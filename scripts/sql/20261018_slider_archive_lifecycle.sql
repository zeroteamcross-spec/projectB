ALTER TABLE sliders
    ADD COLUMN archived_at DATETIME NULL AFTER deleted_at,
    ADD KEY sliders_archived_idx (archived_at);

UPDATE sliders
SET archived_at = COALESCE(archived_at, deleted_at),
    is_active = 0,
    deleted_at = NULL
WHERE deleted_at IS NOT NULL;
