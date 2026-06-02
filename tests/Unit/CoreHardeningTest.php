<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Auth\AuthContext;
use App\Core\Container;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Core\Responder;
use App\Core\Router;
use Tests\TestCase;

class CoreHardeningTest extends TestCase
{
    public function run(): void
    {
        $this->containerResolvesSingletonsAndConstructorDependencies();
        $this->routerResolvesControllerHandlersThroughContainer();
        $this->requestUsesAuthContextAsSourceOfTruth();
    }

    private function containerResolvesSingletonsAndConstructorDependencies(): void
    {
        $container = new Container();
        $container->singleton(Responder::class);
        $container->bind(CoreTestController::class);

        $first = $container->make(Responder::class);
        $second = $container->make(Responder::class);
        $controller = $container->make(CoreTestController::class);

        $this->assertTrue($first === $second, 'Responder singleton should resolve to the same instance.');
        $this->assertTrue($controller instanceof CoreTestController);
    }

    private function routerResolvesControllerHandlersThroughContainer(): void
    {
        $container = new Container();
        $container->singleton(Responder::class);
        $router = new Router($container);
        $router->get('/core-hardening', [CoreTestController::class, 'show']);

        $response = $router->dispatch(new Request('GET', '/core-hardening', '/core-hardening'));
        $payload = json_decode($response->body(), true);

        $this->assertSame(200, $response->statusCode());
        $this->assertSame(true, $payload['success']);
        $this->assertSame('ready', $payload['data']['status']);
    }

    private function requestUsesAuthContextAsSourceOfTruth(): void
    {
        $auth = new AuthContext();
        $request = (new Request('GET', '/me', '/me'))->withAuthContext($auth);
        $request = $request->withAttribute('auth_user', [
            'id' => 42,
            'role' => 'seller',
        ]);

        $this->assertSame(42, $auth->id());
        $this->assertSame('seller', $request->user()['role']);
    }
}

class CoreTestController
{
    private Responder $response;

    public function __construct(Responder $response)
    {
        $this->response = $response;
    }

    public function show(Request $request): JsonResponse
    {
        return $this->response->success([
            'status' => 'ready',
        ]);
    }
}
