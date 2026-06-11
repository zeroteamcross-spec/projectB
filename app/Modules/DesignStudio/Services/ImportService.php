<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\PublishRepository;
use App\Modules\DesignStudio\Repositories\VersionHistoryRepository;

class ImportService
{
    private PublishRepository $published;
    private VersionHistoryRepository $history;
    private ChecksumValidator $checksum;

    public function __construct(PublishRepository $published, VersionHistoryRepository $history, ?ChecksumValidator $checksum = null)
    {
        $this->published = $published;
        $this->history = $history;
        $this->checksum = $checksum ?? new ChecksumValidator();
    }

    public function dryRun(array $payload, string $route): array
    {
        $validation = $this->validate($payload, $route);
        $current = $this->published->getPublished($route);
        $warnings = [];

        if (($current['version'] ?? 0) > ($payload['version'] ?? 0)) {
            $warnings[] = 'import_version_older_than_current';
        }

        return [
            'valid' => $validation === [],
            'errors' => $validation,
            'warnings' => $warnings,
            'route' => $route,
            'strategy' => 'create_new_version',
            'currentVersion' => $current['version'] ?? null,
            'importVersion' => $payload['version'] ?? null,
        ];
    }

    public function import(array $payload, string $route, int $publishedBy, bool $confirm = false): ?array
    {
        if (! $confirm || $this->dryRun($payload, $route)['valid'] !== true) {
            return null;
        }

        $published = $payload['published'] ?? null;

        if (! is_array($published)) {
            return null;
        }

        $nextVersion = $this->history->latestVersion($route) + 1;
        $snapshot = $published;
        $snapshot['version'] = $nextVersion;
        $snapshot['route'] = $route;
        $snapshot['publishedBy'] = $publishedBy;
        $snapshot['publishedAt'] = date('Y-m-d H:i:s');
        $snapshot['publishNote'] = 'Imported configuration';
        $snapshot['imported'] = true;
        $snapshot['importSourceVersion'] = $payload['version'] ?? null;

        if (! $this->history->saveSnapshot($route, $nextVersion, $snapshot)) {
            return null;
        }

        if (! $this->published->savePublishedAtomic($route, $snapshot)) {
            $this->history->deleteSnapshot($route, $nextVersion);
            return null;
        }

        $this->history->enforceLimit($route, (int) config('design_studio.max_history', 20));

        return $snapshot;
    }

    public function previewReplaceRoute(array $payload, string $route): array
    {
        return array_merge($this->dryRun($payload, $route), [
            'strategy' => 'replace_route_preview_only',
            'writeAllowed' => false,
        ]);
    }

    private function validate(array $payload, string $route): array
    {
        $errors = [];

        if (($payload['type'] ?? null) !== 'design_studio_v2_export') {
            $errors[] = 'invalid_export_type';
        }

        if (! $this->checksum->validate($payload)) {
            $errors[] = 'checksum_mismatch';
        }

        if (($payload['route'] ?? null) !== $route) {
            $errors[] = 'route_mismatch';
        }

        if (! is_array($payload['published'] ?? null)) {
            $errors[] = 'missing_published';
        }

        return $errors;
    }
}
