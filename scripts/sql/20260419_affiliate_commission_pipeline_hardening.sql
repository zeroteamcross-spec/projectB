ALTER TABLE transactions
    ADD COLUMN affiliate_id BIGINT UNSIGNED NULL AFTER car_id,
    ADD COLUMN affiliate_referral_code_snapshot VARCHAR(50) NULL AFTER affiliate_id,
    ADD INDEX idx_transactions_affiliate_id (affiliate_id),
    ADD CONSTRAINT fk_transactions_affiliate
        FOREIGN KEY (affiliate_id) REFERENCES affiliates(id);

ALTER TABLE affiliate_commission_ledgers
    ADD COLUMN seller_user_id BIGINT UNSIGNED NULL AFTER transaction_id,
    ADD COLUMN showroom_id BIGINT UNSIGNED NULL AFTER seller_user_id,
    ADD COLUMN rule_source ENUM('global', 'car_override') NULL AFTER entry_type,
    ADD COLUMN commission_type ENUM('percent', 'flat') NULL AFTER rule_source,
    ADD COLUMN commission_value_snapshot DECIMAL(15,2) NULL AFTER commission_type,
    ADD COLUMN base_amount DECIMAL(15,2) NULL AFTER commission_value_snapshot,
    ADD COLUMN commission_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00 AFTER base_amount,
    ADD COLUMN ledger_status ENUM('pending', 'accrued', 'paid_out', 'voided') NULL AFTER amount,
    ADD COLUMN finality_event ENUM('paid') NULL AFTER ledger_status,
    ADD COLUMN updated_at DATETIME NULL AFTER created_at,
    ADD INDEX idx_affiliate_commission_ledgers_seller_user_id (seller_user_id),
    ADD INDEX idx_affiliate_commission_ledgers_showroom_id (showroom_id),
    ADD INDEX idx_affiliate_commission_ledgers_status (ledger_status),
    ADD CONSTRAINT fk_affiliate_commission_ledgers_seller
        FOREIGN KEY (seller_user_id) REFERENCES users(id),
    ADD CONSTRAINT fk_affiliate_commission_ledgers_showroom
        FOREIGN KEY (showroom_id) REFERENCES showrooms(id);

UPDATE affiliate_commission_ledgers
SET commission_amount = amount,
    ledger_status = COALESCE(ledger_status, 'accrued'),
    updated_at = COALESCE(updated_at, created_at)
WHERE commission_amount = 0.00
   OR ledger_status IS NULL
   OR updated_at IS NULL;
