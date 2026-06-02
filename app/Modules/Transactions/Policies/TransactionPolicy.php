<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Policies;

use App\Core\Exceptions\ForbiddenException;

class TransactionPolicy
{
    public static function scopeFilters(array $user, array $filters): array
    {
        if (($user['role'] ?? null) === 'admin') {
            return $filters;
        }

        if (($user['role'] ?? null) === 'seller') {
            $filters['seller_user_id'] = (int) $user['id'];
            unset($filters['buyer_user_id']);

            return $filters;
        }

        $filters['buyer_user_id'] = (int) $user['id'];
        unset($filters['seller_user_id']);

        return $filters;
    }

    public static function ensureCanCreate(array $user, int $buyerUserId): void
    {
        if (($user['role'] ?? null) === 'admin') {
            return;
        }

        if (($user['role'] ?? null) === 'buyer' && (int) $user['id'] === $buyerUserId) {
            return;
        }

        throw new ForbiddenException('Akses transaksi tidak diizinkan.');
    }

    public static function ensureCanView(array $user, array $transaction): void
    {
        if (($user['role'] ?? null) === 'admin') {
            return;
        }

        if ((int) $user['id'] === (int) $transaction['buyer_user_id']) {
            return;
        }

        if (($user['role'] ?? null) === 'seller' && (int) $user['id'] === (int) $transaction['seller_user_id']) {
            return;
        }

        throw new ForbiddenException('Akses transaksi tidak diizinkan.');
    }

    public static function ensureCanUpdateStatus(array $user, array $transaction, string $targetStatus): void
    {
        if ($targetStatus === 'completed') {
            if (($user['role'] ?? null) === 'buyer' && (int) $user['id'] === (int) $transaction['buyer_user_id']) {
                return;
            }

            throw new ForbiddenException('Hanya buyer yang dapat menyelesaikan transaksi.');
        }

        self::ensureCanManageStatus($user, $transaction);
    }

    public static function ensureCanManageStatus(array $user, array $transaction): void
    {
        if (($user['role'] ?? null) === 'admin') {
            return;
        }

        if (($user['role'] ?? null) === 'seller' && (int) $user['id'] === (int) $transaction['seller_user_id']) {
            return;
        }

        throw new ForbiddenException('Akses update status transaksi tidak diizinkan.');
    }

    public static function ensureCanManageFulfillmentChecklist(array $user, array $transaction): void
    {
        if (($user['role'] ?? null) === 'seller' && (int) $user['id'] === (int) $transaction['seller_user_id']) {
            return;
        }

        if (($user['role'] ?? null) === 'admin') {
            return;
        }

        throw new ForbiddenException('Hanya seller yang dapat memperbarui checklist transaksi.');
    }

    public static function ensureCanCompletePayment(array $user, array $transaction): void
    {
        if (($user['role'] ?? null) === 'admin') {
            return;
        }

        if (($user['role'] ?? null) === 'buyer' && (int) $user['id'] === (int) $transaction['buyer_user_id']) {
            return;
        }

        throw new ForbiddenException('Akses pelunasan transaksi tidak diizinkan.');
    }
}
