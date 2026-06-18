CREATE TABLE IF NOT EXISTS user_auth_tokens (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    selector CHAR(12) NOT NULL,
    hashed_validator LONGTEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    last_used_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    revoked_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY user_auth_tokens_selector_unique (selector),
    KEY user_auth_tokens_user_id_idx (user_id),
    KEY user_auth_tokens_expires_at_idx (expires_at),
    CONSTRAINT user_auth_tokens_user_id_fk
        FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
