-- Persistent task list for user requests and completion tracking.
CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_key VARCHAR(120) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  status ENUM('open', 'sip') NOT NULL DEFAULT 'open',
  requested_by_user_id BIGINT UNSIGNED NULL,
  completed_by_user_id BIGINT UNSIGNED NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tasks_task_key (task_key),
  KEY idx_tasks_status_created (status, created_at, id),
  KEY idx_tasks_requested_by_user (requested_by_user_id),
  KEY idx_tasks_completed_by_user (completed_by_user_id),
  CONSTRAINT fk_tasks_requested_by_user
    FOREIGN KEY (requested_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_tasks_completed_by_user
    FOREIGN KEY (completed_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tasks
  (task_key, title, description, status, requested_by_user_id, completed_by_user_id,
   completed_at, created_at, updated_at, deleted_at)
VALUES
  ('request-001-transaction-access-and-task-page',
   'Sembunyikan Akun Akses pada transaksi dan sediakan halaman daftar tugas.',
   'Pada transactions/new?car_id={id}, sembunyikan card Akun akses beserta tombol Masuk dan Daftar Pembeli. Sediakan halaman khusus berisi daftar permintaan dengan tombol Beres yang mengubah status menjadi sip.',
   'open', NULL, NULL, NULL, '2026-10-01 00:00:00', NULL, NULL)
ON DUPLICATE KEY UPDATE task_key = VALUES(task_key);
