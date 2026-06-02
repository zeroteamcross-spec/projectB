<?php

declare(strict_types=1);

namespace App\Infrastructure\Database;

use PDO;

class SchemaInspector
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function tableExists(string $tableName): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) AS total
             FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE()
             AND TABLE_NAME = :table_name'
        );
        $stmt->execute(['table_name' => $tableName]);

        return (int) ($stmt->fetch()['total'] ?? 0) > 0;
    }
}
