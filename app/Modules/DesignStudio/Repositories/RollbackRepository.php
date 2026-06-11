<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Repositories;

class RollbackRepository
{
    private PublishRepository $published;
    private VersionHistoryRepository $history;

    public function __construct(PublishRepository $published, VersionHistoryRepository $history)
    {
        $this->published = $published;
        $this->history = $history;
    }

    public function getCurrentPublished(string $route): ?array
    {
        return $this->published->getPublished($route);
    }

    public function getTargetVersion(string $route, int $version): ?array
    {
        return $this->history->find($route, $version);
    }

    public function nextVersion(string $route): int
    {
        return $this->history->latestVersion($route) + 1;
    }

    public function saveRollbackSnapshot(string $route, int $version, array $snapshot): bool
    {
        return $this->history->saveSnapshot($route, $version, $snapshot);
    }

    public function publishRollback(string $route, array $snapshot): bool
    {
        return $this->published->savePublishedAtomic($route, $snapshot);
    }

    public function deleteRollbackSnapshot(string $route, int $version): bool
    {
        return $this->history->deleteSnapshot($route, $version);
    }

    public function enforceRetention(string $route, int $maxHistory): void
    {
        $this->history->enforceLimit($route, $maxHistory);
    }

    public function clearRouteCache(string $route): bool
    {
        return $this->published->clearRouteCache($route);
    }
}
