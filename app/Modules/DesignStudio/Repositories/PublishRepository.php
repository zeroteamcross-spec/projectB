<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Repositories;

class PublishRepository extends JsonRepository
{
    private const MAX_PUBLISHED_BYTES = 2097152;

    public function getPublished(string $route): ?array
    {
        if (! $this->isEnabled()) {
            return null;
        }

        $published = $this->readJson($this->publishedPath($route));

        return $published === [] ? null : $published;
    }

    public function savePublishedAtomic(string $route, array $published): bool
    {
        if (! $this->isEnabled()) {
            return false;
        }

        $encoded = json_encode($published, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        if ($encoded === false || strlen($encoded) > self::MAX_PUBLISHED_BYTES) {
            return false;
        }

        $path = $this->publishedPath($route);
        $directory = dirname($path);

        if (! is_dir($directory) && ! mkdir($directory, 0755, true) && ! is_dir($directory)) {
            return false;
        }

        $tmpPath = $directory . DIRECTORY_SEPARATOR . 'published.tmp.json';
        $backupPath = $path . '.bak';

        if (is_file($path) && ! @copy($path, $backupPath)) {
            return false;
        }

        if (file_put_contents($tmpPath, $encoded . PHP_EOL, LOCK_EX) === false) {
            @unlink($backupPath);
            return false;
        }

        if (! @rename($tmpPath, $path)) {
            @unlink($tmpPath);
            if (is_file($backupPath)) {
                @copy($backupPath, $path);
                @unlink($backupPath);
            }
            return false;
        }

        if (is_file($backupPath)) {
            @unlink($backupPath);
        }

        return true;
    }

    public function clearRouteCache(string $route): bool
    {
        if (! $this->isEnabled()) {
            return false;
        }

        $cachePath = $this->storagePath . DIRECTORY_SEPARATOR . 'cache' . DIRECTORY_SEPARATOR . $this->routeKey($route) . '.json';

        return ! is_file($cachePath) || @unlink($cachePath);
    }

    private function publishedPath(string $route): string
    {
        return $this->storagePath . DIRECTORY_SEPARATOR . 'routes' . DIRECTORY_SEPARATOR . $this->routeKey($route) . DIRECTORY_SEPARATOR . 'published.json';
    }
}
