-- Global per-user notification inbox for preload snapshot, popover, and full notification list.

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  role ENUM('seller', 'buyer', 'affiliate_admin', 'admin') NOT NULL,
  type VARCHAR(80) NOT NULL,
  title VARCHAR(160) NOT NULL,
  body VARCHAR(600) NOT NULL,
  data_json LONGTEXT NULL,
  link_url VARCHAR(300) NULL,
  icon_key VARCHAR(60) NULL,
  priority ENUM('low', 'normal', 'high') NOT NULL DEFAULT 'normal',
  source_type VARCHAR(80) NULL,
  source_id VARCHAR(120) NULL,
  actor_user_id BIGINT UNSIGNED NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  read_at DATETIME NULL,
  expires_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_user_role_created (user_id, role, created_at, id),
  KEY idx_notifications_user_role_read (user_id, role, is_read),
  KEY idx_notifications_type (type),
  KEY idx_notifications_source (source_type, source_id),
  KEY idx_notifications_actor (actor_user_id),
  UNIQUE KEY uq_notifications_idempotency (user_id, role, type, source_type, source_id),
  CONSTRAINT fk_notifications_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_notifications_actor
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
    ON DELETE SET NULL
);
