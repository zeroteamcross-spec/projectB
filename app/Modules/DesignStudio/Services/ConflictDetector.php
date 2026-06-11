<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class ConflictDetector
{
    public function detect(array $elements): array
    {
        $issues = [];

        foreach ($elements as $elementName => $style) {
            foreach (['mobile', 'tablet', 'desktop'] as $breakpoint) {
                $properties = $style[$breakpoint] ?? [];

                if (($properties['position'] ?? null) === 'absolute' && $this->hasOffset($properties)) {
                    $issues[] = $this->issue('HIGH', 'absolute_offset_risk', $elementName, $breakpoint, 'position', 'Absolute positioning with offsets may escape parent bounds.');
                }

                if (($properties['overflow'] ?? null) === 'hidden' && ($this->numeric($properties['height'] ?? null) > 0 || $this->numeric($properties['maxHeight'] ?? null) > 0)) {
                    $issues[] = $this->issue('HIGH', 'hidden_overflow_size_risk', $elementName, $breakpoint, 'overflow', 'Hidden overflow with fixed height can hide content.');
                }

                if ($this->numeric($properties['width'] ?? null) > 0 && $this->numeric($properties['maxWidth'] ?? null) > 0 && $this->numeric($properties['width']) > $this->numeric($properties['maxWidth'])) {
                    $issues[] = $this->issue('WARNING', 'width_max_width_conflict', $elementName, $breakpoint, 'width', 'Width is greater than maxWidth.');
                }
            }
        }

        return $issues;
    }

    private function hasOffset(array $properties): bool
    {
        return array_key_exists('top', $properties)
            || array_key_exists('left', $properties)
            || array_key_exists('right', $properties)
            || array_key_exists('bottom', $properties);
    }

    private function issue(string $severity, string $code, string $element, string $breakpoint, string $property, string $message): array
    {
        return compact('severity', 'code', 'element', 'breakpoint', 'property', 'message');
    }

    private function numeric($value): float
    {
        if (is_numeric($value)) {
            return (float) $value;
        }

        if (is_string($value) && preg_match('/-?\d+(\.\d+)?/', $value, $matches)) {
            return (float) $matches[0];
        }

        return 0.0;
    }
}
