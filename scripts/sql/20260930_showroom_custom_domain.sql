-- Backlog #7: showroom bisa memakai domain sendiri, mengarah ke showroom
-- itu lewat carlynk.id/{slug} yang sama persis (URL tetap menyertakan
-- slug -- lihat plan groovy-napping-thacker.md). Siklus: pending_dns
-- (baru didaftarkan) -> verified (DNS sudah dicek otomatis dan memang
-- mengarah ke server ini) -> active (admin sudah menyiapkan nginx+SSL
-- manual dan menekan Aktifkan). Hanya status 'active' yang boleh benar-benar
-- melayani trafik -- lihat ShowroomRepository::findByCustomDomain().
ALTER TABLE showrooms
    ADD COLUMN custom_domain VARCHAR(255) NULL AFTER slug,
    ADD COLUMN custom_domain_status ENUM('pending_dns','verified','active') NULL AFTER custom_domain,
    ADD COLUMN custom_domain_requested_at DATETIME NULL AFTER custom_domain_status,
    ADD COLUMN custom_domain_verified_at DATETIME NULL AFTER custom_domain_requested_at,
    ADD COLUMN custom_domain_activated_at DATETIME NULL AFTER custom_domain_verified_at,
    ADD UNIQUE KEY uq_showrooms_custom_domain (custom_domain);
