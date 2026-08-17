# PropCopia Phase 1 Checklist

This file is the working source of truth for the current Phase 1 checkpoint. An item is checked only after its offline tests and TypeScript verification pass.

## Current Work

- [x] Complete route-level copy-group workflow tests
- [x] Test persisted pause, resume, stop, and emergency-stop workflows end to end
- [x] Verify risk breaches correctly pause or stop the selected group
- [x] Complete offline master-to-follower execution simulation
- [x] Review and organize the accumulated code changes
- [x] Run the larger focused test suite
- [x] Commit and push the finished Phase 1 checkpoint

## Guardrails

- Use Rithmic Test only.
- Do not place live trades.
- Do not change broker protocol code unless a verified blocker requires it.
- Keep tests offline whenever possible.
