"""Installed catalog queries must not open native event or transcript contents."""
import os
import sys

def audit(event,args):
    if event=='open' and isinstance(args[0],(str,bytes)) and os.path.basename(os.fsdecode(args[0])) in {'events.jsonl','transcript.jsonl','transcript.jsonl.backup'}:
        raise AssertionError('Catalog metadata queries may not open native history bodies')

sys.addaudithook(audit)
from amplifier_session_catalog.__main__ import main
main()
