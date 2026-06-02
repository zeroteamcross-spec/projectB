CREATE TABLE IF NOT EXISTS sliders (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code VARCHAR(80) NOT NULL,
    title VARCHAR(180) NOT NULL,
    subtitle VARCHAR(220) NULL,
    body_text TEXT NULL,
    html_content TEXT NULL,
    image_url TEXT NULL,
    image_alt VARCHAR(180) NULL,
    cta_text VARCHAR(80) NULL,
    cta_url VARCHAR(300) NULL,
    position_key VARCHAR(80) NOT NULL DEFAULT 'landing_hero',
    template_key VARCHAR(80) NOT NULL DEFAULT 'elegant_gradient',
    animation_key VARCHAR(40) NOT NULL DEFAULT 'fade',
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    start_at DATETIME NULL,
    end_at DATETIME NULL,
    created_by BIGINT UNSIGNED NULL,
    updated_by BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    deleted_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY sliders_code_unique (code),
    KEY sliders_position_active_order_idx (position_key, is_active, sort_order),
    KEY sliders_template_idx (template_key),
    KEY sliders_schedule_idx (start_at, end_at),
    KEY sliders_created_by_idx (created_by),
    KEY sliders_updated_by_idx (updated_by)
);

SET @slider_sidebar_item = JSON_OBJECT(
    'id', 'sidebar_admin_sliders',
    'key', 'admin.sliders',
    'role', 'admin',
    'label', 'Slider',
    'route', '#/admin/sliders',
    'icon', 'image',
    'order', 55,
    'parent_key', '',
    'is_parent', false,
    'is_visible', true,
    'is_active', true,
    'meta', JSON_OBJECT(),
    'updated_at', '2026-05-19T00:00:00.000Z'
);

UPDATE master_data
SET data_json = JSON_SET(
        data_json,
        '$.items',
        JSON_ARRAY_APPEND(COALESCE(JSON_EXTRACT(data_json, '$.items'), JSON_ARRAY()), '$', @slider_sidebar_item)
    ),
    updated_at = NOW()
WHERE master_key = 'app.sidebar'
  AND JSON_SEARCH(data_json, 'one', 'admin.sliders', NULL, '$.items[*].key') IS NULL;
