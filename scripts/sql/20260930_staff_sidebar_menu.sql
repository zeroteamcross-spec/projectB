-- Sidebar seller (app.sidebar) sudah dikelola lewat master data, bukan
-- SELLER_LINKS hardcode di sidebar.js -- itu cuma fallback saat master data
-- kosong. Item "Kelola Staf" harus ditambahkan ke sini juga, sama seperti
-- pola 20260518_profile_menu_seed.sql, supaya benar-benar muncul di sidebar
-- seller (owner-only, staf tidak pernah melihatnya karena getSidebarLinksForRole()
-- hanya membaca master data untuk role admin/seller/affiliate -- seller_staff
-- selalu jatuh ke STAFF_LINKS hardcode).
SET @master_sidebar_key = 'app.sidebar';
SET @staff_menu_exists = (
    SELECT COUNT(*)
    FROM master_data
    WHERE master_key = @master_sidebar_key
      AND JSON_SEARCH(data_json, 'one', 'seller.staff', NULL, '$.items[*].key') IS NOT NULL
);

UPDATE master_data
SET data_json = JSON_ARRAY_APPEND(
        data_json,
        '$.items',
        JSON_OBJECT(
            'id', 'sidebar_seller_staff',
            'key', 'seller.staff',
            'role', 'seller',
            'label', 'Kelola Staf',
            'route', '#/seller/staff',
            'icon', 'user',
            'order', 38,
            'parent_key', '',
            'is_parent', false,
            'is_visible', true,
            'is_active', true,
            'meta', JSON_OBJECT(),
            'updated_at', '2026-09-30T00:00:00.000Z'
        )
    ),
    updated_at = NOW()
WHERE master_key = @master_sidebar_key
  AND @staff_menu_exists = 0;

UPDATE api_versions
SET version_number = version_number + 1,
    updated_at = NOW()
WHERE resource_name = @master_sidebar_key
  AND @staff_menu_exists = 0;
