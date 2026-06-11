<?php

declare(strict_types=1);

return [
    'enabled' => env('DESIGN_STUDIO_ENABLED', false),
    'design_mode' => env('DESIGN_STUDIO_DESIGN_MODE', false),
    'max_history' => 20,
    'cache_registry' => true,
    'allow_custom_css' => false,
    'allow_custom_html' => false,
    'allow_js_injection' => false,
    'storage_path' => base_path('storage/design-studio'),
    'schema_version' => 1,
];
