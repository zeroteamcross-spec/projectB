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
        ], 'settlement', 150000000, 150000000));

        $this->assertSame(null, $service->providerStatusToCanon([
            'payment_type' => 'dp',
            'transaction_status' => 'pending_payment',
            'remaining_amount' => 100000000,
        ], 'capture', 50000000, 50000000));

        $this->assertSame('paid', $service->providerStatusToCanon([
            'payment_type' => 'full',
            'transaction_status' => 'pending_payment',
        ], 'capture', 150000000, 150000000, 'accept', true));
        $this->assertSame(null, $service->providerStatusToCanon([
            'payment_type' => 'full',
            'transaction_status' => 'pending_payment',
        ], 'capture', 150000000, 150000000));
        foreach (['challenge', 'deny'] as $fraudStatus) {
            $this->assertSame(null, $service->providerStatusToCanon([
                'payment_type' => 'full',
                'transaction_status' => 'pending_payment',
            ], 'capture', 150000000, 150000000, $fraudStatus, true));
        }

        $this->assertSame('dp_paid', $service->providerStatusToCanon([
            'payment_type' => 'dp',
            'payment_method' => 'gopay',
            'transaction_status' => 'dp_paid',
            'remaining_amount' => 100000000,
        ], 'settlement', 100000000, null));

        $this->assertSame('dp_paid', $service->providerStatusToCanon([
            'payment_type' => 'dp',
            'payment_method' => 'offline_payment',
            'transaction_status' => 'dp_paid',
            'remaining_amount' => 100000000,
        ], 'settlement', 100000000, null));

        $this->assertSame('expired', $service->providerStatusToCanon([
            'payment_type' => 'full',
            'transaction_status' => 'pending_payment',
        ], 'expire', null, null));

        $this->assertSame('cancelled', $service->providerStatusToCanon([
            'payment_type' => 'full',
            'transaction_status' => 'pending_payment',
        ], 'deny', null, null));

        $this->assertSame(null, $service->providerStatusToCanon([
            'payment_type' => 'full',
            'transaction_status' => 'pending_payment',
        ], 'settlement', 149999999, 150000000));
    }
}
