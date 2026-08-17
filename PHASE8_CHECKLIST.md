# Phase 8 - Copy Latency Monitoring

## Metrics

- [x] Track dispatch latency sample counts with copy-group statistics
- [x] Aggregate p95 and p99 latency without sending raw samples to the client
- [x] Distinguish no-data, warming, healthy, watch, and high-latency states
- [x] Label dispatch latency separately from broker execution or fill latency

## Dashboard

- [x] Replace the average-only card with p95 and sample context
- [x] Keep the dashboard payload compact and avoid additional polling

## Verification

- [x] Add offline aggregation and status tests
- [x] Run focused copy-group and dashboard tests
- [x] Run TypeScript checks and production build
- [x] Run the complete offline regression suite
- [x] Commit and push the Phase 8 checkpoint
