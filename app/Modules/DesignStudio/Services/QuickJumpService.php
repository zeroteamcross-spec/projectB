<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class QuickJumpService
{
    private RouteSearchService $routeSearch;
    private ElementSearchService $elementSearch;

    public function __construct(?RouteSearchService $routeSearch = null, ?ElementSearchService $elementSearch = null)
    {
        $this->routeSearch = $routeSearch ?? new RouteSearchService();
        $this->elementSearch = $elementSearch ?? new ElementSearchService();
    }

    public function resolve(string $query, array $routes, array $routeElements, ?string $activeRoute = null): ?array
    {
        if ($activeRoute !== null) {
            $elements = $this->elementSearch->search($activeRoute, $routeElements, $query);

            if ($elements !== []) {
                return [
                    'route' => $activeRoute,
                    'element' => $elements[0]['name'],
                    'action' => 'focus_element',
                ];
            }
        }

        $routeResults = $this->routeSearch->search($routes, $query);

        if ($routeResults === []) {
            return null;
        }

        return [
            'route' => $routeResults[0]['route'],
            'action' => 'open_route',
        ];
    }
}
