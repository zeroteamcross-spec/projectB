<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\AuditRepository;
use App\Modules\DesignStudio\Repositories\PublishRepository;
use App\Modules\DesignStudio\Repositories\RegistryRepository;
use App\Modules\DesignStudio\Repositories\VersionHistoryRepository;

class ExportService
{
    private PublishRepository $published;
    private VersionHistoryRepository $history;
    private AuditRepository $audit;
    private RegistryRepository $registry;
    private ?HealthCheckerService $healthChecker;

    public function __construct(
        PublishRepository $published,
        VersionHistoryRepository $history,
        AuditRepository $audit,
        RegistryRepository $registry,
        ?HealthCheckerService $healthChecker = null
    ) {
        $this->published = $published;
        $this->history = $history;
        $this->audit = $audit;
        $this->registry = $registry;
        $this->healthChecker = $healthChecker;
    }

    public function exportRoute(string $route, array $options = []): array
    {
        $published = $this->published->getPublished($route);

        $payload = [
            'schemaVersion' => 1,
            'type' => 'design_studio_v2_export',
            'route' => $route,
            'version' => $published['version'] ?? null,
            'published' => $published,
            'metadata' => [
                'exportedAt' => date('Y-m-d H:i:s'),
                'environment' => $options['environment'] ?? null,
                'exportedBy' => $options['exportedBy'] ?? null,
            ],
        ];

        if (($options['includeHistory'] ?? false) === true) {
            $payload['history'] = array_values($this->history->all($route));
        }

        if (($options['includeAudit'] ?? false) === true) {
            $payload['auditSummary'] = $this->auditSummary($this->audit->forRoute($route));
        }

        if (($options['includeHealthReport'] ?? false) === true && $this->healthChecker !== null && $published !== null) {
            $payload['healthReport'] = $this->healthChecker->check($published);
        }

        $index = $this->registry->getIndex();
        $payload['registry'] = $index['routes'][$route] ?? null;

        return $payload;
    }

    public function toJson(array $payload): string
    {
        return json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) ?: '{}';
    }

    private function auditSummary(array $entries): array
    {
        return [
            'total' => count($entries),
            'publish' => count(array_filter($entries, static fn (array $entry): bool => ($entry['type'] ?? null) === 'publish')),
            'rollback' => count(array_filter($entries, static fn (array $entry): bool => ($entry['type'] ?? null) === 'rollback')),
        ];
    }
}
