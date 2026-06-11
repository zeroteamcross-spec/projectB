<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Repositories;

class AuditRepository extends JsonRepository
{
    public function append(array $entry): ?array
    {
        if (! $this->isEnabled()) {
            return null;
        }

        $auditId = $this->nextAuditId();
        $document = array_merge($entry, ['auditId' => $auditId]);
        $path = $this->auditPath() . DIRECTORY_SEPARATOR . sprintf('audit-%06d.json', $auditId);

        return $this->writeJson($path, $document) ? $document : null;
    }

    public function latest(): ?array
    {
        $items = $this->all();

        if ($items === []) {
            return null;
        }

        return end($items) ?: null;
    }

    public function all(): array
    {
        if (! $this->isEnabled()) {
            return [];
        }

        $auditPath = $this->storagePath . DIRECTORY_SEPARATOR . 'audit';
        $files = is_dir($auditPath) ? (glob($auditPath . DIRECTORY_SEPARATOR . '*.json') ?: []) : [];
        $items = [];

        foreach ($files as $file) {
            $data = $this->readJson($file);

            if ($data !== []) {
                $items[basename($file, '.json')] = $data;
            }
        }

        ksort($items);

        return $items;
    }

    public function forRoute(string $route): array
    {
        return array_values(array_filter($this->all(), static fn (array $entry): bool => ($entry['route'] ?? null) === $route));
    }

    private function nextAuditId(): int
    {
        $ids = array_map(static fn (array $entry): int => (int) ($entry['auditId'] ?? 0), $this->all());

        return $ids === [] ? 1 : max($ids) + 1;
    }

    private function auditPath(): string
    {
        return $this->storagePath . DIRECTORY_SEPARATOR . 'audit';
    }
}
