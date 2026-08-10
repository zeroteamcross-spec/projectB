-- Showroom city, chosen at registration from the `locations.cities` master.

ALTER TABLE showrooms
    ADD COLUMN city_name varchar(100) NULL AFTER address;

CREATE INDEX idx_showrooms_city_name ON showrooms (city_name);
