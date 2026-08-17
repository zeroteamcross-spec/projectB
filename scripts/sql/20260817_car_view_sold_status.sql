-- "View Sold": mobil yang sudah laku tetapi tetap tampil di katalog publik
-- dengan badge Sold, berbeda dari status `sold` biasa yang disembunyikan
-- seperti draft/archived. Lihat CarService::catalog() dan
-- CarRepository::buildWhere() untuk perlakuan IN (published, view_sold).

ALTER TABLE cars
    MODIFY listing_status ENUM(
        'draft',
        'published',
        'reserved',
        'sold',
        'view_sold',
        'archived'
    ) NOT NULL DEFAULT 'draft';
