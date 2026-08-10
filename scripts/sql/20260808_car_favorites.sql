-- Per-buyer car favorites. Drives the favorites-only grid on the buyer home.

CREATE TABLE IF NOT EXISTS car_favorites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  car_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_car_favorites_user_car (user_id, car_id),
  KEY idx_car_favorites_user_deleted (user_id, deleted_at),
  KEY idx_car_favorites_car (car_id),
  CONSTRAINT fk_car_favorites_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_car_favorites_car
    FOREIGN KEY (car_id) REFERENCES cars(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
