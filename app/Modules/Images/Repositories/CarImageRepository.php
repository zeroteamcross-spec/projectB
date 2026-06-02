<?php

declare(strict_types=1);

namespace App\Modules\Images\Repositories;

use PDO;

class CarImageRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function carOwner(int $carId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, seller_user_id, listing_status FROM cars WHERE id = :id AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['id' => $carId]);
        $car = $stmt->fetch();

        return $car ?: null;
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, car_id, user_id, file_path, file_name, file_size, mime_type,
                    sort_order, is_cover, created_at, updated_at
             FROM car_images
             WHERE id = :id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $image = $stmt->fetch();

        return $image ?: null;
    }

    public function listByCar(int $carId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, car_id, user_id, file_path, file_name, file_size, mime_type,
                    sort_order, is_cover, created_at, updated_at
             FROM car_images
             WHERE car_id = :car_id
             AND deleted_at IS NULL
             ORDER BY is_cover DESC, sort_order ASC, id ASC'
        );
        $stmt->execute(['car_id' => $carId]);

        return $stmt->fetchAll();
    }

    public function nextSortOrder(int $carId): int
    {
        $stmt = $this->pdo->prepare(
            'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order
             FROM car_images
             WHERE car_id = :car_id
             AND deleted_at IS NULL'
        );
        $stmt->execute(['car_id' => $carId]);
        $row = $stmt->fetch();

        return (int) ($row['next_sort_order'] ?? 0);
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO car_images
                (car_id, user_id, file_path, file_name, file_size, mime_type,
                 sort_order, is_cover, created_at, updated_at)
             VALUES
                (:car_id, :user_id, :file_path, :file_name, :file_size, :mime_type,
                 :sort_order, :is_cover, :created_at, :updated_at)'
        );
        $stmt->execute([
            'car_id' => $data['car_id'],
            'user_id' => $data['user_id'],
            'file_path' => $data['file_path'],
            'file_name' => $data['file_name'],
            'file_size' => $data['file_size'],
            'mime_type' => $data['mime_type'],
            'sort_order' => $data['sort_order'],
            'is_cover' => $data['is_cover'],
            'created_at' => $data['created_at'],
            'updated_at' => $data['updated_at'] ?? null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function clearCover(int $carId): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE car_images
             SET is_cover = 0, updated_at = :updated_at
             WHERE car_id = :car_id
             AND deleted_at IS NULL'
        );
        $stmt->execute([
            'car_id' => $carId,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function setCover(int $id): void
    {
        $stmt = $this->pdo->prepare('UPDATE car_images SET is_cover = 1, updated_at = :updated_at WHERE id = :id');
        $stmt->execute([
            'id' => $id,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function updateSortOrder(int $id, int $sortOrder): void
    {
        $stmt = $this->pdo->prepare('UPDATE car_images SET sort_order = :sort_order, updated_at = :updated_at WHERE id = :id');
        $stmt->execute([
            'id' => $id,
            'sort_order' => $sortOrder,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function softDelete(int $id): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE car_images
             SET deleted_at = :deleted_at, is_cover = 0, updated_at = :updated_at
             WHERE id = :id'
        );
        $now = date('Y-m-d H:i:s');
        $stmt->execute([
            'id' => $id,
            'deleted_at' => $now,
            'updated_at' => $now,
        ]);
    }

    public function softDeletedBefore(string $cutoff, int $limit = 100): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, car_id, user_id, file_path, file_name, file_size, mime_type,
                    sort_order, is_cover, created_at, updated_at, deleted_at
             FROM car_images
             WHERE deleted_at IS NOT NULL
             AND deleted_at < :cutoff
             ORDER BY deleted_at ASC, id ASC
             LIMIT :limit'
        );
        $stmt->bindValue('cutoff', $cutoff);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }
}
