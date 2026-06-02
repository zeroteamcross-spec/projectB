CREATE TABLE IF NOT EXISTS affiliate_settlement_batches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    affiliate_id BIGINT UNSIGNED NOT NULL,
    requested_amount DECIMAL(15,2) NOT NULL,
    ledger_count INT NOT NULL DEFAULT 0,
    status ENUM('pending', 'settled', 'cancelled') NOT NULL DEFAULT 'pending',
    notes TEXT NULL,
    requested_at DATETIME NOT NULL,
    settled_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    INDEX idx_affiliate_settlement_batches_affiliate_id (affiliate_id),
    INDEX idx_affiliate_settlement_batches_status (status),
    INDEX idx_affiliate_settlement_batches_requested_at (requested_at),
    CONSTRAINT fk_affiliate_settlement_batches_affiliate
        FOREIGN KEY (affiliate_id) REFERENCES affiliates(id)
);

CREATE TABLE IF NOT EXISTS affiliate_settlement_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    settlement_batch_id BIGINT UNSIGNED NOT NULL,
    ledger_id BIGINT UNSIGNED NOT NULL,
    amount_snapshot DECIMAL(15,2) NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_affiliate_settlement_items_batch_id (settlement_batch_id),
    UNIQUE KEY uniq_affiliate_settlement_items_ledger_id (ledger_id),
    CONSTRAINT fk_affiliate_settlement_items_batch
        FOREIGN KEY (settlement_batch_id) REFERENCES affiliate_settlement_batches(id),
    CONSTRAINT fk_affiliate_settlement_items_ledger
        FOREIGN KEY (ledger_id) REFERENCES affiliate_commission_ledgers(id)
);
