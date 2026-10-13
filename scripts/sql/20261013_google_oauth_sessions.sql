-- Server-side state and one-time handoff for Google Login on custom showroom domains.
-- Raw state/handoff values are never persisted; only SHA-256 hashes are stored.
CREATE TABLE IF NOT EXISTS google_oauth_sessions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    state_hash CHAR(64) NOT NULL,
    handoff_hash CHAR(64) NULL,
    source_host VARCHAR(253) NOT NULL,
    role VARCHAR(32) NOT NULL,
    showroom_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NULL,
    next_path VARCHAR(512) NULL,
    redirect_path VARCHAR(512) NULL,
    redirect_uri VARCHAR(512) NOT NULL,
    completion_cookie TEXT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    expires_at DATETIME NOT NULL,
    handoff_expires_at DATETIME NULL,
    consumed_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_google_oauth_sessions_state_hash (state_hash),
    UNIQUE KEY uq_google_oauth_sessions_handoff_hash (handoff_hash),
    KEY idx_google_oauth_sessions_source_status (source_host, status),
    KEY idx_google_oauth_sessions_expires_at (expires_at),
    KEY idx_google_oauth_sessions_handoff_expires_at (handoff_expires_at),
    CONSTRAINT fk_google_oauth_sessions_showroom
        FOREIGN KEY (showroom_id) REFERENCES showrooms(id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_google_oauth_sessions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
