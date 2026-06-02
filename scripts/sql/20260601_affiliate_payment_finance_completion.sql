ALTER TABLE affiliate_settlement_batches
    ADD COLUMN settlement_code VARCHAR(100) NULL AFTER id,
    ADD COLUMN affiliate_user_id BIGINT UNSIGNED NULL AFTER affiliate_id,
    ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'IDR' AFTER requested_amount,
    ADD COLUMN payment_method VARCHAR(80) NULL AFTER status,
    ADD COLUMN payment_reference VARCHAR(160) NULL AFTER payment_method,
    ADD COLUMN payment_note TEXT NULL AFTER payment_reference,
    ADD COLUMN proof_file_url TEXT NULL AFTER payment_note,
    ADD COLUMN period_start DATE NULL AFTER proof_file_url,
    ADD COLUMN period_end DATE NULL AFTER period_start,
    ADD COLUMN requested_by BIGINT UNSIGNED NULL AFTER period_end,
    ADD COLUMN approved_by BIGINT UNSIGNED NULL AFTER requested_by,
    ADD COLUMN paid_by BIGINT UNSIGNED NULL AFTER approved_by,
    ADD COLUMN cancelled_by BIGINT UNSIGNED NULL AFTER paid_by,
    ADD COLUMN deleted_at DATETIME NULL AFTER updated_at,
    ADD UNIQUE KEY uniq_affiliate_settlement_batches_code (settlement_code),
    ADD INDEX idx_affiliate_settlement_batches_affiliate_user_id (affiliate_user_id),
    ADD CONSTRAINT fk_affiliate_settlement_batches_affiliate_user
        FOREIGN KEY (affiliate_user_id) REFERENCES users(id),
    ADD CONSTRAINT fk_affiliate_settlement_batches_requested_by
        FOREIGN KEY (requested_by) REFERENCES users(id),
    ADD CONSTRAINT fk_affiliate_settlement_batches_approved_by
        FOREIGN KEY (approved_by) REFERENCES users(id),
    ADD CONSTRAINT fk_affiliate_settlement_batches_paid_by
        FOREIGN KEY (paid_by) REFERENCES users(id),
    ADD CONSTRAINT fk_affiliate_settlement_batches_cancelled_by
        FOREIGN KEY (cancelled_by) REFERENCES users(id);

UPDATE affiliate_settlement_batches AS b
INNER JOIN affiliates AS a ON a.id = b.affiliate_id
SET b.settlement_code = COALESCE(b.settlement_code, CONCAT('AFS-', DATE_FORMAT(b.created_at, '%Y%m%d'), '-', b.id)),
    b.affiliate_user_id = COALESCE(b.affiliate_user_id, a.user_id),
    b.payment_note = COALESCE(b.payment_note, b.notes)
WHERE b.deleted_at IS NULL;

ALTER TABLE affiliate_commission_ledgers
    ADD COLUMN affiliate_user_id BIGINT UNSIGNED NULL AFTER affiliate_id,
    ADD COLUMN buyer_user_id BIGINT UNSIGNED NULL AFTER showroom_id,
    ADD COLUMN source_type VARCHAR(80) NULL AFTER buyer_user_id,
    ADD COLUMN source_id VARCHAR(120) NULL AFTER source_type,
    ADD COLUMN currency CHAR(3) NOT NULL DEFAULT 'IDR' AFTER amount,
    ADD COLUMN status_reason VARCHAR(255) NULL AFTER ledger_status,
    ADD COLUMN settlement_id BIGINT UNSIGNED NULL AFTER status_reason,
    ADD COLUMN accrued_at DATETIME NULL AFTER finality_event,
    ADD COLUMN pending_at DATETIME NULL AFTER accrued_at,
    ADD COLUMN paid_out_at DATETIME NULL AFTER pending_at,
    ADD COLUMN voided_at DATETIME NULL AFTER paid_out_at,
    ADD COLUMN deleted_at DATETIME NULL AFTER updated_at,
    ADD INDEX idx_affiliate_commission_ledgers_affiliate_user_id (affiliate_user_id),
    ADD INDEX idx_affiliate_commission_ledgers_settlement_id (settlement_id),
    ADD INDEX idx_affiliate_commission_ledgers_source (source_type, source_id),
    ADD UNIQUE KEY uniq_affiliate_commission_ledgers_accrual_source (transaction_id, affiliate_id, source_type, source_id),
    ADD CONSTRAINT fk_affiliate_commission_ledgers_affiliate_user
        FOREIGN KEY (affiliate_user_id) REFERENCES users(id),
    ADD CONSTRAINT fk_affiliate_commission_ledgers_buyer
        FOREIGN KEY (buyer_user_id) REFERENCES users(id),
    ADD CONSTRAINT fk_affiliate_commission_ledgers_settlement
        FOREIGN KEY (settlement_id) REFERENCES affiliate_settlement_batches(id);

UPDATE affiliate_commission_ledgers AS l
INNER JOIN affiliates AS a ON a.id = l.affiliate_id
LEFT JOIN transactions AS t ON t.id = l.transaction_id
SET l.affiliate_user_id = COALESCE(l.affiliate_user_id, a.user_id),
    l.buyer_user_id = COALESCE(l.buyer_user_id, t.buyer_user_id),
    l.source_type = COALESCE(l.source_type, CASE WHEN l.transaction_id IS NULL THEN NULL ELSE 'transaction' END),
    l.source_id = COALESCE(l.source_id, CASE WHEN l.transaction_id IS NULL THEN NULL ELSE CAST(l.transaction_id AS CHAR) END),
    l.accrued_at = COALESCE(l.accrued_at, CASE WHEN l.ledger_status = 'accrued' THEN l.created_at ELSE NULL END),
    l.pending_at = COALESCE(l.pending_at, CASE WHEN l.ledger_status = 'pending' THEN l.updated_at ELSE NULL END),
    l.paid_out_at = COALESCE(l.paid_out_at, CASE WHEN l.ledger_status = 'paid_out' THEN l.updated_at ELSE NULL END)
WHERE l.deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS affiliate_settlement_histories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    settlement_id BIGINT UNSIGNED NOT NULL,
    from_status VARCHAR(30) NULL,
    to_status VARCHAR(30) NOT NULL,
    note TEXT NULL,
    actor_user_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_affiliate_settlement_histories_settlement_id (settlement_id),
    INDEX idx_affiliate_settlement_histories_actor_user_id (actor_user_id),
    CONSTRAINT fk_affiliate_settlement_histories_settlement
        FOREIGN KEY (settlement_id) REFERENCES affiliate_settlement_batches(id),
    CONSTRAINT fk_affiliate_settlement_histories_actor
        FOREIGN KEY (actor_user_id) REFERENCES users(id)
);
