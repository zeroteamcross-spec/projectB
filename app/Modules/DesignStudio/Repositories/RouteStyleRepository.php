<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Repositories;

use App\Modules\DesignStudio\Models\RouteStyleDocument;

class RouteStyleRepository extends JsonRepository
{
    public function getDraft(string $route): ?array
    {
        return $this->getRouteDocument($route, 'draft.json');
    }

    public function getPublished(string $route): ?array
    {
        return $this->getRouteDocument($route, 'published.json');
    }

    public function exists(string $route): bool
    {
        if (! $this->isEnabled()) {
            return false;
        }

        $routePath = $this->routePath($route);

        return is_file($routePath . DIRECTORY_SEPARATOR . 'draft.json')
            || is_file($routePath . DIRECTORY_SEPARATOR . 'published.json');
    }

    private function getRouteDocument(string $route, string $fileName): ?array
    {
        if (! $this->isEnabled()) {
            return null;
        }

        $document = $this->readJson($this->routePath($route) . DIRECTORY_SEPARATOR . $fileName, RouteStyleDocument::empty($route));

        return $document;
    }

    private function routePath(string $route): string
    {
        return $this->storagePath . DIRECTORY_SEPARATOR . 'routes' . DIRECTORY_SEPARATOR . $this->routeKey($route);
    }
}
