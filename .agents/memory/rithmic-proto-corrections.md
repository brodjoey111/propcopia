---
name: Rithmic proto corrections
description: Correct field numbers and template IDs for Rithmic R|Protocol v0.87.0.0 — sourced from official .proto files and Reference Guide PDF
---

## Field numbers (PB field tags in .proto files)

All sourced from `attached_assets/rithmic_api/0.87.0.0/proto/`.

| Field | Correct tag | Previous (wrong) |
|---|---|---|
| TEMPLATE_ID | 154467 | 154489 |
| USER (login username) | 131003 | 131803 |
| PASSWORD | 130004 | 131802 |
| APP_NAME | 130002 | 154013 (that's fcm_id!) |
| APP_VERSION | 131803 | 154014 (that's ib_id!) |
| SYSTEM_NAME | 153628 | 153648 |
| INFRA_TYPE | 153621 | 153646 |
| FCM_ID | 154013 | — |
| IB_ID | 154014 | — |
| ACCOUNT_ID | 154008 | — |
| MANUAL_OR_AUTO (OrderPlacement) | 154710 | — |
| RP_CODE | 132766 | — |

## SysInfraType enum values

| Name | Correct value | Previous (wrong) |
|---|---|---|
| TICKER_PLANT | 1 | 1 ✓ |
| ORDER_PLANT | 2 | 3 ✗ |
| HISTORY_PLANT | 3 | 4 ✗ |
| PNL_PLANT | 4 | 5 ✗ |
| REPOSITORY_PLANT | 5 | — |

## Template ID VALUES (from Reference Guide PDF)

These are the VALUES written into the template_id field (not the field tag number).

### Shared (all plants)
- 10 = Login Request
- 11 = Login Response
- 12 = Logout Request
- 13 = Logout Response
- 18 = Heartbeat Request
- 19 = Heartbeat Response
- 75 = Reject
- 76 = User Account Update
- 77 = Forced Logout

### Order Plant (infra_type=2)
- 300 = Login Info Request
- 301 = Login Info Response
- 302 = Account List Request
- 303 = Account List Response
- 304–307 = RMS info messages
- 308 = Subscribe For Order Updates Request
- 309 = Subscribe For Order Updates Response
- 310 = Trade Routes Request
- 311 = Trade Routes Response
- 312 = New Order Request
- 313 = New Order Response
- 314 = Modify Order Request / 315 = Response
- 316 = Cancel Order Request / 317 = Response
- 318–319 = Show Order History Dates
- 320–321 = Show Orders
- 322–323 = Show Order History
- 324–325 = Show Order History Summary
- 326–327 = Show Order History Detail
- 328–329 = OCO Order
- 330–331 = Bracket Order
- 332–333 = Update Target Bracket Level
- 334–335 = Update Stop Bracket Level ← old code used these for exit_position!
- 336–337 = Subscribe To Bracket Updates
- 338–339 = Show Brackets
- 340–341 = Show Bracket Stops
- 342–343 = List Exchange Permissions
- 344–345 = Link Orders
- **346 = Cancel All Orders Request**
- **347 = Cancel All Orders Response**
- 348–349 = Easy To Borrow List
- 350 = Trade Route (push)
- 351 = Rithmic Order Notification (push)
- 352 = Exchange Order Notification (push)
- 353 = Bracket Updates (push)
- 355 = Update Easy To Borrow List (push)
- 356 = Account RMS Updates (push)
- 3500–3501 = Modify Order Reference Data
- 3502–3503 = Order Session Config
- **3504 = Exit Position Request** ← kill switch uses this
- **3505 = Exit Position Response**
- 3506–3507 = Replay Executions
- 3508–3509 = Account RMS Updates Request/Response

### History Plant (infra_type=3)
- 200–211 = Time/Tick bar replay/update

## Kill switch flow (ORDER_PLANT)
1. Connect to ORDER_PLANT (infra_type=2)
2. Send Login (template=10) → receive Login Response (template=11)
3. Parse `fcm_id` (field 154013) and `ib_id` (field 154014) from response
4. Send Exit Position Request (template=3504) with fcm_id, ib_id, account_id, manual_or_auto=2 (AUTO)
5. Receive Exit Position Response (template=3505), check rp_code="0" for success

## Server URIs
- Test/paper: `wss://rituz00100.rithmic.com:443`
- Live Chicago: `wss://rithmic01.rithmic.com:443`

**Why:** All previous field numbers were wrong due to copying approximate values instead of reading the official .proto files. The incorrect INFRA_TYPE for ORDER_PLANT (3 vs 2) and wrong TEMPLATE values for exit_position (334/335 vs 3504/3505) would have caused the kill switch to silently send garbage or the wrong message type.
