<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ForbiddenException;
use App\Modules\Showrooms\Policies\ShowroomPolicy;
use App\Modules\Showrooms\Repositories\ShowroomRepository;
use Tests\TestCase;

/**
 * Fase 1-2 fitur Multi-Cabang (lihat plan groovy-napping-thacker.md):
 * satu user boleh punya banyak showroom, dan setiap method seller-facing
 * yang menerima showroom_id eksplisit harus memverifikasi kepemilikannya.
 * Skenario yang lebih berat (ShowroomService::createBranch(),
 * handleSubscriptionMidtransCallback() approve-scoping) sudah diverifikasi
 * manual lewat database nyata karena butuh dependency MidtransHttpClient/
 * StorageServiceInterface yang berat untuk di-mock di sqlite; test di sini
 * fokus ke bagian yang murni dan cepat diuji.
 */
class ShowroomMultiBranchTest extends TestCase
{
    public function run(): void
    {
        $this->findAllByUserIdReturnsAllBranchesOrderedByCreatedAt();
        $this->showroomPolicyRejectsAccessByNonOwner();
        $this->showroomPolicyAllowsAdminRegardlessOfOwnership();
        $this->findAllByUserIdSelectsAllowsMultiBranchColumn();
    }

    /**
     * Fase 5: kolom selected_plan_allows_multi_branch harus benar-benar
     * ikut terbaca (bukan cuma ada di skema) -- ini gerbang yang dibaca
     * ShowroomService::createBranch() untuk memutuskan boleh/tidaknya
     * seller menambah cabang.
     */
    private function findAllByUserIdSelectsAllowsMultiBranchColumn(): void
    {
        $pdo = $this->sqlite();
        $this->createShowroomsTable($pdo);
        $pdo->exec("INSERT INTO showrooms (id, user_id, name, selected_plan_allows_multi_branch, created_at) VALUES
            (1, 11, 'Cabang Enterprise', 1, '2026-01-01 00:00:00'),
            (2, 12, 'Cabang Basic', 0, '2026-01-01 00:00:00')");

        $repository = new ShowroomRepository($pdo);

        $this->assertSame(true, (bool) $repository->findAllByUserId(11)[0]['selected_plan_allows_multi_branch']);
        $this->assertSame(false, (bool) $repository->findAllByUserId(12)[0]['selected_plan_allows_multi_branch']);
    }

    private function findAllByUserIdReturnsAllBranchesOrderedByCreatedAt(): void
    {
        $pdo = $this->sqlite();
        $this->createShowroomsTable($pdo);
        $pdo->exec("INSERT INTO showrooms (id, user_id, name, created_at) VALUES
            (1, 7, 'Cabang Kedua', '2026-02-01 00:00:00'),
            (2, 7, 'Cabang Pertama', '2026-01-01 00:00:00'),
            (3, 9, 'Showroom Lain', '2026-01-15 00:00:00')");

        $repository = new ShowroomRepository($pdo);
        $branches = $repository->findAllByUserId(7);

        $this->assertSame(2, count($branches));
        $this->assertSame('Cabang Pertama', $branches[0]['name']);
        $this->assertSame('Cabang Kedua', $branches[1]['name']);

        // findByUserId() sekarang berarti "cabang pertama", bukan lagi
        // "satu-satunya showroom" -- harus balik baris yang sama dengan
        // elemen pertama findAllByUserId().
        $first = $repository->findByUserId(7);
        $this->assertSame('Cabang Pertama', $first['name']);
    }

    private function showroomPolicyRejectsAccessByNonOwner(): void
    {
        $showroom = ['id' => 1, 'user_id' => 7];
        $stranger = ['id' => 9, 'role' => 'seller'];

        $this->expectException(ForbiddenException::class, static function () use ($showroom, $stranger): void {
            ShowroomPolicy::ensureOwnedByUser($showroom, $stranger);
        });

        // Pemiliknya sendiri tidak boleh ikut ditolak.
        ShowroomPolicy::ensureOwnedByUser($showroom, ['id' => 7, 'role' => 'seller']);
    }

    private function showroomPolicyAllowsAdminRegardlessOfOwnership(): void
    {
        $showroom = ['id' => 1, 'user_id' => 7];

        // Tidak boleh melempar apa pun -- ini yang diverifikasi, bukan nilai
        // baliknya (method ini void).
        ShowroomPolicy::ensureOwnedByUser($showroom, ['id' => 999, 'role' => 'admin']);
        ShowroomPolicy::ensureOwnedByUser($showroom, ['id' => 999, 'role' => 'super_admin']);
        $this->assertTrue(true);
    }

    private function createShowroomsTable(\PDO $pdo): void
    {
        $pdo->exec('CREATE TABLE showrooms (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            slug TEXT NULL,
            custom_domain TEXT NULL, custom_domain_status TEXT NULL, custom_domain_requested_at TEXT NULL,
            custom_domain_verified_at TEXT NULL, custom_domain_activated_at TEXT NULL,
            name TEXT NULL, address TEXT NULL, city_name TEXT NULL,
            phone_number TEXT NULL, bank_account_number TEXT NULL, bank_type TEXT NULL,
            bank_account_name TEXT NULL, icon_url TEXT NULL, header_logo_url TEXT NULL, tab_title TEXT NULL,
            selected_plan_name TEXT NULL, selected_plan_price REAL NULL, selected_plan_billing_period TEXT NULL,
            selected_plan_listing_limit INTEGER NULL, selected_plan_allows_multi_branch INTEGER NULL, selected_plan_staff_limit INTEGER NULL, selected_plan_selected_at TEXT NULL,
            subscription_payment_status TEXT NULL, subscription_proof_path TEXT NULL, subscription_proof_note TEXT NULL,
            subscription_proof_submitted_at TEXT NULL, subscription_confirmed_at TEXT NULL, subscription_confirmed_by INTEGER NULL,
            subscription_rejected_at TEXT NULL, subscription_rejected_reason TEXT NULL, subscription_next_due_at TEXT NULL,
            subscription_payment_method TEXT NULL, subscription_midtrans_order_id TEXT NULL,
            subscription_midtrans_transaction_id TEXT NULL, subscription_midtrans_payment_data TEXT NULL,
            subscription_midtrans_expires_at TEXT NULL, subscription_midtrans_paid_at TEXT NULL,
            is_active INTEGER NULL, deactivated_reason TEXT NULL, deactivated_at TEXT NULL, deactivated_by INTEGER NULL,
            created_at TEXT NULL, updated_at TEXT NULL, deleted_at TEXT NULL
        )');
    }
}
