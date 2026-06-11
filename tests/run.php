<?php

declare(strict_types=1);

require_once __DIR__ . '/../bootstrap/helpers.php';
require_once __DIR__ . '/../bootstrap/autoload.php';
require_once __DIR__ . '/TestCase.php';

foreach (glob(__DIR__ . '/Unit/*Test.php') ?: [] as $file) {
    require_once $file;
}

$tests = [
    Tests\Unit\ValidationTest::class,
    Tests\Unit\RepositoryQueryTest::class,
    Tests\Unit\PaymentStatusTest::class,
    Tests\Unit\TransactionStatusTransitionTest::class,
    Tests\Unit\TransactionFoundationHardeningTest::class,
    Tests\Unit\CoreHardeningTest::class,
    Tests\Unit\HealthRouteTest::class,
    Tests\Unit\AuthUsersCarsHardeningTest::class,
    Tests\Unit\ImagesHardeningTest::class,
    Tests\Unit\InspectionHardeningTest::class,
    Tests\Unit\AffiliateFoundationHardeningTest::class,
    Tests\Unit\ProjectStabilizationTest::class,
    Tests\Unit\EnvironmentReadinessTest::class,
    Tests\Unit\MidtransCallbackEndpointTest::class,
    Tests\Unit\DesignStudioV2DraftTest::class,
];

$passed = 0;
$failed = 0;

foreach ($tests as $testClass) {
    try {
        (new $testClass())->run();
        $passed++;
        echo '[PASS] ' . $testClass . PHP_EOL;
    } catch (Throwable $exception) {
        $failed++;
        echo '[FAIL] ' . $testClass . ': ' . $exception->getMessage() . PHP_EOL;
    }
}

echo PHP_EOL . sprintf('Tests: %d passed, %d failed.', $passed, $failed) . PHP_EOL;

exit($failed > 0 ? 1 : 0);
