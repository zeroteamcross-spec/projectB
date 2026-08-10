-- Showroom a buyer is treated as a customer of. Set the first time they log
-- in through a showroom-scoped Google login (#/s/<slug>/login), and updated
-- again each time they log in through a different showroom's link — this is
-- "which showroom they currently belong to", not a one-time permanent tie.
--
-- Nullable and independent of any single session: unlike the in-memory
-- public catalog context, this survives closing the browser and logging in
-- again days later, which is the whole point of storing it.

ALTER TABLE users
    ADD COLUMN home_showroom_id bigint unsigned NULL AFTER is_approved,
    ADD CONSTRAINT fk_users_home_showroom_id
        FOREIGN KEY (home_showroom_id) REFERENCES showrooms (id)
        ON DELETE SET NULL;

CREATE INDEX idx_users_home_showroom_id ON users (home_showroom_id);
