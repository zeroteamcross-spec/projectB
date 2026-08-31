<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Services;

use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Modules\Notifications\Mappers\NotificationMapper;
use App\Modules\Notifications\Repositories\NotificationRepository;
use PDOException;

class NotificationService
{
    private const ROLES = ['seller', 'buyer', 'affiliate_admin', 'admin'];

    private const TYPES = [
        'transaction_paid',
        'transaction_processing',
        'transaction_completed',
        'transaction_new',
        'message_new',
        'offer',
        'listing_approved',
        'listing_rejected',
        'inspection_needed',
        'commission_accrued',
        'settlement_paid',
        'security_alert',
        'system_message',
        'manual_transfer_submitted',
        'manual_transfer_rejected',
    ];

    private const ICON_KEYS = [
        'payment',
        'transaction',
        'message',
        'offer',
        'security',
        'commission',
        'settlement',
        'inspection',
        'listing',
        'system',
    ];

    private NotificationRepository $notifications;

    public function __construct(NotificationRepository $notifications)
    {
        $this->notifications = $notifications;
    }

    public function create(array $data): array
    {
        $targetUserId = (int) ($data['user_id'] ?? 0);
        $targetUser = $targetUserId > 0 ? $this->notifications->findUserById($targetUserId) : null;

        if (! $targetUser) {
            throw new ValidationException(['user_id' => 'Target user notifikasi tidak valid.']);
        }

        $role = $this->normalizeRole((string) ($data['role'] ?? $targetUser['role']));
        if ($role !== (string) $targetUser['role']) {
            throw new ValidationException(['role' => 'Role notifikasi tidak sesuai dengan user target.']);
        }

        $type = (string) ($data['type'] ?? '');
        if (! in_array($type, self::TYPES, true)) {
            throw new ValidationException(['type' => 'Type notifikasi tidak valid.']);
        }

        $iconKey = $data['icon_key'] ?? null;
        if ($iconKey !== null && $iconKey !== '' && ! in_array((string) $iconKey, self::ICON_KEYS, true)) {
            throw new ValidationException(['icon_key' => 'Icon key notifikasi tidak valid.']);
        }

        $payload = [
            'user_id' => $targetUserId,
            'role' => $role,
            'type' => $type,
            'title' => $this->requiredString($data, 'title', 160),
            'body' => $this->requiredString($data, 'body', 600),
            'data_json' => $this->encodeData($data['data'] ?? $data['data_json'] ?? []),
            'link_url' => $this->nullableString($data['link_url'] ?? null, 300),
            'icon_key' => $iconKey === null || $iconKey === '' ? null : (string) $iconKey,
            'priority' => $this->priority((string) ($data['priority'] ?? 'normal')),
            'source_type' => $this->nullableString($data['source_type'] ?? null, 80),
            'source_id' => $this->nullableString($data['source_id'] ?? null, 120),
            'actor_user_id' => isset($data['actor_user_id']) ? (int) $data['actor_user_id'] : null,
            'is_read' => 0,
            'read_at' => null,
            'expires_at' => $this->nullableString($data['expires_at'] ?? null, 25),
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => null,
            'deleted_at' => null,
        ];

        $notificationId = $this->notifications->create($payload);

        return NotificationMapper::notification(
            $this->notifications->findForUser($notificationId, $targetUserId, $role)
        );
    }

    public function createOnce(array $data): array
    {
        $targetUserId = (int) ($data['user_id'] ?? 0);
        $targetUser = $targetUserId > 0 ? $this->notifications->findUserById($targetUserId) : null;
        $role = $this->normalizeRole((string) ($data['role'] ?? ($targetUser['role'] ?? '')));
        $type = (string) ($data['type'] ?? '');
        $sourceType = trim((string) ($data['source_type'] ?? ''));
        $sourceId = trim((string) ($data['source_id'] ?? ''));

        if ($targetUser && $sourceType !== '' && $sourceId !== '') {
            $existing = $this->notifications->findBySourceForUser($targetUserId, $role, $type, $sourceType, $sourceId);
            if ($existing) {
                return NotificationMapper::notification($existing);
            }
        }

        try {
            return $this->create($data);
        } catch (PDOException $exception) {
            if ($this->isDuplicateKey($exception) && $targetUser && $sourceType !== '' && $sourceId !== '') {
                $existing = $this->notifications->findBySourceForUser($targetUserId, $role, $type, $sourceType, $sourceId);
                if ($existing) {
                    return NotificationMapper::notification($existing);
                }
            }

            throw $exception;
        }
    }

    public function createTransactionPaidNotifications(array $transaction): array
    {
        $transactionId = (int) ($transaction['id'] ?? 0);
        if ($transactionId <= 0 || ($transaction['transaction_status'] ?? null) !== 'paid') {
            return [];
        }

        $source = [
            'type' => 'transaction_paid',
            'source_type' => 'transaction',
            'source_id' => (string) $transactionId,
        ];
        $data = $this->transactionNotificationData($transaction);
        $carLabel = $this->transactionCarLabel($transaction);
        $code = (string) ($transaction['transaction_code'] ?? ('#' . $transactionId));
        $created = [];

        $buyerUserId = (int) ($transaction['buyer_user_id'] ?? 0);
        if ($buyerUserId > 0) {
            $created[] = $this->createOnce(array_merge($source, [
                'user_id' => $buyerUserId,
                'role' => 'buyer',
                'title' => 'Pembayaran Berhasil',
                'body' => sprintf('Pembayaran untuk transaksi %s sudah diterima.', $carLabel ?: $code),
                'data' => $data,
                'link_url' => '/buyer/transactions/' . $transactionId,
                'icon_key' => 'payment',
                'priority' => 'high',
            ]));
        }

        $sellerUserId = (int) ($transaction['seller_user_id'] ?? 0);
        if ($sellerUserId > 0) {
            $created[] = $this->createOnce(array_merge($source, [
                'user_id' => $sellerUserId,
                'role' => 'seller',
                'title' => 'Transaksi Dibayar',
                'body' => sprintf('Buyer telah menyelesaikan pembayaran untuk %s. Segera proses transaksi.', $carLabel ?: $code),
                'data' => $data,
                'link_url' => '/seller/transactions',
                'icon_key' => 'transaction',
                'priority' => 'high',
            ]));
        }

        foreach ($this->notifications->listActiveAdmins() as $admin) {
            $created[] = $this->createOnce(array_merge($source, [
                'user_id' => (int) $admin['id'],
                'role' => 'admin',
                'title' => 'Pembayaran Transaksi Masuk',
                'body' => sprintf('Transaksi %s untuk %s sudah berstatus paid.', $code, $carLabel ?: 'unit terkait'),
                'data' => $data,
                'link_url' => '/admin/transactions',
                'icon_key' => 'payment',
                'priority' => 'normal',
            ]));
        }

        return $created;
    }

    public function createManualTransferSubmittedNotification(array $transaction): ?array
    {
        $sellerUserId = (int) ($transaction['seller_user_id'] ?? 0);
        if ($sellerUserId <= 0) {
            return null;
        }

        $carLabel = $this->transactionCarLabel($transaction);
        $code = (string) ($transaction['transaction_code'] ?? ('#' . (int) ($transaction['id'] ?? 0)));

        return $this->create([
            'user_id' => $sellerUserId,
            'role' => 'seller',
            'type' => 'manual_transfer_submitted',
            'title' => 'Bukti Transfer Manual Masuk',
            'body' => sprintf('Buyer mengunggah bukti transfer untuk %s. Cek mutasi rekening lalu konfirmasi.', $carLabel ?: $code),
            'data' => $this->transactionNotificationData($transaction),
            'link_url' => '/seller/transactions',
            'icon_key' => 'payment',
            'priority' => 'high',
        ]);
    }

    public function createManualTransferRejectedNotification(array $transaction): ?array
    {
        $buyerUserId = (int) ($transaction['buyer_user_id'] ?? 0);
        if ($buyerUserId <= 0) {
            return null;
        }

        $carLabel = $this->transactionCarLabel($transaction);
        $code = (string) ($transaction['transaction_code'] ?? ('#' . (int) ($transaction['id'] ?? 0)));
        $reason = trim((string) ($transaction['manual_transfer_rejected_reason'] ?? ''));

        return $this->create([
            'user_id' => $buyerUserId,
            'role' => 'buyer',
            'type' => 'manual_transfer_rejected',
            'title' => 'Bukti Transfer Ditolak',
            'body' => $reason !== ''
                ? sprintf('Bukti transfer untuk %s ditolak: %s. Unggah ulang buktinya.', $carLabel ?: $code, $reason)
                : sprintf('Bukti transfer untuk %s ditolak showroom. Unggah ulang buktinya.', $carLabel ?: $code),
            'data' => $this->transactionNotificationData($transaction),
            'link_url' => '/buyer/transactions',
            'icon_key' => 'payment',
            'priority' => 'high',
        ]);
    }

    public function createCommissionAccruedNotification(array $ledger, array $affiliate, array $transaction = []): ?array
    {
        $ledgerId = (int) ($ledger['id'] ?? 0);
        $affiliateUserId = (int) ($affiliate['user_id'] ?? 0);

        if ($ledgerId <= 0 || $affiliateUserId <= 0) {
            return null;
        }

        $transactionId = (int) ($ledger['transaction_id'] ?? ($transaction['id'] ?? 0));
        $carLabel = $this->transactionCarLabel($transaction);
        $bodySubject = $carLabel ?: (($transaction['transaction_code'] ?? null) ? 'transaksi ' . $transaction['transaction_code'] : 'transaksi referral');

        return $this->createOnce([
            'user_id' => $affiliateUserId,
            'role' => 'affiliate_admin',
            'type' => 'commission_accrued',
            'title' => 'Komisi Affiliate Masuk',
            'body' => sprintf('Komisi dari %s sudah tercatat.', $bodySubject),
            'data' => [
                'ledger_id' => $ledgerId,
                'affiliate_id' => (int) ($ledger['affiliate_id'] ?? $affiliate['id'] ?? 0),
                'transaction_id' => $transactionId ?: null,
                'commission_amount' => isset($ledger['commission_amount'])
                    ? (float) $ledger['commission_amount']
                    : (isset($ledger['amount']) ? (float) $ledger['amount'] : null),
            ],
            'link_url' => '/affiliate/ledger',
            'icon_key' => 'commission',
            'priority' => 'normal',
            'source_type' => 'affiliate_commission',
            'source_id' => (string) $ledgerId,
        ]);
    }

    public function createListingApprovedNotification(array $car): ?array
    {
        return $this->createListingStatusNotification(
            $car,
            'listing_approved',
            'Listing Disetujui',
            sprintf('Listing %s sudah aktif dan terlihat oleh buyer.', $this->carLabel($car) ?: ('mobil #' . ($car['id'] ?? ''))),
            'high'
        );
    }

    public function createListingRejectedNotification(array $car): ?array
    {
        return $this->createListingStatusNotification(
            $car,
            'listing_rejected',
            'Listing Ditolak',
            sprintf('Listing %s perlu diperbaiki sebelum dapat dipublikasikan kembali.', $this->carLabel($car) ?: ('mobil #' . ($car['id'] ?? ''))),
            'normal'
        );
    }

    public function createInspectionNeededNotification(array $car): ?array
    {
        $carId = (int) ($car['id'] ?? 0);
        $sellerUserId = (int) ($car['seller_user_id'] ?? 0);

        if ($carId <= 0 || $sellerUserId <= 0) {
            return null;
        }

        return $this->createOnce([
            'user_id' => $sellerUserId,
            'role' => 'seller',
            'type' => 'inspection_needed',
            'title' => 'Inspeksi Perlu Dilengkapi',
            'body' => sprintf('Lengkapi inspeksi untuk %s agar listing lebih siap diproses.', $this->carLabel($car) ?: ('mobil #' . $carId)),
            'data' => $this->carNotificationData($car),
            'link_url' => '/seller/inspection',
            'icon_key' => 'inspection',
            'priority' => 'normal',
            'source_type' => 'car_inspection',
            'source_id' => (string) $carId,
        ]);
    }

    public function createTransactionCompletedNotifications(array $transaction): array
    {
        $transactionId = (int) ($transaction['id'] ?? 0);
        if ($transactionId <= 0 || ($transaction['transaction_status'] ?? null) !== 'completed') {
            return [];
        }

        $source = [
            'type' => 'transaction_completed',
            'source_type' => 'transaction',
            'source_id' => (string) $transactionId,
        ];
        $data = $this->transactionNotificationData($transaction);
        $carLabel = $this->transactionCarLabel($transaction);
        $code = (string) ($transaction['transaction_code'] ?? ('#' . $transactionId));
        $created = [];

        $buyerUserId = (int) ($transaction['buyer_user_id'] ?? 0);
        if ($buyerUserId > 0) {
            $created[] = $this->createOnce(array_merge($source, [
                'user_id' => $buyerUserId,
                'role' => 'buyer',
                'title' => 'Transaksi Selesai',
                'body' => sprintf('Transaksi %s untuk %s sudah selesai.', $code, $carLabel ?: 'unit terkait'),
                'data' => $data,
                'link_url' => '/buyer/transactions/' . $transactionId,
                'icon_key' => 'transaction',
                'priority' => 'normal',
            ]));
        }

        $sellerUserId = (int) ($transaction['seller_user_id'] ?? 0);
        if ($sellerUserId > 0) {
            $created[] = $this->createOnce(array_merge($source, [
                'user_id' => $sellerUserId,
                'role' => 'seller',
                'title' => 'Transaksi Selesai',
                'body' => sprintf('Transaksi %s untuk %s sudah selesai.', $code, $carLabel ?: 'unit terkait'),
                'data' => $data,
                'link_url' => '/seller/transactions',
                'icon_key' => 'transaction',
                'priority' => 'normal',
            ]));
        }

        return $created;
    }

    public function createSettlementPaidNotification(array $settlement, array $affiliate): ?array
    {
        $settlementId = (int) ($settlement['id'] ?? 0);
        $affiliateUserId = (int) ($affiliate['user_id'] ?? 0);

        if ($settlementId <= 0 || $affiliateUserId <= 0 || ($settlement['status'] ?? null) !== 'settled') {
            return null;
        }

        return $this->createOnce([
            'user_id' => $affiliateUserId,
            'role' => 'affiliate_admin',
            'type' => 'settlement_paid',
            'title' => 'Settlement Dibayar',
            'body' => sprintf('Settlement affiliate senilai Rp%s sudah dibayar.', number_format((float) ($settlement['requested_amount'] ?? 0), 0, ',', '.')),
            'data' => [
                'settlement_batch_id' => $settlementId,
                'affiliate_id' => (int) ($settlement['affiliate_id'] ?? $affiliate['id'] ?? 0),
                'requested_amount' => isset($settlement['requested_amount']) ? (float) $settlement['requested_amount'] : null,
                'ledger_count' => isset($settlement['ledger_count']) ? (int) $settlement['ledger_count'] : null,
            ],
            'link_url' => '/affiliate/settlements',
            'icon_key' => 'settlement',
            'priority' => 'normal',
            'source_type' => 'affiliate_settlement',
            'source_id' => (string) $settlementId,
        ]);
    }

    public function snapshot(array $user, int $limit = 5): array
    {
        $scope = $this->scope($user);
        $limit = max(1, min($limit, 10));

        return [
            'unread_count' => $this->notifications->unreadCountForUser($scope['user_id'], $scope['role']),
            'items' => array_map(
                static fn (array $row): array => NotificationMapper::snapshotNotification($row),
                $this->notifications->latestForUser($scope['user_id'], $scope['role'], $limit)
            ),
        ];
    }

    public function list(array $user, array $filters = []): array
    {
        $scope = $this->scope($user);
        $status = $this->status((string) ($filters['status'] ?? 'all'));
        $limit = max(1, min((int) ($filters['limit'] ?? 20), 50));
        $cursor = isset($filters['cursor']) && is_numeric($filters['cursor']) ? (int) $filters['cursor'] : null;
        $rows = $this->notifications->listForUser(
            $scope['user_id'],
            $scope['role'],
            ['status' => $status],
            $limit + 1,
            $cursor
        );
        $hasNext = count($rows) > $limit;
        $items = array_slice($rows, 0, $limit);
        $last = $items[count($items) - 1] ?? null;

        return [
            'items' => array_map(
                static fn (array $row): array => NotificationMapper::notification($row),
                $items
            ),
            'next_cursor' => $hasNext && $last ? (string) $last['id'] : null,
            'unread_count' => $this->notifications->unreadCountForUser($scope['user_id'], $scope['role']),
        ];
    }

    public function markRead(array $user, int $notificationId): array
    {
        $scope = $this->scope($user);
        $notification = $this->notifications->findForUser($notificationId, $scope['user_id'], $scope['role']);

        if (! $notification) {
            throw new NotFoundException('Notifikasi tidak ditemukan.');
        }

        $readAt = date('Y-m-d H:i:s');
        $this->notifications->markRead($notificationId, $scope['user_id'], $scope['role'], $readAt);
        $updated = $this->notifications->findForUser($notificationId, $scope['user_id'], $scope['role']);

        return [
            'id' => $notificationId,
            'is_read' => true,
            'read_at' => $updated['read_at'] ?? $readAt,
            'unread_count' => $this->notifications->unreadCountForUser($scope['user_id'], $scope['role']),
        ];
    }

    public function markAllRead(array $user): array
    {
        $scope = $this->scope($user);
        $updatedCount = $this->notifications->markAllRead($scope['user_id'], $scope['role'], date('Y-m-d H:i:s'));

        return [
            'updated_count' => $updatedCount,
            'unread_count' => 0,
        ];
    }

    private function scope(array $user): array
    {
        $userId = (int) ($user['id'] ?? 0);
        $role = $this->normalizeRole((string) ($user['role'] ?? ''));

        if ($userId <= 0 || ! in_array($role, self::ROLES, true)) {
            throw new ValidationException(['auth' => 'User notifikasi tidak valid.']);
        }

        return [
            'user_id' => $userId,
            'role' => $role,
        ];
    }

    private function transactionNotificationData(array $transaction): array
    {
        return [
            'transaction_id' => (int) ($transaction['id'] ?? 0),
            'transaction_code' => $transaction['transaction_code'] ?? null,
            'car_id' => isset($transaction['car_id']) ? (int) $transaction['car_id'] : null,
            'seller_id' => isset($transaction['seller_user_id']) ? (int) $transaction['seller_user_id'] : null,
            'buyer_id' => isset($transaction['buyer_user_id']) ? (int) $transaction['buyer_user_id'] : null,
        ];
    }

    private function createListingStatusNotification(
        array $car,
        string $type,
        string $title,
        string $body,
        string $priority
    ): ?array {
        $carId = (int) ($car['id'] ?? 0);
        $sellerUserId = (int) ($car['seller_user_id'] ?? 0);

        if ($carId <= 0 || $sellerUserId <= 0) {
            return null;
        }

        return $this->createOnce([
            'user_id' => $sellerUserId,
            'role' => 'seller',
            'type' => $type,
            'title' => $title,
            'body' => $body,
            'data' => $this->carNotificationData($car),
            'link_url' => '/seller/cars',
            'icon_key' => 'listing',
            'priority' => $priority,
            'source_type' => 'car',
            'source_id' => (string) $carId,
        ]);
    }

    private function carNotificationData(array $car): array
    {
        return [
            'car_id' => isset($car['id']) ? (int) $car['id'] : null,
            'seller_id' => isset($car['seller_user_id']) ? (int) $car['seller_user_id'] : null,
            'listing_status' => $car['listing_status'] ?? null,
            'inspection_summary_status' => $car['inspection_summary_status'] ?? null,
        ];
    }

    private function carLabel(array $car): string
    {
        return trim(implode(' ', array_filter([
            $car['brand_name'] ?? null,
            $car['model_name'] ?? null,
            $car['sub_model_name'] ?? null,
        ])));
    }

    private function transactionCarLabel(array $transaction): string
    {
        return trim(implode(' ', array_filter([
            $transaction['brand_name'] ?? null,
            $transaction['model_name'] ?? null,
            $transaction['sub_model_name'] ?? null,
        ])));
    }

    private function isDuplicateKey(PDOException $exception): bool
    {
        return $exception->getCode() === '23000';
    }

    private function normalizeRole(string $role): string
    {
        return $role === 'affiliate' ? 'affiliate_admin' : $role;
    }

    private function status(string $status): string
    {
        if (! in_array($status, ['all', 'unread', 'read'], true)) {
            throw new ValidationException(['status' => 'Filter status notifikasi tidak valid.']);
        }

        return $status;
    }

    private function priority(string $priority): string
    {
        if (! in_array($priority, ['low', 'normal', 'high'], true)) {
            throw new ValidationException(['priority' => 'Priority notifikasi tidak valid.']);
        }

        return $priority;
    }

    private function requiredString(array $data, string $key, int $maxLength): string
    {
        $value = trim((string) ($data[$key] ?? ''));

        if ($value === '') {
            throw new ValidationException([$key => 'Field ' . $key . ' wajib diisi.']);
        }

        if (strlen($value) > $maxLength) {
            throw new ValidationException([$key => 'Field ' . $key . ' terlalu panjang.']);
        }

        return $value;
    }

    private function nullableString($value, int $maxLength): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $value = trim((string) $value);

        if (strlen($value) > $maxLength) {
            throw new ValidationException(['value' => 'Nilai string terlalu panjang.']);
        }

        return $value;
    }

    private function encodeData($data): ?string
    {
        if ($data === null || $data === '' || $data === []) {
            return null;
        }

        if (is_string($data)) {
            json_decode($data, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new ValidationException(['data_json' => 'Data JSON notifikasi tidak valid.']);
            }

            return $data;
        }

        if (! is_array($data)) {
            throw new ValidationException(['data' => 'Data notifikasi harus berupa object/array.']);
        }

        return json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
