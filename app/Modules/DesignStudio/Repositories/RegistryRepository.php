<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Repositories;

class RegistryRepository extends JsonRepository
{
    private const STATUS_ACTIVE = 'active';
    private const STATUS_IGNORED = 'ignored';
    private const RISK_SAFE = 'safe';

    public function get(string $key): ?array
    {
        if (! $this->isEnabled()) {
            return null;
        }

        $name = $this->normalizeName($key);

        if ($name === null) {
            return null;
        }

        $data = $this->readJson($this->registryFile($name));

        return $data === [] ? null : $data;
    }

    public function find(string $key): ?array
    {
        return $this->get($key);
    }

    public function exists(string $key): bool
    {
        return $this->get($key) !== null;
    }

    public function all(): array
    {
        if (! $this->isEnabled()) {
            return [];
        }

        $registryPath = $this->storagePath . DIRECTORY_SEPARATOR . 'registry';
        $files = is_dir($registryPath) ? (glob($registryPath . DIRECTORY_SEPARATOR . '*.json') ?: []) : [];
        $items = [];

        foreach ($files as $file) {
            $key = basename($file, '.json');
            $data = $this->readJson($file);

            if ($data !== []) {
                $items[$key] = $data;
            }
        }

        return $items;
    }

    public function getIndex(): array
    {
        if (! $this->isEnabled()) {
            return ['routes' => []];
        }

        $index = $this->readJson($this->registryIndexFile(), ['routes' => []]);

        return isset($index['routes']) && is_array($index['routes']) ? $index : ['routes' => []];
    }

    public function saveIndex(array $index): bool
    {
        if (! $this->isEnabled()) {
            return false;
        }

        $document = [
            'routes' => is_array($index['routes'] ?? null) ? $index['routes'] : [],
        ];

        return $this->writeJson($this->registryIndexFile(), $document);
    }

    public function updateRouteIndex(string $route, array $elements): bool
    {
        $index = $this->getIndex();
        $uniqueElements = array_values(array_unique(array_filter(array_map('strval', $elements))));
        sort($uniqueElements, SORT_STRING);

        $index['routes'][$route] = [
            'elements' => $uniqueElements,
            'lastSeenAt' => date('Y-m-d H:i:s'),
            'scanCount' => (int) ($index['routes'][$route]['scanCount'] ?? 0) + 1,
        ];

        return $this->saveIndex($index);
    }

    public function load(string $key): ?array
    {
        return $this->get($key);
    }

    public function save(string $key, array $data): bool
    {
        if (! $this->isEnabled()) {
            return false;
        }

        $name = $this->normalizeName($key);

        if ($name === null) {
            return false;
        }

        $document = array_merge($data, ['name' => $name]);

        return $this->writeJson($this->registryFile($name), $document);
    }

    public function register(string $key, ?int $createdBy = null): ?array
    {
        return $this->persistRegistry($key, self::STATUS_ACTIVE, $createdBy);
    }

    public function ignore(string $key, ?int $createdBy = null): ?array
    {
        return $this->persistRegistry($key, self::STATUS_IGNORED, $createdBy);
    }

    public function unregisteredElements(array $elements): array
    {
        if (! $this->isEnabled()) {
            return [];
        }

        $missing = [];

        foreach ($elements as $element) {
            $name = $this->normalizeName((string) $element);

            if ($name === null) {
                continue;
            }

            $entry = $this->get($name);

            if ($entry === null) {
                $missing[] = $name;
            }
        }

        $missing = array_values(array_unique($missing));
        sort($missing, SORT_STRING);

        return $missing;
    }

    private function persistRegistry(string $key, string $status, ?int $createdBy): ?array
    {
        if (! $this->isEnabled()) {
            return null;
        }

        $name = $this->normalizeName($key);

        if ($name === null) {
            return null;
        }

        $existing = $this->get($name) ?? [];
        $document = array_merge($existing, [
            'name' => $name,
            'risk' => $existing['risk'] ?? self::RISK_SAFE,
            'createdAt' => $existing['createdAt'] ?? gmdate('c'),
            'createdBy' => $existing['createdBy'] ?? $createdBy,
            'status' => $status,
        ]);

        return $this->save($name, $document) ? $document : null;
    }

    private function registryFile(string $name): string
    {
        return $this->storagePath . DIRECTORY_SEPARATOR . 'registry' . DIRECTORY_SEPARATOR . $name . '.json';
    }

    private function registryIndexFile(): string
    {
        return $this->storagePath . DIRECTORY_SEPARATOR . 'registry' . DIRECTORY_SEPARATOR . 'registry.json';
    }

    private function normalizeName(string $name): ?string
    {
        $normalized = trim($name);

        if ($normalized === '' || strlen($normalized) > 255 || preg_match('/\s/', $normalized)) {
            return null;
        }

        if (! preg_match('/^[A-Za-z0-9_.-]+$/', $normalized)) {
            return null;
        }

        return $normalized;
    }
}
