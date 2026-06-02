<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Infrastructure\Environment\EnvironmentReadinessChecker;
use Tests\TestCase;

class EnvironmentReadinessTest extends TestCase
{
    public function run(): void
    {
        $this->localCheckReportsExpectedSections();
        $this->stagingCheckRequiresMidtransCredentials();
    }

    private function localCheckReportsExpectedSections(): void
    {
        $result = (new EnvironmentReadinessChecker())->check('local', false);

        foreach (['target', 'ready', 'checks', 'blockers', 'warnings'] as $key) {
            $this->assertTrue(array_key_exists($key, $result));
        }

        $this->assertSame('local', $result['target']);
        $this->assertTrue(array_key_exists('php_version', $result['checks']));
        $this->assertTrue(array_key_exists('database_connectivity', $result['checks']));
        $this->assertSame('skipped', $result['checks']['database_connectivity']['value']);
    }

    private function stagingCheckRequiresMidtransCredentials(): void
    {
        $result = (new EnvironmentReadinessChecker())->check('staging', false);

        $this->assertSame('staging', $result['target']);
        $this->assertTrue(array_key_exists('midtrans_verify_signature', $result['checks']));

        if (($result['checks']['midtrans_server_key']['value'] ?? '') === '') {
            $this->assertTrue(! $result['ready']);
        }
    }
}
