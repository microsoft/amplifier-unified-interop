# Amplifier Unified interop — local vision

Status: documentation of inherited approved family direction, 2026-10-03.
This is a repository-specific view of the [family vision](https://github.com/microsoft/amplifier-unified/blob/625af2f2832fafc8152f6078061d626f160362a4/docs/architecture/VISION.md),
not a new ratification or an expansion of product scope. The versioned local
[contract entry point](CONTRACT.v1.md) maps that direction to this repository.

## Purpose and desired outcomes

Make independently implemented clients, hosts and ACP agents demonstrably
interchangeable at their public boundaries. A reviewer should be able to rerun
an isolated consumer journey, identify every participating artifact and see
what passed, failed, remained unknown or was not exercised.

Qualification should demonstrate that selecting an agent at creation keeps its
identity, authorized viewers share one execution authority, and recovery reads
accepted history without repeating effects. Filtered catalogs and small changes
should remain bounded as historical existence grows while the active set stays
fixed. Backend measurements and actual client experience need their own evidence.
These desired outcomes follow HP, AP, WS and CS; existing tests cover narrower
scenarios and do not reduce the promises to their present coverage.

## Scope and ownership

This repository owns independent seam fixtures, public-peer consumer probes,
load/recovery measurements and exact compatibility receipts. It runs declared
public executables, exports and negotiated capabilities in task-owned state.
Default checks need no production history, credentials, models or shared service.
Explicit account qualification uses a fresh bounded session and preserves unknown
outcomes. The [component boundary](https://github.com/microsoft/amplifier-unified/blob/625af2f2832fafc8152f6078061d626f160362a4/contracts/component-boundaries.v1.md)
assigns runtime authority and production state to their respective owners.

The host owns admission and ACP orchestration; adapters own native execution and
history; clients own private drafts, presentation and device effects. Distribution
owns package selection, integration and activation. Interop supplies evidence to
those owners and proposes cross-owner semantic changes before implementation.
AHP and ACP upstream definitions remain authoritative.

## Non-goals and open boundaries

This repository does not implement a production host, agent or client; convert
history between engines; replay unknown work; mutate canonical user history;
manage authentication; or merge, publish or deploy on another owner's behalf.
It does not replace full Core/Foundation native composition with another engine.
Fixture success does not establish browser paint, terminal interaction, device,
account entitlement or live-worker adoption. The local contract lists known
qualification gaps without retiring the supported behavior they concern.

Novel obligations or changes to externally observable meaning remain proposals
for the family/owning component to approve. This documentation introduces none.
