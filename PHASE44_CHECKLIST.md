# Phase 44 - Auth And Session Hardening

- [x] Audit remaining auth and session lifecycle edge cases
- [x] Keep logout working even when runtime cleanup fails
- [ ] Clear logout-in-progress state after cleanup and destroy failures
- [x] Preserve stale-session cleanup on `/api/auth/me`
- [x] Add offline route coverage for logout failure handling
- [ ] Add offline route coverage for idempotent auth-session cleanup
- [x] Run TypeScript checks and focused auth/session tests
- [ ] Commit and push the Phase 44 checkpoint
