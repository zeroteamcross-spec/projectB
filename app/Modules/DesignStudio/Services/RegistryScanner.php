<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\RegistryRepository;

class RegistryScanner
{
    private RegistryRepository $registry;
    private LockRecoveryService $locks;

    public function __construct(RegistryRepository $registry, ?LockRecoveryService $locks = null)
    {
        $this->registry = $registry;
        $this->locks = $locks ?? new LockRecoveryService();
    }

    public function scan(string $route, array $scannedElements): array
    {
        return $this->withLock(function () use ($route, $scannedElements): array {
            $elements = array_values(array_unique(array_filter(array_map('strval', $scannedElements))));
            sort($elements, SORT_STRING);

            foreach ($elements as $element) {
                $entry = $this->registry->get($element) ?? [];
                $entry['lastSeenAt'] = date('Y-m-d H:i:s');
                $entry['scanCount'] = (int) ($entry['scanCount'] ?? 0) + 1;
                $entry['status'] = $entry['status'] ?? 'active';
                $this->registry->save($element, $entry);
            }

            $this->registry->updateRouteIndex($route, $elements);

            return [
                'route' => $route,
                'elements' => $elements,
                'scannedAt' => date('Y-m-d H:i:s'),
            ];
        });
    }

    private function withLock(callable $operation): array
    {
        $lockPath = (string) config('design_studio.storage_path', base_path('storage/design-studio')) . DIRECTORY_SEPARATOR . 'locks' . DIRECTORY_SEPARATOR . 'registry.lock';
        $directory = dirname($lockPath);

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        if (! $this->locks->acquire($lockPath, 'registry_scan', 300)) {
            return ['error' => 'registry_locked'];
        }

        try {
            return $operation();
        } finally {
            $this->locks->release($lockPath, 'registry_scan');
        }
    }
}
