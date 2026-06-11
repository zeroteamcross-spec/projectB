<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class HealthCheckerService
{
    private const TTL_SECONDS = 300;

    private RiskAnalyzer $riskAnalyzer;
    private ResponsiveValidator $responsiveValidator;
    private ConflictDetector $conflictDetector;
    private HealthReportBuilder $reportBuilder;
    private array $cache = [];

    public function __construct(
        ?RiskAnalyzer $riskAnalyzer = null,
        ?ResponsiveValidator $responsiveValidator = null,
        ?ConflictDetector $conflictDetector = null,
        ?HealthReportBuilder $reportBuilder = null
    ) {
        $this->riskAnalyzer = $riskAnalyzer ?? new RiskAnalyzer();
        $this->responsiveValidator = $responsiveValidator ?? new ResponsiveValidator();
        $this->conflictDetector = $conflictDetector ?? new ConflictDetector();
        $this->reportBuilder = $reportBuilder ?? new HealthReportBuilder();
    }

    public function check(array $document): array
    {
        $route = (string) ($document['route'] ?? '');
        $cacheKey = $route . ':' . md5(json_encode($document['elements'] ?? []) ?: '');
        $now = time();

        if (isset($this->cache[$cacheKey]) && $this->cache[$cacheKey]['expiresAt'] > $now) {
            return $this->cache[$cacheKey]['report'];
        }

        $elements = is_array($document['elements'] ?? null) ? $document['elements'] : [];
        $issues = [];

        foreach ($elements as $elementName => $style) {
            if (! is_array($style)) {
                continue;
            }

            $issues = array_merge($issues, $this->responsiveValidator->validate((string) $elementName, $style));

            foreach (['mobile', 'tablet', 'desktop'] as $breakpoint) {
                foreach (($style[$breakpoint] ?? []) as $property => $value) {
                    $issues = array_merge($issues, $this->riskAnalyzer->analyze((string) $elementName, $breakpoint, (string) $property, $value));
                }
            }
        }

        $issues = array_merge($issues, $this->conflictDetector->detect($elements));
        $report = $this->reportBuilder->build($route, $issues);
        $this->cache[$cacheKey] = [
            'expiresAt' => $now + self::TTL_SECONDS,
            'report' => $report,
        ];

        return $report;
    }

    public function clearCache(?string $route = null): void
    {
        if ($route === null) {
            $this->cache = [];
            return;
        }

        foreach (array_keys($this->cache) as $key) {
            if (str_starts_with($key, $route . ':')) {
                unset($this->cache[$key]);
            }
        }
    }
}
