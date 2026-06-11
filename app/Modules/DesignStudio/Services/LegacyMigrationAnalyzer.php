<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class LegacyMigrationAnalyzer
{
    private const SUPPORTED_PROPERTIES = [
        'fontSize', 'color', 'backgroundColor', 'padding', 'margin', 'borderRadius',
        'lineHeight', 'gap', 'opacity', 'width', 'height', 'display', 'justifyContent', 'alignItems',
    ];

    public function analyze(array $legacyPayload): array
    {
        $elements = [];
        $unsupported = [];

        foreach (($legacyPayload['elements'] ?? []) as $element => $properties) {
            $elements[$element] = ['mobile' => [], 'tablet' => [], 'desktop' => []];

            foreach ($properties as $property => $value) {
                if (! in_array($property, self::SUPPORTED_PROPERTIES, true)) {
                    $unsupported[] = [
                        'element' => $element,
                        'property' => $property,
                        'status' => 'WARNING',
                    ];
                    continue;
                }

                $elements[$element]['mobile'][$property] = $value;
            }
        }

        return [
            'route' => (string) ($legacyPayload['route'] ?? ''),
            'elements' => $elements,
            'unsupported' => $unsupported,
            'risk' => $unsupported === [] ? 'SAFE' : 'WARNING',
        ];
    }
}
