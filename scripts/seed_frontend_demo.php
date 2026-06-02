<?php

declare(strict_types=1);

$app = require __DIR__ . '/../bootstrap/app.php';

/** @var PDO $pdo */
$pdo = $app->container()->make(PDO::class);

$appEnv = (string) config('app.env', 'local');

if ($appEnv === 'production') {
    fwrite(STDERR, 'Refusing to seed frontend demo data in production environment.' . PHP_EOL);
    exit(1);
}

$now = date('Y-m-d H:i:s');
$password = 'DemoPass123!';
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

$users = [
    'admin' => [
        'role' => 'admin',
        'name' => 'Frontend Demo Admin',
        'phone_number' => '081100000001',
        'email' => 'frontend-admin@projectb.local',
        'address' => 'Frontend demo control',
    ],
    'buyer' => [
        'role' => 'buyer',
        'name' => 'Frontend Demo Buyer',
        'phone_number' => '081100000002',
        'email' => 'frontend-buyer@projectb.local',
        'address' => 'Frontend demo buyer',
    ],
    'seller_jakarta' => [
        'role' => 'seller',
        'name' => 'Metro Auto Seller',
        'phone_number' => '081100000101',
        'email' => 'metro-auto@projectb.local',
        'address' => 'Jakarta Selatan',
    ],
    'seller_bandung' => [
        'role' => 'seller',
        'name' => 'Parahyangan Cars Seller',
        'phone_number' => '081100000102',
        'email' => 'parahyangan-cars@projectb.local',
        'address' => 'Bandung',
    ],
    'seller_surabaya' => [
        'role' => 'seller',
        'name' => 'Nusantara Wheels Seller',
        'phone_number' => '081100000103',
        'email' => 'nusantara-wheels@projectb.local',
        'address' => 'Surabaya',
    ],
];

$showrooms = [
    'seller_jakarta' => [
        'name' => 'Metro Auto Jakarta',
        'address' => 'Jl. Radio Dalam Raya No. 18, Jakarta Selatan',
        'phone_number' => '081188880101',
        'bank_account_number' => '101000111222',
        'bank_type' => 'BCA',
        'bank_account_name' => 'Metro Auto Jakarta',
    ],
    'seller_bandung' => [
        'name' => 'Parahyangan Cars Bandung',
        'address' => 'Jl. Buah Batu No. 88, Bandung',
        'phone_number' => '081188880102',
        'bank_account_number' => '102000111222',
        'bank_type' => 'Mandiri',
        'bank_account_name' => 'Parahyangan Cars Bandung',
    ],
    'seller_surabaya' => [
        'name' => 'Nusantara Wheels Surabaya',
        'address' => 'Jl. Mayjen Sungkono No. 45, Surabaya',
        'phone_number' => '081188880103',
        'bank_account_number' => '103000111222',
        'bank_type' => 'BNI',
        'bank_account_name' => 'Nusantara Wheels Surabaya',
    ],
];

$cars = [
    ['seller' => 'seller_jakarta', 'plate' => 'FDEMO 001', 'brand' => 'Toyota', 'model' => 'Avanza', 'sub' => 'G 1.5', 'color' => 'Hitam', 'document' => 'old', 'date' => '2022-03-15', 'transmission' => 'Automatic', 'location' => 'Jakarta Selatan', 'cc' => 1500, 'km' => 24000, 'seat' => 7, 'owner' => 1, 'book' => 1, 'cash' => 218000000, 'discount' => 209000000, 'credit' => 198000000, 'inspection' => 'completed', 'stock' => 1],
    ['seller' => 'seller_jakarta', 'plate' => 'FDEMO 002', 'brand' => 'Honda', 'model' => 'Brio', 'sub' => 'RS CVT', 'color' => 'Kuning', 'document' => 'old', 'date' => '2021-09-20', 'transmission' => 'Automatic', 'location' => 'Jakarta Selatan', 'cc' => 1200, 'km' => 31000, 'seat' => 5, 'owner' => 1, 'book' => 1, 'cash' => 176000000, 'discount' => null, 'credit' => 166000000, 'inspection' => 'completed', 'stock' => 1],
    ['seller' => 'seller_jakarta', 'plate' => 'FDEMO 003', 'brand' => 'Mitsubishi', 'model' => 'Xpander', 'sub' => 'Ultimate', 'color' => 'Putih', 'document' => 'old', 'date' => '2020-11-05', 'transmission' => 'Automatic', 'location' => 'Jakarta Barat', 'cc' => 1500, 'km' => 42500, 'seat' => 7, 'owner' => 1, 'book' => 1, 'cash' => 236000000, 'discount' => 229000000, 'credit' => 218000000, 'inspection' => 'completed', 'stock' => 1],
    ['seller' => 'seller_jakarta', 'plate' => 'FDEMO 004', 'brand' => 'Suzuki', 'model' => 'Ertiga', 'sub' => 'GX', 'color' => 'Abu-abu', 'document' => 'old', 'date' => '2019-07-12', 'transmission' => 'Manual', 'location' => 'Depok', 'cc' => 1500, 'km' => 58000, 'seat' => 7, 'owner' => 2, 'book' => 1, 'cash' => 165000000, 'discount' => 158000000, 'credit' => 151000000, 'inspection' => 'partial', 'stock' => 1],
    ['seller' => 'seller_bandung', 'plate' => 'FDEMO 005', 'brand' => 'Toyota', 'model' => 'Raize', 'sub' => 'GR Sport', 'color' => 'Merah', 'document' => 'old', 'date' => '2023-01-10', 'transmission' => 'Automatic', 'location' => 'Bandung', 'cc' => 1000, 'km' => 12000, 'seat' => 5, 'owner' => 1, 'book' => 1, 'cash' => 245000000, 'discount' => null, 'credit' => 232000000, 'inspection' => 'completed', 'stock' => 1],
    ['seller' => 'seller_bandung', 'plate' => 'FDEMO 006', 'brand' => 'Daihatsu', 'model' => 'Terios', 'sub' => 'R Deluxe', 'color' => 'Silver', 'document' => 'old', 'date' => '2021-05-19', 'transmission' => 'Manual', 'location' => 'Bandung', 'cc' => 1500, 'km' => 39500, 'seat' => 7, 'owner' => 1, 'book' => 1, 'cash' => 214000000, 'discount' => 207000000, 'credit' => 199000000, 'inspection' => 'completed', 'stock' => 1],
    ['seller' => 'seller_bandung', 'plate' => 'FDEMO 007', 'brand' => 'Honda', 'model' => 'HR-V', 'sub' => 'SE', 'color' => 'Hitam', 'document' => 'old', 'date' => '2020-02-22', 'transmission' => 'Automatic', 'location' => 'Cimahi', 'cc' => 1500, 'km' => 48500, 'seat' => 5, 'owner' => 2, 'book' => 1, 'cash' => 286000000, 'discount' => 275000000, 'credit' => 263000000, 'inspection' => 'partial', 'stock' => 1],
    ['seller' => 'seller_bandung', 'plate' => 'FDEMO 008', 'brand' => 'Nissan', 'model' => 'Livina', 'sub' => 'VL', 'color' => 'Cokelat', 'document' => 'old', 'date' => '2019-10-03', 'transmission' => 'Automatic', 'location' => 'Bandung', 'cc' => 1500, 'km' => 61000, 'seat' => 7, 'owner' => 2, 'book' => 0, 'cash' => 159000000, 'discount' => null, 'credit' => 149000000, 'inspection' => 'partial', 'stock' => 1],
    ['seller' => 'seller_surabaya', 'plate' => 'FDEMO 009', 'brand' => 'Toyota', 'model' => 'Innova', 'sub' => 'Venturer Diesel', 'color' => 'Putih', 'document' => 'old', 'date' => '2020-12-18', 'transmission' => 'Automatic', 'location' => 'Surabaya', 'cc' => 2400, 'km' => 52000, 'seat' => 7, 'owner' => 1, 'book' => 1, 'cash' => 382000000, 'discount' => 368000000, 'credit' => 352000000, 'inspection' => 'completed', 'stock' => 1],
    ['seller' => 'seller_surabaya', 'plate' => 'FDEMO 010', 'brand' => 'Mazda', 'model' => 'CX-5', 'sub' => 'GT', 'color' => 'Merah', 'document' => 'old', 'date' => '2018-08-14', 'transmission' => 'Automatic', 'location' => 'Surabaya', 'cc' => 2500, 'km' => 72000, 'seat' => 5, 'owner' => 2, 'book' => 1, 'cash' => 298000000, 'discount' => null, 'credit' => 281000000, 'inspection' => 'completed', 'stock' => 1],
    ['seller' => 'seller_surabaya', 'plate' => 'FDEMO 011', 'brand' => 'Hyundai', 'model' => 'Creta', 'sub' => 'Prime', 'color' => 'Biru', 'document' => 'old', 'date' => '2022-06-09', 'transmission' => 'Automatic', 'location' => 'Sidoarjo', 'cc' => 1500, 'km' => 20500, 'seat' => 5, 'owner' => 1, 'book' => 1, 'cash' => 287000000, 'discount' => 279000000, 'credit' => 267000000, 'inspection' => 'not_checked', 'stock' => 1],
    ['seller' => 'seller_surabaya', 'plate' => 'FDEMO 012', 'brand' => 'Wuling', 'model' => 'Almaz', 'sub' => 'RS', 'color' => 'Abu-abu', 'document' => 'old', 'date' => '2021-04-25', 'transmission' => 'Automatic', 'location' => 'Surabaya', 'cc' => 1500, 'km' => 33000, 'seat' => 7, 'owner' => 1, 'book' => 1, 'cash' => 258000000, 'discount' => 249000000, 'credit' => 238000000, 'inspection' => 'partial', 'stock' => 1],
    ['seller' => 'seller_jakarta', 'plate' => 'FDEMO 013', 'brand' => 'Daihatsu', 'model' => 'Ayla', 'sub' => 'X', 'color' => 'Putih', 'document' => 'old', 'date' => '2020-01-17', 'transmission' => 'Manual', 'location' => 'Tangerang', 'cc' => 1200, 'km' => 66500, 'seat' => 5, 'owner' => 2, 'book' => 0, 'cash' => 108000000, 'discount' => 103000000, 'credit' => 98000000, 'inspection' => 'not_checked', 'stock' => 1],
    ['seller' => 'seller_bandung', 'plate' => 'FDEMO 014', 'brand' => 'Honda', 'model' => 'City Hatchback', 'sub' => 'RS', 'color' => 'Merah', 'document' => 'old', 'date' => '2022-05-28', 'transmission' => 'Automatic', 'location' => 'Bandung', 'cc' => 1500, 'km' => 18000, 'seat' => 5, 'owner' => 1, 'book' => 1, 'cash' => 289000000, 'discount' => null, 'credit' => 274000000, 'inspection' => 'completed', 'stock' => 1],
    ['seller' => 'seller_surabaya', 'plate' => 'FDEMO 015', 'brand' => 'Kia', 'model' => 'Seltos', 'sub' => 'EX Plus', 'color' => 'Orange', 'document' => 'old', 'date' => '2021-02-11', 'transmission' => 'Automatic', 'location' => 'Malang', 'cc' => 1400, 'km' => 41000, 'seat' => 5, 'owner' => 1, 'book' => 1, 'cash' => 269000000, 'discount' => 259000000, 'credit' => 248000000, 'inspection' => 'partial', 'stock' => 1],
    ['seller' => 'seller_jakarta', 'plate' => 'FDEMO 016', 'brand' => 'Toyota', 'model' => 'Yaris', 'sub' => 'TRD Sportivo', 'color' => 'Silver', 'document' => 'old', 'date' => '2019-03-08', 'transmission' => 'Manual', 'location' => 'Bekasi', 'cc' => 1500, 'km' => 54000, 'seat' => 5, 'owner' => 2, 'book' => 1, 'cash' => 192000000, 'discount' => null, 'credit' => 181000000, 'inspection' => 'not_checked', 'stock' => 1],
];

try {
    $pdo->beginTransaction();

    $userIds = [];
    foreach ($users as $key => $user) {
        $userIds[$key] = upsertDemoUser($pdo, array_merge($user, [
            'password_hash' => $passwordHash,
            'account_status' => 'active',
            'is_approved' => 1,
            'created_at' => $now,
            'updated_at' => $now,
        ]));
    }

    $showroomIds = [];
    foreach ($showrooms as $sellerKey => $showroom) {
        $showroomIds[$sellerKey] = upsertDemoShowroom($pdo, $userIds[$sellerKey], array_merge($showroom, [
            'created_at' => $now,
            'updated_at' => $now,
        ]));
    }

    $app->container()
        ->make(\App\Modules\Inspection\Jobs\SeedInspectionTemplatesJob::class)
        ->run();
    $templateIds = demoInspectionTemplateIds($pdo);
    $seededCarIds = [];
    $imageCount = 0;
    $reportCount = 0;

    foreach ($cars as $index => $car) {
        $sellerId = $userIds[$car['seller']];
        $showroomId = $showroomIds[$car['seller']];
        $publishedAt = date('Y-m-d H:i:s', strtotime(sprintf('-%d days', $index)));
        $inspectionStatus = $car['inspection'] === 'not_checked' ? 'not_checked' : $car['inspection'];

        $carId = upsertDemoCar($pdo, $sellerId, $showroomId, [
            'listing_status' => 'published',
            'stock' => $car['stock'],
            'license_plate_number' => $car['plate'],
            'brand_name' => $car['brand'],
            'model_name' => $car['model'],
            'sub_model_name' => $car['sub'],
            'primary_color' => $car['color'],
            'secondary_color' => $car['color'],
            'color_variation' => null,
            'document_type' => $car['document'],
            'registration_date' => $car['date'],
            'transmission' => $car['transmission'],
            'engine_number' => 'FDEMO-ENG-' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
            'chassis_number' => 'FDEMO-CHS-' . str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
            'location_name' => $car['location'],
            'engine_capacity_cc' => $car['cc'],
            'mileage_km' => $car['km'],
            'seat_count' => $car['seat'],
            'previous_owner_count' => $car['owner'],
            'has_service_book' => $car['book'],
            'key_count' => 2,
            'description' => demoDescription($car),
            'price_cash' => $car['cash'],
            'price_discount' => $car['discount'],
            'price_credit' => $car['credit'],
            'inspection_summary_status' => $inspectionStatus,
            'published_at' => $publishedAt,
            'created_at' => $publishedAt,
            'updated_at' => $now,
        ]);

        $seededCarIds[] = $carId;
        $imageCount += seedDemoImages($pdo, $carId, $sellerId, $car, $index, $now);

        if ($car['inspection'] !== 'not_checked') {
            upsertDemoInspectionReport($pdo, $carId, $userIds['admin'], $templateIds, $car, $now);
            $reportCount++;
        }
    }

    $pdo->commit();
} catch (Throwable $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    throw $exception;
}

echo json_encode([
    'success' => true,
    'message' => 'Frontend demo seed completed.',
    'data' => [
        'credentials' => [
            'password' => $password,
            'admin' => $users['admin']['email'],
            'buyer' => $users['buyer']['email'],
            'sellers' => [
                $users['seller_jakarta']['email'],
                $users['seller_bandung']['email'],
                $users['seller_surabaya']['email'],
            ],
        ],
        'summary' => [
            'published_cars' => count($seededCarIds),
            'showrooms' => count($showroomIds),
            'images' => $imageCount,
            'inspection_reports' => $reportCount,
        ],
        'car_ids' => $seededCarIds,
        'public_catalog' => '/api/cars?listing_status=published&page=1&limit=12',
    ],
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;

function upsertDemoUser(PDO $pdo, array $data): int
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

function upsertDemoShowroom(PDO $pdo, int $sellerUserId, array $data): int
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

function upsertDemoCar(PDO $pdo, int $sellerUserId, int $showroomId, array $data): int
{
    $stmt = $pdo->prepare(
        'SELECT id FROM cars
         WHERE license_plate_number = :license_plate_number
         LIMIT 1'
    );
    $stmt->execute(['license_plate_number' => $data['license_plate_number']]);
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

        $pdo->prepare('UPDATE cars SET ' . implode(', ', $sets) . ', deleted_at = NULL WHERE id = :id')
            ->execute($updateData);

        return (int) $id;
    }

    $columns = array_merge(array_keys($data), ['deleted_at']);
    $placeholders = array_map(
        static fn (string $column): string => $column === 'deleted_at' ? 'NULL' : ':' . $column,
        $columns
    );

    $pdo->prepare('INSERT INTO cars (' . implode(', ', $columns) . ') VALUES (' . implode(', ', $placeholders) . ')')
        ->execute($data);

    return (int) $pdo->lastInsertId();
}

function seedDemoImages(PDO $pdo, int $carId, int $sellerUserId, array $car, int $index, string $now): int
{
    $baseSlug = slug($car['brand'] . '-' . $car['model'] . '-' . $car['plate']);
    $count = 0;

    for ($sort = 0; $sort < 4; $sort++) {
        $fileName = $baseSlug . '-' . ($sort + 1) . '.svg';
        $relativePath = 'uploads/demo/cars/' . $fileName;
        writeDemoSvg($relativePath, $car, $index, $sort);

        upsertDemoImage($pdo, [
            'car_id' => $carId,
            'user_id' => $sellerUserId,
            'file_path' => $relativePath,
            'file_name' => $fileName,
            'file_size' => filesize(base_path('public/' . $relativePath)) ?: null,
            'mime_type' => 'image/svg+xml',
            'sort_order' => $sort,
            'is_cover' => $sort === 0 ? 1 : 0,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $count++;
    }

    return $count;
}

function upsertDemoImage(PDO $pdo, array $data): int
{
    $stmt = $pdo->prepare(
        'SELECT id FROM car_images
         WHERE car_id = :car_id
         AND file_path = :file_path
         LIMIT 1'
    );
    $stmt->execute([
        'car_id' => $data['car_id'],
        'file_path' => $data['file_path'],
    ]);
    $id = $stmt->fetchColumn();

    if ($id) {
        $data['id'] = (int) $id;
        $pdo->prepare(
            'UPDATE car_images
             SET user_id = :user_id,
                 file_name = :file_name,
                 file_size = :file_size,
                 mime_type = :mime_type,
                 sort_order = :sort_order,
                 is_cover = :is_cover,
                 updated_at = :updated_at,
                 deleted_at = NULL
             WHERE id = :id'
        )->execute(only($data, [
            'user_id',
            'file_name',
            'file_size',
            'mime_type',
            'sort_order',
            'is_cover',
            'updated_at',
            'id',
        ]));

        return (int) $id;
    }

    $pdo->prepare(
        'INSERT INTO car_images
            (car_id, user_id, file_path, file_name, file_size, mime_type,
             sort_order, is_cover, created_at, updated_at, deleted_at)
         VALUES
            (:car_id, :user_id, :file_path, :file_name, :file_size, :mime_type,
             :sort_order, :is_cover, :created_at, :updated_at, NULL)'
    )->execute($data);

    return (int) $pdo->lastInsertId();
}

function demoInspectionTemplateIds(PDO $pdo): array
{
    $targets = [
        'exterior' => ['exterior', 'Body exterior'],
        'interior' => ['interior', 'Interior cabin'],
        'engine' => ['underbody_engine', 'Engine condition'],
        'documents' => ['documents', 'Vehicle documents'],
    ];
    $ids = [];

    foreach ($targets as $key => [$categoryName, $itemName]) {
        $stmt = $pdo->prepare(
            'SELECT id FROM inspection_templates
             WHERE category_name = :category_name
             AND item_name = :item_name
             AND is_active = 1
             LIMIT 1'
        );
        $stmt->execute([
            'category_name' => $categoryName,
            'item_name' => $itemName,
        ]);
        $ids[$key] = (int) $stmt->fetchColumn();
    }

    return array_filter($ids);
}

function upsertDemoInspectionReport(PDO $pdo, int $carId, int $inspectorUserId, array $templateIds, array $car, string $now): int
{
    $stmt = $pdo->prepare('SELECT id FROM inspection_reports WHERE car_id = :car_id AND deleted_at IS NULL LIMIT 1');
    $stmt->execute(['car_id' => $carId]);
    $id = $stmt->fetchColumn();
    $status = $car['inspection'] === 'completed' ? 'published' : 'completed';
    $notes = $car['inspection'] === 'completed'
        ? 'Unit siap ditampilkan untuk demo buyer/public. Kondisi utama sesuai ekspektasi.'
        : 'Unit memiliki beberapa catatan ringan untuk simulasi inspection summary.';

    if ($id) {
        $pdo->prepare(
            'UPDATE inspection_reports
             SET inspector_user_id = :inspector_user_id,
                 report_status = :report_status,
                 summary_notes = :summary_notes,
                 inspected_at = :inspected_at,
                 updated_at = :updated_at,
                 deleted_at = NULL
             WHERE id = :id'
        )->execute([
            'id' => (int) $id,
            'inspector_user_id' => $inspectorUserId,
            'report_status' => $status,
            'summary_notes' => $notes,
            'inspected_at' => $now,
            'updated_at' => $now,
        ]);
    } else {
        $pdo->prepare(
            'INSERT INTO inspection_reports
                (car_id, inspector_user_id, report_status, summary_notes,
                 inspected_at, created_at, updated_at, deleted_at)
             VALUES
                (:car_id, :inspector_user_id, :report_status, :summary_notes,
                 :inspected_at, :created_at, :updated_at, NULL)'
        )->execute([
            'car_id' => $carId,
            'inspector_user_id' => $inspectorUserId,
            'report_status' => $status,
            'summary_notes' => $notes,
            'inspected_at' => $now,
            'created_at' => $now,
            'updated_at' => $now,
        ]);
        $id = $pdo->lastInsertId();
    }

    $reportId = (int) $id;
    $results = [
        'exterior' => $car['inspection'] === 'completed' ? 'good' : 'fair',
        'interior' => 'good',
        'engine' => $car['inspection'] === 'completed' ? 'good' : 'fair',
        'documents' => $car['book'] ? 'good' : 'fair',
    ];

    foreach ($templateIds as $category => $templateId) {
        upsertDemoInspectionItem($pdo, [
            'inspection_report_id' => $reportId,
            'template_id' => $templateId,
            'item_name_snapshot' => inspectionItemName($category),
            'result_status' => $results[$category] ?? 'good',
            'description' => inspectionDescription($category, $results[$category] ?? 'good'),
            'notes' => $results[$category] === 'good' ? 'Normal untuk demo.' : 'Catatan ringan untuk simulasi filter dan detail.',
            'created_at' => $now,
            'updated_at' => $now,
        ]);
    }

    return $reportId;
}

function upsertDemoInspectionItem(PDO $pdo, array $data): int
{
    $stmt = $pdo->prepare(
        'SELECT id FROM inspection_report_items
         WHERE inspection_report_id = :inspection_report_id
         AND template_id = :template_id
         LIMIT 1'
    );
    $stmt->execute([
        'inspection_report_id' => $data['inspection_report_id'],
        'template_id' => $data['template_id'],
    ]);
    $id = $stmt->fetchColumn();

    if ($id) {
        $data['id'] = (int) $id;
        $pdo->prepare(
            'UPDATE inspection_report_items
             SET item_name_snapshot = :item_name_snapshot,
                 result_status = :result_status,
                 description = :description,
                 notes = :notes,
                 updated_at = :updated_at
             WHERE id = :id'
        )->execute(only($data, [
            'item_name_snapshot',
            'result_status',
            'description',
            'notes',
            'updated_at',
            'id',
        ]));

        return (int) $id;
    }

    $pdo->prepare(
        'INSERT INTO inspection_report_items
            (inspection_report_id, template_id, item_name_snapshot,
             result_status, description, notes, created_at, updated_at)
         VALUES
            (:inspection_report_id, :template_id, :item_name_snapshot,
             :result_status, :description, :notes, :created_at, :updated_at)'
    )->execute($data);

    return (int) $pdo->lastInsertId();
}

function writeDemoSvg(string $relativePath, array $car, int $index, int $sort): void
{
    $fullPath = base_path('public/' . $relativePath);
    $dir = dirname($fullPath);

    if (! is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    $palettes = [
        ['#0f766e', '#e0f2fe'],
        ['#b91c1c', '#fee2e2'],
        ['#374151', '#f3f4f6'],
        ['#ca8a04', '#fef9c3'],
        ['#1d4ed8', '#dbeafe'],
    ];
    [$primary, $secondary] = $palettes[($index + $sort) % count($palettes)];
    $title = htmlspecialchars($car['brand'] . ' ' . $car['model'], ENT_QUOTES, 'UTF-8');
    $subtitle = htmlspecialchars($car['sub'] . ' - ' . $car['color'], ENT_QUOTES, 'UTF-8');
    $angle = 80 + ($sort * 10);
    $imageNumber = $sort + 1;

    $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900" role="img" aria-label="{$title}">
  <rect width="1200" height="900" fill="{$secondary}"/>
  <rect x="0" y="610" width="1200" height="290" fill="#111827" opacity="0.08"/>
  <path d="M180 {$angle} C360 20 620 90 1020 40 L1200 0 L1200 900 L0 900 L0 160 C55 135 110 110 180 {$angle}Z" fill="{$primary}" opacity="0.12"/>
  <g transform="translate(190 355)">
    <path d="M135 170 L205 75 C230 40 275 20 325 20 L615 20 C670 20 715 45 745 88 L815 170 Z" fill="#ffffff"/>
    <path d="M210 165 L265 88 C285 62 315 50 352 50 L598 50 C635 50 668 65 690 92 L750 165 Z" fill="{$primary}" opacity="0.9"/>
    <rect x="90" y="150" width="780" height="160" rx="50" fill="#ffffff"/>
    <rect x="150" y="190" width="170" height="42" rx="18" fill="{$primary}" opacity="0.18"/>
    <rect x="630" y="190" width="170" height="42" rx="18" fill="{$primary}" opacity="0.18"/>
    <circle cx="245" cy="315" r="70" fill="#111827"/>
    <circle cx="245" cy="315" r="34" fill="#9ca3af"/>
    <circle cx="715" cy="315" r="70" fill="#111827"/>
    <circle cx="715" cy="315" r="34" fill="#9ca3af"/>
  </g>
  <text x="70" y="95" fill="#111827" font-family="Arial, sans-serif" font-size="54" font-weight="700">{$title}</text>
  <text x="72" y="150" fill="#374151" font-family="Arial, sans-serif" font-size="30">{$subtitle}</text>
  <text x="72" y="825" fill="#374151" font-family="Arial, sans-serif" font-size="26">Frontend demo image {$imageNumber}</text>
</svg>
SVG;

    file_put_contents($fullPath, $svg);
}

function demoDescription(array $car): string
{
    return sprintf(
        '%s %s %s warna %s untuk kebutuhan demo frontend. Data ini dibuat agar katalog, filter, detail, galeri, inspeksi, dan CTA transaksi dapat diuji nyaman di local/dev/staging.',
        $car['brand'],
        $car['model'],
        $car['sub'],
        strtolower($car['color'])
    );
}

function inspectionItemName(string $category): string
{
    return [
        'exterior' => 'Body exterior',
        'interior' => 'Interior cabin',
        'engine' => 'Engine condition',
        'documents' => 'Vehicle documents',
    ][$category] ?? ucfirst($category);
}

function inspectionDescription(string $category, string $result): string
{
    if ($result === 'good') {
        return ucfirst($category) . ' dalam kondisi baik untuk demo.';
    }

    return ucfirst($category) . ' memiliki catatan ringan untuk simulasi inspection summary.';
}

function slug(string $value): string
{
    $value = strtolower($value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? $value;
    return trim($value, '-');
}

function only(array $data, array $keys): array
{
    $filtered = [];

    foreach ($keys as $key) {
        $filtered[$key] = $data[$key];
    }

    return $filtered;
}
