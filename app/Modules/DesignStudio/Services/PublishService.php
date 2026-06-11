<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\DraftRepository;
use App\Modules\DesignStudio\Repositories\PublishRepository;
use App\Modules\DesignStudio\Repositories\VersionHistoryRepository;

class PublishService
{
    private DraftRepository $drafts;
    private PublishRepository $published;
    private VersionHistoryRepository $history;
    private DraftValidator $validator;
    private ?AuditService $audit;
    private DiffEngine $diff;
    private ?HealthCheckerService $healthChecker;

    public function __construct(
        DraftRepository $drafts,
        PublishRepository $published,
        VersionHistoryRepository $history,
        ?DraftValidator $validator = null,
        ?AuditService $audit = null,
        ?DiffEngine $diff = null,
        ?HealthCheckerService $healthChecker = null
    ) {
        $this->drafts = $drafts;
        $this->published = $published;
        $this->history = $history;
        $this->validator = $validator ?? new DraftValidator();
        $this->audit = $audit;
        $this->diff = $diff ?? new DiffEngine();
        $this->healthChecker = $healthChecker;
    }

    public function publish(string $route, int $publishedBy, string $publishNote): ?array
    {
        $publishNote = trim($publishNote);

        if (strlen($publishNote) < 5 || strlen($publishNote) > 500) {
            return null;
        }

        $draft = $this->drafts->get($route);

        if ($draft === null || ! $this->validator->validate($draft)) {
            return null;
        }

        $version = $this->history->latestVersion($route) + 1;
        $snapshot = [
            'schemaVersion' => $draft['schemaVersion'],
            'version' => $version,
            'route' => $draft['route'],
            'publishedBy' => $publishedBy,
            'publishedAt' => date('Y-m-d H:i:s'),
            'publishNote' => $publishNote,
            'elements' => $draft['elements'],
        ];

        if (! $this->history->saveSnapshot($route, $version, $snapshot)) {
            return null;
        }

        if (! $this->published->savePublishedAtomic($route, $snapshot)) {
            $this->history->deleteSnapshot($route, $version);
            return null;
        }

        $this->history->enforceLimit($route, (int) config('design_studio.max_history', 20));
        $this->published->clearRouteCache($route);

        $previous = $this->history->find($route, $version - 1) ?? ['elements' => []];
        $statistics = $this->diff->statistics($this->diff->diff($previous, $snapshot));

        if ($this->audit !== null && $this->audit->recordPublish($snapshot, $statistics) === null) {
            $snapshot['warning'] = 'audit_write_failed';
        }

        if ($this->healthChecker !== null) {
            $healthReport = $this->healthChecker->check($snapshot);
            $snapshot['healthReport'] = $healthReport;
            $snapshot['requiresConfirmation'] = $healthReport['requiresConfirmation'] ?? false;
            $snapshot['requiresReason'] = $healthReport['requiresReason'] ?? false;
        }

        return $snapshot;
    }

    public function getPublished(string $route): ?array
    {
        return $this->published->getPublished($route);
    }
}
