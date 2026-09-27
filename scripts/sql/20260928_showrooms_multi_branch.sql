-- Satu akun login (users.id) sebelumnya cuma boleh punya SATU showroom,
-- ditegakkan oleh unique key ini. Fitur multi-cabang (paket Enterprise)
-- butuh satu akun bisa punya banyak showroom/cabang -- tiap baris showroom
-- tetap punya slug sendiri (showrooms_slug_unique, TIDAK disentuh di sini,
-- tetap unik global) dan siklus tagihan sendiri. Tidak ada pengganti
-- constraint ini: mencegah slug duplikat sudah cukup mencegah baris yang
-- benar-benar identik; "satu user boleh berapa showroom" sekarang murni
-- aturan aplikasi (lihat ShowroomService::createBranch(), fase berikutnya),
-- bukan aturan skema.
-- fk_showrooms_user_id butuh SATU index yang menutupi user_id -- selama ini
-- itu uq_showrooms_user_id sendiri, jadi tidak bisa langsung di-drop begitu
-- saja (MySQL menolak: "needed in a foreign key constraint"). Index biasa
-- (non-unique) ditambah lebih dulu di kolom yang sama supaya FK tetap punya
-- index-nya, baru unique key-nya dilepas.
ALTER TABLE showrooms
    ADD INDEX idx_showrooms_user_id (user_id),
    DROP INDEX uq_showrooms_user_id;
