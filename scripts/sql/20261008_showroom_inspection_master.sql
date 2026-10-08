-- Master inspeksi tetap memakai tabel canon yang sama.
-- showroom_id NULL = master admin/global lama; nilai terisi = master cabang.
ALTER TABLE inspection_templates
    ADD COLUMN showroom_id BIGINT UNSIGNED NULL AFTER id,
    DROP INDEX uq_inspection_templates_category_item,
    ADD UNIQUE KEY uq_inspection_templates_showroom_category_item (showroom_id, category_name, item_name),
    ADD KEY idx_inspection_templates_showroom_id (showroom_id),
    ADD CONSTRAINT fk_inspection_templates_showroom_id FOREIGN KEY (showroom_id) REFERENCES showrooms(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE inspection_reports
    ADD COLUMN inspection_master_showroom_id BIGINT UNSIGNED NULL AFTER inspector_user_id,
    ADD KEY idx_inspection_reports_master_showroom_id (inspection_master_showroom_id),
    ADD CONSTRAINT fk_inspection_reports_master_showroom_id FOREIGN KEY (inspection_master_showroom_id) REFERENCES showrooms(id) ON DELETE SET NULL ON UPDATE CASCADE;
