<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class FavoriteRouteService
{
    private array $favorites = [];

    public function addFavorite(string $userId, string $route): array
    {
        $this->favorites[$userId] = $this->favorites[$userId] ?? [];
        $this->favorites[$userId][$route] = $route;

        return $this->listFavorites($userId);
    }

    public function removeFavorite(string $userId, string $route): array
    {
        unset($this->favorites[$userId][$route]);

        return $this->listFavorites($userId);
    }

    public function listFavorites(string $userId): array
    {
        return array_values($this->favorites[$userId] ?? []);
    }
}
