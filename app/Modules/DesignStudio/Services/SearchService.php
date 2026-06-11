<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class SearchService
{
    public function search(array $items, string $query, array $filters = []): array
    {
        $query = strtolower(trim($query));

        if ($query === '') {
            return [];
        }

        $results = [];

        foreach ($items as $item) {
            if (! $this->matchesFilters($item, $filters)) {
                continue;
            }

            $haystack = strtolower((string) ($item['label'] ?? $item['route'] ?? $item['name'] ?? $item['note'] ?? ''));
            $score = $this->score($haystack, $query);

            if ($score > 0) {
                $item['score'] = $score;
                $results[] = $item;
            }
        }

        usort($results, static fn (array $a, array $b): int => ($b['score'] <=> $a['score']) ?: strcmp((string) ($a['label'] ?? ''), (string) ($b['label'] ?? '')));

        return $results;
    }

    private function matchesFilters(array $item, array $filters): bool
    {
        foreach ($filters as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }

            if (($item[$key] ?? null) !== $value) {
                return false;
            }
        }

        return true;
    }

    private function score(string $haystack, string $query): int
    {
        if ($haystack === $query) {
            return 100;
        }

        if (strpos($haystack, $query) === 0) {
            return 80;
        }

        if (strpos($haystack, $query) !== false) {
            return 60;
        }

        return levenshtein($query, substr($haystack, 0, max(strlen($query), 1))) <= 2 ? 30 : 0;
    }
}
