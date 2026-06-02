# ProjectB Final Full Regression Gate

Date: 2026-06-01

## 1. Date / Environment

- Workspace: `projectB`.
- Server: PHP built-in server, `http://127.0.0.1:8022/app.html` for full gate; targeted checks also used existing `http://127.0.0.1:8019/app.html`.
- Browser: Playwright Chromium headless.
- Test suite: local PHP test runner.
- ProjectA: not changed.

## 2. Scope

Regression covered:

- guest/public routes.
- buyer routes and account shell.
- seller routes, cars, images, inspection, affiliates, transactions.
- admin dashboard/users/transactions/settlements/affiliate finance/sliders.
- affiliate account routes.
- notification popover/page behavior.
- affiliate finance UAT evidence data.
- background video.
- responsive matrix.
- SPA stability static checks.
- full PHP test suite.

## 3. Test Data Used

- Public car id: `19`.
- Public affiliate slug: `smoke-seller`.
- Smoke users:
  - buyer: `buyer@projectb.local`
  - seller: `seller@projectb.local`
  - admin: `admin@projectb.local`
  - affiliate: `uat_aff_fin_20260601_145953_affiliate@projectb.local`
- Affiliate finance evidence:
  - Run ID: `uat_aff_fin_20260601_145953`
  - ledgers: `2,3`
  - settlements: `2,3`
  - transactions: `34,35`
  - affiliate user: `28`

## 4. Guest / Public Result

Result: PASS for implemented public routes.

- `/` opened and rendered public landing.
- `#/cars/19` opened and rendered public car detail.
- `#/transactions/new?car_id=19` opened without submitting mutation.
- `#/af/smoke-seller` opened and showed affiliate context.
- `#/af/smoke-seller/cars/19` opened and kept affiliate context.
- `#/af/smoke-seller/transactions/new?car_id=19` opened without checkout submit.
- Guest notification bell count: `0`.
- Landing max card row detected in the smoke viewport: `1` (within max 3 rule).
- No horizontal overflow detected.
- Background video visible and non-blocking.

Notes:

- Public affiliate routes performed `POST /api/affiliate/clicks`. This is existing affiliate telemetry, not finance/transaction mutation. It is documented as expected supporting telemetry because affiliate click is not commission source of truth.
- Public optional auth/inspection requests returned expected `401/403` console network messages and did not crash the page.

## 5. Buyer Result

Result: PASS.

- `#/buyer`, `#/buyer/cars`, `#/buyer/transactions`, `#/profile`, and `#/notifications` rendered.
- Buyer account has no visible sidebar.
- Desktop top nav rendered.
- Mobile/responsive samples at `360`, `390`, `768`, `1024`, and `1280` had no horizontal overflow.
- Notification popover opened from buyer notifications page with `fetchesOnOpen=0`.
- Notification filter `#byr_notifications_filter` stayed stable after filter click.
- Logout uses global modal, not native browser dialog.
- Background video visible and non-blocking.
- Follow-up fix 2026-06-01: `#/buyer` now visibly renders the active buyer name in the dashboard top navigation from the merged auth/user source of truth, so the requested "update name -> buyer greeting/header changes" check can be proven visually without a reload.

## 6. Seller Result

Result: PASS for route render and static/runtime checks; image upload modal mutation was not repeated after harness correction.

- `#/seller`, `#/seller/cars`, `#/seller/cars/2/images`, `#/seller/cars/2/inspection`, `#/seller/inspection`, `#/seller/affiliates`, `#/seller/affiliate-commissions`, `#/seller/transactions`, `#/notifications`, and `#/profile` rendered.
- Seller cars DataTable/table surface rendered.
- Seller affiliates create modal preserved draft after viewport/state event.
- Seller transaction notification popover opened with `fetchesOnOpen=0`.
- Static checks found no direct `fetch()`, `location.reload()`, or `router.handleChange()` sync workaround in checked seller files.
- No horizontal overflow detected in sampled seller routes.

Images:

- API confirmed car `2` has active gallery images.
- Image list endpoint returned only active images after cleanup.
- Preview/direct URL anchor count: `0`.
- Upload queue validation was initially exercised by choosing a tiny PNG; the current upload queue auto-started and created image id `258`. Because this was created by this gate, it was immediately cleaned up through `DELETE /api/cars/2/images/258`, which soft-deleted the disposable image.
- The gate script was patched so future runs do not select files or trigger upload mutation.

Inspection:

- API for car `2` returned a published inspection report with items.
- Inspection item contract includes `template_id`, `item_name`, `item_name_snapshot`, and nested `template`.
- Seller inspection route rendered without schema mismatch or overflow.

## 7. Admin Result

Result: PASS after targeted route-gap follow-up.

- `#/admin`, `#/admin/users`, `#/admin/transactions`, `#/admin/settlements`, `#/admin/affiliate-commissions`, `#/admin/sliders`, `#/notifications`, and `#/profile` rendered.
- Admin DataTable/list surfaces rendered for users, transactions, settlements, and affiliate commissions.
- Admin affiliate finance labels rendered (`Sudah Dibayar`, `Belum Dibayar`, `Dibatalkan`).
- Notification bell rendered for logged-in admin.
- Notification popover did not trigger notification fetch on open. One nearby GET during targeted check was `/api/transactions?limit=50`, from route working data finishing around the click.
- Static checks found no direct `fetch()`, `location.reload()`, or `router.handleChange()` sync workaround in checked admin finance files.

Route-gap follow-up 2026-06-01:

- `#/admin/pending-users` is registered as an admin-only alias that reuses the existing approval queue page and preload contract.
- `#/admin/cars` is registered as an admin-only read-only listing page backed by existing `carsResource.adminList` route preload.
- No backend/API/schema change was required.

## 8. Affiliate Result

Result: PASS.

- `#/affiliate`, `#/affiliate/ledger`, `#/affiliate/settlements`, `#/profile`, and `#/notifications` rendered for `affiliate_admin`.
- Affiliate account has no visible sidebar.
- Desktop top nav rendered.
- Public affiliate route remained public and did not switch to account shell.
- Background video visible and non-blocking.
- Ledger and settlement labels rendered user-friendly finance statuses.
- No horizontal overflow in responsive matrix.

## 9. Notifications Result

Result: PASS for implemented notification components.

- Guest/public bell count: `0`.
- Logged-in buyer, seller, admin, and affiliate pages showed bells on sampled account/app routes.
- Popovers opened above page content and closed by outside/backdrop click.
- Inside popover click did not close the popover.
- Seller and affiliate popovers reported `fetchesOnOpen=0`; admin targeted request analysis showed no notification fetch on open.
- `Lihat semua notifikasi` was present in popovers.
- `#/notifications` filter stability passed for buyer. Default-role filter selectors need a more precise harness selector, but route render and static checks passed.
- Finance notification text/links were visible in affiliate popover; docs confirm `commission_accrued -> #/affiliate/ledger` and `settlement_paid -> #/affiliate/settlements`.

## 10. Affiliate Finance Result

Result: PASS non-mutating.

- Admin affiliate commissions page rendered UAT ledger data and status labels.
- Admin settlements page rendered settled/cancelled status labels.
- Affiliate ledger rendered scoped affiliate finance data with `Sudah Dibayar` and `Belum Dibayar`.
- Affiliate settlements rendered history with `Sudah Dibayar` and `Dibatalkan`.
- No duplicate ledger hint was observed.
- No finance formula/status/canon changes were made.
- No new finance mutation was executed.

Known harness gap:

- The final harness did not find the settlement detail button by generic selector, but prior browser visual smoke for the same UAT run already passed detail modal with items/history/payment metadata. No runtime patch was made.

## 11. Images Result

Result: PASS after cleanup.

- `GET /api/cars/2/images` returned active image list.
- Disposable gate-created image `258` was soft-deleted after the accidental upload.
- Direct image URL navigation anchors were not detected in seller image page.
- Static checks found no direct fetch/reload workaround in `carImagesPage.js`.

## 12. Inspection Result

Result: PASS.

- `GET /api/cars/2/inspection-report` returned published report.
- First item includes:
  - `template_id`
  - `item_name`
  - `item_name_snapshot`
  - nested `template`
- Seller inspection route rendered without overflow.

## 13. Background Video Result

Result: PASS.

- Public landing: 1 visible video, render not blocked.
- Buyer account sample: 1 visible video, render not blocked.
- Affiliate account sample: 1 visible video, render not blocked.

## 14. Responsive Matrix

Result: PASS for sampled implemented routes.

Viewports checked:

- `360`
- `390`
- `768`
- `1024`
- `1280`

Sample routes:

- landing
- public car detail
- buyer dashboard
- buyer notifications
- seller cars
- seller images
- admin affiliate commissions
- affiliate ledger
- affiliate settlements

No horizontal overflow was detected in the recorded matrix.

One route timeout occurred during a late responsive pass for `/`; the same route had already passed earlier and in other responsive samples, so this is classified as harness/server timing rather than functional failure.

## 15. SPA Stability Checks

Result: PASS for checked files.

Static checks found:

- no `location.reload()`.
- no `router.handleChange()` sync workaround.
- no direct `fetch()` in checked seller/admin/notification/affiliate page files.

Checked files include seller cars/images/inspection/affiliates/transactions, admin finance, notifications page/bell, and affiliate ledger/settlements.

## 16. Automated Test Result

- `node --check scripts/final_full_regression_gate.js`: pass.
- `php tests/run.php`: 13 passed, 0 failed.

No PHP runtime file was changed in this gate, so no new `php -l` target was required.

## 17. Bugs Found

Confirmed route gaps:

- Fixed 2026-06-01: `#/admin/pending-users` is now registered.
- Fixed 2026-06-01: `#/admin/cars` is now registered.

Verification gaps:

- Fixed 2026-06-01: buyer dashboard now visibly renders the active buyer name, so profile name sync can be visually verified on `#/buyer`.
- Final harness generic selector did not open admin settlement detail, although the prior dedicated affiliate finance browser smoke passed this area.

Harness issue:

- Initial image upload queue check accidentally triggered upload auto-start. The created disposable image was soft-deleted and the script was corrected to avoid future upload mutation.

## 18. Patches Made

Runtime patches:

- Added admin-only route alias `#/admin/pending-users`.
- Added admin-only read-only route `#/admin/cars`.
- Added visible active buyer name to `#/buyer` desktop top navigation.

Tooling/docs patches:

- Added `scripts/final_full_regression_gate.js`.
- Added this document.
- Updated `docs/KNOWN_LIMITATIONS.md`.

## 19. Remaining Risks

- Public affiliate click telemetry is a route-open mutation; it is expected by current affiliate tracking, but should be called out in future "non-mutating" browser gates.
- Admin cars route is intentionally read-only and does not add approval/archive actions beyond existing implemented surfaces.

## 20. Go / No-Go Recommendation

Recommendation: GO after targeted follow-up verification.

Reason:

- Core implemented roles/features tested cleanly.
- PHP tests are green.
- No schema/canon/finance formula issue was found.
- The two requested admin route gaps are closed with admin-only routes.
- Buyer dashboard now visibly renders the active auth user name for source-of-truth verification.
