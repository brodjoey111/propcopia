# Phase 18 - Authentication Abuse Protection

- [x] Throttle signup, login, and password-change attempts
- [x] Return a clear 429 response with retry timing
- [x] Reset attempt windows after successful authentication
- [x] Keep limiter memory bounded and replace stale keys
- [x] Avoid logging credentials or request bodies
- [x] Leave normal API polling and broker routes unaffected
- [x] Add deterministic offline limiter and route-wiring tests
- [x] Run TypeScript checks and production build
- [x] Run the complete offline regression suite
- [x] Commit and push the Phase 18 checkpoint
