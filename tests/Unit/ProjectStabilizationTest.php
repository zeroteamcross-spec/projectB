<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\JsonResponse;
use App\Modules\Auth\Repositories\AuthTokenRepository;
use App\Modules\Auth\Repositories\AuthUserRepository;
use App\Modules\Auth\Services\AuthService;
use PDO;
use ReflectionClass;
use Tests\TestCase;

class ProjectStabilizationTest extends TestCase
{
    public function run(): void
    {
        $this->routesUseContainerResolvedClassHandlers();
        $this->modulesDoNotManuallyWireCoreDependencies();
        $this->authServiceUsesRepositoryInjection();
        $this->jsonResponseUsesStandardEnvelope();
    }

    private function routesUseContainerResolvedClassHandlers(): void
    {
        foreach (glob($this->projectPath('app/Modules/*/Routes/api.php')) ?: [] as $routeFile) {
            $contents = file_get_contents($routeFile);

            $this->assertTrue(
                strpos($contents, 'new ') === false,
                $routeFile . ' must not instantiate route handlers manually.'
            );
            $this->assertTrue(
                strpos($contents, 'static fn (Request') === false,
                $routeFile . ' must not use Request closures as controller wrappers.'
            );
            $this->assertTrue(
                strpos($contents, 'Controller::class') !== false,
                $routeFile . ' should register controller class handlers.'
            );
        }
    }

    private function modulesDoNotManuallyWireCoreDependencies(): void
    {
        foreach (glob($this->projectPath('app/Modules/*/{Controllers,Routes,Services}/*.php'), GLOB_BRACE) ?: [] as $file) {
            $contents = file_get_contents($file);

            foreach ([
                'ConnectionFactory',
                'new TransactionRepository',
                'new PaymentLogRepository',
                'new AffiliateRepository',
                'new AuthUserRepository',
                'new AuthTokenRepository',
                'new MasterDataRepository',
                'new ApiVersionRepository',
                'new ShowroomRepository',
                'new UserRepository',
                'new CarRepository',
                'new CarImageRepository',
                'new InspectionRepository',
            ] as $manualWiring) {
                $this->assertTrue(
                    strpos($contents, $manualWiring) === false,
                    $file . ' should rely on container dependency resolution, found ' . $manualWiring . '.'
                );
            }
        }
    }

    private function authServiceUsesRepositoryInjection(): void
    {
        $constructor = (new ReflectionClass(AuthService::class))->getConstructor();

        $this->assertNotNull($constructor);

        $types = array_map(
            static fn ($parameter): string => $parameter->getType()->getName(),
            $constructor->getParameters()
        );

        $this->assertTrue(in_array(PDO::class, $types, true));
        $this->assertTrue(in_array(AuthUserRepository::class, $types, true));
        $this->assertTrue(in_array(AuthTokenRepository::class, $types, true));
    }

    private function jsonResponseUsesStandardEnvelope(): void
    {
        $success = json_decode(JsonResponse::success(['id' => 1], 'OK')->body(), true);
        $error = json_decode(JsonResponse::error('Invalid', ['field' => 'Required'], 422)->body(), true);

        foreach (['success', 'message', 'data', 'meta', 'errors'] as $key) {
            $this->assertTrue(array_key_exists($key, $success));
            $this->assertTrue(array_key_exists($key, $error));
        }

        $this->assertSame(true, $success['success']);
        $this->assertSame(false, $error['success']);
        $this->assertSame([], $success['errors']);
        $this->assertSame('Required', $error['errors']['field']);
    }

    private function projectPath(string $path): string
    {
        return dirname(__DIR__, 2) . '/' . str_replace('\\', '/', $path);
    }
}
