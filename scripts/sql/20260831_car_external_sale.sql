-- Admin bisa menandai mobil terjual di luar sistem (mis. laku lewat WhatsApp
-- atau transaksi langsung di showroom, tanpa ada record transaksi di
-- aplikasi) dengan keterangan wajib untuk audit. Lihat
-- CarService::markSoldExternal().

ALTER TABLE cars
    ADD COLUMN external_sale_note TEXT NULL AFTER listing_status,
    ADD COLUMN external_sale_marked_at DATETIME NULL AFTER external_sale_note,
    ADD COLUMN external_sale_marked_by BIGINT UNSIGNED NULL AFTER external_sale_marked_at;

ALTER TABLE cars
    ADD CONSTRAINT fk_cars_external_sale_marked_by
    FOREIGN KEY (external_sale_marked_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
