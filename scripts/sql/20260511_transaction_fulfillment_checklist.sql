-- Stores seller-managed fulfillment checklist progress for paid transactions.

CREATE TABLE IF NOT EXISTS transaction_fulfillment_checklist_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_id BIGINT UNSIGNED NOT NULL,
  checklist_key VARCHAR(80) NOT NULL,
  label VARCHAR(200) NOT NULL,
  is_required TINYINT(1) NOT NULL DEFAULT 1,
  is_completed TINYINT(1) NOT NULL DEFAULT 0,
  completed_at DATETIME NULL,
  completed_by_user_id BIGINT UNSIGNED NULL,
  notes VARCHAR(500) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_transaction_fulfillment_item (transaction_id, checklist_key),
  KEY idx_transaction_fulfillment_transaction (transaction_id),
  KEY idx_transaction_fulfillment_completed (is_completed),
  CONSTRAINT fk_transaction_fulfillment_transaction
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_transaction_fulfillment_completed_by
    FOREIGN KEY (completed_by_user_id) REFERENCES users(id)
    ON DELETE SET NULL
);
