<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Container;
use App\Core\Request;
use App\Core\Router;
use Tests\TestCase;

class HealthRouteTest extends TestCase
{
    public function run(): void
    {
        $router = new Router(new Container());
        $registerRoutes = require base_path('routes/api.php');
        $registerRoutes($router);

        $this->assertRootRouteReturnsStandardJson($router);
        $this->assertHealthRouteReturnsSafeStandardJson($router);
    }

    private function assertRootRouteReturnsStandardJson(Router $router): void
    {
        $response = $router->dispatch(new Request('GET', '/', '/'));
        $payload = json_decode($response->body(), true);

        $this->assertSame(200, $response->statusCode());
        $this->assertSame(true, $payload['success']);
        $this->assertSame('Application is running', $payload['message']);
        $this->assertSame('running', $payload['data']['status']);
        $this->assertSame('BeliMobil', $payload['data']['app']);
        $this->assertTrue(array_key_exists('meta', $payload));
        $this->assertTrue(array_key_exists('errors', $payload));
    }

    private function assertHealthRouteReturnsSafeStandardJson(Router $router): void
    {
        $response = $router->dispatch(new Request('GET', '/health', '/health'));
        $payload = json_decode($response->body(), true);

        $this->assertSame(200, $response->statusCode());
        $this->assertSame(true, $payload['success']);
        $this->assertSame('Health check OK', $payload['message']);
        $this->assertSame('ok', $payload['data']['status']);
        $this->assertSame('BeliMobil', $payload['data']['app']);
        $this->assertTrue(isset($payload['data']['timestamp']));
        $this->assertTrue(isset($payload['data']['timezone']));
        $this->assertTrue(! array_key_exists('environment', $payload['data']));
        $this->assertTrue(! array_key_exists('request_id', $payload['data']));
    }
}
