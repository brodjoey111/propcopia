# PropCopia Phase 3 Checklist

This file tracks the offline Position Synchronization checkpoint. An item is checked only after its tests and TypeScript verification pass.

## Current Work

- [x] Validate position comparison, scaling, reversal, caps, and adjustment safety
- [x] Generate immutable simulation-only repair evidence
- [x] Persist simulation evidence with the position-sync workflow
- [x] Add authenticated, account-scoped position-sync simulation routes
- [x] Connect dashboard simulation actions to the server-owned simulator
- [x] Verify approval, ownership, handoff, and manual-completion history
- [x] Run the larger offline test suite and production build
- [x] Commit and push the finished Phase 3 checkpoint

## Guardrails

- Simulation only: do not submit broker orders.
- Use Rithmic Test only when broker access is eventually required.
- Do not claim Rithmic position snapshots are available until the API supports them.
- Do not mark a plan simulated unless exact plan evidence was generated.
- Keep live automatic repair outside this checkpoint.
