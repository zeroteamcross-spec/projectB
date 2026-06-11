<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class RouteSearchService
{
    private SearchService $search;

    public function __construct(?SearchService $search = null)
    {
        $this->search = $search ?? new SearchService();
    }

    public function search(array $routes, string $query, ?string $roleFilter = null): array
    {
        $items = array_map(static function (string $route): array {
            return [
                'type' => 'route',
                'route' => $route,
                'label' => $route,
                'role' => explode('/', ltrim($route, '#/'))[0] ?? 'public',
            ];
        }, $routes);

        return $this->search->search($items, $query, $roleFilter ? ['role' => strtolower($roleFilter)] : []);
    }
}
