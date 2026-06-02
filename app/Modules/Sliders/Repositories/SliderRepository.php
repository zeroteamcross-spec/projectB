<?php

declare(strict_types=1);

namespace App\Modules\Sliders\Repositories;

use PDO;

class SliderRepository
{
    private const SELECT_COLUMNS = 'id, code, title, subtitle, body_text, html_content, image_url, image_alt,
        cta_text, cta_url, position_key, template_key, animation_key, sort_order, is_active,
        start_at, end_at, created_by, updated_by, created_at, updated_at, deleted_at';

    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function list(array $filters, int $limit, int $offset): array
    {
        [$where, $params] = $this->buildWhere($filters);
        $sql = 'SELECT ' . self::SELECT_COLUMNS . ' FROM sliders ' . $where . ' ORDER BY sort_order ASC, id DESC LIMIT :limit OFFSET :offset';
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
        $stmt = $this->pdo->prepare('SELECT COUNT(*) AS total FROM sliders ' . $where);

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->execute();
        $row = $stmt->fetch();

        return (int) ($row['total'] ?? 0);
    }

    public function publicList(?string $positionKey, int $limit, string $now): array
    {
        $conditions = [
            'deleted_at IS NULL',
            'is_active = 1',
            '(start_at IS NULL OR start_at <= :now_start)',
            '(end_at IS NULL OR end_at >= :now_end)',
        ];
        $params = [
            'now_start' => $now,
            'now_end' => $now,
        ];

        if ($positionKey !== null && $positionKey !== '') {
            $conditions[] = 'position_key = :position_key';
            $params['position_key'] = $positionKey;
        }

        $stmt = $this->pdo->prepare(
            'SELECT ' . self::SELECT_COLUMNS . ' FROM sliders WHERE ' . implode(' AND ', $conditions) . ' ORDER BY sort_order ASC, id DESC LIMIT :limit'
        );

        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }

        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT ' . self::SELECT_COLUMNS . ' FROM sliders WHERE id = :id AND deleted_at IS NULL LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function findByCode(string $code, ?int $exceptId = null): ?array
    {
        $sql = 'SELECT ' . self::SELECT_COLUMNS . ' FROM sliders WHERE code = :code AND deleted_at IS NULL';
        $params = ['code' => $code];

        if ($exceptId !== null) {
            $sql .= ' AND id <> :except_id';
            $params['except_id'] = $exceptId;
        }

        $sql .= ' LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();

        return $row ?: null;
    }

    public function create(array $data): int
    {
        $columns = array_keys($data);
        $placeholders = array_map(static fn (string $column): string => ':' . $column, $columns);
        $stmt = $this->pdo->prepare(
            'INSERT INTO sliders (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')'
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
        $stmt = $this->pdo->prepare('UPDATE sliders SET ' . implode(', ', $sets) . ' WHERE id = :id');
        $stmt->execute($data);
    }

    public function softDelete(int $id, int $userId): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE sliders SET deleted_at = :deleted_at, updated_at = :updated_at, updated_by = :updated_by WHERE id = :id'
        );
        $now = date('Y-m-d H:i:s');
        $stmt->execute([
            'id' => $id,
            'deleted_at' => $now,
            'updated_at' => $now,
            'updated_by' => $userId,
        ]);
    }

    private function buildWhere(array $filters): array
    {
        $conditions = ['deleted_at IS NULL'];
        $params = [];

        foreach (['position_key', 'template_key', 'animation_key'] as $field) {
            if (isset($filters[$field]) && $filters[$field] !== '') {
                $conditions[] = $field . ' = :' . $field;
                $params[$field] = $filters[$field];
            }
        }

        if (array_key_exists('is_active', $filters) && $filters['is_active'] !== '') {
            $conditions[] = 'is_active = :is_active';
            $params['is_active'] = (int) (bool) $filters['is_active'];
        }

        if (isset($filters['keyword']) && $filters['keyword'] !== '') {
            $conditions[] = '(code LIKE :keyword OR title LIKE :keyword OR subtitle LIKE :keyword OR body_text LIKE :keyword)';
            $params['keyword'] = '%' . $filters['keyword'] . '%';
        }

        return ['WHERE ' . implode(' AND ', $conditions), $params];
    }
}
