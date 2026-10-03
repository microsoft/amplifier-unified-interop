"""An installed public catalog server that fails on event-log parsing."""
import sys
def audit(event,args):
    if event=='open' and isinstance(args[0],str) and args[0].endswith('events.jsonl'):
        raise AssertionError('Interactive catalog requests must not open event logs')
sys.addaudithook(audit)
from amplifier_session_catalog.__main__ import main
main()
