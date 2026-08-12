<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Modules\Transactions\Repositories\PaymentLogRepository;
use App\Modules\Transactions\Services\PaymentLogService;
use Tests\TestCase;

class PaymentStatusTest extends TestCase
{
    public function run(): void
    {
        $service = new PaymentLogService(new PaymentLogRepository($this->sqlite()));

        $this->assertSame('paid', $service->providerStatusToCanon([
            'payment_type' => 'full',
            'transaction_status' => 'pending_payment',
        ], 'settlement', 150000000));

        $this->assertSame('dp_paid', $service->providerStatusToCanon([
            'payment_type' => 'dp',
            'transaction_status' => 'pending_payment',
            'remaining_amount' => 100000000,
        ], 'capture', 50000000));

        $this->assertSame('dp_paid', $service->providerStatusToCanon([
            'payment_type' => 'dp',
            'transaction_status' => 'dp_paid',
            'remaining_amount' => 100000000,
        ], 'settlement', 100000000));

        $this->assertSame('expired', $service->providerStatusToCanon([
            'payment_type' => 'full',
            'transaction_status' => 'pending_payment',
        ], 'expire', null));

        $this->assertSame('cancelled', $service->providerStatusToCanon([
            'payment_type' => 'full',
            'transaction_status' => 'pending_payment',
        ], 'deny', null));
    }
}
