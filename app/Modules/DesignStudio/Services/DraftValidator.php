<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class DraftValidator
{
    private const BREAKPOINTS = ['mobile', 'tablet', 'desktop'];

    public function validate(array $draft): bool
    {
        if (! isset($draft['schemaVersion'], $draft['route'], $draft['elements'])) {
            return false;
        }

        if (! is_int($draft['schemaVersion']) || ! is_string($draft['route']) || ! is_array($draft['elements'])) {
            return false;
        }

        foreach ($draft['elements'] as $element) {
            if (! is_array($element)) {
                return false;
            }

            foreach (self::BREAKPOINTS as $breakpoint) {
                if (! array_key_exists($breakpoint, $element) || ! is_array($element[$breakpoint])) {
                    return false;
                }
            }
        }

        return true;
    }
}
