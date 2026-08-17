# PropCopia Phase 2 Checklist

This file tracks the Rithmic Test stabilization and execution-readiness checkpoint. An item is checked only after its offline tests and TypeScript verification pass.

## Current Work

- [x] Harden saved Rithmic Test reconnect cleanup and session replacement
- [x] Complete route-level reconnect and readiness revalidation tests
- [x] Persist accurate connection state through restart and failed reconnects
- [x] Verify disconnect, retry backoff, and retry exhaustion workflows
- [x] Complete offline master-fill detection boundary tests
- [x] Verify acknowledgement, partial-fill, final-fill, rejection, and cancellation state handling
- [x] Run the larger focused offline test suite
- [x] Commit and push the finished Phase 2 checkpoint

## Guardrails

- Use Rithmic Test only.
- Do not place live trades.
- Do not change Rithmic broker protocol code unless a verified blocker requires it.
- Keep tests offline whenever possible.
- Do not mark a reconnect successful until authentication and post-login setup both finish.
