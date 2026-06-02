## Added

- GoPay payment method for initial payment and completion payment
- QRIS payment method for initial payment and completion payment
- GoPay instruction panel with deeplink-aware CTA
- QRIS instruction panel with QR rendering and `Download QR`
- backend payment QR download endpoint for same-origin secure delivery

## Changed

- transaction detail/payment log contract now exposes reusable payment payload data for buyer payment status reopening
- public transaction result panel now shows payment-method-specific guidance
- buyer payment status page now renders method-aware instruction content instead of VA-only guidance

## Fixed

- payment status page losing QR/deeplink context after reload/navigation
- checkout/payment forms only exposing `bca_va`
- GoPay deeplink opening risk on repeated rerender by adding one-time session guard

## Known limitations

- provider real UAT for GoPay/QRIS still depends on public HTTPS callback setup
- QR bitmap generation from raw QR payload string is not implemented because current audited contract uses provider image actions

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
- Security checks: provider execution not started; code-level controls unchanged
- Issues:
  - no public HTTPS callback URL
  - no approved disposable UAT mutation set
- Result: `BLOCKED`
