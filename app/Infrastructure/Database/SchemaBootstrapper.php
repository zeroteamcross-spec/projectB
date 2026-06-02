<?php

declare(strict_types=1);

namespace App\Infrastructure\Database;

use InvalidArgumentException;
use PDO;

class SchemaBootstrapper
{
    private PDO $pdo;

    private SchemaInspector $inspector;

    private static array $ensuredTables = [];

    public function __construct(PDO $pdo, SchemaInspector $inspector)
    {
        $this->pdo = $pdo;
        $this->inspector = $inspector;
    }

    public function ensureTable(string $tableName, string $createTableSql): void
    {
        if (! (bool) config('schema.auto_bootstrap_enabled', false)) {
            return;
        }

        $this->assertSafeTableName($tableName);

        if (isset(self::$ensuredTables[$tableName])) {
            return;
        }

        if (! $this->inspector->tableExists($tableName)) {
            $this->pdo->exec($createTableSql);
        }

        self::$ensuredTables[$tableName] = true;
    }

    private function assertSafeTableName(string $tableName): void
    {
        if (! preg_match('/^[a-z][a-z0-9_]*$/', $tableName)) {
            throw new InvalidArgumentException('Unsafe table name for schema bootstrap.');
        }
    }
}
