<?php

declare(strict_types=1);

$app = require __DIR__ . '/../bootstrap/app.php';

/** @var PDO $pdo */
$pdo = $app->container()->make(PDO::class);

$appEnv = (string) config('app.env', 'local');

if ($appEnv === 'production') {
    fwrite(STDERR, 'Refusing to seed smoke data in production environment.' . PHP_EOL);
    exit(1);
}

$now = date('Y-m-d H:i:s');
$password = 'SmokePass123!';
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

try {
    $pdo->beginTransaction();

    $adminId = upsertSmokeUser($pdo, [
        'role' => 'admin',
        'name' => 'Smoke Admin',
        'phone_number' => '080000000001',
        'email' => 'admin@projectb.local',
        'password_hash' => $passwordHash,
        'address' => 'Smoke Test',
        'account_status' => 'active',
        'is_approved' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $sellerId = upsertSmokeUser($pdo, [
        'role' => 'seller',
        'name' => 'Smoke Seller',
        'phone_number' => '080000000002',
        'email' => 'seller@projectb.local',
        'password_hash' => $passwordHash,
        'address' => 'Smoke Test Seller',
        'account_status' => 'active',
        'is_approved' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $buyerId = upsertSmokeUser($pdo, [
        'role' => 'buyer',
        'name' => 'Smoke Buyer',
        'phone_number' => '080000000003',
        'email' => 'buyer@projectb.local',
        'password_hash' => $passwordHash,
        'address' => 'Smoke Test Buyer',
        'account_status' => 'active',
        'is_approved' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $affiliateAdminId = upsertSmokeUser($pdo, [
        'role' => 'affiliate_admin',
        'name' => 'Smoke Affiliate Admin',
        'phone_number' => '080000000004',
        'email' => 'affiliate@projectb.local',
        'password_hash' => $passwordHash,
        'address' => 'Smoke Test Affiliate',
        'account_status' => 'active',
        'is_approved' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $superadminId = upsertSmokeUser($pdo, [
        'role' => 'super_admin',
        'name' => 'Smoke Super Admin',
        'phone_number' => '080000000009',
        'email' => 'superadmin@projectb.local',
        'password_hash' => $passwordHash,
        'address' => 'Smoke Test Super Admin',
        'account_status' => 'active',
        'is_approved' => 1,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $showroomId = upsertSmokeShowroom($pdo, $sellerId, [
        'name' => 'Smoke Showroom',
        'address' => 'Jl. Smoke Test No. 1',
        'phone_number' => '080000000005',
        'bank_account_number' => '000111222333',
        'bank_type' => 'BCA',
        'bank_account_name' => 'Smoke Seller',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $carId = upsertSmokeCar($pdo, $sellerId, $showroomId, [
        'listing_status' => 'published',
        'stock' => 1,
        'license_plate_number' => 'SMOKE 001',
        'brand_name' => 'Toyota',
        'model_name' => 'Avanza',
        'sub_model_name' => 'G',
        'primary_color' => 'Hitam',
        'secondary_color' => 'Hitam',
        'color_variation' => null,
        'document_type' => 'old',
        'registration_date' => '2022-01-15',
        'transmission' => 'Automatic',
        'engine_number' => 'SMOKE-ENG-001',
        'chassis_number' => 'SMOKE-CHS-001',
        'location_name' => 'Bandung',
        'engine_capacity_cc' => 1500,
        'mileage_km' => 25000,
        'seat_count' => 7,
        'previous_owner_count' => 1,
        'has_service_book' => 1,
        'key_count' => 2,
        'description' => 'Unit smoke test untuk readiness projectB.',
        'price_cash' => 210000000,
        'price_discount' => 205000000,
        'price_credit' => 195000000,
        'inspection_summary_status' => 'not_checked',
        'published_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $affiliateId = upsertSmokeAffiliate($pdo, $affiliateAdminId, $sellerId, [
        'referral_code' => 'SMOKE-SELLER',
        'commission_type' => 'percent',
        'commission_percent' => '5.00',
        'commission_flat' => '0.00',
        'status' => 'active',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    throw $exception;
}

echo json_encode([
    'success' => true,
    'message' => 'Smoke readiness seed completed.',
    'data' => [
        'credentials' => [
            'password' => $password,
            'admin' => 'admin@projectb.local',
            'super_admin' => 'superadmin@projectb.local',
            'seller' => 'seller@projectb.local',
            'buyer' => 'buyer@projectb.local',
            'affiliate_admin' => 'affiliate@projectb.local',
        ],
        'ids' => [
            'admin_user_id' => $adminId,
            'super_admin_user_id' => $superadminId,
            'seller_user_id' => $sellerId,
            'buyer_user_id' => $buyerId,
            'affiliate_admin_user_id' => $affiliateAdminId,
            'showroom_id' => $showroomId,
            'car_id' => $carId,
            'affiliate_id' => $affiliateId,
        ],
        'affiliate' => [
            'referral_code' => 'SMOKE-SELLER',
        ],
    ],
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;

function upsertSmokeUser(PDO $pdo, array $data): int
{
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $data['email']]);
    $id = $stmt->fetchColumn();

    if ($id) {
        $data['id'] = (int) $id;
        $pdo->prepare(
            'UPDATE users
             SET role = :role,
                 name = :name,
                 phone_number = :phone_number,
                 email = :email,
                 password_hash = :password_hash,
                 address = :address,
                 account_status = :account_status,
                 is_approved = :is_approved,
                 otp_code = NULL,
                 otp_expires_at = NULL,
                 updated_at = :updated_at,
                 deleted_at = NULL
             WHERE id = :id'
        )->execute(only($data, [
            'role',
            'name',
            'phone_number',
            'email',
            'password_hash',
            'address',
            'account_status',
            'is_approved',
            'updated_at',
            'id',
        ]));

        return (int) $id;
    }

    $pdo->prepare(
        'INSERT INTO users
            (role, name, phone_number, email, password_hash, address, account_status,
             is_approved, created_at, updated_at, deleted_at)
         VALUES
            (:role, :name, :phone_number, :email, :password_hash, :address, :account_status,
             :is_approved, :created_at, :updated_at, NULL)'
    )->execute($data);

    return (int) $pdo->lastInsertId();
}

function upsertSmokeShowroom(PDO $pdo, int $sellerUserId, array $data): int
{
    $stmt = $pdo->prepare('SELECT id FROM showrooms WHERE user_id = :user_id LIMIT 1');
    $stmt->execute(['user_id' => $sellerUserId]);
    $id = $stmt->fetchColumn();

    $data['user_id'] = $sellerUserId;

    if ($id) {
        $data['id'] = (int) $id;
        $pdo->prepare(
            'UPDATE showrooms
             SET name = :name,
                 address = :address,
                 phone_number = :phone_number,
                 bank_account_number = :bank_account_number,
                 bank_type = :bank_type,
                 bank_account_name = :bank_account_name,
                 updated_at = :updated_at,
                 deleted_at = NULL
             WHERE id = :id'
        )->execute(only($data, [
            'name',
            'address',
            'phone_number',
            'bank_account_number',
            'bank_type',
            'bank_account_name',
            'updated_at',
            'id',
        ]));

        return (int) $id;
    }

    $pdo->prepare(
        'INSERT INTO showrooms
            (user_id, name, address, phone_number, bank_account_number,
             bank_type, bank_account_name, created_at, updated_at, deleted_at)
         VALUES
            (:user_id, :name, :address, :phone_number, :bank_account_number,
             :bank_type, :bank_account_name, :created_at, :updated_at, NULL)'
    )->execute($data);

    return (int) $pdo->lastInsertId();
}

function upsertSmokeCar(PDO $pdo, int $sellerUserId, int $showroomId, array $data): int
{
    $stmt = $pdo->prepare(
        'SELECT id FROM cars
         WHERE seller_user_id = :seller_user_id
         AND license_plate_number = :license_plate_number
         LIMIT 1'
    );
    $stmt->execute([
        'seller_user_id' => $sellerUserId,
        'license_plate_number' => $data['license_plate_number'],
    ]);
    $id = $stmt->fetchColumn();

    $data['seller_user_id'] = $sellerUserId;
    $data['showroom_id'] = $showroomId;

    if ($id) {
        $updateData = $data;
        unset($updateData['created_at']);
        $updateData['id'] = (int) $id;
        $sets = [];

        foreach (array_keys($updateData) as $column) {
            if ($column !== 'id') {
                $sets[] = $column . ' = :' . $column;
            }
        }

        $pdo->prepare(
            'UPDATE cars SET ' . implode(', ', $sets) . ', deleted_at = NULL WHERE id = :id'
        )->execute($updateData);

        return (int) $id;
    }

    $columns = array_merge(array_keys($data), ['deleted_at']);
    $placeholders = array_map(
        static fn (string $column): string => $column === 'deleted_at' ? 'NULL' : ':' . $column,
        $columns
    );

    $pdo->prepare(
        'INSERT INTO cars (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')'
    )->execute($data);

    return (int) $pdo->lastInsertId();
}

function upsertSmokeAffiliate(PDO $pdo, int $affiliateUserId, int $sellerUserId, array $data): int
{
    $stmt = $pdo->prepare('SELECT id FROM affiliates WHERE referral_code = :referral_code LIMIT 1');
    $stmt->execute(['referral_code' => $data['referral_code']]);
    $id = $stmt->fetchColumn();

    $data['user_id'] = $affiliateUserId;
    $data['seller_user_id'] = $sellerUserId;

    if ($id) {
        $data['id'] = (int) $id;
        $pdo->prepare(
            'UPDATE affiliates
             SET user_id = :user_id,
                 seller_user_id = :seller_user_id,
                 referral_code = :referral_code,
                 commission_type = :commission_type,
                 commission_percent = :commission_percent,
                 commission_flat = :commission_flat,
                 status = :status,
                 updated_at = :updated_at,
                 deleted_at = NULL
             WHERE id = :id'
        )->execute(only($data, [
            'user_id',
            'seller_user_id',
            'referral_code',
            'commission_type',
            'commission_percent',
            'commission_flat',
            'status',
            'updated_at',
            'id',
        ]));

        return (int) $id;
    }

    $pdo->prepare(
        'INSERT INTO affiliates
            (user_id, seller_user_id, referral_code, commission_type,
             commission_percent, commission_flat, total_clicks, total_transactions,
             total_commission, status, created_at, updated_at, deleted_at)
         VALUES
            (:user_id, :seller_user_id, :referral_code, :commission_type,
             :commission_percent, :commission_flat, 0, 0, 0.00, :status,
             :created_at, :updated_at, NULL)'
    )->execute($data);

    return (int) $pdo->lastInsertId();
}

function only(array $data, array $keys): array
{
    $filtered = [];

    foreach ($keys as $key) {
        $filtered[$key] = $data[$key];
    }

    return $filtered;
}
