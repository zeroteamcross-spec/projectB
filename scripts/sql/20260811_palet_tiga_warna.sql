-- Palet baru tiga rona untuk seluruh aplikasi.
--
--   #1e81b0  biru   - warna utama
--   #eab676  peach  - warna kedua, dipakai sebagai aksen
--   #faf4ed  krem   - warna ketiga, dipakai sebagai kanvas halaman
--
-- Warna sebenarnya dibaca dari baris ini, bukan dari DEFAULT_THEME di
-- public/assets/js/theme/tailwindRuntimeConfig.js. Selama baris ini masih
-- menyimpan palet lama, mengubah file saja tidak mengubah tampilan apa pun,
-- karena nilai dari sini menimpanya saat halaman dimuat.
--
-- Dua catatan soal pemetaan:
--
-- 1. `secondary` diisi biru gelap #17698f, bukan peach. Slot itu dipakai
--    sebagai warna TEKS brand di seratusan tempat; peach di atas putih tidak
--    terbaca. Jadi tetap tiga rona, hanya birunya punya versi gelap untuk teks.
-- 2. `button.primaryFrom/To` hijau, karena tombol primary adalah tombol "Ya".
--    Merah untuk tombol "Tidak" diambil dari `colors.danger`.
--
-- JSON_MERGE_PATCH dipakai supaya hanya kunci warna yang ditimpa; nama
-- aplikasi, tagline, logo, kontak WhatsApp, dan skala layout di baris yang
-- sama tetap utuh.

UPDATE master_data
SET data_json = JSON_MERGE_PATCH(
        data_json,
        JSON_OBJECT(
            'colors', JSON_OBJECT(
                'primary', '#1e81b0',
                'secondary', '#17698f',
                'accent', '#eab676',
                'pageBg', '#faf4ed',
                'surface', '#ffffff',
                'surfaceMuted', '#faf4ed',
                'inset', '#f5ece1',
                'text', '#1c1917',
                'textStrong', '#2f2a26',
                'textMuted', '#6f665e',
                'border', '#e7dccd',
                'borderStrong', '#d8c9b4',
                'overlay', 'rgba(28, 25, 23, 0.55)',
                'success', '#15803d',
                'warning', '#b45309',
                'danger', '#b91c1c',
                'info', '#1e81b0',
                'publicCanvasStart', '#ffffff',
                'publicCanvasMid', '#faf4ed',
                'publicCanvasEnd', '#f5ece1'
            ),
            'shell', JSON_OBJECT(
                'publicHeaderBg', 'rgba(255, 255, 255, 0.92)',
                'appHeaderBg', 'rgba(255, 255, 255, 0.95)',
                'sidebarStart', '#1e81b0',
                'sidebarEnd', '#17698f',
                'navActiveBg', 'rgba(255, 255, 255, 0.18)',
                'navText', '#ffffff'
            ),
            'button', JSON_OBJECT(
                'primaryFrom', '#15803d',
                'primaryTo', '#1a9a49',
                'secondaryBg', '#ffffff',
                'secondaryText', '#17698f',
                'ghostText', '#17698f'
            ),
            'surface', JSON_OBJECT(
                'cardBg', '#ffffff',
                'cardBorder', '#e7dccd',
                'panelBg', '#ffffff',
                'insetBg', '#faf4ed'
            ),
            'form', JSON_OBJECT(
                'searchBg', '#ffffff',
                'inputBg', '#ffffff',
                'controlBorder', '#d8c9b4',
                'focus', '#1e81b0',
                'chipBg', '#ffffff',
                'chipText', '#4a423b',
                'chipActiveFrom', '#1e81b0',
                'chipActiveTo', '#17698f'
            ),
            'state', JSON_OBJECT(
                'emptyBg', '#ffffff',
                'errorBg', '#ffffff',
                'errorBorder', '#f0c9c9',
                'badgeNeutralBg', '#f3ece3'
            )
        )
    ),
    updated_at = NOW()
WHERE master_key = 'design_studio.theme_config'
  AND deleted_at IS NULL;
