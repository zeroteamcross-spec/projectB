<?php

declare(strict_types=1);

require_once __DIR__ . '/../../bootstrap/helpers.php';

$options = parseOptions(array_slice($argv, 1));
$channel = $options['channel'] ?? 'production';
$manifestPath = base_path('public/release-manifest.json');
$releaseVersion = date('YmdHi');
$createdAt = date('Y-m-d H:i:s');
$changedFiles = getChangedFiles(base_path());
$resources = detectResources($changedFiles);

if ($resources === []) {
    $resources = ['app'];
}

$manifest = [
    'release_version' => $releaseVersion,
    'created_at' => $createdAt,
    'channel' => $channel,
    'resources' => array_values($resources),
];

$encoded = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

if ($encoded === false) {
    fwrite(STDERR, 'Failed to encode release manifest.' . PHP_EOL);
    exit(1);
}

if (file_put_contents($manifestPath, $encoded . PHP_EOL) === false) {
    fwrite(STDERR, 'Failed to write release manifest: ' . $manifestPath . PHP_EOL);
    exit(1);
}

echo 'Release version: ' . $releaseVersion . PHP_EOL;
echo 'Created at: ' . $createdAt . PHP_EOL;
echo 'Channel: ' . $channel . PHP_EOL;
echo PHP_EOL;

echo 'Changed files:' . PHP_EOL;
if ($changedFiles === []) {
    echo '- No Git changes detected, or Git is unavailable.' . PHP_EOL;
} else {
    foreach ($changedFiles as $file) {
        echo '- ' . $file . PHP_EOL;
    }
}
echo PHP_EOL;

echo 'Resources to bump after upload verification:' . PHP_EOL;
foreach ($resources as $resource) {
    echo '- ' . $resource . PHP_EOL;
}
echo PHP_EOL;

echo 'Manifest updated: public/release-manifest.json' . PHP_EOL;
echo PHP_EOL;
echo 'Next:' . PHP_EOL;
echo '1. Upload changed files and public/release-manifest.json to the server.' . PHP_EOL;
echo '2. Verify the upload is complete on the server.' . PHP_EOL;
echo '3. Trigger the internal Model A version bump for the listed resources.' . PHP_EOL;

/**
 * @param list<string> $arguments
 * @return array<string, string>
 */
function parseOptions(array $arguments): array
{
    $options = [];

    foreach ($arguments as $argument) {
        if (strpos($argument, '--channel=') === 0) {
            $channel = trim(substr($argument, strlen('--channel=')));

            if ($channel !== '') {
                $options['channel'] = $channel;
            }
        }
    }

    return $options;
}

/**
 * @return list<string>
 */
function getChangedFiles(string $projectRoot): array
{
    $command = 'git -C ' . escapeshellarg($projectRoot) . ' status --short';
    $output = [];
    $exitCode = 0;

    exec($command, $output, $exitCode);

    if ($exitCode !== 0) {
        return [];
    }

    $files = [];

    foreach ($output as $line) {
        $path = parseGitStatusPath($line);

        if ($path === null || shouldIgnoreChangedFile($path)) {
            continue;
        }

        $files[] = $path;
    }

    sort($files);

    return array_values(array_unique($files));
}

function parseGitStatusPath(string $line): ?string
{
    $line = rtrim($line);

    if (strlen($line) < 4) {
        return null;
    }

    $path = trim(substr($line, 3));

    if ($path === '') {
        return null;
    }

    if (strpos($path, ' -> ') !== false) {
        $parts = explode(' -> ', $path);
        $path = trim((string) end($parts));
    }

    return str_replace('\\', '/', $path);
}

function shouldIgnoreChangedFile(string $path): bool
{
    return $path === 'public/release-manifest.json'
        || $path === '.env'
        || strpos($path, '.env.') === 0
        || strpos($path, 'node_modules/') === 0
        || strpos($path, 'storage/') === 0
        || $path === 'projectB.zip';
}

/**
 * @param list<string> $changedFiles
 * @return list<string>
 */
function detectResources(array $changedFiles): array
{
    $resources = [];

    foreach ($changedFiles as $file) {
        if (requiresAppBump($file)) {
            $resources[] = 'app';
        }

        $moduleResource = detectModuleResource($file);

        if ($moduleResource !== null) {
            $resources[] = $moduleResource;
        }
    }

    $resources = array_values(array_unique($resources));
    sort($resources);

    return $resources;
}

function requiresAppBump(string $file): bool
{
    return $file === 'public/index.html'
        || $file === 'public/app.html'
        || strpos($file, 'public/assets/js/') === 0
        || strpos($file, 'public/assets/css/') === 0
        || strpos($file, 'public/assets/theme/') === 0
        || strpos($file, 'app/Modules/') === 0
        || strpos($file, 'routes/') === 0;
}

function detectModuleResource(string $file): ?string
{
    $map = [
        'app/Modules/Cars/' => 'cars',
        'app/Modules/Transactions/' => 'transactions',
        'app/Modules/Notifications/' => 'notifications',
        'app/Modules/Sliders/' => 'sliders',
        'app/Modules/MasterData/' => 'master_data',
        'app/Modules/DesignStudio/' => 'design_studio',
        'app/Modules/Affiliate/' => 'affiliate',
        'app/Modules/Users/' => 'users',
        'app/Modules/Showrooms/' => 'showrooms',
        'app/Modules/Profile/' => 'profile',
    ];

    foreach ($map as $prefix => $resource) {
        if (strpos($file, $prefix) === 0) {
            return $resource;
        }
    }

    return null;
}
