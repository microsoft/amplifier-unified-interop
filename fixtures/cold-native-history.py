"""Seed canonical historical fixtures, or audit an installed native ACP process."""
import hashlib
import json
import os
from pathlib import Path
import sys

if sys.argv[1]=='seed':
    from amplifier_session_catalog import Catalog
    from amplifier_session_catalog.discovery import Discovery,project_slug
    root=Path(sys.argv[2]).resolve();workspace=root/'workspace';workspace.mkdir()
    home=root/'native';sid='11111111-1111-4111-8111-111111111111'
    sessions=home/'projects'/project_slug(workspace)/'sessions'
    selected=sessions/sid;selected.mkdir(parents=True)
    (selected/'metadata.json').write_text(json.dumps({'session_id':sid,'working_dir':str(workspace),'name':'Large retained native session','parent_id':None,'turn_count':10000}))
    with (selected/'transcript.jsonl').open('w') as stream:
        for index in range(10000):
            stream.write(json.dumps({'role':'user','content':f'Request {index}','metadata':{'amplifier_input':{'id':f'turn-{index}','kind':'user','source':'user'}}})+'\n')
            stream.write(json.dumps({'role':'assistant','content':f'Answer {index}: '+'x'*512})+'\n')
    (selected/'events.jsonl').write_bytes(b'{"historical":"preserved"}\n'*100000)
    for index in range(700):
        child=sessions/f'{sid}_child-{index}';child.mkdir()
        (child/'metadata.json').write_text(json.dumps({'working_dir':str(workspace),'parent_id':sid,'name':f'Delegated child {index}','turn_count':1}))
        (child/'transcript.jsonl').write_text('{"role":"user","content":"retained child"}\n')
    catalog=Catalog(root/'catalog.sqlite');discovery=Discovery(catalog,[home]);root_record=discovery.hint(sessionDirectory=str(selected))
    for child in sessions.iterdir():
        if child!=selected:discovery.hint(sessionDirectory=str(child))
    config=root/'native.json';config.write_text(json.dumps({'home':str(home),'appHome':str(root/'native-app'),'workerCommand':['/never-start-a-worker-for-history']}))
    hashes={name:hashlib.sha256((selected/name).read_bytes()).hexdigest() for name in ['transcript.jsonl','events.jsonl']}
    print(json.dumps({'session':root_record['uri'],'nativeSession':sid,'directory':str(selected),'workspace':str(workspace),'config':str(config),'turns':10000,'children':700,'transcriptBytes':(selected/'transcript.jsonl').stat().st_size,'hashes':hashes}))
else:
    log=Path(os.environ['NATIVE_IO_LOG'])
    original=Path.open
    def record(row):
        with original(log,'a') as stream:stream.write(json.dumps({'pid':os.getpid(),**row})+'\n')
    def audit(event,args):
        if event=='open' and isinstance(args[0],(str,bytes)) and os.fsdecode(args[0]).endswith('events.jsonl'):
            record({'event':'forbidden-events-open'});raise AssertionError('History does not read event logs')
        if event in {'subprocess.Popen','os.posix_spawn'}:
            record({'event':'forbidden-worker-start'});raise AssertionError('Passive history cannot start a worker')
    sys.addaudithook(audit)
    class Reader:
        def __init__(self,stream):self.stream=stream
        def __getattr__(self,name):return getattr(self.stream,name)
        def __enter__(self):return self
        def __exit__(self,*args):return self.stream.__exit__(*args)
        def read(self,*args):
            result=self.stream.read(*args);record({'event':'transcript-read','bytes':len(result)});return result
    def opened(path,*args,**kwargs):
        stream=original(path,*args,**kwargs)
        if path.name in {'transcript.jsonl','transcript.jsonl.backup'}:
            record({'event':'transcript-open'});return Reader(stream)
        return stream
    Path.open=opened
    record({'event':'native-process-start'})
    sys.argv=sys.argv[2:]
    from amplifier_acp.server import main
    main()
