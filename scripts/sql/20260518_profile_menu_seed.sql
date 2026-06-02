SET @master_sidebar_key = 'app.sidebar';
SET @profile_menu_exists = (
    SELECT COUNT(*)
    FROM master_data
    WHERE master_key = @master_sidebar_key
      AND JSON_SEARCH(data_json, 'one', '#/profile', NULL, '$.items[*].route') IS NOT NULL
);

UPDATE master_data
SET data_json = JSON_ARRAY_APPEND(
        data_json,
        '$.items',
        JSON_OBJECT(
            'id', 'sidebar_admin_profile',
            'key', 'admin.profile',
            'role', 'admin',
            'label', 'Profil Saya',
            'route', '#/profile',
            'icon', 'user',
            'order', 15,
            'parent_key', '',
            'is_parent', false,
            'is_visible', true,
            'is_active', true,
            'meta', JSON_OBJECT('scope', 'own', 'can_view', true, 'can_create', false, 'can_update', true, 'can_delete', false, 'can_export', false, 'can_print', false),
            'updated_at', '2026-05-18T00:00:00.000Z'
        ),
        '$.items',
        JSON_OBJECT(
            'id', 'sidebar_seller_profile',
            'key', 'seller.profile',
            'role', 'seller',
            'label', 'Profil Saya',
            'route', '#/profile',
            'icon', 'user',
            'order', 15,
            'parent_key', '',
            'is_parent', false,
            'is_visible', true,
            'is_active', true,
            'meta', JSON_OBJECT('scope', 'own', 'can_view', true, 'can_create', false, 'can_update', true, 'can_delete', false, 'can_export', false, 'can_print', false),
            'updated_at', '2026-05-18T00:00:00.000Z'
        ),
        '$.items',
        JSON_OBJECT(
            'id', 'sidebar_affiliate_profile',
            'key', 'affiliate.profile',
            'role', 'affiliate',
            'label', 'Profil Saya',
            'route', '#/profile',
            'icon', 'user',
            'order', 15,
            'parent_key', '',
            'is_parent', false,
            'is_visible', true,
            'is_active', true,
            'meta', JSON_OBJECT('scope', 'own', 'can_view', true, 'can_create', false, 'can_update', true, 'can_delete', false, 'can_export', false, 'can_print', false),
            'updated_at', '2026-05-18T00:00:00.000Z'
        )
    ),
    updated_at = NOW()
WHERE master_key = @master_sidebar_key
  AND @profile_menu_exists = 0;

UPDATE api_versions
SET version_number = version_number + 1,
    updated_at = NOW()
WHERE resource_name = @master_sidebar_key
  AND @profile_menu_exists = 0;
