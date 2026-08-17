# Phase 13 - Notification Delivery Readiness

## Delivery policy

- [x] Use one shared preference policy on the server and client
- [x] Filter disabled trade, connection, and error notifications before responding
- [x] Keep generated and delivered counts distinct
- [x] Report in-app delivery available while email and push remain unavailable

## Guardrails

- [x] Do not contact email, push, broker, or payment providers
- [x] Do not add background jobs, polling, or database load
- [x] Keep existing notification URLs and review workflows unchanged

## Verification

- [x] Add offline policy, delivery summary, route, and client compatibility tests
- [x] Run TypeScript checks and production build
- [x] Run the complete offline regression suite
- [x] Commit and push the Phase 13 checkpoint
