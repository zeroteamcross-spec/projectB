<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ValidationException;
use App\Modules\Transactions\Policies\TransactionPaymentModePolicy;
use Tests\TestCase;

class TransactionPaymentModePolicyTest extends TestCase
{
    public function run(): void
    {
        $this->assertTrue(TransactionPaymentModePolicy::allows('manual', 'manual_transfer'));
        $this->assertTrue(! TransactionPaymentModePolicy::allows('manual', 'bca_va'));
        $this->assertTrue(! TransactionPaymentModePolicy::allows('manual', 'qris'));

        $this->assertTrue(! TransactionPaymentModePolicy::allows('midtrans', 'manual_transfer'));
        $this->assertTrue(TransactionPaymentModePolicy::allows('midtrans', 'bca_va'));
        $this->assertTrue(TransactionPaymentModePolicy::allows('midtrans', 'gopay'));
        $this->assertTrue(TransactionPaymentModePolicy::allows('midtrans', 'qris'));

        $this->assertTrue(TransactionPaymentModePolicy::allows('both', 'manual_transfer'));
        $this->assertTrue(TransactionPaymentModePolicy::allows('both', 'bca_va'));
        $this->assertSame('both', TransactionPaymentModePolicy::normalizeMode('unknown'));
        $this->assertTrue(TransactionPaymentModePolicy::allows('unknown', 'manual_transfer'));
        $this->assertTrue(! TransactionPaymentModePolicy::allows('both', 'unknown_method'));

        $this->expectException(ValidationException::class, static function (): void {
            TransactionPaymentModePolicy::assertAllowed('manual', 'bca_va');
        }, 'payment_method');
        $this->expectException(ValidationException::class, static function (): void {
            TransactionPaymentModePolicy::assertAllowed('midtrans', 'manual_transfer');
        }, 'payment_method');
    }
}
