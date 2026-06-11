<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Repositories;

class HistoryRepository extends JsonRepository
{
    public function all(string $route): array
    {
        if (! $this->isEnabled()) {
            return [];
        }

        $historyPath = $this->historyPath($route);
        $files = is_dir($historyPath) ? (glob($historyPath . DIRECTORY_SEPARATOR . '*.json') ?: []) : [];
        $items = [];

        foreach ($files as $file) {
            $data = $this->readJson($file);

            if ($data !== []) {
                $items[basename($file, '.json')] = $data;
            }
        }

        ksort($items);

        return $items;
    }

    public function latest(string $route): ?array
    {
        $items = $this->all($route);

        if ($items === []) {
            return null;
        }

        return end($items) ?: null;
    }

    public function count(string $route): int
    {
        return count($this->all($route));
    }

    private function historyPath(string $route): string
    {
        return $this->storagePath . DIRECTORY_SEPARATOR . 'routes' . DIRECTORY_SEPARATOR . $this->routeKey($route) . DIRECTORY_SEPARATOR . 'history';
    }
}
