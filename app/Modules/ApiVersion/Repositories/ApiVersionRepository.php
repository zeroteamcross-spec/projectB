<?php

declare(strict_types=1);

namespace App\Modules\ApiVersion\Repositories;

use PDO;
use RuntimeException;

class ApiVersionRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findByResourceName(string $resourceName): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, resource_name, display_name, version_number, created_at, updated_at
             FROM api_versions
             WHERE resource_name = :resource_name
             LIMIT 1'
        );
        $stmt->execute(['resource_name' => $resourceName]);
        $version = $stmt->fetch();

        return $version ?: null;
    }

    public function findMany(array $resourceNames = []): array
    {
        if ($resourceNames === []) {
            $stmt = $this->pdo->query(
                'SELECT id, resource_name, display_name, version_number, created_at, updated_at
                 FROM api_versions
                 ORDER BY resource_name ASC'
            );

            return $stmt->fetchAll() ?: [];
        }

        $placeholders = [];
        $params = [];

        foreach (array_values($resourceNames) as $index => $resourceName) {
            $key = ':resource_' . $index;
            $placeholders[] = $key;
            $params[$key] = $resourceName;
        }

        $stmt = $this->pdo->prepare(
            'SELECT id, resource_name, display_name, version_number, created_at, updated_at
             FROM api_versions
             WHERE resource_name IN (' . implode(', ', $placeholders) . ')
             ORDER BY resource_name ASC'
        );
        $stmt->execute($params);

        return $stmt->fetchAll() ?: [];
    }

    public function create(string $resourceName, ?string $displayName = null): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO api_versions (resource_name, display_name, version_number, created_at, updated_at)
             VALUES (:resource_name, :display_name, 1, :created_at, NULL)'
        );
        $stmt->execute([
            'resource_name' => $resourceName,
            'display_name' => $displayName,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function bump(string $resourceName, ?string $displayName = null): array
    {
        $version = $this->findByResourceName($resourceName);

        if (! $version) {
            $this->create($resourceName, $displayName);

            $created = $this->findByResourceName($resourceName);

            if (! $created) {
                throw new RuntimeException('Failed to create API version row.');
            }

            return $created;
        }

        $stmt = $this->pdo->prepare(
            'UPDATE api_versions
             SET version_number = version_number + 1,
                 display_name = :display_name,
                 updated_at = :updated_at
             WHERE resource_name = :resource_name'
        );
        $stmt->execute([
            'resource_name' => $resourceName,
            'display_name' => $displayName ?? $version['display_name'],
            'updated_at' => date('Y-m-d H:i:s'),
        ]);

        $updated = $this->findByResourceName($resourceName);

        if (! $updated) {
            throw new RuntimeException('Failed to reload API version row.');
        }

        return $updated;
    }
}
