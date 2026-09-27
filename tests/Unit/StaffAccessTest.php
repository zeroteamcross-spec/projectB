<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ForbiddenException;
use App\Modules\Auth\Policies\StaffAccessPolicy;
use App\Modules\Showrooms\Policies\ShowroomPolicy;
use Tests\TestCase;

/**
 * Fase 2 fitur Akses Tim (lihat plan groovy-napping-thacker.md): staf login
 * dengan users.id miliknya sendiri, bukan user_id pemilik showroom, jadi
 * predikat kepemilikannya ADDITIF -- tidak boleh menggantikan pengecekan
 * kepemilikan biasa, dan tidak boleh meloloskan aksi billing.
 */
class StaffAccessTest extends TestCase
{
    public function run(): void
    {
        $this->staffMatchesOnlyItsOwnAssignedShowroom();
        $this->staffAccessPolicyRejectsNonStaffRoles();
        $this->ensureOwnedOrStaffAssignedAllowsAssignedStaff();
        $this->ensureOwnedOrStaffAssignedRejectsStaffOfAnotherBranch();
        $this->ensureOwnedByUserStillRejectsStaffForBillingActions();
    }

    private function staffMatchesOnlyItsOwnAssignedShowroom(): void
    {
        $staff = ['id' => 50, 'role' => 'seller_staff', 'staff_showroom_id' => 7];

        $this->assertTrue(StaffAccessPolicy::staffCanActOnShowroom($staff, 7));
        $this->assertSame(false, StaffAccessPolicy::staffCanActOnShowroom($staff, 8));
        $this->assertSame(false, StaffAccessPolicy::staffCanActOnShowroom($staff, null));
    }

    private function staffAccessPolicyRejectsNonStaffRoles(): void
    {
        $seller = ['id' => 50, 'role' => 'seller', 'staff_showroom_id' => 7];

        $this->assertSame(false, StaffAccessPolicy::staffCanActOnShowroom($seller, 7));
    }

    private function ensureOwnedOrStaffAssignedAllowsAssignedStaff(): void
    {
        $showroom = ['id' => 7, 'user_id' => 1];
        $staff = ['id' => 50, 'role' => 'seller_staff', 'staff_showroom_id' => 7];

        // Tidak boleh melempar apa pun.
        ShowroomPolicy::ensureOwnedOrStaffAssigned($showroom, $staff);
        $this->assertTrue(true);
    }

    private function ensureOwnedOrStaffAssignedRejectsStaffOfAnotherBranch(): void
    {
        $showroom = ['id' => 8, 'user_id' => 1];
        $staff = ['id' => 50, 'role' => 'seller_staff', 'staff_showroom_id' => 7];

        $this->expectException(ForbiddenException::class, static function () use ($showroom, $staff): void {
            ShowroomPolicy::ensureOwnedOrStaffAssigned($showroom, $staff);
        });
    }

    /**
     * Billing/ganti-paket/tambah-cabang HARUS tetap memakai
     * ensureOwnedByUser() yang ketat -- staf tidak boleh pernah lolos di
     * sini meski dia ditugaskan ke cabang tersebut.
     */
    private function ensureOwnedByUserStillRejectsStaffForBillingActions(): void
    {
        $showroom = ['id' => 7, 'user_id' => 1];
        $staff = ['id' => 50, 'role' => 'seller_staff', 'staff_showroom_id' => 7];

        $this->expectException(ForbiddenException::class, static function () use ($showroom, $staff): void {
            ShowroomPolicy::ensureOwnedByUser($showroom, $staff);
        });
    }
}
