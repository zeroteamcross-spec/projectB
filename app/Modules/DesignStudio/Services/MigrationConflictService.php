<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class MigrationConflictService
{
    public function detect(array $legacyElements, array $draftElements): array
    {
        $conflicts = [];

        foreach ($legacyElements as $element => $responsive) {
            foreach (['mobile', 'tablet', 'desktop'] as $breakpoint) {
                foreach (($responsive[$breakpoint] ?? []) as $property => $value) {
                    $draftValue = $draftElements[$element][$breakpoint][$property] ?? null;

                    if ($draftValue !== null && $draftValue !== $value) {
                        $conflicts[] = [
                            'element' => $element,
                            'breakpoint' => $breakpoint,
                            'property' => $property,
                            'legacy' => $value,
                            'draft' => $draftValue,
                            'status' => 'CONFLICT',
                        ];
                    }
                }
            }
        }

        return $conflicts;
    }
}
