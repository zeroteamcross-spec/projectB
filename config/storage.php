<?php

declare(strict_types=1);

return [
    'uploads_path' => base_path((string) env('STORAGE_UPLOADS_PATH', 'storage/uploads')),
    'public_uploads_prefix' => env('STORAGE_PUBLIC_UPLOADS_PREFIX', '/storage/uploads'),
    'deleted_image_retention_days' => (int) env('STORAGE_DELETED_IMAGE_RETENTION_DAYS', 30),
    'cleanup_log_path' => base_path((string) env('STORAGE_CLEANUP_LOG_PATH', 'storage/logs/car_images_cleanup.log')),
];
