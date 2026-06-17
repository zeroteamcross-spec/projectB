<?php

declare(strict_types=1);

use App\Modules\ApiVersion\Services\ApiVersionService;

$app = require __DIR__ . '/../../bootstrap/app.php';

$arguments = array_slice($argv, 1);
$resourceName = $arguments[0] ?? '';
$displayName = null;
$confirmed = false;

foreach ($arguments as $argument) {
    if (strpos($argument, '--display-name=') === 0) {
        $displayName = trim(substr($argument, strlen('--display-name=')));
        continue;
    }

    if ($argument === '--confirm-upload-verified') {
        $confirmed = true;
    }
}

if (! is_string($resourceName) || trim($resourceName) === '') {
    fwrite(STDERR, 'Usage: php scripts/release/bump-version.php <resource_name> --confirm-upload-verified [--display-name="Application Shell"]' . PHP_EOL);
    exit(1);
}

if (! $confirmed) {
    fwrite(STDERR, 'Refusing to bump version before upload verification is confirmed.' . PHP_EOL);
    fwrite(STDERR, 'Add --confirm-upload-verified after checking the release files on the server.' . PHP_EOL);
    exit(1);
}

/** @var ApiVersionService $service */
$service = $app->container()->make(ApiVersionService::class);
$version = $service->bump(trim($resourceName), $displayName !== '' ? $displayName : null);

echo 'Version bumped successfully.' . PHP_EOL;
echo 'Resource: ' . $version['resource_name'] . PHP_EOL;
echo 'Version number: ' . $version['version_number'] . PHP_EOL;
echo 'Updated at: ' . ($version['updated_at'] ?? '-') . PHP_EOL;
