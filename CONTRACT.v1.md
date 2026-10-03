# Interoperability qualification contract — v1

Status: inherited approved family obligations mapped to this repository,
2026-10-03. This local entry point documents scope and evidence discipline; it
does not independently ratify new protocol or product obligations.
Parent: [local vision](VISION.md) and [approved family vision](https://github.com/microsoft/amplifier-unified/blob/625af2f2832fafc8152f6078061d626f160362a4/docs/architecture/VISION.md).

## Authority and public boundary

Upstream [AHP](https://github.com/microsoft/agent-host-protocol) and
[ACP](https://agentclientprotocol.com/) own wire schemas, version negotiation,
actions and lifecycle meanings. Interop references their recorded revisions;
`upstream/ahp/SOURCE.json` identifies byte-exact qualification inputs rather than
an alternative normative protocol. Optional extensions require negotiation.
An artifact/version receipt is a tested combination, not a standing dependency pin.

The public input is a declared installed executable or package export, exact
artifact/revision, explicit account requirement and owned state root. Outputs are
repeatable checks and receipts that distinguish fixture, actual peer, source,
installed package, account, UI and deployed acceptance. Other repositories retain
runtime, storage, UI, capability and release authority. No private imports or
production ownership are substituted for the public seam (CB1–4, CB6; CD4–6).

## Inherited promises, falsifiers and existing acceptance

The clauses below retain their shared meaning. Tests cited here establish only
the scenario and exact revisions in their receipts, never the whole clause.

| Shared clauses | Local qualification responsibility | Falsifier | Existing executable checks and evidence |
| --- | --- | --- | --- |
| CB1–4, CB6; CD1, CD3–6; HP1; AP1, AP4–5 | Use independent public peers; name negotiated versions, capabilities and honest unsupported behavior. | A passing claim needs a private runtime import, ignores an invalid action or calls unsupported behavior equivalent. | [Wire/schema checks](test/host-wire.test.mjs), [provenance](test/provenance.test.mjs), [official client](test/official-client.test.mjs), [vendor runner](test/vendor-qualification.mjs); [exact matrix](evidence/2026-10-03/qualification.json). |
| AP3; HP4; CS1, CS7 | Qualify agent choice at creation and shared identity/authority across viewers. An engine swap creates another conversation. | Attaching another viewer changes the agent or starts competing/repeated execution. | [Creation/client swaps](test/substitution-recovery.test.mjs), [wire viewers](test/host-wire.test.mjs), [working set](test/working-set-acceptance.mjs). Fixture identities and vendor account turns are separate evidence. |
| HP3, HP6; CS4; CX2–3 | Recover from lost replies/baselines/replay gaps using authoritative state and original receipts; keep uncertain outcomes inspectable. | Reconnect, process replacement or test retry repeats accepted/unknown work, or an admission echo is reported as completion. | [Recovery swaps](test/substitution-recovery.test.mjs), [official reconnect](test/official-client.test.mjs), [receipt/control concurrency](test/rpc-concurrency.test.mjs), [no-prompt/no-overwrite guard](test/vendor-runner.test.mjs); [vendor unknown receipt](evidence/2026-10-03/vendor-fresh-turns.json). UI delivery experience is a separate gap. |
| WS1–3, WS6; HP2 | Qualify filtered paged discovery and selected cold history without dormant execution or canonical mutation. | A sidebar query opens event logs/starts workers, pages after globally loading history, or changes retained history bytes. | [Scale composition](test/scale-composition.mjs), [audited catalog](fixtures/audited-catalog.py), [cold native](test/cold-native-acceptance.mjs); [cold receipt](evidence/2026-10-03/current-native-cold.json). Index-loss/hint-reconciliation breadth remains separate. |
| WS4–5; CS3 | Hold active work fixed while history grows; measure bounded queues, replay/cursors and interested update delivery. | A slow viewer grows unbounded buffers, detaching cancels accepted work, or tiny updates serialize unrelated histories. | [Scale receipt](evidence/2026-10-03/current-scale.json), [working-set receipt](evidence/2026-10-03/current-working-set.json). Warm-filesystem backend wire measurements include host/harness memory, not browser or subprocess memory. |
| CD5–6; CB4–5; CS6; CX1, CX6–7 | Report per-surface acceptance and saved/package/loaded/adopted state truthfully; give runtime/UI owners exact handoffs. | Source tests are reported as device, browser, account or freshly deployed worker acceptance. | [Qualification limits](evidence/2026-10-03/qualification.json) and [README journeys](README.md). No UI/device/deployment verdict is produced here. |

Shared authoritative clause references:
[HP](https://github.com/microsoft/amplifier-unified/blob/625af2f2832fafc8152f6078061d626f160362a4/contracts/host-protocol.v1.md),
[AP](https://github.com/microsoft/amplifier-unified/blob/625af2f2832fafc8152f6078061d626f160362a4/contracts/agent-protocol.v1.md),
[WS](https://github.com/microsoft/amplifier-unified/blob/625af2f2832fafc8152f6078061d626f160362a4/contracts/working-set.v1.md),
[CB](https://github.com/microsoft/amplifier-unified/blob/625af2f2832fafc8152f6078061d626f160362a4/contracts/component-boundaries.v1.md),
[CS](https://github.com/microsoft/amplifier-unified/blob/625af2f2832fafc8152f6078061d626f160362a4/contracts/client-state.v1.md),
[CX](https://github.com/microsoft/amplifier-unified/blob/625af2f2832fafc8152f6078061d626f160362a4/contracts/client-experience.v1.md), and
[CD](https://github.com/microsoft/amplifier-unified/blob/625af2f2832fafc8152f6078061d626f160362a4/contracts/client-development.v1.md).
The links record the authority snapshot consulted for this documentation; changed
shared meaning must be reconciled by its owner, not silently forked here.

## Consumer obligations inherited from CB/CD/HP/CS

- Supply owned temporary state/home/workspace/ports and actual public artifacts.
  Keep credentials out of repository/receipts; separately remove copied credentials
  after qualification while retaining historical and unknown-outcome evidence.
- Record exact versions, hashes, negotiated baseline, extensions, account needs,
  test skips and scenario limits. Verify installed bytes against their artifacts.
  A current model catalog alone does not establish inference access.
- Inspect per-stage receipt status and original command identity. Do not replay an
  unknown prompt/effect, overwrite its receipt, or infer successful completion from
  runner exit status. Optional model turns require fresh bounded disposable sessions.
- Use relevant README rerun commands. Missing configured peers explicitly skip;
  skipped/schema-only runs do not establish component integration. Keep backend,
  browser, device and adoption measurements distinct when consuming these results.

## Qualification gaps; no implied retirement

The 2026-10-03 packet records eight source/installed checks and a separate eight
packed-consumer checks with no skips for its configured graph, plus separate
scale/working-set/cold-reader probes. Counts cannot be added into a product pass.
The official AHP1.0 client negotiated0.9; newer1.0-only features are unqualified.
Current Claude0.85.1 exposes controls/creates sessions but its fresh isolated turn
required authentication and retains an unknown receipt. Earlier Claude account
success belongs to a different package/account qualification.

Browser paint, actual terminal UI, keyboard/accessibility, device/account breadth,
complete native module/configuration parity, all crash/admission/writer races,
index-loss/hint recovery, subprocess memory and deployed fresh-worker adoption
remain owner-specific or unqualified here. Successful Codex/Copilot bounded turns
are exact-model/account evidence, not all-model entitlement. No pending family
feature decision is resolved by an absent fixture or this documentation.

## Revision and change policy

Version1 is a documentation entry point for inherited approved promises; public
contract delta is **none**. A future novel obligation or changed public meaning
must identify affected producers/consumers and falsifiable acceptance, then be
proposed to the family/owning component under CD2/CD4 before implementation.
Existing evidence and sealed implementation artifacts retain their original
revision/hashes when documentation gains a successor.
