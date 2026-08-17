# Phase 17 - Graceful Server Shutdown

## Runtime cleanup

- [x] Handle SIGTERM and SIGINT once through an idempotent coordinator
- [x] Stop accepting HTTP requests with a bounded close timeout
- [x] Disconnect active copy engines and cached Rithmic Test sessions
- [x] Stop market-data background work without submitting orders
- [x] Drain buffered trade history before closing database pools
- [x] Continue remaining cleanup if one resource fails

## Verification

- [x] Add offline coordinator and startup-wiring tests
- [x] Run TypeScript checks and production build
- [x] Run the complete offline regression suite
- [x] Commit and push the Phase 17 checkpoint
