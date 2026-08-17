-- Transfer Manual: alternatif Booking Fee selain Midtrans. Buyer transfer ke
-- rekening showroom (showrooms.bank_account_number dkk, sudah ada), upload
-- bukti, showroom yang konfirmasi -- lihat TransactionService::create() dan
-- submitManualTransferProof()/confirmManualTransfer()/rejectManualTransfer().

ALTER TABLE transactions
    ADD COLUMN payment_method VARCHAR(30) NULL AFTER payment_type,
    ADD COLUMN manual_transfer_proof_path VARCHAR(255) NULL AFTER payment_method,
    ADD COLUMN manual_transfer_note VARCHAR(255) NULL AFTER manual_transfer_proof_path,
    ADD COLUMN manual_transfer_submitted_at DATETIME NULL AFTER manual_transfer_note,
    ADD COLUMN manual_transfer_confirmed_at DATETIME NULL AFTER manual_transfer_submitted_at,
    ADD COLUMN manual_transfer_confirmed_by BIGINT UNSIGNED NULL AFTER manual_transfer_confirmed_at,
    ADD COLUMN manual_transfer_rejected_at DATETIME NULL AFTER manual_transfer_confirmed_by,
    ADD COLUMN manual_transfer_rejected_reason VARCHAR(500) NULL AFTER manual_transfer_rejected_at;
