# PropCopia Phase 4 Checklist

This file tracks the offline Risk Management checkpoint. An item is checked only after its tests and TypeScript verification pass.

## Current Work

- [x] Validate and normalize account risk settings before saving
- [x] Persist global risk defaults and synchronize Global-mode follower accounts
- [x] Evaluate every configured account loss rule without inventing missing runtime data
- [x] Make follower whitelist, direction, schedule, sizing, and session limits deterministic
- [x] Carry saved follower risk rules into active copy sessions
- [x] Record tamper-evident risk decision evidence in trade history
- [x] Add offline tests for validation, boundary cases, and copy-session enforcement
- [x] Run the larger offline test suite and production build
- [x] Commit and push the finished Phase 4 checkpoint

## Guardrails

- Do not submit live broker orders while validating this checkpoint.
- Keep broker protocol and authentication code unchanged.
- Treat unavailable risk data as unavailable instead of reporting it as safe.
- Never log credentials or broker secrets in risk evidence.
- Use Rithmic Test only when broker access is eventually required.
