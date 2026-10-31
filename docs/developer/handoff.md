# Handoff Guide

Preserve the current plan, validation and remaining release work for the next session.

## Prerequisites

- Read root AGENTS.md and the required startup documents.
- Resume from `docs/handoffs/HANDOFF.md`, then inspect actual Git status before editing.

## Commands

```powershell
npm run todo
npm run ledger:list
npm run handoff -- "Describe the implementation state, checks and next action"
```

## Notes

`handoff` updates the durable handoff and creates an ignored timestamped snapshot. Keep runtime data, secrets and temporary QA artifacts out of it. Before ending a complex session, reconcile source, package scripts, manifest, foundation, version targets and docs, record validation in the ledger, then generate the handoff. Final reports state changed surfaces, checks, dist rebuild status, schema/migration changes, and any remaining deployment action.
