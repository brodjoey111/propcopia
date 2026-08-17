# Phase 14 - Deployment Readiness

## Runtime configuration

- [x] Keep development startup defaults convenient
- [x] Reject missing, default, or short production session secrets
- [x] Validate configured ports before server startup
- [x] Keep secret values out of public responses

## Liveness

- [x] Add a lightweight unauthenticated liveness endpoint
- [x] Register liveness before session and database-backed middleware
- [x] Avoid broker, database, payment, and external API probes

## Verification

- [x] Add offline configuration, liveness, and startup wiring tests
- [x] Run TypeScript checks and production build
- [x] Run the complete offline regression suite
- [x] Commit and push the Phase 14 checkpoint
