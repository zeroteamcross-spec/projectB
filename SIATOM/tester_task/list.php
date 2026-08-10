<?php
// Endpoint canonical: SIATOM/tester_task/list.php.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$base = dirname(__DIR__);
$dirs = array(
    __DIR__,
);

$files = array();
foreach ($dirs as $dir) {
    if (!is_dir($dir)) {
        continue;
    }

    foreach (glob($dir . DIRECTORY_SEPARATOR . '*.json') as $f) {
        if (is_file($f)) {
            $files[basename($f)] = true;
        }
    }
}

$files = array_keys($files);
sort($files);
echo json_encode($files);
