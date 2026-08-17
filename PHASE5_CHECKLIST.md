# Phase 5 - Persistent Trade History

## Persistence foundation

- [x] Add a user-owned trade history database table and idempotent migration
- [x] Persist lifecycle changes without blocking trade execution
- [x] Hydrate saved history for authenticated users
- [x] Preserve review notes and lifecycle evidence across restarts

## Restart safety

- [x] Flag unfinished records from an older server run for operator review
- [x] Never replay or resubmit persisted orders automatically
- [x] Keep history isolated by authenticated user and owned accounts
- [x] Log persistence failures without changing broker behavior

## Product integration

- [x] Merge persisted records into history and CSV routes
- [x] Include persisted records in dashboard recovery and notifications
- [x] Add bounded retention for old history records

## Verification

- [x] Add offline persistence and restart-recovery tests
- [x] Run the focused offline test suite
- [x] Run TypeScript checks and production build
- [x] Apply the database migration
- [x] Commit and push the Phase 5 checkpoint
