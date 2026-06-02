<?php

declare(strict_types=1);

spl_autoload_register(static function (string $class): void {
    $prefix = 'App\\';

    if (strpos($class, $prefix) !== 0) {
        return;
    }

    $relativeClass = substr($class, strlen($prefix));
    $file = base_path('app/' . str_replace('\\', '/', $relativeClass) . '.php');

    if (is_file($file)) {
        require $file;
    }
});
