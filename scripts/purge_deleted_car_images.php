<?php

declare(strict_types=1);

use App\Modules\Images\Jobs\PurgeDeletedCarImagesJob;

$app = require __DIR__ . '/../bootstrap/app.php';

$retentionDays = null;
$batchSize = null;

foreach (array_slice($argv, 1) as $argument) {
    if (strpos($argument, '--days=') === 0) {
        $retentionDays = (int) substr($argument, 7);
    }

    if (strpos($argument, '--limit=') === 0) {
        $batchSize = (int) substr($argument, 8);
    }
}

$summary = $app->container()
    ->make(PurgeDeletedCarImagesJob::class)
    ->run($retentionDays, $batchSize);

echo json_encode($summary, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . PHP_EOL;
