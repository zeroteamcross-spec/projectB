<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Repositories;

use PDO;

class MasterDataRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function findByKey(string $masterKey): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT md.id, md.master_key, md.data_json, md.api_version_id,
                    md.created_at, md.updated_at,
                    av.resource_name, av.display_name, av.version_number
             FROM master_data AS md
             LEFT JOIN api_versions AS av ON av.id = md.api_version_id
             WHERE md.master_key = :master_key
             AND md.deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['master_key' => $masterKey]);
        $master = $stmt->fetch();

        return $master ?: null;
    }

    public function create(string $masterKey, array $data, ?int $apiVersionId): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO master_data (master_key, data_json, api_version_id, created_at, updated_at, deleted_at)
             VALUES (:master_key, :data_json, :api_version_id, :created_at, NULL, NULL)'
        );
        $stmt->execute([
            'master_key' => $masterKey,
            'data_json' => json_encode($data, JSON_UNESCAPED_SLASHES),
            'api_version_id' => $apiVersionId,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, array $data, ?int $apiVersionId): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE master_data
             SET data_json = :data_json,
                 api_version_id = :api_version_id,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );
        $stmt->execute([
            'id' => $id,
            'data_json' => json_encode($data, JSON_UNESCAPED_SLASHES),
            'api_version_id' => $apiVersionId,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }
}
