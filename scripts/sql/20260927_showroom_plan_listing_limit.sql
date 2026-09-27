-- Master Harga menjanjikan batas listing per paket (mis. Basic "Sampai 10
-- listing mobil"), tapi tidak ada tempat menyimpannya untuk showroom yang
-- sudah memilih paket -- CarService tidak punya cara mengecek batas siapa
-- pun. Kolom ini snapshot dari Master Harga persis seperti
-- selected_plan_price/selected_plan_billing_period (lihat
-- ShowroomService::resolveSelectedPlan()/upsertMine()): diisi ulang tiap kali
-- showroom pilih/ganti paket, supaya perubahan Master Harga nanti tidak ikut
-- mengubah batas showroom yang sudah memilih paket lama. NULL berarti tanpa
-- batas (paket unlimited, atau showroom belum pernah pilih paket).
ALTER TABLE showrooms
    ADD COLUMN selected_plan_listing_limit INT UNSIGNED NULL AFTER selected_plan_billing_period;
