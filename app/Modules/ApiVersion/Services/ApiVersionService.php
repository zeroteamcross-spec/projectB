<?php

declare(strict_types=1);

namespace App\Modules\ApiVersion\Services;

use App\Core\Exceptions\NotFoundException;
use App\Modules\ApiVersion\Repositories\ApiVersionRepository;

class ApiVersionService
{
    private ApiVersionRepository $versions;

    public function __construct(ApiVersionRepository $versions)
    {
        $this->versions = $versions;
    }

    public function get(string $resourceName): array
    {
        $version = $this->versions->findByResourceName($this->normalizeResourceName($resourceName));

        if (! $version) {
            throw new NotFoundException('Versi resource tidak ditemukan.');
        }

        return $this->map($version);
    }

    public function list(array $resourceNames = []): array
    {
        $normalized = [];

        foreach ($resourceNames as $resourceName) {
            if (! is_string($resourceName)) {
                continue;
            }

            $resourceName = $this->normalizeResourceName($resourceName);

            if ($resourceName !== '') {
                $normalized[] = $resourceName;
            }
        }

        $normalized = array_values(array_unique($normalized));

        return array_map(
            fn (array $version): array => $this->map($version),
            $this->versions->findMany($normalized)
        );
    }

    public function bump(string $resourceName, ?string $displayName = null): array
    {
        return $this->map($this->versions->bump($this->normalizeResourceName($resourceName), $displayName));
    }

    private function normalizeResourceName(string $resourceName): string
    {
        return strtolower(trim($resourceName));
    }

    private function map(array $version): array
    {
        return [
            'id' => (int) $version['id'],
            'resource_name' => $version['resource_name'],
            'display_name' => $version['display_name'],
            'version_number' => (int) $version['version_number'],
            'created_at' => $version['created_at'],
            'updated_at' => $version['updated_at'],
        ];
    }
}
