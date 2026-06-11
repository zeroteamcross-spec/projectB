<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Repositories;

class VersionHistoryRepository extends JsonRepository
{
    public function all(string $route): array
    {
        if (! $this->isEnabled()) {
            return [];
        }

        $files = is_dir($this->historyPath($route)) ? (glob($this->historyPath($route) . DIRECTORY_SEPARATOR . 'v*.json') ?: []) : [];
        $items = [];

        foreach ($files as $file) {
            $version = $this->versionFromFile($file);
            $data = $this->readJson($file);

            if ($version > 0 && $data !== []) {
                $items[$version] = $data;
            }
        }

        ksort($items, SORT_NUMERIC);

        return $items;
    }

    public function find(string $route, int $version): ?array
    {
        if (! $this->isEnabled() || $version < 1) {
            return null;
        }

        $data = $this->readJson($this->versionPath($route, $version));

        return $data === [] ? null : $data;
    }

    public function latestVersion(string $route): int
    {
        $versions = array_keys($this->all($route));

        return $versions === [] ? 0 : max($versions);
    }

    public function saveSnapshot(string $route, int $version, array $snapshot): bool
    {
        if (! $this->isEnabled() || $version < 1) {
            return false;
        }

        $path = $this->versionPath($route, $version);

        if (is_file($path)) {
            return false;
        }

        return $this->writeJson($path, $snapshot);
    }

    public function deleteSnapshot(string $route, int $version): bool
    {
        if (! $this->isEnabled() || $version < 1) {
            return false;
        }

        $path = $this->versionPath($route, $version);

        return ! is_file($path) || @unlink($path);
    }

    public function enforceLimit(string $route, int $maxHistory): void
    {
        if (! $this->isEnabled() || $maxHistory < 1) {
            return;
        }

        $versions = array_keys($this->all($route));
        sort($versions, SORT_NUMERIC);

        while (count($versions) > $maxHistory) {
            $version = array_shift($versions);
            $path = $this->versionPath($route, (int) $version);

            if (is_file($path)) {
                @unlink($path);
            }
        }
    }

    private function historyPath(string $route): string
    {
        return $this->storagePath . DIRECTORY_SEPARATOR . 'routes' . DIRECTORY_SEPARATOR . $this->routeKey($route) . DIRECTORY_SEPARATOR . 'history';
    }

    private function versionPath(string $route, int $version): string
    {
        return $this->historyPath($route) . DIRECTORY_SEPARATOR . 'v' . $version . '.json';
    }

    private function versionFromFile(string $file): int
    {
        return preg_match('/v(\d+)\.json$/', basename($file), $matches) ? (int) $matches[1] : 0;
    }
}
