<?php

declare(strict_types=1);

$appEnv = strtolower((string) env('APP_ENV', 'local'));

return [
    'auto_bootstrap_enabled' => env('AUTO_SCHEMA_BOOTSTRAP_ENABLED', $appEnv !== 'production'),
];
