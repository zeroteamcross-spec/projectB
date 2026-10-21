-- Durable provider operation state, stable order IDs, idempotency keys and fencing.
CREATE TABLE IF NOT EXISTS `transaction_payment_operations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `transaction_id` bigint unsigned NOT NULL,
  `parent_operation_id` bigint unsigned DEFAULT NULL,
  `operation_key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `operation_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_order_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gross_amount` bigint DEFAULT NULL,
  `idempotency_key` varchar(46) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `operation_status` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider_status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fence` bigint unsigned NOT NULL DEFAULT 0,
  `lease_token` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `lease_expires_at` datetime DEFAULT NULL,
  `first_attempt_at` datetime DEFAULT NULL,
  `request_payload_json` longtext COLLATE utf8mb4_unicode_ci,
  `response_payload_json` longtext COLLATE utf8mb4_unicode_ci,
  `error_payload_json` longtext COLLATE utf8mb4_unicode_ci,
  `late_success_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_transaction_payment_operations_key` (`transaction_id`,`operation_key`),
  KEY `idx_transaction_payment_operations_order` (`provider_order_id`),
  KEY `idx_transaction_payment_operations_state` (`transaction_id`,`operation_type`,`operation_status`),
  KEY `idx_transaction_payment_operations_parent` (`parent_operation_id`),
  CONSTRAINT `fk_transaction_payment_operations_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_transaction_payment_operations_parent` FOREIGN KEY (`parent_operation_id`) REFERENCES `transaction_payment_operations` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Import the latest known state for each old Midtrans order. Unknown or failed
-- session creation rows remain unknown and therefore block unsafe retries.
INSERT INTO `transaction_payment_operations`
    (`transaction_id`, `operation_key`, `operation_type`, `provider_order_id`,
     `payment_method`, `gross_amount`, `operation_status`, `provider_status`,
     `fence`, `request_payload_json`, `response_payload_json`, `created_at`,
     `updated_at`, `completed_at`)
SELECT logs.`transaction_id`, CONCAT('legacy-log-', logs.`id`), 'legacy_session',
       logs.`provider_order_id`, logs.`payment_method`, logs.`gross_amount`,
       CASE WHEN LOWER(COALESCE(logs.`transaction_status`, '')) IN
            ('pending', 'settlement', 'capture', 'paid', 'cancel', 'expire', 'deny', 'failure', 'failed')
            THEN 'completed' ELSE 'unknown' END,
       CASE
           WHEN LOWER(COALESCE(logs.`transaction_status`, '')) IN ('settlement', 'capture', 'paid')
               THEN CONCAT('unverified_', LOWER(logs.`transaction_status`))
           ELSE NULLIF(LOWER(logs.`transaction_status`), '')
       END, 0,
       logs.`payload_request_json`, logs.`payload_response_json`, logs.`created_at`,
       logs.`logged_at`,
       CASE WHEN LOWER(COALESCE(logs.`transaction_status`, '')) IN
            ('pending', 'settlement', 'capture', 'paid', 'cancel', 'expire', 'deny', 'failure', 'failed')
            THEN logs.`logged_at` ELSE NULL END
FROM `transaction_payment_logs` AS logs
WHERE logs.`provider_name` = 'midtrans'
  AND logs.`provider_order_id` IS NOT NULL
  AND logs.`provider_order_id` <> ''
  AND NOT EXISTS (
      SELECT 1 FROM `transaction_payment_logs` AS newer
      WHERE newer.`transaction_id` = logs.`transaction_id`
        AND newer.`provider_name` = 'midtrans'
        AND newer.`provider_order_id` = logs.`provider_order_id`
        AND newer.`id` > logs.`id`
  )
  AND NOT EXISTS (
      SELECT 1 FROM `transaction_payment_operations` AS existing
      WHERE existing.`transaction_id` = logs.`transaction_id`
        AND existing.`provider_order_id` = logs.`provider_order_id`
  );

-- Preserve an order ID that exists only on the transaction row. It is unknown
-- until Midtrans is queried, so offline conversion will fail closed if it
-- cannot confirm a terminal unpaid state.
INSERT INTO `transaction_payment_operations`
    (`transaction_id`, `operation_key`, `operation_type`, `provider_order_id`,
     `payment_method`, `gross_amount`, `operation_status`, `fence`, `created_at`, `updated_at`)
SELECT t.`id`, CONCAT('legacy-tx-', t.`id`), 'legacy_session', t.`midtrans_order_id`,
       t.`payment_method`, CASE WHEN t.`payment_type` = 'dp' THEN t.`dp_amount` ELSE t.`car_price` END,
       'unknown', 0, t.`created_at`, COALESCE(t.`updated_at`, t.`created_at`)
FROM `transactions` AS t
WHERE t.`midtrans_order_id` IS NOT NULL
  AND t.`midtrans_order_id` <> ''
  AND NOT EXISTS (
      SELECT 1 FROM `transaction_payment_operations` AS existing
      WHERE existing.`transaction_id` = t.`id`
        AND existing.`provider_order_id` = t.`midtrans_order_id`
  );
