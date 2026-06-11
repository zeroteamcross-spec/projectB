<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class ResponsiveValidator
{
    public function validate(string $element, array $style): array
    {
        $issues = [];

        foreach (['mobile', 'tablet', 'desktop'] as $breakpoint) {
            if (! isset($style[$breakpoint]) || ! is_array($style[$breakpoint])) {
                $issues[] = [
                    'severity' => 'WARNING',
                    'code' => 'missing_breakpoint',
                    'element' => $element,
                    'breakpoint' => $breakpoint,
                    'property' => null,
                    'message' => 'Responsive breakpoint is missing.',
                ];
            }
        }

        $mobileFont = $this->numeric($style['mobile']['fontSize'] ?? null);
        $desktopFont = $this->numeric($style['desktop']['fontSize'] ?? null);

        if ($mobileFont > 0 && $desktopFont > 0 && $desktopFont < $mobileFont * 0.75) {
            $issues[] = [
                'severity' => 'WARNING',
                'code' => 'responsive_font_conflict',
                'element' => $element,
                'breakpoint' => 'desktop',
                'property' => 'fontSize',
                'message' => 'Desktop font size is much smaller than mobile.',
            ];
        }

        return $issues;
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
