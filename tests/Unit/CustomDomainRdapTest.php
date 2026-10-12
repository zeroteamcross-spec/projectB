<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Modules\Showrooms\Services\CustomDomainRdapService;
use Tests\TestCase;

class CustomDomainRdapTest extends TestCase
{
    public function run(): void
    {
        $this->notFoundDomainIsReportedAsCandidate();
        $this->registeredDomainIsReportedAsUnavailable();
        $this->unsupportedTldDoesNotCallExternalRequester();
        $this->providerFailureNeverClaimsAvailability();
    }

    private function notFoundDomainIsReportedAsCandidate(): void
    {
        $requestedUrl = '';
        $service = new CustomDomainRdapService(static function (string $url) use (&$requestedUrl): array {
            $requestedUrl = $url;

            return [404, ''];
        });

        $result = $service->check('rdap-candidate-' . bin2hex(random_bytes(4)) . '.id');

        $this->assertSame('available', $result['status']);
        $this->assertSame(true, $result['available']);
        $this->assertTrue(strpos($requestedUrl, 'https://rdap.pandi.id/rdap/domain/') !== false);
        $this->assertTrue(strpos($requestedUrl, 'http://') === false);
    }

    private function registeredDomainIsReportedAsUnavailable(): void
    {
        $service = new CustomDomainRdapService(static fn (string $url): array => [200, '{"objectClassName":"domain"}']);

        $result = $service->check('rdap-registered-' . bin2hex(random_bytes(4)) . '.com');

        $this->assertSame('unavailable', $result['status']);
        $this->assertSame(false, $result['available']);
    }

    private function unsupportedTldDoesNotCallExternalRequester(): void
    {
        $called = false;
        $service = new CustomDomainRdapService(static function (string $url) use (&$called): array {
            $called = true;

            return [404, ''];
        });

        $result = $service->check('rdap-unsupported-' . bin2hex(random_bytes(4)) . '.example');

        $this->assertSame('unsupported', $result['status']);
        $this->assertSame(null, $result['available']);
        $this->assertSame(false, $called);
    }

    private function providerFailureNeverClaimsAvailability(): void
    {
        $service = new CustomDomainRdapService(static fn (string $url): array => [429, 'rate limited']);

        $result = $service->check('rdap-provider-failure-' . bin2hex(random_bytes(4)) . '.net');

        $this->assertSame('unknown', $result['status']);
        $this->assertSame(null, $result['available']);
    }
}
