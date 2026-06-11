<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Contracts;

interface DesignStudioRepository
{
    public function isEnabled(): bool;
}
