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

## Combined catalog and live-update scale check

`node test/scale-composition.mjs /owned/receipt.json` qualifies independently
installed host/catalog components with 32 AHP wire clients, eight active ACP
fixture agents, 4,000 historical projects, 100 existing directories and 1,000
discoverable root sessions. It varies total stored history from 25,000 to 100,000
while keeping that active set fixed. Eight concurrent standard AHP title-action
notifications share the host with 24 catalog page requests. The test measures the
authoritative origin-correlated action echo, receipt by all four subscribed
viewers, and read-visible catalog convergence separately. A client action echo
is not a catalog disk receipt; convergence is measured after the concurrent
round finishes and can include scheduling and page-request latency.

Set `UNIFIED_HOST_MODULE` to the installed host package's exported module,
`CATALOG_PYTHON` to an independent installed catalog environment,
`UNIFIED_HOST_REVISION` and `CATALOG_REVISION` to their qualified 40-character
commits, and `UNIFIED_HOST_ARTIFACT` to the installed host's verified archive.
The fixture seed explicitly targets catalog schema 1 and is outside measured work.
The catalog subprocess rejects event-log opens. No accounts, native history or
model providers are used, and temporary stores are removed on completion.

Receipts include p50/p95/p99, process memory/CPU, wire-schema failures, exact
prompt counts and component identities. The Node process includes benchmark
clients; these measurements do not establish browser paint, cold native-history,
subprocess memory or slow-socket backpressure acceptance. Fixed-active-set scaling
is a separate claim from a production deployment or a real-model latency result.
