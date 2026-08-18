-- Favicon (icon_url) and header logo are different shapes -- favicon is
-- square (browser tab), header logo is typically wide (wordmark). Reusing
-- icon_url for both forced every raster upload through a square center-crop,
-- mangling wide logos. This gives the header logo its own column and its
-- own upload path that preserves the original aspect ratio.

ALTER TABLE showrooms
    ADD COLUMN header_logo_url varchar(255) NULL AFTER icon_url;
