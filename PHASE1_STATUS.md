# PropCopia Phase 1 Status

Last updated: 2026-08-17
Branch: `feature/broker-manager`

## Current Phase 1 State

- Complete copy-group workflow hardening: complete
- Foundational observability and route-level error hardening: complete
- Offline route and workflow coverage for the Phase 1 runtime surface: complete
- Larger focused regression suite after hardening passes: complete

## Completed Checkpoint Areas

- Copy-group persistence, lifecycle actions, pause/resume/stop, and emergency-stop protection
- Risk settings and global-risk route hardening
- Auth, session, logout cleanup, and user-management route hardening
- Account mutation, connection, recovery, and removal route hardening
- Runtime dashboard, operations overview, notifications, and position snapshot route hardening
- Copy-group alert reviews, position-sync reviews, and position-sync simulations
- Broker credential test routes for Tradovate, Tradeify, and Rithmic Test
- Trade history list and CSV export route hardening
- Trade-copy runtime cleanup, kill-switch activation, AI chat, and market websocket error logging
- Execution-history idempotency for duplicate and out-of-order acknowledgement/fill events
- Follower fill-pipeline reconciliation now defers cumulative progress handling to the execution manager
- Trade-copy engine runtime failures now emit structured operational log events instead of raw console errors
- Overdue `SENT` executions now surface in execution follow-up notifications alongside stale acknowledged and partial orders
- Client trade-history lifecycle summaries now distinguish broker-submission waits from acknowledged fill waits so `SENT` executions stay visible in dashboard/operator views
- Server execution-recovery payloads now distinguish fresh and stale broker-submission waits from acknowledged and partial-fill states for dashboard and operator follow-up consumers
- Activity execution follow-up boards now surface broker-wait and fill-wait labels directly in the operator queue instead of collapsing every live execution into a generic active state
- Dashboard execution-recovery summary cards now break broker-submission waits and acknowledged fill waits out into separate counts instead of one generic active bucket
- Server execution-recovery top-level summaries now describe broker-submission waits and acknowledged fill waits explicitly instead of using one generic in-flight sentence
- Execution follow-up notifications now describe stale broker submissions, acknowledged waits, and partial-fill stalls with state-specific wording instead of one generic in-flight alert
- Client notification attention helpers and types now recognize `SENT` trade alerts explicitly so broker-submission waits are labeled separately from acknowledged fill waits
- Dashboard execution-recovery help text now explains stale executions in broker-state terms instead of using a generic in-flight description
- Server notification trade-story helpers now recognize `SENT` as a working broker state instead of a failure fallback if that lifecycle is ever surfaced through low-noise trade stories
- Server execution-recovery active headlines now describe broker progress explicitly instead of using the generic “currently in flight” wording
- Activity execution follow-up filter labels now use `Active waits` so the operator queue wording matches the broker-wait and fill-wait breakdown
- Client trade-history lifecycle overview headlines now describe broker progress explicitly instead of using the generic `in flight` wording for active sent and acknowledged work
- Server recovery and notification fallback wording now avoids the generic `in flight` phrase even for edge-case lifecycle defaults
- Server execution-recovery payloads now expose explicit `brokerWait` and `fillWait` counts so dashboard and follow-up consumers can reuse the broker-state breakdown without recomputing it
- Dashboard recovery cards now label those counts as `Fresh broker wait` and `Fresh fill wait` so the UI matches the non-stale semantics of the payload
- Execution follow-up review routes and dashboard recovery review actions now have direct offline source-level coverage so Phase 1 operator review endpoints stay pinned while live Rithmic validation is pending

## Current Verification Baseline

- `npm run check`: passing
- Larger focused regression suite: `85/85` passing on 2026-08-17
- Focused client execution-summary suite: `29/29` passing on 2026-08-17
- Focused execution-recovery suite: `18/18` passing on 2026-08-17
- Focused activity execution follow-up suite: `10/10` passing on 2026-08-17
- Focused dashboard execution-recovery suite: `5/5` passing on 2026-08-17
- Focused execution recovery summary suite: `13/13` passing on 2026-08-17
- Focused notification suite: `32/32` passing on 2026-08-17
- Focused notification label suite: `32/32` passing on 2026-08-17 after `SENT` label coverage updates
- Focused dashboard wording suite: `1/1` passing on 2026-08-17
- Focused notification suite: `33/33` passing on 2026-08-17 after `SENT` trade-story hardening
- Focused execution recovery wording suite: `13/13` passing on 2026-08-17 after active headline cleanup
- Focused activity board suite: `2/2` passing on 2026-08-17 after active-wait label cleanup
- Focused trade-history wording suite: `23/23` passing on 2026-08-17 after broker-progress headline cleanup
- Focused recovery and notification fallback suite: `42/42` passing on 2026-08-17
- Focused recovery-count contract suite: `13/13` passing on 2026-08-17 after broker-wait/fill-wait payload counts were added
- Focused dashboard label suite: `1/1` passing on 2026-08-17 after fresh-wait label cleanup
- Focused execution follow-up review route suite: `1/1` passing on 2026-08-17

## Remaining Phase 1 Work

- End-to-end saved-account reconnect validation in Rithmic Test after full server restart
- Real Rithmic Test session validation for account discovery, connection status, and readiness flows
- Order acknowledgement state flow wiring beyond offline route coverage
- Fill handling state updates beyond offline route coverage
- Manual validation of disconnect/reconnect behavior under live Rithmic Test sessions

## Recommended Next Phase

1. Re-run the saved Rithmic reconnect path against a real Rithmic Test session after server restart.
2. Validate order acknowledgement and fill state transitions using the existing offline execution pipeline.
3. Move from offline route pinning into saved-account reconnect and real Rithmic Test validation so the remaining Phase 1 gaps are proven against live account/session behavior.
