"""Public installed catalog fixture; setup costs are outside acceptance measurements."""
from pathlib import Path
import sys
from amplifier_session_catalog import Catalog

root=Path(sys.argv[1]).resolve()
workspace=root/'workspace';workspace.mkdir()
catalog=Catalog(root/'catalog.sqlite')
for index in range(1200):
    catalog.upsert(record={
        'uri':f'ahp-session:/cold-{index}', 'engineId':'fixture',
        'nativeSessionId':f'cold-native-{index}', 'workingDirectory':str(workspace),
        'title':f'Cold indexed session {index}', 'kind':'root' if index<500 else 'child',
        **({'parentUri':'ahp-session:/cold-0'} if index>=500 else {}),
        'createdAt':'2026-01-01T00:00:00Z','modifiedAt':'2026-01-01T00:00:00Z',
        'availability':'available','workspaceAvailability':'present'})
