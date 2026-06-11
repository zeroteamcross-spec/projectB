<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class RiskAnalyzer
{
    public function analyze(string $element, string $breakpoint, string $property, $value): array
    {
        $issues = [];

        if (in_array($property, ['position', 'top', 'left', 'right', 'bottom', 'overflow', 'zIndex', 'transform'], true)) {
            $issues[] = $this->issue('HIGH', 'layout_risk', $element, $breakpoint, $property, 'High risk layout property used.');
        }

        if ($property === 'zIndex' && (int) $value >= 900) {
            $issues[] = $this->issue('HIGH', 'z_index_modal_risk', $element, $breakpoint, $property, 'zIndex may cover modal, toast, or dialog.');
        }

        if ($property === 'position' && in_array($value, ['absolute', 'fixed'], true)) {
            $issues[] = $this->issue('HIGH', 'position_viewport_risk', $element, $breakpoint, $property, 'Element may leave viewport or overlap content.');
        }

        if ($property === 'transform' && $value !== '' && $value !== 'none') {
            $issues[] = $this->issue('HIGH', 'transform_risk', $element, $breakpoint, $property, 'Transform may create layout or visibility issues.');
        }

        if ($property === 'overflow' && in_array($value, ['hidden', 'scroll'], true)) {
            $issues[] = $this->issue('HIGH', 'overflow_risk', $element, $breakpoint, $property, 'Overflow setting may hide content or create scroll issues.');
        }

        if ($property === 'fontSize' && $this->numeric($value) > 0 && $this->numeric($value) < 10) {
            $issues[] = $this->issue('INFO', 'font_too_small', $element, $breakpoint, $property, 'Font size may be too small.');
        }

        if ($property === 'lineHeight' && $this->numeric($value) > 0 && $this->numeric($value) < 1.1) {
            $issues[] = $this->issue('WARNING', 'line_height_tight', $element, $breakpoint, $property, 'Line height may be too tight.');
        }

        if (in_array($property, ['padding', 'margin', 'gap'], true) && $this->numeric($value) > 96) {
            $issues[] = $this->issue('WARNING', 'spacing_large', $element, $breakpoint, $property, 'Spacing may be too large.');
        }

        if (in_array($property, ['padding', 'margin', 'gap'], true) && $this->numeric($value) < 0) {
            $issues[] = $this->issue('HIGH', 'spacing_negative', $element, $breakpoint, $property, 'Negative spacing can break layout.');
        }

        if ($property === 'borderRadius' && $this->numeric($value) > 80) {
            $issues[] = $this->issue('WARNING', 'border_radius_extreme', $element, $breakpoint, $property, 'Border radius may be too extreme.');
        }

        if (in_array($property, ['width', 'minWidth', 'maxWidth'], true) && $this->numeric($value) > 430 && $breakpoint === 'mobile') {
            $issues[] = $this->issue('CRITICAL', 'width_viewport_risk', $element, $breakpoint, $property, 'Width may exceed mobile viewport.');
        }

        if (in_array($property, ['height', 'minHeight', 'maxHeight'], true) && $this->numeric($value) > 900 && $breakpoint === 'mobile') {
            $issues[] = $this->issue('WARNING', 'height_large', $element, $breakpoint, $property, 'Height may be too large for mobile.');
        }

        return $issues;
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
