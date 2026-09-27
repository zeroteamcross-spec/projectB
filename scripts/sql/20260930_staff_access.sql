-- Peran baru: staf operasional showroom, login sendiri tapi tidak memiliki
-- showroom manapun -- dia beraksi atas showroom pemiliknya lewat
-- staff_showroom_id di bawah, bukan lewat kepemilikan langsung.
ALTER TABLE users
    MODIFY COLUMN role ENUM('seller','buyer','affiliate_admin','admin','super_admin','seller_staff') NOT NULL;

-- Satu staf terikat permanen ke SATU cabang tertentu -- meniru pola
-- home_showroom_id milik buyer, NULL untuk peran lain.
ALTER TABLE users
    ADD COLUMN staff_showroom_id bigint unsigned NULL AFTER home_showroom_id,
    ADD CONSTRAINT fk_users_staff_showroom_id
        FOREIGN KEY (staff_showroom_id) REFERENCES showrooms (id)
        ON DELETE SET NULL;

CREATE INDEX idx_users_staff_showroom_id ON users (staff_showroom_id);

-- Jumlah staf per cabang digerbangi paket, snapshot persis seperti
-- selected_plan_allows_multi_branch. Beda dari listing_limit: di sini
-- 0 berarti fitur staf NONAKTIF (bukan "tanpa batas") -- keputusan produk
-- yang disengaja, karena staf adalah fitur tambahan berbayar, bukan
-- kapasitas default yang harus selalu ada.
ALTER TABLE showrooms
    ADD COLUMN selected_plan_staff_limit INT NOT NULL DEFAULT 0 AFTER selected_plan_allows_multi_branch;

-- notifications punya ENUM role terpisah (20260517_notifications.sql), staf
-- butuh notifikasi transaksi/inspeksi cabangnya segera, bukan menyusul.
ALTER TABLE notifications
    MODIFY COLUMN role ENUM('seller','buyer','affiliate_admin','admin','seller_staff') NOT NULL;
