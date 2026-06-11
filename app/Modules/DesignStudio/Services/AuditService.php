<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\AuditRepository;

class AuditService
{
    private AuditRepository $audit;

    public function __construct(AuditRepository $audit)
    {
        $this->audit = $audit;
    }

    public function latest(): ?array
    {
        return $this->audit->latest();
    }

    public function all(): array
    {
        return $this->audit->all();
    }

    public function forRoute(string $route): array
    {
        return $this->audit->forRoute($route);
    }

    public function recordPublish(array $snapshot, array $statistics, ?string $username = null): ?array
    {
        return $this->audit->append([
            'type' => 'publish',
            'version' => $snapshot['version'] ?? null,
            'route' => $snapshot['route'] ?? null,
            'userId' => $snapshot['publishedBy'] ?? null,
            'username' => $username,
            'publishedAt' => $snapshot['publishedAt'] ?? null,
            'publishNote' => $snapshot['publishNote'] ?? null,
            'elementsChanged' => $statistics['elementsChanged'] ?? 0,
            'propertiesChanged' => $statistics['propertiesChanged'] ?? 0,
            'responsiveChanges' => [
                'mobile' => $statistics['mobile'] ?? 0,
                'tablet' => $statistics['tablet'] ?? 0,
                'desktop' => $statistics['desktop'] ?? 0,
            ],
        ]);
    }

    public function recordRollback(array $snapshot, array $statistics, ?string $username = null): ?array
    {
        return $this->audit->append([
            'type' => 'rollback',
            'version' => $snapshot['version'] ?? null,
            'rollbackFrom' => $snapshot['rollbackFrom'] ?? null,
            'rollbackTarget' => $snapshot['rollbackTarget'] ?? null,
            'rollbackNote' => $snapshot['rollbackNote'] ?? null,
            'route' => $snapshot['route'] ?? null,
            'userId' => $snapshot['publishedBy'] ?? null,
            'username' => $username,
            'publishedAt' => $snapshot['publishedAt'] ?? null,
            'elementsChanged' => $statistics['elementsChanged'] ?? 0,
            'propertiesChanged' => $statistics['propertiesChanged'] ?? 0,
            'responsiveChanges' => [
                'mobile' => $statistics['mobile'] ?? 0,
                'tablet' => $statistics['tablet'] ?? 0,
                'desktop' => $statistics['desktop'] ?? 0,
            ],
        ]);
    }

    public function recordMigration(string $route, int $userId, array $preview, ?string $username = null): ?array
    {
        return $this->audit->append([
            'type' => 'migration',
            'route' => $route,
            'userId' => $userId,
            'username' => $username,
            'createdAt' => date('Y-m-d H:i:s'),
            'risk' => $preview['risk'] ?? null,
            'elementsChanged' => count($preview['elements'] ?? []),
            'propertiesChanged' => count($preview['conflicts'] ?? []) + count($preview['unsupported'] ?? []),
        ]);
    }

    public function recordEnableV2(string $route, int $userId, ?string $username = null): ?array
    {
        return $this->audit->append([
            'type' => 'enable_v2',
            'route' => $route,
            'userId' => $userId,
            'username' => $username,
            'createdAt' => date('Y-m-d H:i:s'),
        ]);
    }

    public function recordDisableV2(string $route, int $userId, ?string $username = null): ?array
    {
        return $this->audit->append([
            'type' => 'disable_v2',
            'route' => $route,
            'userId' => $userId,
            'username' => $username,
            'createdAt' => date('Y-m-d H:i:s'),
        ]);
    }
}
