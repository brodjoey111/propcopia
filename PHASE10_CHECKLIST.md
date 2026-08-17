# Phase 10 - Billing and Licensing Foundation

## License model

- [x] Define one server-owned plan catalog and entitlement model
- [x] Persist plan, status, billing period, and external billing references
- [x] Keep existing development users fully accessible before enforcement
- [x] Never expose Stripe customer or subscription identifiers to the client

## Product integration

- [x] Add an authenticated, read-only billing-status endpoint
- [x] Show honest license and billing readiness in Settings
- [x] Keep checkout, webhooks, and paid enforcement disabled until Stripe is configured

## Verification

- [x] Add offline catalog, snapshot, migration, route, and interface tests
- [x] Run TypeScript checks and production build
- [x] Apply the idempotent license-state migration
- [x] Run the complete offline regression suite
- [x] Commit and push the Phase 10 checkpoint
