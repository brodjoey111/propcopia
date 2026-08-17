# Phase 33 - Safe Logout Runtime Cleanup

- [x] Remove only the logging-out user's broker sessions
- [x] Stop the user's active trade-copy engine
- [x] Unregister the user's in-memory copy groups
- [x] Disconnect the user's Rithmic sessions
- [x] Clear the user's runtime snapshot cache
- [x] Preserve saved account and copy-group configuration
- [x] Log cleanup failures without exposing credentials
- [x] Add offline logout cleanup and isolation tests
- [x] Run TypeScript checks and production build
- [x] Run the complete offline regression suite
- [x] Commit and push the Phase 33 checkpoint
