<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class ElementSearchService
{
    private SearchService $search;

    public function __construct(?SearchService $search = null)
    {
        $this->search = $search ?? new SearchService();
    }

    public function search(string $route, array $routeElements, string $query): array
    {
        $elements = $routeElements[$route] ?? [];
        $items = array_map(static fn (string $element): array => [
            'type' => 'element',
            'route' => $route,
            'name' => $element,
            'label' => $element,
        ], $elements);

        return $this->search->search($items, $query);
    }
}
