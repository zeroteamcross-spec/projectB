<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class VersionSearchService
{
    private SearchService $search;

    public function __construct(?SearchService $search = null)
    {
        $this->search = $search ?? new SearchService();
    }

    public function search(array $versions, string $query, array $filters = []): array
    {
        $items = array_map(static fn (array $version): array => array_merge($version, [
            'type' => 'version',
            'label' => 'v' . ($version['version'] ?? '') . ' ' . ($version['publishNote'] ?? ''),
        ]), $versions);

        return $this->search->search($items, $query, $filters);
    }
}
