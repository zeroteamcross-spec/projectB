<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\RouteStyleRepository;

class RouteStyleService
{
    private RouteStyleRepository $styles;

    public function __construct(RouteStyleRepository $styles)
    {
        $this->styles = $styles;
    }

    public function getPublished(string $route): ?array
    {
        return $this->styles->getPublished($route);
    }

    public function getDraft(string $route): ?array
    {
        return $this->styles->getDraft($route);
    }
}
