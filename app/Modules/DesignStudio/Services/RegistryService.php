<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\RegistryRepository;

class RegistryService
{
    private RegistryRepository $registry;

    public function __construct(RegistryRepository $registry)
    {
        $this->registry = $registry;
    }

    public function get(string $key): ?array
    {
        return $this->registry->get($key);
    }

    public function exists(string $key): bool
    {
        return $this->registry->exists($key);
    }

    public function all(): array
    {
        return $this->registry->all();
    }

    public function load(string $key): ?array
    {
        return $this->registry->load($key);
    }

    public function save(string $key, array $data): bool
    {
        return $this->registry->save($key, $data);
    }

    public function register(string $key, ?int $createdBy = null): ?array
    {
        return $this->registry->register($key, $createdBy);
    }

    public function ignore(string $key, ?int $createdBy = null): ?array
    {
        return $this->registry->ignore($key, $createdBy);
    }

    public function unregisteredElements(array $elements): array
    {
        return $this->registry->unregisteredElements($elements);
    }

    public function getIndex(): array
    {
        return $this->registry->getIndex();
    }

    public function saveIndex(array $index): bool
    {
        return $this->registry->saveIndex($index);
    }

    public function updateRouteIndex(string $route, array $elements): bool
    {
        return $this->registry->updateRouteIndex($route, $elements);
    }
}
