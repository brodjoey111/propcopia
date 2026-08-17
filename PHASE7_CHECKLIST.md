# Phase 7 - Session Recovery

## Reconnect coordination

- [x] Deduplicate simultaneous reconnect requests for the same account
- [x] Preserve the existing session until a replacement authenticates successfully
- [x] Record reconnecting, recovered, and failed outcomes

## Safe disconnect and startup

- [x] Record intentional account disconnects
- [x] Record saved connections reset to offline during server startup
- [x] Never restart copy groups or replay orders automatically

## Visibility and verification

- [x] Add an authenticated account recovery-status endpoint
- [x] Add offline concurrency, state, route, and startup tests
- [x] Run focused recovery and Rithmic Test suites
- [x] Run TypeScript checks and production build
- [x] Run the complete offline regression suite
- [x] Commit and push the Phase 7 checkpoint
