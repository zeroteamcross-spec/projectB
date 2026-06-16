<?php

declare(strict_types=1);

namespace App\Modules\Cars\Repositories;

use PDO;

class CarRepository
{
    private const SELECT_COLUMNS = 'id, seller_user_id, showroom_id, listing_status, stock,
        license_plate_number, brand_name, model_name, sub_model_name, primary_color,
        secondary_color, color_variation, document_type, registration_date, transmission,
        engine_number, chassis_number, location_name, engine_capacity_cc, mileage_km,
        seat_count, previous_owner_count, has_service_book, key_count, description,
        youtube_url, price_cash, price_discount, price_credit, inspection_summary_status, published_at,
        created_at, updated_at,
        (
            SELECT cover_image.file_path
            FROM car_images AS cover_image
            WHERE cover_image.car_id = cars.id
            AND cover_image.deleted_at IS NULL
            ORDER BY cover_image.is_cover DESC, cover_image.sort_order ASC, cover_image.id ASC
            LIMIT 1
        ) AS car_cover_image';

    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function list(array $filters, int $limit, int $offset): array
    {
        [$where, $params] = $this->buildWhere($filters);
        $sql = 'SELECT ' . self::SELECT_COLUMNS . ' FROM cars ' . $where . ' ORDER BY id DESC LIMIT :limit OFFSET :offset';
        $stmt = $this->pdo->prepare($sql);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue('offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function count(array $filters): int
    {
        [$where, $params] = $this->buildWhere($filters);
        $stmt = $this->pdo->prepare('SELECT COUNT(*) AS total FROM cars ' . $where);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        $row = $stmt->fetch();

        return (int) ($row['total'] ?? 0);
    }

    public function findById(int $id, bool $includeArchived = false): ?array
    {
        $sql = 'SELECT ' . self::SELECT_COLUMNS . ' FROM cars WHERE id = :id';

        if (! $includeArchived) {
            $sql .= ' AND deleted_at IS NULL AND listing_status <> :archived';
        }

        $sql .= ' LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue('id', $id, PDO::PARAM_INT);

        if (! $includeArchived) {
            $stmt->bindValue('archived', 'archived');
        }

        $stmt->execute();
        $car = $stmt->fetch();

        return $car ?: null;
    }

    public function showroomIdForSeller(int $sellerUserId): ?int
    {
        $stmt = $this->pdo->prepare(
            'SELECT id FROM showrooms WHERE user_id = :user_id AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['user_id' => $sellerUserId]);
        $row = $stmt->fetch();

        return $row ? (int) $row['id'] : null;
    }

    public function create(array $data): int
    {
        $columns = array_keys($data);
        $placeholders = array_map(static fn (string $column): string => ':' . $column, $columns);
        $stmt = $this->pdo->prepare(
            'INSERT INTO cars (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')'
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $sets = [];

        foreach (array_keys($data) as $column) {
            $sets[] = $column . ' = :' . $column;
        }

        $data['id'] = $id;
        $stmt = $this->pdo->prepare('UPDATE cars SET ' . implode(', ', $sets) . ' WHERE id = :id');
        $stmt->execute($data);
    }

    public function archive(int $id): void
    {
        $stmt = $this->pdo->prepare(
            "UPDATE cars
             SET listing_status = 'archived', deleted_at = :deleted_at, updated_at = :updated_at
             WHERE id = :id"
        );
        $now = date('Y-m-d H:i:s');
        $stmt->execute([
            'id' => $id,
            'deleted_at' => $now,
            'updated_at' => $now,
        ]);
    }

    private function buildWhere(array $filters): array
    {
        $conditions = ['deleted_at IS NULL'];
        $params = [];

        foreach ([
            'listing_status',
            'seller_user_id',
            'showroom_id',
            'brand_name',
            'model_name',
            'location_name',
            'transmission',
            'document_type',
            'inspection_summary_status',
        ] as $field) {
            if (isset($filters[$field]) && $filters[$field] !== '') {
                $conditions[] = $field . ' = :' . $field;
                $params[$field] = $filters[$field];
            }
        }

        if (isset($filters['min_price_cash']) && $filters['min_price_cash'] !== '') {
            $conditions[] = 'price_cash >= :min_price_cash';
            $params['min_price_cash'] = (int) $filters['min_price_cash'];
        }

        if (isset($filters['max_price_cash']) && $filters['max_price_cash'] !== '') {
            $conditions[] = 'price_cash <= :max_price_cash';
            $params['max_price_cash'] = (int) $filters['max_price_cash'];
        }

        if (isset($filters['keyword']) && $filters['keyword'] !== '') {
            $conditions[] = '(brand_name LIKE :keyword OR model_name LIKE :keyword OR sub_model_name LIKE :keyword OR location_name LIKE :keyword)';
            $params['keyword'] = '%' . $filters['keyword'] . '%';
        }

        return ['WHERE ' . implode(' AND ', $conditions), $params];
    }
}
