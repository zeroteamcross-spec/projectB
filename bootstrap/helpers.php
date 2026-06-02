<?php

declare(strict_types=1);

if (! function_exists('base_path')) {
    function base_path(string $path = ''): string
    {
        $basePath = dirname(__DIR__);

        if ($path === '') {
            return $basePath;
        }

        return $basePath . DIRECTORY_SEPARATOR . ltrim(
            str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path),
            DIRECTORY_SEPARATOR
        );
    }
}

if (! function_exists('config_path')) {
    function config_path(string $path = ''): string
    {
        return base_path($path === '' ? 'config' : 'config' . DIRECTORY_SEPARATOR . $path);
    }
}

if (! function_exists('load_env')) {
    function load_env(string $path): void
    {
        if (! is_file($path)) {
            return;
        }

        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

        if ($lines === false) {
            return;
        }

        foreach ($lines as $line) {
            $line = trim($line);

            if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) {
                continue;
            }

            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);

            if ($key === '') {
                continue;
            }

            if (
                (strpos($value, '"') === 0 && substr($value, -1) === '"')
                || (strpos($value, "'") === 0 && substr($value, -1) === "'")
            ) {
                $value = substr($value, 1, -1);
            }

            if (getenv($key) === false) {
                putenv($key . '=' . $value);
            }

            $_ENV[$key] = $_ENV[$key] ?? $value;
            $_SERVER[$key] = $_SERVER[$key] ?? $value;
        }
    }
}

if (! function_exists('env')) {
    function env(string $key, $default = null)
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);

        if ($value === false || $value === null) {
            return $default;
        }

        $normalized = strtolower((string) $value);

        if ($normalized === 'true' || $normalized === '(true)') {
            return true;
        }

        if ($normalized === 'false' || $normalized === '(false)') {
            return false;
        }

        if ($normalized === 'null' || $normalized === '(null)') {
            return null;
        }

        if ($normalized === 'empty' || $normalized === '(empty)') {
            return '';
        }

        return $value;
    }
}

if (! function_exists('config')) {
    function config(string $key = '', $default = null)
    {
        static $items = null;

        if ($items === null) {
            $items = [];
            $files = glob(config_path('*.php')) ?: [];

            foreach ($files as $file) {
                $items[basename($file, '.php')] = require $file;
            }
        }

        if ($key === '') {
            return $items;
        }

        $value = $items;

        foreach (explode('.', $key) as $segment) {
            if (! is_array($value) || ! array_key_exists($segment, $value)) {
                return $default;
            }

            $value = $value[$segment];
        }

        return $value;
    }
}
