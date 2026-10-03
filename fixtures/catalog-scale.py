"""Versioned synthetic setup outside the measured public catalog requests."""
import json
from pathlib import Path
import sys
from amplifier_session_catalog import Catalog

root=Path(sys.argv[1]).resolve();count=int(sys.argv[2]);workspace=root/'projects';workspace.mkdir()
for i in range(100):(workspace/f'p-{i}').mkdir()
catalog=Catalog(root/'catalog.sqlite')
with catalog.connect() as db:
    if db.execute('PRAGMA user_version').fetchone()[0]!=1:
        raise ValueError('Fixture requires explicitly reviewed catalog schema 1')
    db.executemany('INSERT INTO workspaces VALUES(?,?,?)',
                   ((str(workspace/f'p-{i}'),'present' if i<100 else 'missing',1) for i in range(4000)))
    def row(i):
        # Keep exactly 1000 discoverable parent sessions as total history varies.
        visible_root=i<1000
        kind='root' if visible_root or i%3==0 else 'child'
        project=i%100 if visible_root or kind=='child' else 100+i%3900
        return (f'ahp-session:/catalog-{i:08d}','fixture',str(i),str(workspace/f'p-{project}'),
                None if kind=='root' else f'ahp-session:/catalog-{i%1000:08d}',kind,
                'Synthetic retained conversation',1,i+1000,'available','fixture',None,None,None,None,1,'{}',int(project<100))
    db.executemany('INSERT INTO sessions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',(row(i) for i in range(count)))
print(json.dumps({'indexedSessions':count,'indexedWorkspaces':4000,'presentWorkspaces':100,'discoverableRoots':1000}))
