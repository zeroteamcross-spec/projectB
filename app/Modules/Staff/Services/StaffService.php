<?php

declare(strict_types=1);

namespace App\Modules\Staff\Services;

use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Modules\Showrooms\Policies\ShowroomPolicy;
use App\Modules\Showrooms\Repositories\ShowroomRepository;
use App\Modules\Staff\Repositories\StaffRepository;
use PDO;
use Throwable;

class StaffService
{
    private PDO $pdo;

    private StaffRepository $repository;

    private ShowroomRepository $showrooms;

    public function __construct(PDO $pdo, StaffRepository $repository, ShowroomRepository $showrooms)
    {
        $this->pdo = $pdo;
        $this->repository = $repository;
        $this->showrooms = $showrooms;
    }

    /**
     * Menambah/menghapus staf adalah keputusan pemilik showroom, bukan staf
     * lain -- ensureOwnedByUser() dipakai apa adanya (ketat, TIDAK meloloskan
     * staf), berbeda dari ensureOwnedOrStaffAssigned() yang dipakai aksi
     * operasional non-billing.
     */
    public function listMine(array $owner, int $showroomId): array
    {
        $showroom = $this->requireShowroom($showroomId);
        ShowroomPolicy::ensureOwnedByUser($showroom, $owner);

        return array_map(
            fn (array $staff): array => $this->serializeStaff($staff),
            $this->repository->listByShowroomId($showroomId)
        );
    }

    public function createManaged(array $owner, int $showroomId, array $data): array
    {
        $showroom = $this->requireShowroom($showroomId);
        ShowroomPolicy::ensureOwnedByUser($showroom, $owner);
        $this->ensureStaffQuotaAvailable($showroom, $showroomId);

        $email = strtolower(trim((string) ($data['email'] ?? '')));

        if ($this->repository->emailExists($email)) {
            throw new ValidationException(['email' => 'Email sudah terdaftar.']);
        }

        $now = date('Y-m-d H:i:s');
        $status = ($data['status'] ?? 'active') === 'inactive' ? 'inactive' : 'active';

        try {
            $this->pdo->beginTransaction();
            $staffUserId = $this->repository->createStaffUser([
                'name' => trim((string) ($data['name'] ?? '')),
                'phone_number' => trim((string) ($data['phone_number'] ?? '')),
                'email' => $email,
                'password_hash' => password_hash((string) $data['password'], PASSWORD_DEFAULT),
                'account_status' => $status === 'active' ? 'active' : 'suspended',
                'staff_showroom_id' => $showroomId,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return $this->serializeStaff($this->requireStaff($staffUserId, $showroomId));
    }

    public function updateManaged(array $owner, int $showroomId, int $staffUserId, array $data): array
    {
        $showroom = $this->requireShowroom($showroomId);
        ShowroomPolicy::ensureOwnedByUser($showroom, $owner);
        $staff = $this->requireStaff($staffUserId, $showroomId);

        $email = strtolower(trim((string) ($data['email'] ?? $staff['email'])));

        if ($this->repository->emailExists($email, $staffUserId)) {
            throw new ValidationException(['email' => 'Email sudah terdaftar.']);
        }

        $now = date('Y-m-d H:i:s');
        $status = ($data['status'] ?? $staff['account_status']) === 'inactive' ? 'inactive' : 'active';
        $password = trim((string) ($data['password'] ?? ''));

        $this->repository->updateStaffUser($staffUserId, [
            'name' => trim((string) ($data['name'] ?? $staff['name'])),
            'phone_number' => trim((string) ($data['phone_number'] ?? ($staff['phone_number'] ?? ''))),
            'email' => $email,
            'password_hash' => $password !== '' ? password_hash($password, PASSWORD_DEFAULT) : null,
            'account_status' => $status === 'active' ? 'active' : 'suspended',
            'updated_at' => $now,
        ]);

        return $this->serializeStaff($this->requireStaff($staffUserId, $showroomId));
    }

    /**
     * Batas jumlah staf digerbangi paket -- 0 berarti fitur staf nonaktif
     * untuk showroom ini, bukan "tanpa batas" (kebalikan dari
     * selected_plan_listing_limit). Lihat migrasi 20260930_staff_access.sql.
     */
    private function ensureStaffQuotaAvailable(array $showroom, int $showroomId): void
    {
        $limit = (int) ($showroom['selected_plan_staff_limit'] ?? 0);

        if ($limit <= 0) {
            throw new ValidationException([
                'plan' => 'Paket showroom ini belum mendukung fitur staf.',
            ]);
        }

        if ($this->repository->countByShowroomId($showroomId) >= $limit) {
            throw new ValidationException([
                'staff' => 'Batas jumlah staf untuk paket showroom ini sudah tercapai.',
            ]);
        }
    }

    private function requireShowroom(int $showroomId): array
    {
        $showroom = $this->showrooms->findById($showroomId);

        if (! $showroom) {
            throw new NotFoundException('Showroom tidak ditemukan.');
        }

        return $showroom;
    }

    private function requireStaff(int $staffUserId, int $showroomId): array
    {
        $staff = $this->repository->findById($staffUserId);

        if (! $staff || (int) $staff['staff_showroom_id'] !== $showroomId) {
            throw new NotFoundException('Staf tidak ditemukan.');
        }

        return $staff;
    }

    private function serializeStaff(array $staff): array
    {
        return [
            'id' => (int) $staff['id'],
            'showroom_id' => (int) $staff['staff_showroom_id'],
            'name' => $staff['name'],
            'email' => $staff['email'],
            'phone_number' => $staff['phone_number'] ?? null,
            'status' => ($staff['account_status'] ?? null) === 'active' ? 'active' : 'inactive',
            'created_at' => $staff['created_at'] ?? null,
            'updated_at' => $staff['updated_at'] ?? null,
        ];
    }
}
