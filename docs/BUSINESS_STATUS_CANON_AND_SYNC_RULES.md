# Business Status Canon and Sync Rules

Status: confirmed and patched for runtime business-specific sync.

This document locks the current status canon found in ProjectB docs/code, records the remaining business ambiguities, and defines the patch plan for domain sync after confirmation.

Runtime business sync follows the confirmed rules in this document.

## Sources Audited

- `docs/SCHEMA_CANON.md`
- `docs/AFFILIATE_FINANCE_CANON.md`
- `docs/RUNBOOK_SETTLEMENT_BASELINE.md`
- `docs/POST_PAYMENT_100_HANDLING.md`
- `docs/SHARED_STATE_SYNC_AUDIT_AND_FIX_PLAN.md`
- `public/assets/js/utils/transactionStatus.js`

## Confirmed Canon From Existing Docs

### Listing Status

Source of truth: `cars.listing_status`.

| Status | Meaning | Visibility / Lock Rule | Sync Impact |
|---|---|---|---|
| `draft` | Listing is being prepared and is not public yet. | Hidden from public/buyer catalog. | Seller/admin cars should update; public/buyer catalog should exclude or invalidate. |
| `published` | Listing is active and available. | Visible to buyer/public and eligible for checkout. | Seller/admin/public/buyer car snapshots may need patch or invalidation. |
| `reserved` | Listing is locked by DP payment. | Buyer/public checkout should be disabled for other users. | Triggered by transaction `dp_paid`; buyer/public/seller/admin listing views must reflect reserved state. |
| `sold` | Listing is fully paid. | Not available for checkout; fulfillment/completion flow continues. | Triggered by transaction `paid`; listing views must reflect sold state. |
| `archived` | Listing is removed/soft-hidden from active workflows. | Hidden from public/buyer catalog. | Seller/admin cars update; public/buyer catalog invalidate. |

Notes:
- `POST_PAYMENT_100_HANDLING.md` lists public-facing listing states as `published`, `reserved`, `sold`, `archived`.
- `SCHEMA_CANON.md` also includes `draft`; therefore `draft` is canon for seller/admin lifecycle but not public availability.

### Payment Status

There is no separate app-level `payment_status` source-of-truth column in the canonical schema.

Canonical payment meaning is derived from `transactions.transaction_status` and payment provider logs.

| Derived Payment Meaning | Canon Transaction Status | Meaning |
|---|---|---|
| unpaid / pending | `pending_payment` | Payment has not been completed. |
| partial / DP paid | `dp_paid` | DP has been accepted; listing becomes `reserved`. |
| paid / full payment | `paid` | Full payment has been accepted; listing becomes `sold`; affiliate accrual is allowed. |
| paid + completed | `completed` | Fulfillment/handover is complete after full payment. |
| closed unpaid | `expired` | Payment window expired before completion. |
| closed/cancelled | `cancelled` | Transaction was cancelled; refund/release rules need confirmation for paid states. |

Compatibility UI labels currently seen in code include:

- `unpaid`
- `partial`
- `failed`
- `refunded`
- `pending`
- `waiting_payment`
- `dp_pending`
- `paid_confirmed`
- `processing`
- `handover`
- `done`
- `success`

These are compatibility/display states unless schema canon is expanded.

Provider statuses remain in payment logs and must not become the app source of truth for business state.

### Transaction Status

Source of truth: `transactions.transaction_status`.

| Status | Meaning | Business Side Effect |
|---|---|---|
| `pending_payment` | Transaction created and waiting for payment. | Listing remains available unless a separate hold exists. |
| `dp_paid` | DP payment accepted. | Listing becomes `reserved`. |
| `paid` | Full payment accepted. | Listing becomes `sold`; affiliate commission accrual is allowed; seller fulfillment starts. |
| `completed` | Buyer-confirmed completion after seller checklist/handover. | Listing remains `sold`; settlement is not automatically completed. |
| `expired` | Payment expired before valid payment. | Terminal for transaction; listing returns/remains `published` unless it was already locked by a paid state. |
| `cancelled` | Transaction cancelled. | Before payment, listing returns/remains `published`; after DP/full payment, listing remains locked until admin action. |

Important rule from current docs:

- `paid` does not mean settlement is done.
- `completed` does not automatically settle affiliate/admin finance.
- Cancel before payment releases the listing to `published`.
- Cancel after `dp_paid` keeps the listing `reserved` until admin release/refund action.
- Refund/cancel after `paid` keeps the listing `sold` until admin action.

### Settlement Status

Source of truth: `affiliate_settlement_batches.status`.

| Status | Meaning | Ledger Impact |
|---|---|---|
| `pending` | Settlement batch created and awaiting manual/admin completion. | Included ledgers move to `pending`. |
| `settled` | Batch has been paid out. | Included ledgers move to `paid_out`. |
| `cancelled` | Batch was cancelled. | Included ledgers return to `accrued`. |

Settlement is manual/admin-driven in the current baseline.

### Affiliate Commission Status

There are two related but different status domains.

#### Affiliate / Rule Status

Sources:

- `affiliates.status`
- `affiliate_commission_rules.status`

| Status | Meaning |
|---|---|
| `active` | Affiliate/rule can be used for future attribution/accrual. |
| `inactive` | Affiliate/rule is disabled for future usage. |

#### Commission Ledger Status

Source of truth: `affiliate_commission_ledgers.ledger_status`.

| Status | Meaning | Transition Source |
|---|---|---|
| `accrued` | Commission has been earned and is eligible for settlement. | Transaction reaches `paid`. |
| `pending` | Commission is included in a pending settlement batch. | Settlement batch created. |
| `paid_out` | Commission has been settled/paid out. | Settlement batch becomes `settled`. |
| `voided` | Commission is cancelled/reversed. | Admin correction, refund after commission accrual, or transaction cancellation after ledger was already created. |

Affiliate finance canon:

- Click/activity is telemetry, not commission source.
- Transaction attribution fields are the source of truth for commission attribution.
- Finality event for commission accrual is transaction status `paid`.
- No commission rule means no commission.
- One affiliate per transaction.

## Transition Rules

### Listing Transitions

| From | To | Trigger | Confirmed |
|---|---|---|---|
| `draft` | `published` | Seller/admin publishes listing. | Yes |
| `published` | `reserved` | Transaction becomes `dp_paid`. | Yes |
| `published` | `sold` | Transaction becomes `paid` without DP step. | Yes |
| `reserved` | `sold` | Transaction becomes `paid`. | Yes |
| `draft`/`published`/`reserved` | `archived` | Seller/admin archive action. | Yes |
| `reserved` | `reserved` | Cancellation after DP. | Yes, remains reserved until admin action |
| `sold` | `sold` | Refund/reversal after full payment. | Yes, remains sold until admin action |

### Transaction / Payment Transitions

| From | To | Trigger | Business Rule |
|---|---|---|---|
| `pending_payment` | `dp_paid` | DP accepted. | Listing becomes `reserved`. |
| `pending_payment` | `paid` | Full payment accepted. | Listing becomes `sold`; affiliate accrual allowed. |
| `dp_paid` | `paid` | Remaining payment accepted. | Listing becomes `sold`; affiliate accrual allowed. |
| `paid` | `completed` | Buyer completion confirmation after seller checklist. | No automatic settlement. |
| `pending_payment` | `expired` | Payment window expires. | Listing remains/reverts `published`. |
| `pending_payment` | `cancelled` | User/admin cancellation before payment. | Listing remains/reverts `published`. |
| `dp_paid` | `cancelled` | Cancellation after DP. | Listing remains `reserved` until admin action. |
| `paid`/`completed` | `cancelled`/`refunded` | Refund/reversal after full payment. | Listing remains `sold` until admin action. |

### Settlement / Ledger Transitions

| Event | Batch Status | Ledger Status |
|---|---|---|
| Commission accrual on transaction `paid` | none | `accrued` |
| Create settlement batch | `pending` | `pending` |
| Mark batch settled | `settled` | `paid_out` |
| Cancel batch | `cancelled` | `accrued` |
| Reverse commission after accrual | n/a | `voided` |

UI paid/unpaid label mapping:
- `accrued` = Belum Dibayar.
- `pending` = Menunggu Pembayaran.
- `paid_out` = Sudah Dibayar.
- `voided` = Dibatalkan.

Settlement mutation response should include related `ledger_ids`/`items`; otherwise frontend marks finance snapshots stale instead of guessing ledger lifecycle.

## Shared Business Sync Rules

After confirmation, business-specific mutation sync must follow these rules.

### Listing Mutations

When a listing changes status or important public listing fields:

1. Patch current page working state.
2. Patch role source snapshot when present:
   - seller cars
   - admin cars
3. Invalidate or patch dependent catalog snapshots:
   - buyer catalog
   - public catalog
   - public detail
4. Do not refetch on page open merely to hide stale data.

### Transaction / Payment Mutations

When a transaction changes status:

1. Patch transaction state for the acting role.
2. Invalidate/patch transaction snapshots for other affected roles:
   - buyer transactions
   - seller transactions
   - admin transactions
3. Apply listing status side effects only for confirmed transitions:
   - `dp_paid` -> listing `reserved`
   - `paid` -> listing `sold`
   - `completed` -> transaction only; listing remains `sold`
4. Invalidate affiliate finance snapshots when transaction becomes `paid`.
5. Cancel before payment may release listing to `published`.
6. Cancel after DP keeps listing `reserved`.
7. Refund/cancel after full payment keeps listing `sold` and only marks affiliate finance stale for correction/void handling.

### Settlement / Affiliate Finance Mutations

When settlement or ledger status changes:

1. Patch admin settlement/batch state.
2. Patch or invalidate affiliate ledger/settlement snapshots.
3. Keep transaction/listing state unchanged unless a confirmed business rule links the mutation.
4. Do not infer payment settlement from transaction `paid` or `completed`.

### Notification State

Notification state must not overwrite optimistic read state with stale poll/snapshot data.

Rules:

1. `mark read` patches bell snapshot and notifications page state.
2. `mark all read` patches bell snapshot and notifications page state.
3. Polling may merge server updates but must not resurrect locally read notifications while the mutation is pending.
4. Opening popover/page must not trigger direct fetch outside the existing notification state/service pattern.

## Runtime Patch Implemented

Files changed for this patch:

- `public/assets/js/utils/transactionStatus.js`
- `public/assets/js/state/sync/businessStatusSync.js`
- `public/assets/js/modules/seller/pages/carsPage.js`
- `public/assets/js/modules/public/pages/transactionEntryPage.js`
- `public/assets/js/modules/buyer/pages/paymentStatusPage.js`
- `public/assets/js/modules/seller/pages/transactionsPage.js`
- `public/assets/js/modules/admin/pages/settlementsPage.js`
- `docs/BUSINESS_SYNC_SANDBOX_UAT_CHECKLIST.md`

Implemented runtime rules:

- Listing mutations call `syncBusinessListing`.
- Transaction create/payment/status/fulfillment mutations call `syncBusinessTransaction`.
- Settlement status mutations call `syncBusinessSettlement`.
- Buyer/public catalogs remove cars whose listing status is no longer `published`.
- Seller/admin car snapshots patch listing status when a transaction side effect changes availability.
- Buyer/seller/admin transaction snapshots patch current-role transaction state and mark cross-role transaction snapshots stale.
- Transaction `paid` marks affiliate finance snapshots stale for accrual.
- Transaction `completed` keeps listing `sold` and does not trigger settlement.
- Settlement `settled` patches related ledgers to `paid_out` when ledger ids are present in the response.
- Settlement `cancelled` patches related ledgers to `accrued` and clears `settlement_batch_id` when ledger ids are present in the response.

## Patch Plan After Confirmation

### Phase 1 - Canon Confirmation

Status: completed.

Acceptance criteria:

- Business status canon is documented.
- Ambiguous transitions are explicitly listed.
- No business-specific runtime sync patch is applied before confirmation.

### Phase 2 - Business Status Helper

Status: completed.

Created/extended:

- `public/assets/js/utils/transactionStatus.js`
- `public/assets/js/state/sync/businessStatusSync.js`

Candidate location:

- `public/assets/js/utils/transactionStatus.js`

Candidate exports:

- canonical listing status list
- canonical transaction status list
- derived payment status mapper
- listing side-effect mapper for transaction status
- affiliate finance side-effect mapper for transaction status

Acceptance criteria:

- No schema change.
- No new dependency.
- Existing compatibility UI statuses still render.
- Canon logic is centralized and tested with `node --check`.

### Phase 3 - Listing / Car Sync Patch

Status: completed for seller create/update/archive and transaction-driven listing side effects.

Acceptance criteria:

- Seller edits/archive/publish reflect in seller list immediately.
- Buyer/public catalog no longer shows stale sold/archived/published data after mutation.
- No fetch-classic workaround on page open.

### Phase 4 - Transaction / Payment Sync Patch

Status: completed for public create, buyer payment/status completion, and seller fulfillment checklist mutation.

Acceptance criteria:

- `dp_paid` patches transaction and listing `reserved`.
- `paid` patches transaction and listing `sold`.
- `completed` patches transaction without changing settlement.
- Cross-role transaction snapshots are patched/invalidated.
- Refund/cancel edge transitions are not guessed.

### Phase 5 - Settlement / Affiliate Finance Sync Patch

Status: completed for admin settlement status mutation when response includes settlement/ledger ids.

Acceptance criteria:

- Admin settlement actions update admin state.
- Affiliate ledger/settlement pages reflect changed ledger lifecycle.
- Batch `cancelled` restores ledgers to `accrued` only if confirmed by backend response or policy.

### Phase 6 - Notification Overwrite Regression

Keep and extend notification stale-overwrite checks.

Acceptance criteria:

- `mark read` updates badge/page consistently.
- `mark all read` updates badge/page consistently.
- Polling does not overwrite pending local read state.

## Confirmation Decisions Applied

1. `draft` is accepted as seller/admin listing lifecycle status; public availability starts at `published`.
2. `pending_payment` expired/cancelled returns/remains `published`.
3. Cancel after `dp_paid` keeps listing `reserved` until admin action.
4. Refund/cancel after `paid` keeps listing `sold` until admin action.
5. `completed` always keeps listing `sold`.
6. `voided` is for admin correction, refund after accrual, or cancellation after ledger was already created.
7. Affiliate commission lifecycle is `accrued -> pending -> paid_out`; `eligible` is derived, not a DB status.
8. Settlement `cancelled` returns included ledgers to `accrued`, not `pending` or `voided`.
9. Inactive affiliate/rule affects future accruals and must not mutate existing ledgers unless a separate admin correction is performed.
10. Transaction `completed` is fulfillment-only and does not trigger affiliate/settlement side effects.

## Current Decision Gate

Confirmed and implemented:

- `dp_paid` implies listing `reserved`.
- `paid` implies listing `sold` and affiliate accrual eligibility.
- `completed` is fulfillment completion, keeps listing `sold`, and is not settlement.
- Settlement batch lifecycle is manual: `pending`, `settled`, `cancelled`.
- Ledger lifecycle is `accrued`, `pending`, `paid_out`; `voided` is reserved for correction/refund/reversal after accrual.

Still requires backend/API payload awareness:

- Applying ledger status patch depends on the settlement response including `ledger_ids`, `ledgerIds`, `ledgers`, or `items`.
- If a mutation response only returns a partial entity without ids, ProjectB marks related snapshots stale rather than guessing hidden related records.
- Mutating browser verification must use sandbox/mock-only checklist in `BUSINESS_SYNC_SANDBOX_UAT_CHECKLIST.md`.
- Sandbox/mock-only browser UAT passed 10/10 scenarios on 2026-05-18. Provider/payment-real UAT remains a separate later gate.

## Project Boundaries

- `projectA` remains read-only.
- Runtime sync patch is limited to ProjectB frontend state/cache behavior.
- No schema or backend business transition was changed by this patch.
