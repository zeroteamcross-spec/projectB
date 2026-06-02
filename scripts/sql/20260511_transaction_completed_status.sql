-- Adds fulfillment completion status for post-payment seller handover.
-- Required before enabling PATCH /api/transactions/{id}/status with transaction_status = completed.

ALTER TABLE transactions
  MODIFY transaction_status ENUM(
    'pending_payment',
    'dp_paid',
    'paid',
    'completed',
    'expired',
    'cancelled'
  ) NOT NULL DEFAULT 'pending_payment';
