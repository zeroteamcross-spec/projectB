<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Modules\Showrooms\Repositories\ShowroomRepository;
use Tests\TestCase;

/**
 * Backlog #6 (lihat plan groovy-napping-thacker.md): showroom yang
 * menunggak lebih dari masa toleransinya harus disuspend otomatis.
 * ShowroomService::suspendOverdue() sendiri butuh dependency berat
 * (MidtransHttpClient/StorageServiceInterface) untuk dikonstruksi, jadi
 * sudah diverifikasi manual lewat database nyata (pola sama seperti
 * ShowroomMultiBranchTest) -- test di sini fokus ke query repository yang
 * murni dan cepat diuji: ambang waktu ($cutoffAt dihitung di PHP, bukan
 * NOW()/DATE_SUB() di SQL, supaya portable ke sqlite) dan idempotensi
 * (showroom yang sudah nonaktif tidak ikut diproses ulang).
 */
class AutoSuspendOverdueTest extends TestCase
{
    public function run(): void
    {
        $this->includesShowroomOverdueYangSudahLewatCutoff();
        $this->excludesShowroomYangBelumLewatCutoff();
        $this->excludesShowroomYangSudahNonaktif();
    }

    private function includesShowroomOverdueYangSudahLewatCutoff(): void
    {
        $pdo = $this->sqlite();
        $this->createSchema($pdo);
        $this->seedUser($pdo, 1, 'active', 1);
        $this->seedShowroom($pdo, 1, 1, '-20 days', true);

        $repository = new ShowroomRepository($pdo);
        $cutoffAt = date('Y-m-d H:i:s', strtotime('-14 days'));
        $rows = $repository->findOverdueForAutoSuspend($cutoffAt);

        $this->assertSame(1, count($rows));
        $this->assertSame(1, (int) $rows[0]['id']);
    }

    private function excludesShowroomYangBelumLewatCutoff(): void
    {
        $pdo = $this->sqlite();
        $this->createSchema($pdo);
        $this->seedUser($pdo, 1, 'active', 1);
        // Due 5 hari lalu -- sudah due tapi belum lewat toleransi 14 hari.
        $this->seedShowroom($pdo, 1, 1, '-5 days', true);

        $repository = new ShowroomRepository($pdo);
        $cutoffAt = date('Y-m-d H:i:s', strtotime('-14 days'));
        $rows = $repository->findOverdueForAutoSuspend($cutoffAt);

        $this->assertSame(0, count($rows));
    }

    private function excludesShowroomYangSudahNonaktif(): void
    {
        $pdo = $this->sqlite();
        $this->createSchema($pdo);
        $this->seedUser($pdo, 1, 'active', 1);
        // Overdue jauh lebih dari 14 hari, tapi is_active sudah 0 --
        // entah disuspend otomatis sebelumnya atau dinonaktifkan admin
        // untuk alasan lain. Proses ini harus idempoten, tidak boleh
        // memproses ulang.
        $this->seedShowroom($pdo, 1, 1, '-40 days', false);

        $repository = new ShowroomRepository($pdo);
        $cutoffAt = date('Y-m-d H:i:s', strtotime('-14 days'));
        $rows = $repository->findOverdueForAutoSuspend($cutoffAt);

        $this->assertSame(0, count($rows));
    }

    private function seedUser(\PDO $pdo, int $id, string $accountStatus, int $isApproved): void
    {
        $pdo->prepare('INSERT INTO users (id, account_status, is_approved, deleted_at) VALUES (:id, :status, :approved, NULL)')
            ->execute(['id' => $id, 'status' => $accountStatus, 'approved' => $isApproved]);
    }

    private function seedShowroom(\PDO $pdo, int $id, int $userId, string $dueOffset, bool $isActive): void
    {
        $pdo->prepare(
            'INSERT INTO showrooms (id, user_id, name, subscription_next_due_at, is_active, deleted_at)
             VALUES (:id, :user_id, :name, :due_at, :is_active, NULL)'
        )->execute([
            'id' => $id,
            'user_id' => $userId,
            'name' => 'Showroom Uji',
            'due_at' => date('Y-m-d H:i:s', strtotime($dueOffset)),
            'is_active' => $isActive ? 1 : 0,
        ]);
    }

    private function createSchema(\PDO $pdo): void
    {
        $pdo->exec('CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            account_status TEXT NULL,
            is_approved INTEGER NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE showrooms (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            name TEXT NULL,
            slug TEXT NULL,
            selected_plan_name TEXT NULL,
            subscription_payment_status TEXT NULL,
            subscription_next_due_at TEXT NULL,
            is_active INTEGER NULL,
            deleted_at TEXT NULL
        )');
    }
}
