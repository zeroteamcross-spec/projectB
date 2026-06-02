ALTER TABLE user_auth_tokens
    ADD COLUMN updated_at DATETIME NULL AFTER created_at;

UPDATE user_auth_tokens
SET updated_at = COALESCE(last_used_at, revoked_at, created_at)
WHERE updated_at IS NULL;

CREATE TABLE IF NOT EXISTS admin_impersonation_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    admin_user_id BIGINT UNSIGNED NOT NULL,
    target_user_id BIGINT UNSIGNED NOT NULL,
    selector CHAR(12) NOT NULL,
    hashed_validator LONGTEXT NOT NULL,
    started_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    last_used_at DATETIME NULL,
    ended_at DATETIME NULL,
    ended_reason VARCHAR(50) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_admin_impersonation_selector (selector),
    KEY idx_admin_impersonation_admin_user_id (admin_user_id),
    KEY idx_admin_impersonation_target_user_id (target_user_id),
    KEY idx_admin_impersonation_expires_at (expires_at),
    CONSTRAINT fk_admin_impersonation_admin_user
        FOREIGN KEY (admin_user_id) REFERENCES users(id),
    CONSTRAINT fk_admin_impersonation_target_user
        FOREIGN KEY (target_user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
