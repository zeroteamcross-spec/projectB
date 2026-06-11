<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class DiffEngine
{
    public function diff(array $left, array $right): array
    {
        $leftElements = $left['elements'] ?? [];
        $rightElements = $right['elements'] ?? [];
        $elementNames = array_values(array_unique(array_merge(array_keys($leftElements), array_keys($rightElements))));
        sort($elementNames, SORT_STRING);

        $diff = [];

        foreach ($elementNames as $elementName) {
            $elementDiff = $this->diffElement($leftElements[$elementName] ?? null, $rightElements[$elementName] ?? null);

            if ($elementDiff !== []) {
                $diff[$elementName] = $elementDiff;
            }
        }

        return $diff;
    }

    public function statistics(array $diff): array
    {
        $stats = [
            'elementsChanged' => count($diff),
            'propertiesChanged' => 0,
            'mobile' => 0,
            'tablet' => 0,
            'desktop' => 0,
        ];

        foreach ($diff as $elementDiff) {
            foreach (['mobile', 'tablet', 'desktop'] as $breakpoint) {
                $count = isset($elementDiff[$breakpoint]) ? count($elementDiff[$breakpoint]) : 0;
                $stats[$breakpoint] += $count;
                $stats['propertiesChanged'] += $count;
            }
        }

        return $stats;
    }

    private function diffElement(?array $left, ?array $right): array
    {
        if ($left === null && $right === null) {
            return [];
        }

        $status = $left === null ? 'added' : ($right === null ? 'removed' : 'modified');
        $breakpoints = ['mobile', 'tablet', 'desktop'];
        $diff = [];

        foreach ($breakpoints as $breakpoint) {
            $leftProperties = $left[$breakpoint] ?? [];
            $rightProperties = $right[$breakpoint] ?? [];
            $properties = array_values(array_unique(array_merge(array_keys($leftProperties), array_keys($rightProperties))));
            sort($properties, SORT_STRING);

            foreach ($properties as $property) {
                $before = $leftProperties[$property] ?? null;
                $after = $rightProperties[$property] ?? null;

                if ($before !== $after) {
                    $diff[$breakpoint][$property] = [
                        'status' => $this->propertyStatus($before, $after, $status),
                        'before' => $before,
                        'after' => $after,
                    ];
                }
            }
        }

        if ($diff === []) {
            return [];
        }

        $diff['_status'] = $status;

        return $diff;
    }

    private function propertyStatus($before, $after, string $elementStatus): string
    {
        if ($elementStatus === 'added') {
            return 'added';
        }

        if ($elementStatus === 'removed') {
            return 'removed';
        }

        if ($before === null) {
            return 'added';
        }

        if ($after === null) {
            return 'removed';
        }

        return 'modified';
    }
}
