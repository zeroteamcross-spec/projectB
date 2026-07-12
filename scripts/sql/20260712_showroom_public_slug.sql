ALTER TABLE showrooms
    ADD COLUMN slug varchar(80) NULL AFTER user_id;

UPDATE showrooms
SET slug = LOWER(
    TRIM(BOTH '-' FROM REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, ' ', '-'), '.', '-'), ',', '-'), '/', '-'), '_', '-'))
)
WHERE slug IS NULL
  AND name IS NOT NULL
  AND name <> '';

UPDATE showrooms
SET slug = CONCAT('showroom-', id)
WHERE slug IS NULL
   OR slug = '';

UPDATE showrooms AS sh
INNER JOIN (
    SELECT slug
    FROM showrooms
    WHERE deleted_at IS NULL
    GROUP BY slug
    HAVING COUNT(*) > 1
) AS dup ON dup.slug = sh.slug
SET sh.slug = CONCAT(sh.slug, '-', sh.id);

ALTER TABLE showrooms
    MODIFY slug varchar(80) NOT NULL,
    ADD UNIQUE KEY showrooms_slug_unique (slug);
