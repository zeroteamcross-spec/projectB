SET @master_sidebar_key = 'app.sidebar';
SET @master_sidebar_json = '{"schema":"admin.master.sidebar.v1","type":"sidebar","seeded_at":"2026-05-04T00:00:00.000Z","seed_source":"projectB/scripts/sql/20260504_master_sidebar_seed.sql","items":[{"id":"sidebar_admin_dashboard","key":"admin.dashboard","role":"admin","label":"Dashboard Admin","route":"#/admin","icon":"dashboard","order":10,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_admin_approvals","key":"admin.approvals","role":"admin","label":"Approval Queue","route":"#/admin/approvals","icon":"transaction","order":20,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_admin_users","key":"admin.users","role":"admin","label":"User Management","route":"#/admin/users","icon":"transaction","order":30,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_admin_transactions","key":"admin.transactions","role":"admin","label":"Transactions","route":"#/admin/transactions","icon":"transaction","order":40,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_admin_settlements","key":"admin.settlements","role":"admin","label":"Settlements","route":"#/admin/settlements","icon":"commission","order":50,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_admin_master","key":"admin.master","role":"admin","label":"Master","route":"#/admin/master","icon":"sort","order":60,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_admin_design_studio","key":"admin.design_studio","role":"admin","label":"Design Studio","route":"#/admin/design-studio","icon":"sparkles","order":70,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_seller_dashboard","key":"seller.dashboard","role":"seller","label":"Dashboard Seller","route":"#/seller","icon":"dashboard","order":10,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_seller_showroom","key":"seller.showroom","role":"seller","label":"Showroom Saya","route":"#/seller/showroom","icon":"showroom","order":20,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_seller_cars","key":"seller.cars","role":"seller","label":"Katalog","route":"#/seller/cars","icon":"car","order":30,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_seller_affiliates","key":"seller.affiliates","role":"seller","label":"Marketing","route":"#/seller/affiliates","icon":"affiliate","order":40,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_seller_affiliate_commissions","key":"seller.affiliate_commissions","role":"seller","label":"Komisi Marketing","route":"#/seller/affiliate-commissions","icon":"commission","order":50,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_seller_transactions","key":"seller.transactions","role":"seller","label":"Transaksi","route":"#/seller/transactions","icon":"transaction","order":60,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_affiliate_dashboard","key":"affiliate.dashboard","role":"affiliate","label":"Dashboard Marketing","route":"#/affiliate","icon":"affiliate","order":10,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_affiliate_activity","key":"affiliate.activity","role":"affiliate","label":"Activity Clicks","route":"#/affiliate/activity","icon":"transaction","order":20,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_affiliate_ledger","key":"affiliate.ledger","role":"affiliate","label":"Ledger Komisi","route":"#/affiliate/ledger","icon":"commission","order":30,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"},{"id":"sidebar_affiliate_settlements","key":"affiliate.settlements","role":"affiliate","label":"Payout Settlement","route":"#/affiliate/settlements","icon":"commission","order":40,"parent_key":"","is_parent":false,"is_visible":true,"is_active":true,"meta":{},"updated_at":"2026-05-04T00:00:00.000Z"}]}';

UPDATE api_versions
SET display_name = 'Master Sidebar',
    updated_at = NOW()
WHERE resource_name = @master_sidebar_key;

INSERT INTO api_versions (resource_name, display_name, version_number, created_at, updated_at)
SELECT @master_sidebar_key, 'Master Sidebar', 1, NOW(), NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM api_versions
    WHERE resource_name = @master_sidebar_key
);

SET @master_sidebar_version_id = (
    SELECT id
    FROM api_versions
    WHERE resource_name = @master_sidebar_key
    LIMIT 1
);

UPDATE master_data
SET data_json = @master_sidebar_json,
    api_version_id = @master_sidebar_version_id,
    deleted_at = NULL,
    updated_at = NOW()
WHERE master_key = @master_sidebar_key;

INSERT INTO master_data (master_key, data_json, api_version_id, created_at, updated_at, deleted_at)
SELECT @master_sidebar_key, @master_sidebar_json, @master_sidebar_version_id, NOW(), NULL, NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM master_data
    WHERE master_key = @master_sidebar_key
);
