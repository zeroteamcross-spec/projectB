# Internal Hardening and Role Regression Gate

Status: required before payment provider real UAT.

Payment provider real UAT must remain blocked until this gate passes and disposable payment data is ready.

## Priority Order

1. Stabilize visible internal bugs.
2. Run regression smoke for all roles.
3. Only then run payment provider real UAT with sandbox credentials and disposable data.

## Priority 1 - Internal Hardening

These checks are low business risk because they do not require real payment/provider mutation.

| Area | Requirement | Status | Notes |
|---|---|---|---|
| Login toast | Login success toast must not flicker, duplicate, or appear from preload/autologin. | [x] | Browser smoke observed exactly one login success toast per role. |
| Buyer profile | `#/profile` for buyer must be clean, mobile-first, no admin/sidebar layout. | [x] | Browser smoke verified buyer `#/profile` has no app sidebar. |
| Buyer notifications page | `#/notifications` for buyer must match buyer shell/style, not admin/seller dashboard style. | [x] | Browser smoke verified buyer `#/notifications` has no app sidebar. |
| Notification backdrop | Buyer notification popover backdrop must work for all buyer ids. | [x] | Browser smoke verified mobile/desktop buyer and buyer profile backdrop ids. |
| Notification backdrop ids | `byr_mobile_ntf_popover`, `byr_desktop_ntf_popover`, `byr_profile_mobile_ntf_popover`, `byr_profile_desktop_ntf_popover` are covered. | [x] | Backdrops verified by corresponding `*_ntf_backdrop` elements; popovers now share `#notification_overlay_root` with their backdrop. |
| Notification layering | Notification popover must be above backdrop across buyer/global variants and below global modal/dialog. | [x] | Browser smoke verified `#notification_overlay_root` z-index 79, backdrop local z-index 0, popover local z-index 1, modal remains z-[80]. |
| Seller dashboard bell | Seller dashboard notification bell/header action is consistent. | [x] | Browser smoke verified seller dashboard bell opens and outside click closes. |
| Stale state | Important pages no longer show stale preload after completed local mutations. | [x] | Auth/profile browser smoke and business sync sandbox passed; role smoke routes render. |

## Priority 2 - Role Regression Smoke

Run these after Priority 1 is stable.

### Guest / Public

- [x] Open public catalog.
- [x] Open public car detail.
- [x] Open `#/notifications` as guest and verify auth guard/redirect.
- [x] Open `#/profile` as guest and verify auth guard/redirect.
- [x] No page error.

### Buyer

- [x] Login buyer.
- [x] Login toast appears once and does not flicker.
- [x] Header action group is `[NotificationBell] [Profile/User]`.
- [x] `#/buyer` renders buyer shell.
- [x] `#/buyer/cars` renders buyer shell.
- [x] `#/buyer/transactions` renders buyer shell.
- [x] `#/profile` renders buyer profile layout.
- [x] `#/notifications` renders buyer notifications layout.
- [x] Notification bell opens popover with backdrop.
- [x] Outside click closes popover.
- [x] `byr_mobile_ntf_popover` backdrop works.
- [x] `byr_desktop_ntf_popover` backdrop works.
- [x] `byr_profile_mobile_ntf_popover` backdrop works.
- [x] `byr_profile_desktop_ntf_popover` backdrop works.
- [x] No sidebar appears on buyer pages.
- [x] No page error.

### Seller

- [x] Login seller.
- [x] Login toast appears once and does not flicker.
- [x] Header action group is `[NotificationBell] [Profile/User]`.
- [x] Seller dashboard bell works.
- [x] `#/seller/cars` renders and actions are visible.
- [x] `#/seller/transactions` renders.
- [x] `#/profile` renders without buyer-only layout regression.
- [x] `#/notifications` renders.
- [x] Notification bell opens and closes correctly.
- [x] No page error.

### Admin

- [x] Login admin.
- [x] Login toast appears once and does not flicker.
- [x] Header/profile action works.
- [ ] `#/admin/cars` or admin car route renders if available.
- [x] `#/admin/transactions` renders.
- [x] `#/admin/settlements` renders.
- [x] `#/profile` renders.
- [x] `#/notifications` renders.
- [x] Notification bell opens and closes correctly.
- [x] No page error.

### Affiliate Admin

- [x] Login affiliate_admin.
- [x] Login toast appears once and does not flicker.
- [x] Header/profile action works.
- [x] `#/affiliate/ledger` renders.
- [x] `#/affiliate/settlements` renders.
- [x] `#/profile` renders.
- [x] `#/notifications` renders.
- [x] Notification bell opens and closes correctly.
- [x] No page error.

## Priority 3 - Payment Provider Real UAT

Payment provider real UAT is blocked until:

- [ ] Internal hardening Priority 1 passes.
- [ ] Role regression Priority 2 passes.
- [ ] Disposable buyer/seller/listing data is ready.
- [ ] Payment provider sandbox credentials are ready.
- [ ] Public HTTPS callback URL is ready.
- [ ] Callback logging is active.
- [ ] Rollback/reset script or disposable DB is ready.
- [ ] Test transactions are explicitly approved to change status.
- [ ] Notification + listing lock + affiliate accrual checklist is accepted.

Use:

- `docs/PAYMENT_PROVIDER_REAL_UAT_RUNBOOK.md`

## Current Known Passed Checks

- Auth/profile source-of-truth browser smoke passed for buyer profile name sync.
- Business sync sandbox/mock UAT passed 10/10 scenarios.
- Native payment provider UAT has not been run and remains blocked.

## Evidence Log

Add smoke run results here.

| Date | Scope | Result | Evidence / Notes |
|---|---|---|---|
| 2026-05-18 | Business sync sandbox/mock UAT | PASS 10/10 | `BUSINESS_SYNC_SANDBOX_UAT_CHECKLIST.md` |
| 2026-05-18 | Internal hardening + role regression browser smoke | PASS | Guest/public, buyer, seller, admin, affiliate_admin passed. Login success toast observed once per authenticated role. Buyer notification backdrop ids passed. Notification outside-click close passed. |
| 2026-05-18 | Public car detail smoke | PASS | Route `#/cars/19`; car id from public catalog; published CTA visible/enabled but not clicked; no mutation API; optional inspection GET returned 403 and was handled as not public by policy. |
| 2026-05-19 | Global notification popover layering smoke | PASS | `#/seller/transactions` verified `global_ntf_popover` above page content, `global_ntf_backdrop` full viewport via body portal, outside-click close, no notification fetch on open. Regression passed for seller cars, admin transactions, affiliate ledger, and buyer dashboard popover. |
| 2026-05-19 | Notification overlay root hardening smoke | PASS | Static browser smoke verified buyer desktop/mobile, buyer profile desktop/mobile, seller transactions, admin transactions, and affiliate ledger. Popover/backdrop shared `#notification_overlay_root`; popover local z-index `1` above backdrop `0`; root z-index `79` below modal `z-[80]`; outside/backdrop close removed visible overlay nodes; no notification fetch on open. |

## Public Car Detail Smoke

- Status: PASS
- Route tested: `#/cars/19`
- Car id/source: `19` from `/api/cars?listing_status=published&page=1&limit=12`
- Listing status: `published`
- CTA result: `Mulai transaksi` visible and enabled; not clicked.
- Image/detail result: detail/spec/price/seller content rendered; image count `5`.
- Inspection result: not available/hidden by policy; optional inspection response `403`.
- Mutation API detected: none (`POST`/`PATCH`/`PUT`/`DELETE` count `0`)
- Fetch/open behavior: normal GETs only for app boot, catalog/detail, images, optional inspection, theme config/autologin; no mutation and no reload workaround.
- Result: PASS
- Evidence: Playwright browser smoke on local ProjectB, non-mutating.
- Notes: CTA was verified but not clicked; checkout/payment flow was not opened.

## Remaining Non-Blocking Items

- Admin does not currently expose a dedicated `#/admin/cars` route in `adminRoutes`; admin cars are covered through dashboard preload/snapshot and business sync sandbox verification.

## Patch Policy

- Patch only the bug found by smoke/audit.
- Do not touch payment provider flow during this gate.
- Do not mutate real payment/transaction/listing/commission data.
- Do not change `projectA`.
