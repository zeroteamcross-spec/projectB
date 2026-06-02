# Business Sync Sandbox UAT Checklist

Status: sandbox/mock-only verification plan.

Do not run these scenarios against real production/business data. This checklist is for browser smoke tests using seeded sandbox data, local mock responses, or disposable test records only.

Latest run: 2026-05-18, browser-runtime mock via Playwright against local `app.html`.

Run summary:

- Total scenarios: 10
- Passed: 10
- Failed: 0
- Runtime mutation API calls: 0
- Notes: app boot issued normal GET preload/autologin/catalog requests. No real POST/PATCH/DELETE business mutation was called.

## Scope

Verify runtime sync for:

- listing/car status
- transaction/payment status
- settlement status
- affiliate ledger status
- cross-role preload snapshot/cache invalidation

This UAT validates frontend state behavior after successful mutations. It does not change backend business rules.

## Safety Rules

- Use local/dev environment only.
- Use disposable sandbox accounts only.
- Use seeded cars/transactions/settlements that can be reset.
- Prefer mocked API responses when verifying edge transitions like refund/cancel after payment.
- Do not use live payment provider callbacks.
- Do not use real buyer, seller, admin, or affiliate finance records.
- Do not settle or cancel real settlement batches.
- Capture before/after state from `appStore`, `localStorage`, and UI.

## Required Sandbox Accounts

| Role | Account | Purpose |
|---|---|---|
| buyer | sandbox buyer | buyer transaction/payment pages and buyer catalog |
| seller | sandbox seller | seller cars and seller transactions |
| admin | sandbox admin | admin cars, transactions, settlements |
| affiliate_admin | sandbox affiliate | ledger and settlement visibility |

Use existing seeded smoke accounts if available. If seeded accounts are missing, create disposable records first and document their ids.

## Required Sandbox Records

| Record | Required Fields | Purpose |
|---|---|---|
| Car A | `listing_status=published` | transaction `pending_payment -> dp_paid` |
| Car B | `listing_status=published` | transaction `pending_payment -> paid` |
| Car C | `listing_status=reserved` | cancelled after DP rule |
| Car D | `listing_status=sold` | refunded/cancelled after paid rule |
| Transaction A | `pending_payment`, linked to Car A | DP paid flow |
| Transaction B | `pending_payment`, linked to Car B | full paid flow |
| Transaction C | `dp_paid`, linked to Car C | cancel after DP flow |
| Transaction D | `paid`, linked to Car D | completed/refund edge flow |
| Settlement A | `pending`, includes Ledger A | settled flow |
| Settlement B | `pending`, includes Ledger B | cancelled flow |
| Ledger A | `pending`, settlement batch A | should become `paid_out` |
| Ledger B | `pending`, settlement batch B | should become `accrued` |

## Mock API Response Requirements

When using mocked responses, include enough ids for frontend sync:

### Transaction Mutation Response

```json
{
  "transaction": {
    "id": 101,
    "car_id": 201,
    "transaction_status": "dp_paid",
    "car": {
      "id": 201,
      "listing_status": "published"
    }
  }
}
```

### Settlement Mutation Response

```json
{
  "settlement": {
    "id": 301,
    "status": "cancelled",
    "ledger_ids": [401]
  }
}
```

If the response does not include related ids, expected behavior is stale invalidation only, not local patch of hidden related records.

## Browser Setup

1. Start local ProjectB app.
2. Open browser devtools.
3. Before each scenario, clear only sandbox app cache if needed:

```js
Object.keys(localStorage)
  .filter((key) => key.startsWith("projectB:spa:v1:"))
  .forEach((key) => localStorage.removeItem(key));
```

4. Login with the role required by the scenario.
5. Confirm route preloads are hydrated before mutation.
6. Record current state:

```js
window.__uatBefore = {
  snapshot: structuredClone(window.appStore?.getState?.()?.snapshot ?? {}),
  working: structuredClone(window.appStore?.getState?.()?.working ?? {}),
  cacheKeys: Object.keys(localStorage).filter((key) => key.startsWith("projectB:spa:v1:")),
};
```

If `window.appStore` is not exposed, verify through UI and `localStorage` only, or temporarily expose it in local sandbox tooling outside production code.

## Scenario 1 - Listing Becomes Reserved After DP Paid

Goal: verify `dp_paid -> listing reserved`.

Steps:

1. Login as buyer.
2. Open `#/buyer/transactions/:id` for Transaction A.
3. Trigger sandbox/mock mutation that returns `transaction_status=dp_paid`.
4. Navigate to `#/buyer/transactions`.
5. Login as seller or switch role in sandbox.
6. Open `#/seller/cars`.
7. Open buyer/public catalog.

Expected:

- Buyer transaction shows `DP Dibayar`.
- Seller transaction snapshot is stale or patched.
- Admin transaction snapshot is stale or patched.
- Seller cars still contains Car A.
- Seller cars shows Car A as `reserved`.
- Buyer/public catalog does not show Car A as available.
- `projectB:spa:v1:buyer.catalog` and `projectB:spa:v1:public.catalog` do not keep Car A as active published item, or are marked stale.

Result:

- [x] Pass
- [ ] Fail
- Notes: Seller/admin listing became `reserved`; buyer/public catalog removed the reserved car from active available items.

## Scenario 2 - Listing Becomes Sold After Full Paid

Goal: verify `paid -> listing sold` and affiliate finance invalidation.

Steps:

1. Login as buyer.
2. Open `#/buyer/transactions/:id` for Transaction B.
3. Trigger sandbox/mock mutation that returns `transaction_status=paid`.
4. Navigate to `#/buyer/transactions`.
5. Login as seller, open `#/seller/cars`.
6. Login as admin, open `#/admin/transactions`.
7. Login as affiliate, open `#/affiliate/ledger`.

Expected:

- Buyer transaction shows paid/lunas state.
- Seller cars shows Car B as `sold`.
- Buyer/public catalog does not show Car B as available.
- Seller/admin transaction snapshots are stale or patched.
- Affiliate ledger/settlement snapshots are marked stale for accrual.
- No settlement status changes automatically.

Result:

- [x] Pass
- [ ] Fail
- Notes: Seller listing became `sold`; derived payment became `paid`; affiliate ledger/settlement snapshots were marked stale.

## Scenario 3 - Completed Keeps Listing Sold

Goal: verify `completed` is fulfillment-only.

Steps:

1. Login as buyer.
2. Open Transaction D in `paid` state.
3. Trigger sandbox/mock mutation that returns `transaction_status=completed`.
4. Open seller cars and admin transactions.

Expected:

- Transaction shows `completed`.
- Listing remains `sold`.
- Buyer/public catalog still does not show the car as available.
- Affiliate settlement snapshots are not treated as settled only because transaction is completed.

Result:

- [x] Pass
- [ ] Fail
- Notes: Transaction became `completed`; seller listing remained `sold`.

## Scenario 4 - Cancel Before Paid Releases Listing

Goal: verify `pending_payment -> cancelled/expired` returns listing to `published`.

Steps:

1. Use Transaction A-like sandbox record still in `pending_payment`.
2. Trigger sandbox/mock mutation returning `transaction_status=cancelled`.
3. Open seller cars.
4. Open buyer/public catalog.

Expected:

- Transaction shows cancelled.
- Listing is `published`.
- Buyer/public catalog may show the car again after stale refresh or patched catalog update.
- Seller/admin transaction snapshots are stale or patched.

Result:

- [x] Pass
- [ ] Fail
- Notes: Cancelled `pending_payment` transaction kept/released listing as `published`.

## Scenario 5 - Cancel After DP Keeps Reserved

Goal: verify cancellation after DP does not auto-release listing.

Steps:

1. Use Transaction C with previous/current status `dp_paid`.
2. Trigger sandbox/mock mutation returning `transaction_status=cancelled`.
3. Open seller cars.
4. Open buyer/public catalog.

Expected:

- Transaction shows cancelled.
- Listing remains `reserved`.
- Buyer/public catalog does not show the car as available.
- Admin action is still required for release/refund.

Result:

- [x] Pass
- [ ] Fail
- Notes: Cancelled transaction after `dp_paid` kept listing `reserved`; buyer catalog did not show it as available.

## Scenario 6 - Refunded After Paid Keeps Sold

Goal: verify refund/cancel after full payment does not reopen listing.

Steps:

1. Use Transaction D with previous/current status `paid`.
2. Trigger sandbox/mock mutation returning `transaction_status=refunded` or `cancelled`.
3. Open seller cars.
4. Open buyer/public catalog.
5. Open affiliate ledger.

Expected:

- Transaction shows refunded/cancelled.
- Listing remains `sold`.
- Buyer/public catalog does not show the car as available.
- Affiliate finance snapshots are stale for correction/void review.
- No automatic ledger `voided` unless backend returns a ledger mutation or admin correction is performed.

Result:

- [x] Pass
- [ ] Fail
- Notes: Refunded transaction after `paid` kept listing `sold`; affiliate finance snapshots were marked stale for correction/void review.

## Scenario 7 - Settlement Settled Updates Ledger Paid Out

Goal: verify `settled -> paid_out`.

Steps:

1. Login as admin.
2. Open `#/admin/settlements`.
3. Use Settlement A with Ledger A.
4. Trigger sandbox/mock status update to `settled` with response containing `ledger_ids`.
5. Login as affiliate.
6. Open `#/affiliate/ledger` and `#/affiliate/settlements`.

Expected:

- Admin settlement shows `settled`.
- Affiliate settlement snapshot is stale or patched.
- Affiliate ledger Ledger A shows `paid_out` if present in current snapshot.
- No transaction/listing state changes.

Result:

- [x] Pass
- [ ] Fail
- Notes: Settlement became `settled`; related ledger became `paid_out` when `ledger_ids` was present in the mock response.

## Scenario 8 - Settlement Cancelled Returns Ledger Accrued

Goal: verify `cancelled -> accrued`.

Steps:

1. Login as admin.
2. Open `#/admin/settlements`.
3. Use Settlement B with Ledger B.
4. Trigger sandbox/mock status update to `cancelled` with response containing `ledger_ids`.
5. Login as affiliate.
6. Open `#/affiliate/ledger` and `#/affiliate/settlements`.

Expected:

- Admin settlement shows `cancelled`.
- Ledger B returns to `accrued`.
- `settlement_batch_id` is cleared locally if the ledger was present in snapshot.
- Ledger does not become `voided`.
- No transaction/listing state changes.

Result:

- [x] Pass
- [ ] Fail
- Notes: Settlement became `cancelled`; related ledger returned to `accrued` and `settlement_batch_id` was cleared locally.

## Scenario 9 - Cross-Role Snapshot Verification

Goal: verify stale/patch behavior across role snapshots.

After transaction/listing mutations, inspect:

```js
[
  "projectB:spa:v1:buyer.transactions",
  "projectB:spa:v1:seller.transactions",
  "projectB:spa:v1:admin.transactions",
  "projectB:spa:v1:buyer.catalog",
  "projectB:spa:v1:public.catalog",
  "projectB:spa:v1:seller.cars",
  "projectB:spa:v1:admin.cars",
  "projectB:spa:v1:affiliate_admin.ledgerActivity",
  "projectB:spa:v1:affiliate_admin.settlementActivity"
].map((key) => [key, JSON.parse(localStorage.getItem(key) || "null")]);
```

Expected:

- Owning role cache is patched when response contains full entity.
- Related role cache is marked `stale` when response is partial.
- Buyer/public catalog does not retain unavailable cars as active published items.
- No full page reload is required for sync.

Result:

- [x] Pass
- [ ] Fail
- Notes: Seller/admin transaction snapshots were marked stale; seller cars cache was written; buyer catalog cache did not retain sold car as available.

## Scenario 10 - No Fetch-On-Open Regression

Goal: verify sync patch did not add page-open fetch workaround.

Steps:

1. Open browser network tab.
2. Open buyer notification popover, buyer transactions, seller cars, admin settlements after preload.
3. Trigger no mutation.
4. Observe network.

Expected:

- No new fetch is triggered only to mask stale state.
- Normal route loaders/preload/polling may still run according to existing lifecycle.

Result:

- [x] Pass
- [ ] Fail
- Notes: Verified through mocked module-level browser execution. Business sync helpers did not call fetch/API directly; normal app boot preload GET requests still occurred.

## Final Sign-Off Checklist

- [x] Browser smoke transaction sandbox/mock completed.
- [x] Browser smoke settlement sandbox/mock completed.
- [x] Buyer/public catalog verified after listing becomes `reserved`.
- [x] Buyer/public catalog verified after listing becomes `sold`.
- [x] Seller cars verified for `reserved` item.
- [x] Seller cars verified for `sold` item.
- [x] Admin cars snapshot verified after listing mutation.
- [x] Admin transactions snapshot verified after transaction mutation.
- [x] Affiliate ledger verified after settlement `settled`.
- [x] Affiliate ledger verified after settlement `cancelled`.
- [x] No real business data was mutated.
- [x] No production/live payment callback was used.

## Known Limitations

- If the backend mutation response does not include related entity ids, frontend sync marks dependent snapshots stale instead of patching unknown records.
- Ledger patching after settlement update requires `ledger_ids`, `ledgerIds`, `ledgers`, or `items` in the settlement response.
- Refund/correction ledger `voided` should be tested only after a dedicated admin correction/mock endpoint exists.

## Next Gate

Before provider/payment UAT with real sandbox callbacks, use:

- `docs/PAYMENT_PROVIDER_REAL_UAT_RUNBOOK.md`

Do not run provider/payment UAT until disposable data, sandbox credentials, public HTTPS callback URL, callback logs, rollback/reset plan, and transaction-change approval are all documented.
