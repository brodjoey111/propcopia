# Phase 12 - Client Startup Performance

## Route loading

- [x] Load public and authenticated pages only when opened
- [x] Keep one accessible, lightweight loading state
- [x] Preserve protected routing and all existing page URLs
- [x] Avoid new polling, server work, or trading behavior changes

## Verification

- [x] Add offline route-loading coverage
- [x] Compare production entry-bundle size before and after (1.63 MB to 385 KB)
- [x] Run TypeScript checks and production build
- [x] Run the complete offline regression suite
- [x] Commit and push the Phase 12 checkpoint
