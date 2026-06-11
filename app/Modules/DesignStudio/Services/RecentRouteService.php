<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class RecentRouteService
{
    private array $recent = [];
    private int $limit;

    public function __construct(int $limit = 20)
    {
        $this->limit = $limit;
    }

    public function record(string $userId, string $route): array
    {
        $items = array_values(array_filter($this->recent[$userId] ?? [], static fn (string $item): bool => $item !== $route));
        array_unshift($items, $route);
        $this->recent[$userId] = array_slice($items, 0, $this->limit);

        return $this->list($userId);
    }

    public function list(string $userId): array
    {
        return $this->recent[$userId] ?? [];
    }
}
