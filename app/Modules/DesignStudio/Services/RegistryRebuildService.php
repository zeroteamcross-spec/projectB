<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\RegistryRepository;

class RegistryRebuildService
{
    private RegistryRepository $registry;
    private RegistryPreviewBuilder $previewBuilder;

    public function __construct(RegistryRepository $registry, ?RegistryPreviewBuilder $previewBuilder = null)
    {
        $this->registry = $registry;
        $this->previewBuilder = $previewBuilder ?? new RegistryPreviewBuilder();
    }

    public function previewRebuild(string $route, array $scannedElements): array
    {
        $index = $this->registry->getIndex();
        $current = $index['routes'][$route]['elements'] ?? [];

        return $this->previewBuilder->build($route, $current, $scannedElements);
    }

    public function confirmRebuild(string $route, array $preview): bool
    {
        if (($preview['route'] ?? null) !== $route || ! is_array($preview['nextElements'] ?? null)) {
            return false;
        }

        $expectedToken = hash('sha256', $route . '|' . implode(',', $preview['nextElements']));

        if (($preview['previewToken'] ?? null) !== $expectedToken) {
            return false;
        }

        return $this->registry->updateRouteIndex($route, $preview['nextElements']);
    }
}
