<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Repositories;

use App\Modules\DesignStudio\Models\RouteStyleDocument;
use App\Modules\DesignStudio\Services\DraftRecoveryService;
use App\Modules\DesignStudio\Services\DraftValidator;

class DraftRepository extends JsonRepository
{
    private const MAX_DRAFT_BYTES = 2097152;

    private DraftValidator $validator;
    private DraftRecoveryService $recovery;

    public function __construct(?string $storagePath = null, ?DraftValidator $validator = null, ?DraftRecoveryService $recovery = null)
    {
        parent::__construct($storagePath);

        $this->validator = $validator ?? new DraftValidator();
        $this->recovery = $recovery ?? new DraftRecoveryService();
    }

    public function get(string $route): ?array
    {
        if (! $this->isEnabled()) {
            return null;
        }

        $path = $this->draftPath($route);
        $default = RouteStyleDocument::empty($route);

        if (! is_file($path)) {
            $publishedRepo = new PublishRepository($this->storagePath);
            $published = $publishedRepo->getPublished($route);
            if ($published !== null && isset($published['elements'])) {
                $default['elements'] = $published['elements'];
            }
            $this->save($route, $default);
            return $default;
        }

        $draft = $this->readJson($path);

        if (! $this->validator->validate($draft)) {
            return $this->recovery->recover($path, $default, fn (array $document): bool => $this->save($route, $document))['draft'];
        }

        return $draft;
    }

    public function save(string $route, array $draft): bool
    {
        if (! $this->isEnabled() || ! $this->validator->validate($draft)) {
            return false;
        }

        $encoded = json_encode($draft, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        if ($encoded === false || strlen($encoded) > self::MAX_DRAFT_BYTES) {
            return false;
        }

        return $this->writeJson($this->draftPath($route), $draft);
    }

    public function exists(string $route): bool
    {
        return $this->isEnabled() && is_file($this->draftPath($route));
    }

    public function delete(string $route): bool
    {
        if (! $this->isEnabled()) {
            return false;
        }

        $path = $this->draftPath($route);

        return ! is_file($path) || @unlink($path);
    }

    public function touch(string $route, ?int $updatedBy = null): ?array
    {
        $draft = $this->get($route);

        if ($draft === null) {
            return null;
        }

        $draft['updatedBy'] = $updatedBy;
        $draft['updatedAt'] = date('Y-m-d H:i:s');

        return $this->save($route, $draft) ? $draft : null;
    }

    private function draftPath(string $route): string
    {
        return $this->storagePath . DIRECTORY_SEPARATOR . 'routes' . DIRECTORY_SEPARATOR . $this->routeKey($route) . DIRECTORY_SEPARATOR . 'draft.json';
    }
}
