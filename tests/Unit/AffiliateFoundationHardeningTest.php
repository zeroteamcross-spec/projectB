<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ForbiddenException;
use App\Modules\Affiliate\Controllers\AffiliateController;
use App\Modules\Affiliate\Policies\AffiliatePolicy;
use App\Modules\Affiliate\Repositories\AffiliateClickLogRepository;
use App\Modules\Affiliate\Repositories\AffiliateCommissionLedgerRepository;
use App\Modules\Affiliate\Repositories\AffiliateRepository;
use App\Modules\Affiliate\Services\AffiliateService;
use ReflectionClass;
use Tests\TestCase;

class AffiliateFoundationHardeningTest extends TestCase
{
    public function run(): void
    {
        $this->testRoutesUseClassHandlers();
        $this->testReferenceRoutesDoNotManuallyInstantiateControllers();
        $this->testControllerUsesConstructorInjection();
        $this->testAffiliateServiceUsesSplitRepositories();
        $this->testPolicyAllowsAdminAndOwnerSellerOnly();
    }

    private function testRoutesUseClassHandlers(): void
    {
        $routes = file_get_contents($this->projectPath('app/Modules/Affiliate/Routes/api.php'));

        $this->assertTrue(strpos($routes, '[AffiliateController::class') !== false);
        $this->assertTrue(strpos($routes, '(new AffiliateController') === false);
    }

    private function testReferenceRoutesDoNotManuallyInstantiateControllers(): void
    {
        foreach ([
            'app/Modules/Affiliate/Routes/api.php',
            'app/Modules/MasterData/Routes/api.php',
            'app/Modules/ApiVersion/Routes/api.php',
        ] as $path) {
            $routes = file_get_contents($this->projectPath($path));

            $this->assertTrue(
                strpos($routes, 'new ') === false,
                $path . ' should rely on container-resolved class handlers.'
            );
        }
    }

    private function testControllerUsesConstructorInjection(): void
    {
        $reflection = new ReflectionClass(AffiliateController::class);
        $constructor = $reflection->getConstructor();

        $this->assertNotNull($constructor);
        $parameters = $constructor->getParameters();

        $this->assertSame(1, count($parameters));
        $this->assertSame(AffiliateService::class, $parameters[0]->getType()->getName());
    }

    private function testAffiliateServiceUsesSplitRepositories(): void
    {
        $constructor = (new ReflectionClass(AffiliateService::class))->getConstructor();

        $this->assertNotNull($constructor);
        $types = array_map(
            static fn ($parameter): string => $parameter->getType()->getName(),
            $constructor->getParameters()
        );

        $this->assertTrue(in_array(AffiliateRepository::class, $types, true));
        $this->assertTrue(in_array(AffiliateClickLogRepository::class, $types, true));
        $this->assertTrue(in_array(AffiliateCommissionLedgerRepository::class, $types, true));

        $affiliateRepository = file_get_contents($this->projectPath('app/Modules/Affiliate/Repositories/AffiliateRepository.php'));

        foreach ([
            'affiliate_click_logs',
            'affiliate_commission_ledgers',
            'createClickLog',
            'createLedger',
            'listLedgers',
        ] as $legacyMethodOrTable) {
            $this->assertTrue(
                strpos($affiliateRepository, $legacyMethodOrTable) === false,
                'AffiliateRepository should not contain ' . $legacyMethodOrTable . '.'
            );
        }
    }

    private function testPolicyAllowsAdminAndOwnerSellerOnly(): void
    {
        AffiliatePolicy::ensureCanManage(['id' => 10, 'role' => 'admin'], ['seller_user_id' => 20]);
        AffiliatePolicy::ensureCanManage(['id' => 20, 'role' => 'seller'], ['seller_user_id' => 20]);

        $this->expectException(ForbiddenException::class, function (): void {
            AffiliatePolicy::ensureCanManage(['id' => 21, 'role' => 'seller'], ['seller_user_id' => 20]);
        });

        $this->expectException(ForbiddenException::class, function (): void {
            AffiliatePolicy::ensureCanGenerateReferralCode(['id' => 30, 'role' => 'buyer']);
        });
    }

    private function projectPath(string $path): string
    {
        return dirname(__DIR__, 2) . '/' . str_replace('\\', '/', $path);
    }
}
