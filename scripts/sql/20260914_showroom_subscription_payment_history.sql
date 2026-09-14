-- Riwayat pembayaran paket SaaS showroom -- ledger append-only, terpisah dari
-- kolom subscription_* di tabel showrooms (yang cuma menyimpan siklus
-- BERJALAN dan ditimpa tiap siklus baru). Satu baris ditulis di sini setiap
-- kali Admin konfirmasi ATAU tolak pembayaran, menyalin persis data siklus
-- itu sebelum kolom di showrooms ditimpa siklus berikutnya. Lihat
-- ShowroomService::confirmSubscriptionPayment() / rejectSubscriptionPayment().
CREATE TABLE IF NOT EXISTS showroom_subscription_payments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    showroom_id BIGINT UNSIGNED NOT NULL,
    plan_name VARCHAR(100) NULL,
    plan_price DECIMAL(14,2) NULL,
    plan_billing_period VARCHAR(50) NULL,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'manual',
    proof_path VARCHAR(255) NULL,
    proof_note VARCHAR(255) NULL,
    proof_submitted_at DATETIME NULL,
    midtrans_order_id VARCHAR(100) NULL,
    midtrans_transaction_id VARCHAR(100) NULL,
    midtrans_payment_data TEXT NULL,
    midtrans_paid_at DATETIME NULL,
    status VARCHAR(20) NOT NULL,
    decided_at DATETIME NOT NULL,
    decided_by BIGINT UNSIGNED NULL,
    rejected_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_showroom_subscription_payments_showroom_id (showroom_id, decided_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE showroom_subscription_payments
    ADD CONSTRAINT fk_showroom_subscription_payments_showroom_id
    FOREIGN KEY (showroom_id) REFERENCES showrooms(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE showroom_subscription_payments
    ADD CONSTRAINT fk_showroom_subscription_payments_decided_by
    FOREIGN KEY (decided_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
