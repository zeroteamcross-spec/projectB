<?php

declare(strict_types=1);

namespace App\Modules\Migration\Services;

use PDO;
use RuntimeException;
use Throwable;

class MigrationManagerService
{
    private PDO $pdo;

    private string $sqlPath;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
        $this->sqlPath = base_path('scripts/sql');
    }

    public function status(): array
    {
        $this->ensureMigrationTable();
        $applied = $this->appliedMigrations();

        return array_map(function (array $file) use ($applied): array {
            $record = $applied[$file['name']] ?? null;

            return [
                'name' => $file['name'],
                'checksum' => $file['checksum'],
                'status' => $record ? 'applied' : 'pending',
                'applied_at' => $record['applied_at'] ?? null,
                'execution_ms' => isset($record['execution_ms']) ? (int) $record['execution_ms'] : null,
            ];
        }, $this->migrationFiles());
    }

    public function runPending(?int $limit = null): array
    {
        $this->ensureMigrationTable();
        $applied = $this->appliedMigrations();
        $results = [];
        $ran = 0;
        $halted = false;

        foreach ($this->migrationFiles() as $file) {
            if (isset($applied[$file['name']])) {
                $results[] = [
                    'name' => $file['name'],
                    'status' => 'skipped',
                    'reason' => 'already_applied',
                ];
                continue;
            }

            if ($halted) {
                $results[] = [
                    'name' => $file['name'],
                    'status' => 'pending',
                    'reason' => 'previous_migration_failed',
                ];
                continue;
            }

            if ($limit !== null && $ran >= $limit) {
                $results[] = [
                    'name' => $file['name'],
                    'status' => 'pending',
                    'reason' => 'limit_reached',
                ];
                continue;
            }

            $result = $this->runFile($file);
            $results[] = $result;
            $halted = ($result['status'] ?? '') === 'failed';
            $ran++;
        }

        return $results;
    }

    public function markApplied(string $name): array
    {
        $this->ensureMigrationTable();
        $file = $this->findMigrationFile($name);

        if ($file === null) {
            throw new RuntimeException('Migration file tidak ditemukan.');
        }

        $this->recordApplied($file, 0);

        return [
            'name' => $file['name'],
            'checksum' => $file['checksum'],
            'status' => 'applied',
            'execution_ms' => 0,
        ];
    }

    private function runFile(array $file): array
    {
        $started = microtime(true);
        $statements = $this->splitStatements((string) file_get_contents($file['path']));
        $executed = [];
        $skipped = [];

        try {
            foreach ($statements as $statement) {
                $next = $this->prepareIdempotentStatement($statement);

                if ($next === null) {
                    $skipped[] = $this->statementLabel($statement);
                    continue;
                }

                $this->pdo->exec($next);
                $executed[] = $this->statementLabel($next);
            }

            $executionMs = (int) round((microtime(true) - $started) * 1000);
            $this->recordApplied($file, $executionMs);

            return [
                'name' => $file['name'],
                'status' => 'applied',
                'executed' => $executed,
                'skipped' => $skipped,
                'execution_ms' => $executionMs,
            ];
        } catch (Throwable $exception) {
            return [
                'name' => $file['name'],
                'status' => 'failed',
                'message' => $exception->getMessage(),
                'executed' => $executed,
                'skipped' => $skipped,
            ];
        }
    }

    private function ensureMigrationTable(): void
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS schema_migrations (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                migration_name VARCHAR(190) NOT NULL,
                checksum CHAR(64) NOT NULL,
                applied_at DATETIME NOT NULL,
                execution_ms INT UNSIGNED NULL,
                created_at DATETIME NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY schema_migrations_name_unique (migration_name)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    private function appliedMigrations(): array
    {
        $stmt = $this->pdo->query(
            'SELECT migration_name, checksum, applied_at, execution_ms
             FROM schema_migrations
             ORDER BY migration_name ASC'
        );

        $rows = $stmt->fetchAll() ?: [];
        $applied = [];

        foreach ($rows as $row) {
            $applied[$row['migration_name']] = $row;
        }

        return $applied;
    }

    private function migrationFiles(): array
    {
        $files = glob($this->sqlPath . DIRECTORY_SEPARATOR . '*.sql') ?: [];
        sort($files);

        return array_map(static function (string $path): array {
            return [
                'name' => basename($path),
                'path' => $path,
                'checksum' => hash_file('sha256', $path),
            ];
        }, $files);
    }

    private function findMigrationFile(string $name): ?array
    {
        $name = basename($name);

        foreach ($this->migrationFiles() as $file) {
            if ($file['name'] === $name) {
                return $file;
            }
        }

        return null;
    }

    private function recordApplied(array $file, int $executionMs): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO schema_migrations (migration_name, checksum, applied_at, execution_ms, created_at)
             VALUES (:migration_name, :checksum, :applied_at, :execution_ms, :created_at)
             ON DUPLICATE KEY UPDATE
                checksum = VALUES(checksum),
                applied_at = VALUES(applied_at),
                execution_ms = VALUES(execution_ms)'
        );
        $now = date('Y-m-d H:i:s');
        $stmt->execute([
            'migration_name' => $file['name'],
            'checksum' => $file['checksum'],
            'applied_at' => $now,
            'execution_ms' => $executionMs,
            'created_at' => $now,
        ]);
    }

    private function prepareIdempotentStatement(string $statement): ?string
    {
        $trimmed = trim($statement);

        if ($trimmed === '') {
            return null;
        }

        // CREATE INDEX berdiri sendiri, di luar ALTER TABLE, jadi tidak lewat
        // pemeriksaan klausa di bawah. Dua migrasi memakai bentuk ini dan
        // keduanya mati saat diulang.
        if (preg_match('/^CREATE\s+(?:UNIQUE\s+|FULLTEXT\s+|SPATIAL\s+)?INDEX\s+`?([a-zA-Z0-9_]+)`?\s+ON\s+`?([a-zA-Z0-9_]+)`?/is', $trimmed, $matches)) {
            return $this->indexExists($matches[2], $matches[1]) ? null : $trimmed;
        }

        if (! preg_match('/^ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s+(.*)$/is', $trimmed, $matches)) {
            return $trimmed;
        }

        $table = $matches[1];
        $clauses = $this->splitAlterClauses($matches[2]);
        $pending = [];

        foreach ($clauses as $clause) {
            if ($this->shouldSkipAlterClause($table, $clause)) {
                continue;
            }

            $pending[] = $clause;
        }

        if ($pending === []) {
            return null;
        }

        return 'ALTER TABLE ' . $this->quoteIdentifier($table) . "\n    " . implode(",\n    ", $pending);
    }

    /**
     * Urutannya penting, dan dulu terbalik.
     *
     * Pola kolom "ADD (COLUMN )?<nama>" juga cocok dengan "ADD INDEX foo (bar)"
     * -- ia menangkap kata INDEX sebagai nama kolom, mencari kolom bernama
     * "INDEX", tidak menemukannya, lalu menyimpulkan klausanya perlu dijalankan.
     * Akibatnya indeks dan constraint tidak pernah benar-benar idempoten, dan
     * migrasi yang diulang mati dengan "Duplicate key name". Yang spesifik
     * harus diperiksa lebih dulu.
     */
    private function shouldSkipAlterClause(string $table, string $clause): bool
    {
        $trimmed = trim($clause);

        if (preg_match('/^ADD\s+(?:UNIQUE\s+|FULLTEXT\s+|SPATIAL\s+)?(?:INDEX|KEY)\s+`?([a-zA-Z0-9_]+)`?/is', $trimmed, $matches)) {
            return $this->indexExists($table, $matches[1]);
        }

        if (preg_match('/^ADD\s+CONSTRAINT\s+`?([a-zA-Z0-9_]+)`?/is', $trimmed, $matches)) {
            return $this->constraintExists($table, $matches[1]);
        }

        // Bentuk tanpa nama -- ADD PRIMARY KEY, ADD FOREIGN KEY, ADD UNIQUE
        // (kolom) -- tidak punya pengenal untuk dicari, jadi dibiarkan jalan
        // dan biar database yang menolak kalau memang sudah ada.
        if (preg_match('/^ADD\s+(?:PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE)\b/is', $trimmed)) {
            return false;
        }

        if (preg_match('/^ADD\s+(?:COLUMN\s+)?`?([a-zA-Z0-9_]+)`?\s+/is', $trimmed, $matches)) {
            return $this->columnExists($table, $matches[1]);
        }

        return false;
    }

    private function columnExists(string $table, string $column): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name
               AND COLUMN_NAME = :column_name'
        );
        $stmt->execute(['table_name' => $table, 'column_name' => $column]);

        return (int) $stmt->fetchColumn() > 0;
    }

    private function indexExists(string $table, string $index): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name
               AND INDEX_NAME = :index_name'
        );
        $stmt->execute(['table_name' => $table, 'index_name' => $index]);

        return (int) $stmt->fetchColumn() > 0;
    }

    private function constraintExists(string $table, string $constraint): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
             WHERE CONSTRAINT_SCHEMA = DATABASE()
               AND TABLE_NAME = :table_name
               AND CONSTRAINT_NAME = :constraint_name'
        );
        $stmt->execute(['table_name' => $table, 'constraint_name' => $constraint]);

        return (int) $stmt->fetchColumn() > 0;
    }

    private function splitStatements(string $sql): array
    {
        $sql = preg_replace('/^\s*--.*$/m', '', $sql) ?? $sql;
        $statements = preg_split('/;\s*(?:\r?\n|$)/', $sql) ?: [];

        return array_values(array_filter(array_map('trim', $statements), static fn (string $statement): bool => $statement !== ''));
    }

    private function splitAlterClauses(string $sql): array
    {
        $clauses = [];
        $current = '';
        $depth = 0;
        $length = strlen($sql);
        $quote = null;

        for ($i = 0; $i < $length; $i++) {
            $char = $sql[$i];

            if ($quote !== null) {
                $current .= $char;
                if ($char === $quote && ($i === 0 || $sql[$i - 1] !== '\\')) {
                    $quote = null;
                }
                continue;
            }

            if ($char === '\'' || $char === '"' || $char === '`') {
                $quote = $char;
                $current .= $char;
                continue;
            }

            if ($char === '(') {
                $depth++;
            } elseif ($char === ')') {
                $depth = max(0, $depth - 1);
            }

            if ($char === ',' && $depth === 0) {
                $clauses[] = trim($current);
                $current = '';
                continue;
            }

            $current .= $char;
        }

        if (trim($current) !== '') {
            $clauses[] = trim($current);
        }

        return $clauses;
    }

    private function statementLabel(string $statement): string
    {
        $line = trim(preg_replace('/\s+/', ' ', $statement) ?? $statement);

        return strlen($line) > 140 ? substr($line, 0, 137) . '...' : $line;
    }

    private function quoteIdentifier(string $identifier): string
    {
        if (! preg_match('/^[a-zA-Z0-9_]+$/', $identifier)) {
            throw new RuntimeException('Invalid SQL identifier: ' . $identifier);
        }

        return '`' . $identifier . '`';
    }
}
