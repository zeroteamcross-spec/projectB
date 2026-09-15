<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Repositories;

use PDO;

class ShowroomRepository
{
    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    private const SUBSCRIPTION_COLUMNS = 'subscription_payment_status, subscription_proof_path, subscription_proof_note,
                    subscription_proof_submitted_at, subscription_confirmed_at, subscription_confirmed_by,
                    subscription_rejected_at, subscription_rejected_reason, subscription_next_due_at,
                    subscription_payment_method, subscription_midtrans_order_id, subscription_midtrans_transaction_id,
                    subscription_midtrans_payment_data, subscription_midtrans_expires_at, subscription_midtrans_paid_at';

    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, user_id, slug, name, address, city_name, phone_number, bank_account_number,
                    bank_type, bank_account_name, icon_url, header_logo_url, tab_title,
                    selected_plan_name, selected_plan_price, selected_plan_billing_period, selected_plan_selected_at,
                    ' . self::SUBSCRIPTION_COLUMNS . ',
                    is_active, deactivated_reason, deactivated_at, deactivated_by,
                    created_at, updated_at
             FROM showrooms
             WHERE id = :id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $showroom = $stmt->fetch();

        return $showroom ?: null;
    }

    public function findByUserId(int $userId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, user_id, slug, name, address, city_name, phone_number, bank_account_number,
                    bank_type, bank_account_name, icon_url, header_logo_url, tab_title,
                    selected_plan_name, selected_plan_price, selected_plan_billing_period, selected_plan_selected_at,
                    ' . self::SUBSCRIPTION_COLUMNS . ',
                    is_active, deactivated_reason, deactivated_at, deactivated_by,
                    created_at, updated_at
             FROM showrooms
             WHERE user_id = :user_id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId]);
        $showroom = $stmt->fetch();

        return $showroom ?: null;
    }

    /**
     * Dipakai halaman showroom publik -- is_active DISERTAKAN (supaya
     * frontend bisa mengarahkan ke halaman maintenance) tapi
     * deactivated_reason SENGAJA TIDAK, itu catatan internal admin, bukan
     * untuk dibaca buyer.
     */
    public function findPublicContextBySlug(string $slug): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT sh.id, sh.user_id, sh.slug, sh.name, sh.address, sh.city_name, sh.phone_number,
                    sh.icon_url, sh.header_logo_url, sh.tab_title, sh.is_active,
                    u.name AS seller_name, u.email AS seller_email, u.phone_number AS seller_phone_number
             FROM showrooms AS sh
             INNER JOIN users AS u ON u.id = sh.user_id
             WHERE sh.slug = :slug
             AND sh.deleted_at IS NULL
             AND u.deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['slug' => $slug]);
        $showroom = $stmt->fetch();

        return $showroom ?: null;
    }

    public function slugExists(string $slug, ?int $ignoreShowroomId = null): bool
    {
        $sql = 'SELECT id FROM showrooms WHERE slug = :slug AND deleted_at IS NULL';
        $params = ['slug' => $slug];

        if ($ignoreShowroomId !== null) {
            $sql .= ' AND id <> :id';
            $params['id'] = $ignoreShowroomId;
        }

        $sql .= ' LIMIT 1';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return (bool) $stmt->fetch();
    }

    public function create(int $userId, array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO showrooms
                (user_id, slug, name, address, city_name, phone_number, bank_account_number,
                 bank_type, bank_account_name, icon_url, header_logo_url, tab_title, created_at, updated_at)
             VALUES
                (:user_id, :slug, :name, :address, :city_name, :phone_number, :bank_account_number,
                 :bank_type, :bank_account_name, :icon_url, :header_logo_url, :tab_title, :created_at, :updated_at)'
        );

        $stmt->execute([
            'user_id' => $userId,
            'slug' => $data['slug'],
            'name' => $data['name'],
            'address' => $data['address'] ?? null,
            'city_name' => $data['city_name'] ?? null,
            'phone_number' => $data['phone_number'] ?? null,
            'bank_account_number' => $data['bank_account_number'] ?? null,
            'bank_type' => $data['bank_type'] ?? null,
            'bank_account_name' => $data['bank_account_name'] ?? null,
            'icon_url' => $data['icon_url'] ?? null,
            'header_logo_url' => $data['header_logo_url'] ?? null,
            'tab_title' => $data['tab_title'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => null,
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function update(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE showrooms
             SET slug = :slug,
                 name = :name,
                 address = :address,
                 city_name = :city_name,
                 phone_number = :phone_number,
                 bank_account_number = :bank_account_number,
                 bank_type = :bank_type,
                 bank_account_name = :bank_account_name,
                 icon_url = :icon_url,
                 header_logo_url = :header_logo_url,
                 tab_title = :tab_title,
                 selected_plan_name = :selected_plan_name,
                 selected_plan_price = :selected_plan_price,
                 selected_plan_billing_period = :selected_plan_billing_period,
                 selected_plan_selected_at = :selected_plan_selected_at,
                 subscription_payment_status = :subscription_payment_status,
                 subscription_proof_path = :subscription_proof_path,
                 subscription_proof_note = :subscription_proof_note,
                 subscription_proof_submitted_at = :subscription_proof_submitted_at,
                 subscription_confirmed_at = :subscription_confirmed_at,
                 subscription_confirmed_by = :subscription_confirmed_by,
                 subscription_rejected_at = :subscription_rejected_at,
                 subscription_rejected_reason = :subscription_rejected_reason,
                 subscription_next_due_at = :subscription_next_due_at,
                 subscription_payment_method = :subscription_payment_method,
                 subscription_midtrans_order_id = :subscription_midtrans_order_id,
                 subscription_midtrans_transaction_id = :subscription_midtrans_transaction_id,
                 subscription_midtrans_payment_data = :subscription_midtrans_payment_data,
                 subscription_midtrans_expires_at = :subscription_midtrans_expires_at,
                 subscription_midtrans_paid_at = :subscription_midtrans_paid_at,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'slug' => $data['slug'],
            'name' => $data['name'],
            'address' => $data['address'] ?? null,
            'city_name' => $data['city_name'] ?? null,
            'phone_number' => $data['phone_number'] ?? null,
            'bank_account_number' => $data['bank_account_number'] ?? null,
            'bank_type' => $data['bank_type'] ?? null,
            'bank_account_name' => $data['bank_account_name'] ?? null,
            'icon_url' => $data['icon_url'] ?? null,
            'header_logo_url' => $data['header_logo_url'] ?? null,
            'tab_title' => $data['tab_title'] ?? null,
            'selected_plan_name' => $data['selected_plan_name'] ?? null,
            'selected_plan_price' => $data['selected_plan_price'] ?? null,
            'selected_plan_billing_period' => $data['selected_plan_billing_period'] ?? null,
            'selected_plan_selected_at' => $data['selected_plan_selected_at'] ?? null,
            'subscription_payment_status' => $data['subscription_payment_status'] ?? 'unpaid',
            'subscription_proof_path' => $data['subscription_proof_path'] ?? null,
            'subscription_proof_note' => $data['subscription_proof_note'] ?? null,
            'subscription_proof_submitted_at' => $data['subscription_proof_submitted_at'] ?? null,
            'subscription_confirmed_at' => $data['subscription_confirmed_at'] ?? null,
            'subscription_confirmed_by' => $data['subscription_confirmed_by'] ?? null,
            'subscription_rejected_at' => $data['subscription_rejected_at'] ?? null,
            'subscription_rejected_reason' => $data['subscription_rejected_reason'] ?? null,
            'subscription_next_due_at' => $data['subscription_next_due_at'] ?? null,
            'subscription_payment_method' => $data['subscription_payment_method'] ?? 'manual',
            'subscription_midtrans_order_id' => $data['subscription_midtrans_order_id'] ?? null,
            'subscription_midtrans_transaction_id' => $data['subscription_midtrans_transaction_id'] ?? null,
            'subscription_midtrans_payment_data' => $data['subscription_midtrans_payment_data'] ?? null,
            'subscription_midtrans_expires_at' => $data['subscription_midtrans_expires_at'] ?? null,
            'subscription_midtrans_paid_at' => $data['subscription_midtrans_paid_at'] ?? null,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    /**
     * Sesi VA baru dibuat lewat Midtrans -- belum tentu sudah dibayar,
     * status pembayaran sengaja TIDAK disentuh di sini (tetap seperti
     * sebelumnya) sampai callback Midtrans mengonfirmasi.
     */
    public function updateSubscriptionMidtransCharge(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE showrooms
             SET subscription_payment_method = \'midtrans\',
                 subscription_midtrans_order_id = :subscription_midtrans_order_id,
                 subscription_midtrans_transaction_id = :subscription_midtrans_transaction_id,
                 subscription_midtrans_payment_data = :subscription_midtrans_payment_data,
                 subscription_midtrans_expires_at = :subscription_midtrans_expires_at,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'subscription_midtrans_order_id' => $data['subscription_midtrans_order_id'],
            'subscription_midtrans_transaction_id' => $data['subscription_midtrans_transaction_id'] ?? null,
            'subscription_midtrans_payment_data' => $data['subscription_midtrans_payment_data'] ?? null,
            'subscription_midtrans_expires_at' => $data['subscription_midtrans_expires_at'] ?? null,
            'updated_at' => $data['updated_at'],
        ]);
    }

    public function findBySubscriptionMidtransOrderId(string $orderId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, user_id, slug, name, selected_plan_name, selected_plan_price, selected_plan_billing_period,
                    ' . self::SUBSCRIPTION_COLUMNS . '
             FROM showrooms
             WHERE subscription_midtrans_order_id = :order_id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['order_id' => $orderId]);
        $showroom = $stmt->fetch();

        return $showroom ?: null;
    }

    /**
     * Midtrans mengonfirmasi VA sudah dibayar -- disamakan dengan alur
     * unggah bukti transfer manual (status jadi pending_verification) supaya
     * masuk ke antrean tinjau Admin yang sama, cuma sumbernya beda. Admin
     * tetap harus konfirmasi manual (lihat ShowroomService::confirmSubscriptionPayment()),
     * pembayaran otomatis TIDAK langsung meloloskan showroom.
     */
    public function updateSubscriptionMidtransPaid(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE showrooms
             SET subscription_payment_status = \'pending_verification\',
                 subscription_proof_submitted_at = :subscription_proof_submitted_at,
                 subscription_midtrans_transaction_id = :subscription_midtrans_transaction_id,
                 subscription_midtrans_payment_data = :subscription_midtrans_payment_data,
                 subscription_midtrans_paid_at = :subscription_midtrans_paid_at,
                 subscription_rejected_at = NULL,
                 subscription_rejected_reason = NULL,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'subscription_proof_submitted_at' => $data['subscription_proof_submitted_at'],
            'subscription_midtrans_transaction_id' => $data['subscription_midtrans_transaction_id'] ?? null,
            'subscription_midtrans_payment_data' => $data['subscription_midtrans_payment_data'] ?? null,
            'subscription_midtrans_paid_at' => $data['subscription_midtrans_paid_at'],
            'updated_at' => $data['updated_at'],
        ]);
    }

    public function updateSubscriptionSubmission(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE showrooms
             SET subscription_payment_status = \'pending_verification\',
                 subscription_proof_path = :subscription_proof_path,
                 subscription_proof_note = :subscription_proof_note,
                 subscription_proof_submitted_at = :subscription_proof_submitted_at,
                 subscription_rejected_at = NULL,
                 subscription_rejected_reason = NULL,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'subscription_proof_path' => $data['subscription_proof_path'],
            'subscription_proof_note' => $data['subscription_proof_note'] ?? null,
            'subscription_proof_submitted_at' => $data['subscription_proof_submitted_at'],
            'updated_at' => $data['updated_at'],
        ]);
    }

    public function updateSubscriptionConfirmation(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE showrooms
             SET subscription_payment_status = \'paid\',
                 subscription_confirmed_at = :subscription_confirmed_at,
                 subscription_confirmed_by = :subscription_confirmed_by,
                 subscription_next_due_at = :subscription_next_due_at,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'subscription_confirmed_at' => $data['subscription_confirmed_at'],
            'subscription_confirmed_by' => $data['subscription_confirmed_by'],
            'subscription_next_due_at' => $data['subscription_next_due_at'],
            'updated_at' => $data['updated_at'],
        ]);
    }

    /**
     * Showroom yang sudah disetujui Admin, siklus tagihannya sudah jatuh
     * tempo (subscription_next_due_at terlewati) atau sedang menunggu
     * verifikasi bukti transfer perpanjangan. Sengaja dibatasi ke showroom
     * yang SUDAH disetujui -- pembayaran pertama (sebelum approval) sudah
     * tertangani lewat Approval Queue, bukan halaman ini.
     */
    public function findDueSubscriptions(): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT sh.id, sh.user_id, sh.slug, sh.name, sh.address, sh.city_name, sh.phone_number,
                    sh.bank_account_number, sh.bank_type, sh.bank_account_name,
                    sh.icon_url, sh.header_logo_url, sh.tab_title,
                    sh.selected_plan_name, sh.selected_plan_price, sh.selected_plan_billing_period, sh.selected_plan_selected_at,
                    ' . self::SUBSCRIPTION_COLUMNS . ',
                    sh.created_at, sh.updated_at,
                    u.name AS seller_name, u.email AS seller_email
             FROM showrooms AS sh
             INNER JOIN users AS u ON u.id = sh.user_id
             WHERE sh.deleted_at IS NULL
             AND u.deleted_at IS NULL
             AND u.account_status = \'active\'
             AND u.is_approved = 1
             AND (
                 (sh.subscription_next_due_at IS NOT NULL AND sh.subscription_next_due_at <= NOW())
                 OR sh.subscription_payment_status = \'pending_verification\'
             )
             ORDER BY sh.subscription_next_due_at ASC'
        );
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function updateSubscriptionRejection(int $id, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE showrooms
             SET subscription_payment_status = \'rejected\',
                 subscription_proof_path = NULL,
                 subscription_midtrans_order_id = NULL,
                 subscription_midtrans_transaction_id = NULL,
                 subscription_midtrans_payment_data = NULL,
                 subscription_midtrans_expires_at = NULL,
                 subscription_midtrans_paid_at = NULL,
                 subscription_rejected_at = :subscription_rejected_at,
                 subscription_rejected_reason = :subscription_rejected_reason,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'subscription_rejected_at' => $data['subscription_rejected_at'],
            'subscription_rejected_reason' => $data['subscription_rejected_reason'],
            'updated_at' => $data['updated_at'],
        ]);
    }

    /**
     * Menyimpan satu baris riwayat -- dipanggil tepat sebelum kolom
     * subscription_* di showrooms ditimpa siklus berikutnya (lihat
     * ShowroomService::confirmSubscriptionPayment()/rejectSubscriptionPayment()),
     * supaya data siklus yang baru diputuskan tidak hilang.
     */
    public function insertSubscriptionPaymentHistory(array $data): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO showroom_subscription_payments
                (showroom_id, plan_name, plan_price, plan_billing_period, payment_method,
                 proof_path, proof_note, proof_submitted_at,
                 midtrans_order_id, midtrans_transaction_id, midtrans_payment_data, midtrans_paid_at,
                 status, decided_at, decided_by, rejected_reason, created_at)
             VALUES
                (:showroom_id, :plan_name, :plan_price, :plan_billing_period, :payment_method,
                 :proof_path, :proof_note, :proof_submitted_at,
                 :midtrans_order_id, :midtrans_transaction_id, :midtrans_payment_data, :midtrans_paid_at,
                 :status, :decided_at, :decided_by, :rejected_reason, :created_at)'
        );

        $stmt->execute([
            'showroom_id' => $data['showroom_id'],
            'plan_name' => $data['plan_name'] ?? null,
            'plan_price' => $data['plan_price'] ?? null,
            'plan_billing_period' => $data['plan_billing_period'] ?? null,
            'payment_method' => $data['payment_method'] ?? 'manual',
            'proof_path' => $data['proof_path'] ?? null,
            'proof_note' => $data['proof_note'] ?? null,
            'proof_submitted_at' => $data['proof_submitted_at'] ?? null,
            'midtrans_order_id' => $data['midtrans_order_id'] ?? null,
            'midtrans_transaction_id' => $data['midtrans_transaction_id'] ?? null,
            'midtrans_payment_data' => $data['midtrans_payment_data'] ?? null,
            'midtrans_paid_at' => $data['midtrans_paid_at'] ?? null,
            'status' => $data['status'],
            'decided_at' => $data['decided_at'],
            'decided_by' => $data['decided_by'] ?? null,
            'rejected_reason' => $data['rejected_reason'] ?? null,
            'created_at' => $data['created_at'],
        ]);
    }

    /**
     * Menonaktifkan/mengaktifkan kembali showroom -- $reason cuma dipakai
     * saat menonaktifkan (dikosongkan lagi otomatis saat diaktifkan, supaya
     * catatan lama tidak nyangkut seolah-olah masih berlaku).
     */
    public function updateActivation(int $id, bool $isActive, ?string $reason, ?int $actorUserId, string $updatedAt): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE showrooms
             SET is_active = :is_active,
                 deactivated_reason = :deactivated_reason,
                 deactivated_at = :deactivated_at,
                 deactivated_by = :deactivated_by,
                 updated_at = :updated_at
             WHERE id = :id
             AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'is_active' => $isActive ? 1 : 0,
            'deactivated_reason' => $isActive ? null : $reason,
            'deactivated_at' => $isActive ? null : $updatedAt,
            'deactivated_by' => $isActive ? null : $actorUserId,
            'updated_at' => $updatedAt,
        ]);
    }

    public function findSubscriptionPaymentHistory(int $showroomId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT sp.id, sp.showroom_id, sp.plan_name, sp.plan_price, sp.plan_billing_period, sp.payment_method,
                    sp.proof_path, sp.proof_note, sp.proof_submitted_at,
                    sp.midtrans_order_id, sp.midtrans_transaction_id, sp.midtrans_payment_data, sp.midtrans_paid_at,
                    sp.status, sp.decided_at, sp.decided_by, sp.rejected_reason, sp.created_at,
                    u.name AS decided_by_name
             FROM showroom_subscription_payments AS sp
             LEFT JOIN users AS u ON u.id = sp.decided_by
             WHERE sp.showroom_id = :showroom_id
             ORDER BY sp.decided_at DESC'
        );
        $stmt->execute(['showroom_id' => $showroomId]);

        return $stmt->fetchAll();
    }
}
