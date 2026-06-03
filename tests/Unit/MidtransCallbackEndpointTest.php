<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Request;
use App\Modules\Transactions\Controllers\TransactionController;
use ReflectionClass;
use Tests\TestCase;

class MidtransCallbackEndpointTest extends TestCase
{
    public function run(): void
    {
        $controller = (new ReflectionClass(TransactionController::class))->newInstanceWithoutConstructor();
        $request = new Request(
            'POST',
            '/api/payments/midtrans/callbacks',
            '/api/payments/midtrans/callbacks',
            [],
            [],
            ['content-type' => 'application/json'],
            [],
            [],
            '{}'
        );

        $response = $controller->providerCallback($request);
        $payload = json_decode($response->body(), true);

        $this->assertSame(200, $response->statusCode());
        $this->assertSame(true, $payload['data']['acknowledged'] ?? null);
        $this->assertSame(false, $payload['data']['processed'] ?? null);
    }
}
