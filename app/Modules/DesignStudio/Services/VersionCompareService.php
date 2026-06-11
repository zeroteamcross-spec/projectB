<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class VersionCompareService
{
    private CompareService $compare;

    public function __construct(?CompareService $compare = null)
    {
        $this->compare = $compare ?? new CompareService();
    }

    public function compare(array $left, array $right): array
    {
        return $this->compare->compare($left, $right)['diff'];
    }
}
