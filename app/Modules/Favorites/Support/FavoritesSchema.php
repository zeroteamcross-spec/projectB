<?php

declare(strict_types=1);

namespace App\Modules\Favorites\Support;

use App\Core\Exceptions\HttpException;
use App\Infrastructure\Database\SchemaBootstrapper;
use Throwable;

class FavoritesSchema
{
    private SchemaBootstrapper $bootstrapper;

    public function __construct(SchemaBootstrapper $bootstrapper)
    {
        $this->bootstrapper = $bootstrapper;
    }

    public function ensure(): void
    {
        try {
            $this->bootstrapper->ensureTable('car_favorites', $this->createCarFavoritesTableSql());
        } catch (Throwable $exception) {
            error_log('Favorites schema bootstrap failed: ' . $exception->getMessage());

            throw new HttpException(
                'Schema favorit belum siap. Periksa privilege CREATE TABLE dan konfigurasi database.',
                500
            );
        }
    }

    private function createCarFavoritesTableSql(): string
    {
        return <<<'SQL'
CREATE TABLE IF NOT EXISTS car_favorites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  car_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  deleted_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_car_favorites_user_car (user_id, car_id),
  KEY idx_car_favorites_user_deleted (user_id, deleted_at),
  KEY idx_car_favorites_car (car_id),
  CONSTRAINT fk_car_favorites_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_car_favorites_car
    FOREIGN KEY (car_id) REFERENCES cars(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
SQL;
    }
}
