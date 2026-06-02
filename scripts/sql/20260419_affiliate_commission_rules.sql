CREATE TABLE IF NOT EXISTS affiliate_commission_rules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seller_user_id BIGINT UNSIGNED NOT NULL,
    car_id BIGINT UNSIGNED NULL,
    commission_type ENUM('percent', 'flat') NOT NULL,
    commission_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    commission_flat DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL,
    updated_at DATETIME NULL,
    deleted_at DATETIME NULL,
    INDEX idx_affiliate_commission_rules_seller_user_id (seller_user_id),
    INDEX idx_affiliate_commission_rules_car_id (car_id),
    INDEX idx_affiliate_commission_rules_status (status),
    CONSTRAINT fk_affiliate_commission_rules_seller
        FOREIGN KEY (seller_user_id) REFERENCES users(id),
    CONSTRAINT fk_affiliate_commission_rules_car
        FOREIGN KEY (car_id) REFERENCES cars(id)
);
