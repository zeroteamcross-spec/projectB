<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

class CompareService
{
    private DiffEngine $diff;

    public function __construct(?DiffEngine $diff = null)
    {
        $this->diff = $diff ?? new DiffEngine();
    }

    public function compare(array $left, array $right): array
    {
        $diff = $this->diff->diff($left, $right);

        return [
            'hasDifference' => $diff !== [],
            'label' => $diff === [] ? 'No Difference' : 'Difference',
            'statistics' => $this->diff->statistics($diff),
            'diff' => $diff,
        ];
    }
}
