<?php

declare(strict_types=1);

use App\Core\JsonResponse;
use App\Infrastructure\Environment\EnvironmentReadinessChecker;

require_once __DIR__ . '/../bootstrap/helpers.php';

load_env(base_path('.env'));

require_once __DIR__ . '/../bootstrap/autoload.php';

$target = 'local';
$checkDatabase = false;

foreach (array_slice($argv, 1) as $argument) {
    if (strpos($argument, '--target=') === 0) {
        $target = substr($argument, strlen('--target='));
        continue;
    }

    if ($argument === '--check-db') {
        $checkDatabase = true;
    }
}

$result = (new EnvironmentReadinessChecker())->check($target, $checkDatabase);
$response = $result['ready']
    ? JsonResponse::success($result, 'Environment readiness check passed.')
    : JsonResponse::error('Environment readiness check found blockers.', [
        'blockers' => $result['blockers'],
    ], 500, $result, [
        'warnings' => $result['warnings'],
    ]);

echo $response->body() . PHP_EOL;

exit($result['ready'] ? 0 : 1);
