-- Buyer accounts created offline can use a username when no email is known.
-- Existing email values and their unique index remain unchanged.
ALTER TABLE users
    MODIFY COLUMN email VARCHAR(100) COLLATE utf8mb4_unicode_ci NULL,
    ADD COLUMN buyer_username VARCHAR(50) COLLATE utf8mb4_unicode_ci NULL AFTER email,
    ADD UNIQUE KEY uq_users_buyer_username (buyer_username);
