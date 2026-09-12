-- Pembayaran otomatis/instan (Virtual Account Midtrans) untuk paket SaaS
-- showroom, sebagai alternatif transfer manual yang sudah ada -- dipakai baik
-- saat registrasi maupun perpanjangan (Tagihan Berulang). Lihat
-- ShowroomService::createSubscriptionMidtransPayment() /
-- handleSubscriptionMidtransCallback().
--
-- subscription_payment_method menandai jalur mana yang dipakai showroom untuk
-- siklus tagihan SAAT INI ('manual' tetap default -- tidak mengubah showroom
-- yang sudah ada). Kolom subscription_midtrans_* menampung sesi VA yang
-- sedang berjalan; begitu Admin konfirmasi atau siklus berikutnya dimulai,
-- kolom-kolom ini ditimpa sesi baru, bukan disimpan sebagai riwayat.
ALTER TABLE showrooms
    ADD COLUMN subscription_payment_method VARCHAR(20) NOT NULL DEFAULT 'manual' AFTER subscription_next_due_at,
    ADD COLUMN subscription_midtrans_order_id VARCHAR(100) NULL AFTER subscription_payment_method,
    ADD COLUMN subscription_midtrans_transaction_id VARCHAR(100) NULL AFTER subscription_midtrans_order_id,
    ADD COLUMN subscription_midtrans_payment_data TEXT NULL AFTER subscription_midtrans_transaction_id,
    ADD COLUMN subscription_midtrans_expires_at DATETIME NULL AFTER subscription_midtrans_payment_data,
    ADD COLUMN subscription_midtrans_paid_at DATETIME NULL AFTER subscription_midtrans_expires_at,
    ADD UNIQUE KEY uniq_showrooms_subscription_midtrans_order_id (subscription_midtrans_order_id);
