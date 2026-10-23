<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Policies;

use App\Core\Exceptions\ValidationException;

final class TransactionPaymentModePolicy
{
    private const MODES = ['manual', 'midtrans', 'both'];

    private const PAYMENT_METHODS = ['bca_va', 'gopay', 'qris', 'manual_transfer'];

    public static function normalizeMode($value): string
    {
        $mode = strtolower(trim((string) ($value ?? 'both')));

        return in_array($mode, self::MODES, true) ? $mode : 'both';
    }

    public static function allows(string $mode, string $paymentMethod): bool
    {
        $mode = self::normalizeMode($mode);
        if (! in_array($paymentMethod, self::PAYMENT_METHODS, true)) {
            return false;
        }

        if ($mode === 'both') {
            return true;
        }

        $isManualTransfer = $paymentMethod === 'manual_transfer';

        return $mode === 'manual' ? $isManualTransfer : ! $isManualTransfer;
    }

    public static function assertAllowed(string $mode, string $paymentMethod): void
    {
        $mode = self::normalizeMode($mode);
        if (self::allows($mode, $paymentMethod)) {
            return;
        }

        throw new ValidationException([
            'payment_method' => $mode === 'manual'
                ? 'Pembayaran otomatis tidak tersedia sesuai pengaturan Master Pembayaran. Gunakan transfer manual.'
                : 'Transfer manual tidak tersedia sesuai pengaturan Master Pembayaran. Gunakan pembayaran otomatis.',
        ]);
    }
}
