<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class AuditSearchService
{
    private SearchService $search;

    public function __construct(?SearchService $search = null)
    {
        $this->search = $search ?? new SearchService();
    }

    public function search(array $auditIndex, string $query, array $filters = []): array
    {
        $items = array_map(static fn (array $entry): array => array_merge($entry, [
            'type' => 'audit',
            'label' => trim(($entry['publishNote'] ?? '') . ' ' . ($entry['rollbackNote'] ?? '') . ' ' . ($entry['username'] ?? '')),
        ]), $auditIndex);

        return $this->search->search($items, $query, $filters);
    }
}
