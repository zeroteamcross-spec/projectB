<?php

declare(strict_types=1);

namespace App\Modules\Favorites\Repositories;

use PDO;
use PDOException;

class FavoriteRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    /**
     * Active favorites for a user, most recently favorited first.
     *
     * @return array<int, array{car_id: int, created_at: string, updated_at: ?string}>
     */
    public function listActive(int $userId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT car_id, created_at, updated_at
             FROM car_favorites
             WHERE user_id = :user_id
             AND deleted_at IS NULL
             ORDER BY COALESCE(updated_at, created_at) DESC, id DESC'
        );
        $stmt->execute(['user_id' => $userId]);

        return array_map(static function (array $row): array {
            return [
                'car_id' => (int) $row['car_id'],
                'created_at' => $row['created_at'],
                'updated_at' => $row['updated_at'],
            ];
        }, $stmt->fetchAll());
    }

    /**
     * @return array<int, int>
     */
    public function activeCarIds(int $userId): array
    {
        return array_map(
            static fn (array $row): int => $row['car_id'],
            $this->listActive($userId)
        );
    }

    public function isFavorited(int $userId, int $carId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT id FROM car_favorites
             WHERE user_id = :user_id AND car_id = :car_id AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId, 'car_id' => $carId]);

        return $stmt->fetch() !== false;
    }

    /**
     * Re-favoriting an entry that was soft deleted revives the same row, so the
     * unique key keeps holding one row per (user, car) pair. Revive first, then
     * insert, so the statement stays portable across MySQL and SQLite.
     */
    public function add(int $userId, int $carId): void
    {
        if ($this->revive($userId, $carId) > 0) {
            return;
        }

        $now = date('Y-m-d H:i:s');

        try {
            $stmt = $this->pdo->prepare(
                'INSERT INTO car_favorites (user_id, car_id, created_at, updated_at, deleted_at)
                 VALUES (:user_id, :car_id, :created_at, :updated_at, NULL)'
            );
            $stmt->execute([
                'user_id' => $userId,
                'car_id' => $carId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } catch (PDOException $exception) {
            // A concurrent add won the race; the unique key rejected this one.
            if (($exception->errorInfo[0] ?? null) !== '23000' || $this->revive($userId, $carId) === 0) {
                throw $exception;
            }
        }
    }

    private function revive(int $userId, int $carId): int
    {
        $stmt = $this->pdo->prepare(
            'UPDATE car_favorites
             SET deleted_at = NULL, updated_at = :updated_at
             WHERE user_id = :user_id AND car_id = :car_id'
        );
        $stmt->execute([
            'user_id' => $userId,
            'car_id' => $carId,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        return $stmt->rowCount();
    }

    public function remove(int $userId, int $carId): void
    {
        $now = date('Y-m-d H:i:s');
        $stmt = $this->pdo->prepare(
            'UPDATE car_favorites
             SET deleted_at = :deleted_at, updated_at = :updated_at
             WHERE user_id = :user_id AND car_id = :car_id AND deleted_at IS NULL'
        );
        $stmt->execute([
            'user_id' => $userId,
            'car_id' => $carId,
            'deleted_at' => $now,
            'updated_at' => $now,
        ]);
    }
}
