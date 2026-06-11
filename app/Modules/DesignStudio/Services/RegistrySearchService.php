<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class RegistrySearchService
{
    private SearchService $search;

    public function __construct(?SearchService $search = null)
    {
        $this->search = $search ?? new SearchService();
    }

    public function search(array $registryItems, string $query, ?string $status = null): array
    {
        $items = array_map(static fn (array $item): array => array_merge($item, [
            'type' => 'registry',
            'label' => (string) ($item['name'] ?? $item['element'] ?? ''),
        ]), $registryItems);

        return $this->search->search($items, $query, $status ? ['status' => strtoupper($status)] : []);
    }
}
