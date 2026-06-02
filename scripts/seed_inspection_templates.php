<?php

declare(strict_types=1);

use App\Modules\Inspection\Jobs\SeedInspectionTemplatesJob;

$app = require __DIR__ . '/../bootstrap/app.php';

$summary = $app->container()
    ->make(SeedInspectionTemplatesJob::class)
    ->run();

echo json_encode($summary, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
