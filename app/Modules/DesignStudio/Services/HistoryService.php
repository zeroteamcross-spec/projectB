<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\HistoryRepository;

class HistoryService
{
    private HistoryRepository $history;

    public function __construct(HistoryRepository $history)
    {
        $this->history = $history;
    }

    public function all(string $route): array
    {
        return $this->history->all($route);
    }

    public function latest(string $route): ?array
    {
        return $this->history->latest($route);
    }

    public function count(string $route): int
    {
        return $this->history->count($route);
    }
}
