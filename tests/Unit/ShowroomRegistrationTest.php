<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ValidationException;
use App\Core\Request;
use App\Modules\Auth\Repositories\AuthTokenRepository;
use App\Modules\Auth\Repositories\AuthUserRepository;
use App\Modules\Auth\Requests\RegisterRequest;
use App\Modules\Auth\Services\AuthService;
use PDO;
use Tests\TestCase;

class ShowroomRegistrationTest extends TestCase
{
    public function run(): void
    {
        $this->sellerRegistrationRequiresShowroomSlug();
        $this->sellerRegistrationRequiresShowroomCity();
        $this->buyerRegistrationIgnoresShowroomRules();
        $this->showroomFieldLengthsAreValidated();
        $this->registrationStoresNormalizedSlugAndBankDetails();
        $this->takenSlugIsRejectedWithAnAvailableSuggestion();
        $this->tooShortSlugIsRejected();
    }

    private function sellerRegistrationRequiresShowroomSlug(): void
    {
        $request = $this->registerRequest([
            'role' => 'seller',
            'name' => 'Pemilik',
            'email' => 'pemilik@example.test',
            'password' => 'RahasiaKu123',
            'showroom' => ['name' => 'Toko Jaya'],
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new RegisterRequest($request))->validate();
        }, 'showroom.slug');
    }

    private function sellerRegistrationRequiresShowroomCity(): void
    {
        $request = $this->registerRequest([
            'role' => 'seller',
            'name' => 'Pemilik',
            'email' => 'pemilik@example.test',
            'password' => 'RahasiaKu123',
            'showroom' => ['name' => 'Toko Jaya', 'slug' => 'toko-jaya'],
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new RegisterRequest($request))->validate();
        }, 'showroom.city_name');
    }

    private function buyerRegistrationIgnoresShowroomRules(): void
    {
        $request = $this->registerRequest([
            'role' => 'buyer',
            'name' => 'Pembeli',
            'email' => 'pembeli@example.test',
            'password' => 'RahasiaKu123',
        ]);

        $payload = (new RegisterRequest($request))->validate();
        $this->assertSame('buyer', $payload['role']);
    }

    private function showroomFieldLengthsAreValidated(): void
    {
        $request = $this->registerRequest([
            'role' => 'seller',
            'name' => 'Pemilik',
            'email' => 'pemilik@example.test',
            'password' => 'RahasiaKu123',
            'showroom' => [
                'name' => 'Toko Jaya',
                'slug' => 'toko-jaya',
                'bank_account_number' => str_repeat('9', 51),
            ],
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new RegisterRequest($request))->validate();
        }, 'showroom.bank_account_number');
    }

    private function registrationStoresNormalizedSlugAndBankDetails(): void
    {
        [$pdo, $service] = $this->makeService();

        $service->register([
            'role' => 'seller',
            'name' => 'Pemilik',
            'phone_number' => '08111000111',
            'email' => 'pemilik@example.test',
            'password' => 'RahasiaKu123',
            'address' => 'Jl Uji 1',
            'showroom' => [
                'name' => 'Toko Jaya Motor',
                'slug' => '  Toko JAYA Motor!!  ',
                'city_name' => 'Surabaya',
                'phone_number' => '0217654321',
                'bank_type' => 'BCA',
                'bank_account_number' => '1234567890',
                'bank_account_name' => 'Pemilik',
            ],
        ]);

        $showroom = $pdo->query('SELECT * FROM showrooms LIMIT 1')->fetch();
        $this->assertSame('toko-jaya-motor', $showroom['slug'], 'Slug must be normalized before it is stored.');
        $this->assertSame('Surabaya', $showroom['city_name'], 'City picked from the master must be stored.');
        $this->assertSame('0217654321', $showroom['phone_number']);
        $this->assertSame('BCA', $showroom['bank_type']);
        $this->assertSame('1234567890', $showroom['bank_account_number']);
        $this->assertSame('Pemilik', $showroom['bank_account_name']);

        $user = $pdo->query('SELECT * FROM users LIMIT 1')->fetch();
        $this->assertSame('pending', $user['account_status'], 'Seller stays pending until an admin approves.');
        $this->assertSame(0, (int) $user['is_approved']);
    }

    private function takenSlugIsRejectedWithAnAvailableSuggestion(): void
    {
        [$pdo, $service] = $this->makeService();
        $pdo->exec("INSERT INTO showrooms (user_id, slug, name, created_at)
            VALUES (99, 'toko-jaya', 'Toko Jaya', '2026-01-01 00:00:00')");

        try {
            $service->register([
                'role' => 'seller',
                'name' => 'Pemilik Dua',
                'email' => 'dua@example.test',
                'password' => 'RahasiaKu123',
                'showroom' => ['name' => 'Toko Jaya', 'slug' => 'toko-jaya'],
            ]);
        } catch (ValidationException $exception) {
            $message = $exception->errors()['showroom.slug'] ?? '';
            $this->assertTrue(
                strpos($message, "'toko-jaya' sudah dipakai") !== false,
                'Message must name the slug that is taken. Got: ' . $message
            );
            $this->assertTrue(
                strpos($message, "Coba 'toko-jaya-2'") !== false,
                'Message must suggest an available alternative. Got: ' . $message
            );

            $this->assertSame(
                0,
                (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),
                'A rejected slug must not leave a half-created user behind.'
            );
            return;
        }

        $this->assertTrue(false, 'Registration with a taken slug must fail.');
    }

    private function tooShortSlugIsRejected(): void
    {
        [, $service] = $this->makeService();

        $this->expectException(ValidationException::class, function () use ($service): void {
            $service->register([
                'role' => 'seller',
                'name' => 'Pemilik',
                'email' => 'pendek@example.test',
                'password' => 'RahasiaKu123',
                'showroom' => ['name' => 'AB', 'slug' => 'ab'],
            ]);
        }, 'showroom.slug');
    }

    private function registerRequest(array $body): Request
    {
        return new Request('POST', '/api/auth/register', '/api/auth/register', [], $body);
    }

    /**
     * @return array{0: PDO, 1: AuthService}
     */
    private function makeService(): array
    {
        $pdo = $this->sqlite();
        $pdo->exec('CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            name TEXT NOT NULL,
            phone_number TEXT NULL,
            email TEXT NOT NULL,
            password_hash TEXT NULL,
            address TEXT NULL,
            account_status TEXT NOT NULL,
            is_approved INTEGER NOT NULL DEFAULT 0,
            otp_code TEXT NULL,
            otp_expires_at TEXT NULL,
            security_key TEXT NULL,
            created_at TEXT NULL,
            updated_at TEXT NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE showrooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            slug TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            address TEXT NULL,
            city_name TEXT NULL,
            phone_number TEXT NULL,
            bank_account_number TEXT NULL,
            bank_type TEXT NULL,
            bank_account_name TEXT NULL,
            created_at TEXT NULL,
            updated_at TEXT NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE user_auth_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            selector TEXT NULL,
            hashed_validator TEXT NULL,
            expires_at TEXT NULL,
            last_used_at TEXT NULL,
            revoked_at TEXT NULL,
            created_at TEXT NULL,
            updated_at TEXT NULL,
            deleted_at TEXT NULL
        )');

        $service = new AuthService(
            $pdo,
            new AuthUserRepository($pdo),
            new AuthTokenRepository($pdo)
        );

        return [$pdo, $service];
    }
}
