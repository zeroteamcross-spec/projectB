<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\VersionHistoryRepository;

class VersionTimelineService
{
    private VersionHistoryRepository $history;

    public function __construct(VersionHistoryRepository $history)
    {
        $this->history = $history;
    }

    public function timeline(string $route): array
    {
        return array_values(array_map(static function (array $snapshot): array {
            return [
                'version' => $snapshot['version'] ?? null,
                'route' => $snapshot['route'] ?? null,
                'publishedAt' => $snapshot['publishedAt'] ?? null,
                'publishedBy' => $snapshot['publishedBy'] ?? null,
                'publishNote' => $snapshot['publishNote'] ?? null,
                'rollback' => (bool) ($snapshot['rollback'] ?? false),
                'rollbackFrom' => $snapshot['rollbackFrom'] ?? null,
                'rollbackTarget' => $snapshot['rollbackTarget'] ?? null,
            ];
        }, $this->history->all($route)));
    }
}
