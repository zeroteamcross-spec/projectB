-- Booking Fee per mobil dan status retur transaksi.
--
-- Istilah: kolom tetap memakai penamaan `dp` agar konsisten dengan
-- transactions.dp_amount dan payment_type='dp' yang sudah ada. Di UI dan
-- dokumen, nilai ini disebut "Booking Fee". Lihat SCHEMA_CANON bagian
-- "Padanan Istilah UI dan Database".

ALTER TABLE cars
    ADD COLUMN dp_amount bigint NULL AFTER price_credit;

-- Transaksi yang diretur showroom setelah Booking Fee dibayar.
ALTER TABLE transactions
    MODIFY transaction_status ENUM(
        'pending_payment',
        'dp_paid',
        'paid',
        'completed',
        'expired',
        'cancelled',
        'returned'
    ) NOT NULL DEFAULT 'pending_payment';

ALTER TABLE transactions
    ADD COLUMN returned_at datetime NULL AFTER paid_at,
    ADD COLUMN return_reason varchar(500) NULL AFTER returned_at;
