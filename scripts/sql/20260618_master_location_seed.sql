SET @master_location_key = 'locations.cities';
SET @master_location_json = '{
  "schema": "admin.master.location.v1",
  "type": "location",
  "seeded_at": "2026-06-18T00:00:00.000Z",
  "seed_source": "projectB/scripts/sql/20260618_master_location_seed.sql",
  "cities": [
    {"id":"city_jakarta","name":"Jakarta","slug":"jakarta","status":"active","province_name":"DKI Jakarta","province_slug":"dki-jakarta","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_bandung","name":"Bandung","slug":"bandung","status":"active","province_name":"Jawa Barat","province_slug":"jawa-barat","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_surabaya","name":"Surabaya","slug":"surabaya","status":"active","province_name":"Jawa Timur","province_slug":"jawa-timur","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_semarang","name":"Semarang","slug":"semarang","status":"active","province_name":"Jawa Tengah","province_slug":"jawa-tengah","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_yogyakarta","name":"Yogyakarta","slug":"yogyakarta","status":"active","province_name":"DI Yogyakarta","province_slug":"di-yogyakarta","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_medan","name":"Medan","slug":"medan","status":"active","province_name":"Sumatera Utara","province_slug":"sumatera-utara","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_palembang","name":"Palembang","slug":"palembang","status":"active","province_name":"Sumatera Selatan","province_slug":"sumatera-selatan","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_pekanbaru","name":"Pekanbaru","slug":"pekanbaru","status":"active","province_name":"Riau","province_slug":"riau","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_padang","name":"Padang","slug":"padang","status":"active","province_name":"Sumatera Barat","province_slug":"sumatera-barat","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_makassar","name":"Makassar","slug":"makassar","status":"active","province_name":"Sulawesi Selatan","province_slug":"sulawesi-selatan","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_denpasar","name":"Denpasar","slug":"denpasar","status":"active","province_name":"Bali","province_slug":"bali","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_balipapan","name":"Balikpapan","slug":"balikpapan","status":"active","province_name":"Kalimantan Timur","province_slug":"kalimantan-timur","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_samarinda","name":"Samarinda","slug":"samarinda","status":"active","province_name":"Kalimantan Timur","province_slug":"kalimantan-timur","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_banjarmasin","name":"Banjarmasin","slug":"banjarmasin","status":"active","province_name":"Kalimantan Selatan","province_slug":"kalimantan-selatan","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_manado","name":"Manado","slug":"manado","status":"active","province_name":"Sulawesi Utara","province_slug":"sulawesi-utara","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_batam","name":"Batam","slug":"batam","status":"active","province_name":"Kepulauan Riau","province_slug":"kepulauan-riau","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_tangerang","name":"Tangerang","slug":"tangerang","status":"active","province_name":"Banten","province_slug":"banten","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_bekasi","name":"Bekasi","slug":"bekasi","status":"active","province_name":"Jawa Barat","province_slug":"jawa-barat","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_bogor","name":"Bogor","slug":"bogor","status":"active","province_name":"Jawa Barat","province_slug":"jawa-barat","updated_at":"2026-06-18T00:00:00.000Z"},
    {"id":"city_depok","name":"Depok","slug":"depok","status":"active","province_name":"Jawa Barat","province_slug":"jawa-barat","updated_at":"2026-06-18T00:00:00.000Z"}
  ]
}';

UPDATE api_versions
SET display_name = 'Master Lokasi',
    updated_at = NOW()
WHERE resource_name = @master_location_key;

INSERT INTO api_versions (resource_name, display_name, version_number, created_at, updated_at)
SELECT @master_location_key, 'Master Lokasi', 1, NOW(), NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM api_versions
    WHERE resource_name = @master_location_key
);

SET @master_location_version_id = (
    SELECT id
    FROM api_versions
    WHERE resource_name = @master_location_key
    LIMIT 1
);

UPDATE master_data
SET deleted_at = NULL,
    api_version_id = @master_location_version_id,
    updated_at = NOW()
WHERE master_key = @master_location_key;

INSERT INTO master_data (master_key, data_json, api_version_id, created_at, updated_at, deleted_at)
SELECT @master_location_key, @master_location_json, @master_location_version_id, NOW(), NULL, NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM master_data
    WHERE master_key = @master_location_key
);

SET @master_sidebar_key = 'app.sidebar';
SET @master_location_menu_exists = (
    SELECT COUNT(*)
    FROM master_data
    WHERE master_key = @master_sidebar_key
      AND JSON_SEARCH(data_json, 'one', 'admin.master_location', NULL, '$.items[*].key') IS NOT NULL
);

UPDATE master_data
SET data_json = JSON_ARRAY_APPEND(
        data_json,
        '$.items',
        JSON_OBJECT(
            'id', 'sidebar_admin_master_location',
            'key', 'admin.master_location',
            'role', 'admin',
            'label', 'Master Lokasi',
            'route', '#/admin/master-location',
            'icon', 'location',
            'order', 50,
            'parent_key', 'admin.master',
            'is_parent', false,
            'is_visible', true,
            'is_active', true,
            'meta', JSON_OBJECT(),
            'updated_at', '2026-06-18T00:00:00.000Z'
        )
    ),
    updated_at = NOW()
WHERE master_key = @master_sidebar_key
  AND @master_location_menu_exists = 0;

UPDATE api_versions
SET version_number = version_number + 1,
    updated_at = NOW()
WHERE resource_name = @master_sidebar_key
  AND @master_location_menu_exists = 0;
