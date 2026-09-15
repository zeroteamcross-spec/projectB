-- Admin bisa menonaktifkan showroom (mis. menunggak, melanggar aturan) tanpa
-- menyentuh status login sellernya (account_status) -- seller tetap bisa
-- masuk ke dashboard untuk melihat alasan/menghubungi admin, tapi halaman
-- showroom publik dan katalog mobilnya diarahkan ke halaman maintenance.
-- Lihat ShowroomService::deactivate()/activate().
ALTER TABLE showrooms
    ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1,
    ADD COLUMN deactivated_reason VARCHAR(255) NULL,
    ADD COLUMN deactivated_at DATETIME NULL,
    ADD COLUMN deactivated_by BIGINT UNSIGNED NULL;

ALTER TABLE showrooms
    ADD CONSTRAINT fk_showrooms_deactivated_by
    FOREIGN KEY (deactivated_by) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
