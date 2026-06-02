<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\ValidationException;
use App\Core\Request;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\Auth\Requests\ListPendingUsersRequest;
use App\Modules\Cars\Policies\CarPolicy;
use App\Modules\Cars\Requests\ListCarsRequest;
use Tests\TestCase;

class AuthUsersCarsHardeningTest extends TestCase
{
    public function run(): void
    {
        $this->authAdminPolicyRejectsSeller();
        $this->userPolicyAllowsSelfOrAdminOnly();
        $this->pendingUsersLimitIsValidated();
        $this->carsListLimitIsValidated();
        $this->carPolicySeparatesSellerAndAdminSemantics();
    }

    private function authAdminPolicyRejectsSeller(): void
    {
        $this->expectException(ForbiddenException::class, static function (): void {
            AuthPolicy::requireAdmin([
                'id' => 2,
                'role' => 'seller',
            ]);
        });
    }

    private function userPolicyAllowsSelfOrAdminOnly(): void
    {
        $self = AuthPolicy::ensureCanViewUser([
            'id' => 5,
            'role' => 'seller',
        ], 5);
        $admin = AuthPolicy::ensureCanViewUser([
            'id' => 1,
            'role' => 'admin',
        ], 5);

        $this->assertSame(5, $self['id']);
        $this->assertSame('admin', $admin['role']);

        $this->expectException(ForbiddenException::class, static function (): void {
            AuthPolicy::ensureCanViewUser([
                'id' => 9,
                'role' => 'seller',
            ], 5);
        });
    }

    private function pendingUsersLimitIsValidated(): void
    {
        $request = new Request('GET', '/api/auth/pending-users?limit=999', '/api/auth/pending-users', [
            'limit' => '999',
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new ListPendingUsersRequest($request))->validate();
        }, 'limit');
    }

    private function carsListLimitIsValidated(): void
    {
        $request = new Request('GET', '/api/cars?limit=0', '/api/cars', [
            'limit' => '0',
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new ListCarsRequest($request))->validate();
        }, 'limit');
    }

    private function carPolicySeparatesSellerAndAdminSemantics(): void
    {
        CarPolicy::requireSeller([
            'id' => 2,
            'role' => 'seller',
        ]);
        CarPolicy::requireAdmin([
            'id' => 1,
            'role' => 'admin',
        ]);

        $this->expectException(ForbiddenException::class, static function (): void {
            CarPolicy::requireSeller([
                'id' => 1,
                'role' => 'admin',
            ]);
        });
    }
}
