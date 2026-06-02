# Payment Provider Real UAT Runbook

Status: pre-UAT gate.

Do not run real provider/payment UAT until every prerequisite in this runbook is completed and signed off.

Additional gate: `docs/INTERNAL_HARDENING_AND_ROLE_REGRESSION_GATE.md` must pass before this provider UAT starts.

This runbook is for provider sandbox/UAT credentials and disposable ProjectB records only. It is not a production payment runbook.

## Purpose

Validate the end-to-end payment provider flow after sandbox/mock frontend sync has passed:

- provider payment creation
- provider callback/webhook
- transaction status update
- listing lock/status sync
- notification trigger/update
- affiliate accrual after full payment
- cross-role frontend state/cache invalidation

## Non-Negotiable Safety Rules

- Do not use production provider credentials.
- Do not use real buyer/seller/listing/affiliate business records.
- Do not use real bank/payment settlement records.
- Do not run against production database.
- Do not run without callback logging enabled.
- Do not run without rollback/reset plan.
- Every tested transaction must be explicitly approved as disposable.

## Required Sign-Off

| Item | Status | Owner | Notes |
|---|---|---|---|
| Disposable buyer account ready | [ ] |  |  |
| Disposable seller account ready | [ ] |  |  |
| Disposable listing/car ready | [ ] |  |  |
| Disposable affiliate/referral ready if testing accrual | [ ] |  |  |
| Provider sandbox credential configured | [ ] |  |  |
| Public HTTPS callback URL configured | [ ] |  |  |
| Callback/webhook log active | [ ] |  |  |
| Rollback/reset script ready | [ ] |  |  |
| DB is disposable or snapshot backup exists | [ ] |  |  |
| Tested transaction ids approved for status changes | [ ] |  |  |
| Notification checklist accepted | [ ] |  |  |
| Listing lock checklist accepted | [ ] |  |  |
| Affiliate accrual checklist accepted | [ ] |  |  |

## Environment Checklist

### Application

| Requirement | Value / Evidence | Status |
|---|---|---|
| ProjectB environment name |  | [ ] |
| Base app URL |  | [ ] |
| API base URL |  | [ ] |
| Database name / DSN alias |  | [ ] |
| Build/version/commit under test |  | [ ] |
| Error logging enabled |  | [ ] |
| Frontend console monitored |  | [ ] |
| Backend logs monitored |  | [ ] |

### Provider Sandbox

| Requirement | Value / Evidence | Status |
|---|---|---|
| Provider name |  | [ ] |
| Sandbox merchant/client id |  | [ ] |
| Sandbox server key configured |  | [ ] |
| Sandbox client key configured |  | [ ] |
| Signature verification enabled |  | [ ] |
| Callback/webhook endpoint path |  | [ ] |
| Provider dashboard webhook URL |  | [ ] |
| Payment methods to test | `bca_va`, `gopay`, `qris` (and others if in scope) | [ ] |

Never paste secret keys into this document. Record only masked ids or config variable names.

### Public HTTPS Callback URL

Provider callbacks require a public HTTPS URL.

| Requirement | Value / Evidence | Status |
|---|---|---|
| HTTPS URL |  | [ ] |
| URL forwards to local/UAT app |  | [ ] |
| SSL valid |  | [ ] |
| Provider can reach endpoint |  | [ ] |
| Callback endpoint returns expected 2xx |  | [ ] |
| Callback endpoint logs request id/body safely |  | [ ] |

Suggested callback log fields:

- timestamp
- provider event id / order id
- transaction id / transaction code
- provider transaction status
- signature verification result
- mapped ProjectB transaction status
- HTTP response status
- error message if any

## Disposable Data Setup

### Buyer

| Field | Value |
|---|---|
| user id |  |
| name |  |
| email |  |
| role | buyer |
| allowed for mutation | [ ] yes |

### Seller

| Field | Value |
|---|---|
| user id |  |
| showroom id |  |
| name |  |
| email |  |
| role | seller |
| allowed for mutation | [ ] yes |

### Listing / Car

| Field | Value |
|---|---|
| car id |  |
| seller id |  |
| initial `listing_status` | `published` |
| expected after DP | `reserved` |
| expected after full payment | `sold` |
| allowed for mutation | [ ] yes |

### Affiliate

Use only if testing affiliate accrual.

| Field | Value |
|---|---|
| affiliate id |  |
| referral code / slug |  |
| commission rule id |  |
| rule type/value |  |
| initial ledger count |  |
| allowed for mutation | [ ] yes |

## Transaction Records Under Test

| Scenario | Transaction ID | Initial Status | Expected Final Status | Listing ID | Allowed to Change |
|---|---:|---|---|---:|---|
| DP payment |  | `pending_payment` | `dp_paid` |  | [ ] |
| Full payment |  | `pending_payment` or `dp_paid` | `paid` |  | [ ] |
| Provider failure/expiry if tested |  | `pending_payment` | `expired` / provider mapped status |  | [ ] |

## Rollback / Reset Plan

Choose one:

- [ ] Disposable database can be dropped/reseeded.
- [ ] DB snapshot backup exists before test.
- [ ] Reset SQL/script exists for tested records only.

Required reset coverage:

- transaction rows
- transaction payment logs
- car/listing status
- notification rows
- affiliate commission ledger rows
- settlement batch rows if created
- cache/session cleanup if needed

Reset command/script:

```txt
TBD
```

Rollback verification:

- [ ] Tested transactions removed or reset.
- [ ] Listing returned to known disposable state.
- [ ] Notifications removed/reset.
- [ ] Affiliate ledger removed/reset.
- [ ] Provider sandbox transaction history documented.

## UAT Scenario A - DP Payment

Goal: provider callback maps transaction to `dp_paid` and listing to `reserved`.

Steps:

1. Login as disposable buyer.
2. Open disposable published listing.
3. Create transaction with DP payment.
4. Complete provider sandbox payment.
5. Wait for HTTPS callback.
6. Confirm callback log is recorded.
7. Open buyer transaction detail.
8. Open seller transactions.
9. Open seller cars.
10. Open buyer/public catalog.
11. Open notification bell/page for buyer and seller.

Expected:

- Transaction status becomes `dp_paid`.
- Listing status becomes `reserved`.
- Buyer/public catalog no longer offers the listing as available.
- Seller cars still shows the listing and status `reserved`.
- Buyer transaction shows DP paid.
- Seller transaction shows DP paid / waiting settlement or next payment as applicable.
- Notification is created/visible if trigger exists.
- No affiliate ledger accrual yet unless business rule says DP accrues commission, which current canon does not.

Result:

- [ ] Pass
- [ ] Fail
- Callback log id:
- Notes:

### Optional method coverage inside Scenario A/B

Tambahkan variasi metode berikut jika memang termasuk scope release:

- [ ] GoPay pending -> paid/DP paid
- [ ] QRIS pending -> paid/DP paid
- [ ] GoPay deeplink tersedia di mobile
- [ ] QRIS QR tampil
- [ ] QRIS `Download QR` berhasil mengunduh file image
- [ ] Buyer status page tetap bisa membuka ulang QR/deeplink setelah page dibuka ulang

## UAT Scenario B - Full Payment

Goal: provider callback maps transaction to `paid`, listing to `sold`, and affiliate accrual is created if attribution/rule exists.

Steps:

1. Login as disposable buyer.
2. Open disposable published/reserved listing.
3. Create or continue full payment transaction.
4. Complete provider sandbox full payment.
5. Wait for HTTPS callback.
6. Confirm callback log is recorded.
7. Open buyer transaction detail.
8. Open seller transactions.
9. Open admin transactions.
10. Open seller cars.
11. Open buyer/public catalog.
12. Open affiliate ledger if referral is part of the scenario.
13. Open notification bell/page for buyer, seller, admin/affiliate if relevant.

Expected:

- Transaction status becomes `paid`.
- Listing status becomes `sold`.
- Buyer/public catalog no longer offers the listing as available.
- Seller cars still shows the listing and status `sold`.
- Buyer/seller/admin transactions show consistent `paid` state.
- Affiliate ledger becomes `accrued` only when transaction has valid affiliate attribution and active rule.
- Settlement is not automatically `settled`.
- Notifications are created/updated according to existing triggers.

Result:

- [ ] Pass
- [ ] Fail
- Callback log id:
- Ledger id if created:
- Notes:

## UAT Scenario C - Expired / Failed Provider Status

Run only if provider sandbox supports deterministic expiry/failure without waiting too long.

Goal: failed/expired provider status does not incorrectly mark listing sold/reserved.

Steps:

1. Create disposable transaction.
2. Trigger provider sandbox expiry/failure.
3. Wait for callback or status sync.
4. Check transaction/listing/catalog.

Expected:

- Transaction maps to confirmed backend status.
- If transaction never reached paid/DP, listing remains or returns `published`.
- Buyer/public catalog can show listing again after refresh/preload.
- No affiliate accrual.

Result:

- [ ] Pass
- [ ] Fail
- Callback log id:
- Notes:

## Notification Checklist

Verify after each relevant payment status change:

- [ ] Buyer receives/loads payment status notification if trigger exists.
- [ ] Seller receives/loads transaction update notification if trigger exists.
- [ ] Admin receives/loads monitoring notification if trigger exists.
- [ ] Affiliate receives/loads accrual notification if trigger exists.
- [ ] Bell unread count updates.
- [ ] `#/notifications` shows the new notification.
- [ ] Mark read / mark all read still syncs badge and page.

## Listing Lock Checklist

Verify after each payment transition:

- [ ] `dp_paid` listing is `reserved`.
- [ ] `paid` listing is `sold`.
- [ ] `completed` listing remains `sold`.
- [ ] Buyer/public catalog does not allow checkout for `reserved`.
- [ ] Buyer/public catalog does not allow checkout for `sold`.
- [ ] Seller cars still shows reserved/sold item.
- [ ] Admin cars reflects reserved/sold after refresh/preload.

## Affiliate Accrual Checklist

Run only with disposable affiliate attribution and rule.

- [ ] Transaction has exactly one affiliate attribution.
- [ ] Active commission rule exists.
- [ ] No ledger exists before full payment.
- [ ] Ledger is created after transaction reaches `paid`.
- [ ] Ledger status is `accrued`.
- [ ] Ledger amount matches rule snapshot.
- [ ] Ledger does not become `pending` until settlement batch is created.
- [ ] Ledger does not become `paid_out` until settlement is marked `settled`.
- [ ] Refund/correction flow is not tested unless a dedicated disposable correction scenario exists.

## Cross-Role Frontend Sync Checklist

After each successful callback:

- [ ] Buyer transaction page reflects latest status without browser reload after state refresh/navigation.
- [ ] Seller transaction page reflects latest status or related snapshot is stale and refreshes through existing loader.
- [ ] Admin transaction page reflects latest status or related snapshot is stale and refreshes through existing loader.
- [ ] Seller cars reflects listing status.
- [ ] Buyer/public catalog no longer shows locked/sold listing as available.
- [ ] Affiliate ledger/settlement pages reflect accrual or stale-refresh correctly.
- [ ] No page uses full reload as sync mechanism.

## Evidence To Attach

For every run, collect:

- callback log id(s)
- transaction id(s)
- car id(s)
- ledger id(s), if any
- screenshots:
  - buyer transaction
  - seller transaction
  - seller cars listing status
  - buyer/public catalog availability
  - affiliate ledger, if any
  - notifications page/bell
- relevant local/browser console errors
- backend log excerpt with secrets redacted

## Exit Criteria

Provider/payment UAT can be considered passed only if:

- [ ] All required sign-off items are checked.
- [ ] DP scenario passes, if DP is in scope.
- [ ] Full payment scenario passes.
- [ ] Listing lock rules pass.
- [ ] Notifications pass or documented as trigger-not-enabled.
- [ ] Affiliate accrual passes if affiliate attribution is in scope.
- [ ] Rollback/reset verified.
- [ ] No real business data was mutated.
- [ ] No provider production credential was used.

## Next Gate

After this sandbox provider UAT passes, the next step is a controlled staging/UAT run with:

- explicit data owner approval
- rollback window
- monitoring owner assigned
- payment provider sandbox dashboard open
- no production credential or production database

## GoPay/QRIS Provider Sandbox UAT Result

- Date: 2026-06-01
- Environment: local
- APP_URL: `http://localhost:8000`
- MIDTRANS_CALLBACK_URL: `http://localhost:8000/api/payments/midtrans/callbacks`
- UAT run id: `<NOT_CREATED>`
- GoPay transaction id: `<NOT_CREATED>`
- QRIS transaction id: `<NOT_CREATED>`
- GoPay desktop: `BLOCKED`
- GoPay mobile deeplink: `BLOCKED`
- QRIS display: `BLOCKED`
- QRIS download: `BLOCKED`
- Callback status mapping: `BLOCKED`
- Cross-role sync: `BLOCKED`
- Security checks:
  - signature verification config still `true`
  - provider sandbox execution not started because HTTPS callback prerequisite failed
- Issues:
  - production-style readiness check failed with blocker `Production Midtrans callback URL must use HTTPS.`
  - no approved disposable transaction set for UAT mutation was recorded
- Result: `BLOCKED`
