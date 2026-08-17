# PropCopia Phase 1 Change Set

## Scope

This checkpoint stabilizes copy groups and adds the observability needed for later execution, risk, reconnect, and position-sync phases. It is designed for offline verification and Rithmic Test only.

## Change Groups

### Copy-group lifecycle

- Multiple isolated copy-group runtimes.
- Start, stop, pause, resume, and emergency-stop controls.
- Safe lifecycle restoration after server restart.
- Route actions mutate state before persistence and do not persist failed actions.
- Configuration validation prevents duplicate, cross-group, mismatched, or master-as-follower assignments.
- Risk-rule rejections apply the selected group's `PAUSE`, `STOP`, or emergency safety action.

### Copy-group interface

- The large account-groups component is split into smaller board, lane, card, toolbar, overlay, and hook modules.
- Runtime health, routing gates, signal freshness, operator history, and restart-recovery context are shown without loading full history payloads.

### Execution observability

- Trade history tracks intent, submission, acknowledgement, partial-fill, fill, failure, and review state.
- Recovery queues expose exact checkpoints and stale/fresh follow-up windows.
- Trade-logger queue depth, flush timing, failures, and clean shutdown are observable.
- One offline simulation covers master fill through follower MARKET submission, partial fill, and final fill.

### Operator follow-up

- Execution, copy-group alert, risk, position-sync, and Rithmic-readiness review state can be assigned and persisted.
- Dashboard, Activity, Notifications, Accounts, and Trades consume shared follow-up models.

### Persistence

- `0019_create_execution_follow_up_reviews.sql`
- `0020_create_copy_group_alert_reviews.sql`
- `0021_create_rithmic_readiness_reviews.sql`
- Shared schema definitions match the three new review tables.

### Rithmic boundary

- Rithmic login metadata is captured for readiness and conformance evidence.
- No order protocol, production URI, or live-trading behavior is added by this checkpoint.
- `FLATTEN_AND_STOP` enters emergency safety; live flattening remains blocked until an approved broker workflow exists.

## Repository Cleanup

- Removed the empty tracked `client/src/pages/Dashboard.tsx` duplicate.
- Kept `client/src/pages/dashboard.tsx` as the single dashboard implementation used by `App.tsx`.
- No temporary images, logs, or generated artifacts are part of the pending change set.

## Verification Gate

Before committing this checkpoint:

1. Run the complete focused offline test set.
2. Run `npx tsc --noEmit --incremental false`.
3. Run `git diff --check` and `git diff --cached --check`.
4. Confirm the server starts locally without initiating a live broker action.
5. Review the final staged file list before committing and pushing.

## External Blockers

- Real Rithmic Test credentials and server-side conformance validation are required for the final test-environment demonstration.
- Production/live trading remains out of scope.
