-- Showroom-scoped branding: custom favicon/header icon and browser tab title,
-- shown only on that showroom's own public catalog pages.

ALTER TABLE showrooms
    ADD COLUMN icon_url varchar(255) NULL AFTER bank_account_name,
    ADD COLUMN tab_title varchar(70) NULL AFTER icon_url;
