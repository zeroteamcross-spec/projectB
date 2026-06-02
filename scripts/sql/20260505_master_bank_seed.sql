SET @master_bank_key = 'payments.banks';
SET @master_bank_json = '{
  "schema": "admin.master.bank.v1",
  "type": "bank",
  "seeded_at": "2026-05-05T00:00:00.000Z",
  "seed_source": "projectB/scripts/sql/20260505_master_bank_seed.sql",
  "banks": [
    {"id":"bank_bca","slug":"bca","bank_name":"BCA","bank_code":"014","icon_path":"","icon_asset":{},"status":"active","updated_at":"2026-05-05T00:00:00.000Z"},
    {"id":"bank_mandiri","slug":"mandiri","bank_name":"Mandiri","bank_code":"008","icon_path":"","icon_asset":{},"status":"active","updated_at":"2026-05-05T00:00:00.000Z"},
    {"id":"bank_bni","slug":"bni","bank_name":"BNI","bank_code":"009","icon_path":"","icon_asset":{},"status":"active","updated_at":"2026-05-05T00:00:00.000Z"},
    {"id":"bank_bri","slug":"bri","bank_name":"BRI","bank_code":"002","icon_path":"","icon_asset":{},"status":"active","updated_at":"2026-05-05T00:00:00.000Z"},
    {"id":"bank_cimb_niaga","slug":"cimb-niaga","bank_name":"CIMB Niaga","bank_code":"022","icon_path":"","icon_asset":{},"status":"active","updated_at":"2026-05-05T00:00:00.000Z"},
    {"id":"bank_permata","slug":"permata-bank","bank_name":"Permata Bank","bank_code":"013","icon_path":"","icon_asset":{},"status":"active","updated_at":"2026-05-05T00:00:00.000Z"},
    {"id":"bank_danamon","slug":"danamon","bank_name":"Danamon","bank_code":"011","icon_path":"","icon_asset":{},"status":"active","updated_at":"2026-05-05T00:00:00.000Z"},
    {"id":"bank_bsi","slug":"bsi","bank_name":"Bank Syariah Indonesia","bank_code":"451","icon_path":"","icon_asset":{},"status":"active","updated_at":"2026-05-05T00:00:00.000Z"}
  ]
}';

UPDATE api_versions
SET display_name = 'Master Bank',
    updated_at = NOW()
WHERE resource_name = @master_bank_key;

INSERT INTO api_versions (resource_name, display_name, version_number, created_at, updated_at)
SELECT @master_bank_key, 'Master Bank', 1, NOW(), NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM api_versions
    WHERE resource_name = @master_bank_key
);

SET @master_bank_version_id = (
    SELECT id
    FROM api_versions
    WHERE resource_name = @master_bank_key
    LIMIT 1
);

UPDATE master_data
SET data_json = @master_bank_json,
    api_version_id = @master_bank_version_id,
    deleted_at = NULL,
    updated_at = NOW()
WHERE master_key = @master_bank_key;

INSERT INTO master_data (master_key, data_json, api_version_id, created_at, updated_at, deleted_at)
SELECT @master_bank_key, @master_bank_json, @master_bank_version_id, NOW(), NULL, NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM master_data
    WHERE master_key = @master_bank_key
);
