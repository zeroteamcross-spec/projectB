<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Models\RouteStyleDocument;
use App\Modules\DesignStudio\Repositories\DraftRepository;

class LegacyMigrationService
{
    private DraftRepository $drafts;
    private LegacyMigrationPreviewService $preview;
    private LegacySnapshotService $snapshots;
    private RouteMigrationService $routes;
    private ?AuditService $audit;

    public function __construct(
        DraftRepository $drafts,
        ?LegacyMigrationPreviewService $preview = null,
        ?LegacySnapshotService $snapshots = null,
        ?RouteMigrationService $routes = null,
        ?AuditService $audit = null
    ) {
        $this->drafts = $drafts;
        $this->preview = $preview ?? new LegacyMigrationPreviewService();
        $this->snapshots = $snapshots ?? new LegacySnapshotService();
        $this->routes = $routes ?? new RouteMigrationService();
        $this->audit = $audit;
    }

    public function preview(array $legacyPayload): array
    {
        return $this->preview->preview($legacyPayload, $this->drafts->get((string) ($legacyPayload['route'] ?? '')) ?? []);
    }

    public function confirmMigration(array $legacyPayload, int $updatedBy): ?array
    {
        $preview = $this->preview($legacyPayload);
        $route = $preview['route'];

        if ($route === '') {
            return null;
        }

        $this->snapshots->save($route, $legacyPayload);

        $draft = RouteStyleDocument::empty($route);
        $draft['updatedBy'] = $updatedBy;
        $draft['updatedAt'] = date('Y-m-d H:i:s');
        $draft['elements'] = $preview['elements'];

        if (! $this->drafts->save($route, $draft)) {
            return null;
        }

        $this->routes->markMigrated($route, $preview['conflicts'] === [] ? 'FULL' : 'PARTIAL');

        if ($this->audit !== null) {
            $this->audit->recordMigration($route, $updatedBy, $preview);
        }

        return $draft;
    }

    public function enableV2(string $route, int $userId): bool
    {
        $result = $this->routes->setV2Enabled($route, true);

        if ($result && $this->audit !== null) {
            $this->audit->recordEnableV2($route, $userId);
        }

        return $result;
    }

    public function disableV2(string $route, int $userId): bool
    {
        $result = $this->routes->setV2Enabled($route, false);

        if ($result && $this->audit !== null) {
            $this->audit->recordDisableV2($route, $userId);
        }

        return $result;
    }
}
