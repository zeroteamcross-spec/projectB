<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class RecentElementService
{
    private array $recent = [];
    private int $limit;

    public function __construct(int $limit = 20)
    {
        $this->limit = $limit;
    }

    public function record(string $userId, string $route, string $element): array
    {
        $entry = ['route' => $route, 'element' => $element];
        $items = array_values(array_filter($this->recent[$userId] ?? [], static fn (array $item): bool => $item !== $entry));
        array_unshift($items, $entry);
        $this->recent[$userId] = array_slice($items, 0, $this->limit);

        return $this->list($userId);
    }

    public function list(string $userId): array
    {
        return $this->recent[$userId] ?? [];
    }
}
