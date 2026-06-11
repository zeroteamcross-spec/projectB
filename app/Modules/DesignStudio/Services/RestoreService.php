<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\PublishRepository;
use App\Modules\DesignStudio\Repositories\VersionHistoryRepository;

class RestoreService
{
    private PublishRepository $published;
    private VersionHistoryRepository $history;

    public function __construct(PublishRepository $published, VersionHistoryRepository $history)
    {
        $this->published = $published;
        $this->history = $history;
    }

    public function restore(array $backup, int $publishedBy, bool $confirm = false): ?array
    {
        if (! $confirm || ($backup['type'] ?? null) !== 'design_studio_v2_backup' || ! is_array($backup['published'] ?? null)) {
            return null;
        }

        $route = (string) $backup['route'];
        $nextVersion = $this->history->latestVersion($route) + 1;
        $snapshot = $backup['published'];
        $snapshot['version'] = $nextVersion;
        $snapshot['publishedBy'] = $publishedBy;
        $snapshot['publishedAt'] = date('Y-m-d H:i:s');
        $snapshot['restored'] = true;
        $snapshot['restoreSourceVersion'] = $backup['published']['version'] ?? null;

        if (! $this->history->saveSnapshot($route, $nextVersion, $snapshot)) {
            return null;
        }

        if (! $this->published->savePublishedAtomic($route, $snapshot)) {
            $this->history->deleteSnapshot($route, $nextVersion);
            return null;
        }

        return $snapshot;
    }
}
