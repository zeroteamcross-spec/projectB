-- Cabang tambahan (multi-cabang) cuma boleh dibuat showroom yang paket
-- terpilihnya mendukung fitur ini (paket Enterprise) -- snapshot persis
-- seperti selected_plan_listing_limit (lihat ShowroomService::resolveSelectedPlan()),
-- supaya kalau Admin nanti mengubah paket mana yang boleh multi-cabang,
-- showroom yang sudah terlanjur pilih paket lama tidak diam-diam kehilangan
-- atau mendapat akses cabang tambahan.
ALTER TABLE showrooms
    ADD COLUMN selected_plan_allows_multi_branch TINYINT(1) NOT NULL DEFAULT 0 AFTER selected_plan_listing_limit;
