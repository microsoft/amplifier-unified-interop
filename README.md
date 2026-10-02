# Amplifier Unified interoperability qualification

Independent peers and protocol checks for Amplifier Unified. Fixtures import no
host, agent or client implementation. Candidate programs are launched through
public executable interfaces in owned temporary state; no native history,
credentials, real models or shared services are used by default.

```sh
npm ci
UNIFIED_HOST_COMMAND='["amplifier-unified-host"]' npm test
```

`UNIFIED_HOST_COMMAND` is a JSON argv array, not shell code. The harness appends
`--config` with a generated private configuration and launches an independent
ACP v1 subprocess fixture. Without that variable, process acceptance tests are
explicitly skipped; a green schema-only run is not integration acceptance.

Current wire journeys validate initialization, root/session/chat snapshots,
scoped catalog pages, every observed concrete action, permission denial, two
viewers seeing the same result and duplicate prompt rejection. The fixture
records received prompts so duplicate effects can be detected independently.
This is component interoperability evidence, not vendor or live-account approval.

## Upstream evidence

`upstream/ahp/` contains unchanged AHP0.9 generated schemas, license and SHA256
provenance. The generated StateAction union at the recorded upstream revision
contains a dangling `#/$defs/` member. The harness therefore validates the
unchanged envelope shape and each concrete action definition separately,
selecting the definition by its upstream literal discriminator. Unknown actions
fail. It never removes a field requirement or silently treats a schema failure
as protocol success. Recheck this adapter when refreshing upstream schemas.

## Qualification still required

The independently installed Amplifier ACP wheel, actual browser and terminal
clients, recovery/crash and load tests, and external Copilot/Codex/Claude peers
have separate evidence rows. This repository does not claim those from an echo
fixture. Installed artifacts, exact revisions, transport, capabilities and
account requirements must accompany a completed qualification row.
