# Phase 42 - Runtime Cache Invalidation

- [x] Audit runtime snapshot scopes and cache lifetime
- [x] Preserve short-lived read reuse and in-flight request sharing
- [x] Invalidate after copy-group lifecycle changes
- [x] Invalidate after copy-group registration and deletion
- [x] Invalidate after account creation and connection changes
- [x] Invalidate after broker settings and account-role changes
- [x] Preserve existing risk-setting invalidation
- [x] Invalidate after trade-copy start, follower add, and stop
- [x] Keep invalidation scoped to the authenticated user
- [x] Add offline route coverage for mutation invalidation
- [x] Run TypeScript checks and focused cache tests
- [x] Run the complete offline regression suite and production build
- [x] Commit and push the Phase 42 checkpoint
