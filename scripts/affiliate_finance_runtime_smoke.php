<?php

declare(strict_types=1);

use App\Modules\Affiliate\Services\AffiliateService;
use App\Modules\Transactions\Services\TransactionService;

$app = require __DIR__ . '/../bootstrap/app.php';
$pdo = $app->container()->make(PDO::class);
$mode = $argv[1] ?? 'preflight';

if (env('APP_ENV', '') === 'production') {
    fwrite(STDERR, 'Refusing to run affiliate finance smoke in production.' . PHP_EOL);
    exit(1);
}

try {
    if ($mode === 'preflight') {
        output(preflight($pdo));
        exit(0);
    }

    if ($mode === 'apply-patch') {
        output(applyPatch($pdo, __DIR__ . '/sql/20260601_affiliate_payment_finance_completion.sql'));
        exit(0);
    }

    if ($mode === 'backup') {
        output(backupFinanceTables($pdo));
        exit(0);
    }

    if ($mode === 'schema') {
        output(schemaVerification($pdo));
        exit(0);
    }

    if ($mode === 'smoke') {
        output(smoke($pdo, $app->container()->make(TransactionService::class), $app->container()->make(AffiliateService::class)));
        exit(0);
    }

    fwrite(STDERR, 'Unknown mode. Use preflight, backup, apply-patch, schema, or smoke.' . PHP_EOL);
    exit(1);
} catch (Throwable $exception) {
    output([
        'status' => 'FAIL',
        'error' => $exception->getMessage(),
        'exception' => get_class($exception),
    ]);
    exit(1);
}

function preflight(PDO $pdo): array
{
    $schema = schemaVerification($pdo);
    $settlementPresent = count($schema['columns']['affiliate_settlement_batches']['present']);
    $ledgerPresent = count($schema['columns']['affiliate_commission_ledgers']['present']);
    $settlementExpected = count($schema['columns']['affiliate_settlement_batches']['expected']);
    $ledgerExpected = count($schema['columns']['affiliate_commission_ledgers']['expected']);
    $alreadyApplied = $settlementPresent === $settlementExpected
        && $ledgerPresent === $ledgerExpected
        && $schema['history_table_exists']
        && $schema['unique_accrual_source_exists'];
    $partial = ! $alreadyApplied && ($settlementPresent > 0 || $ledgerPresent > 0 || $schema['history_table_exists'] || $schema['unique_accrual_source_exists']);

    return [
        'status' => $partial ? 'BLOCKED' : 'OK',
        'app_env' => env('APP_ENV', ''),
        'db_host' => env('DB_HOST', ''),
        'database' => databaseName($pdo),
        'patch_already_applied' => $alreadyApplied,
        'partial_patch_detected' => $partial,
        'duplicate_accrual_risk' => duplicateAccruals($pdo),
        'schema' => $schema,
    ];
}

function applyPatch(PDO $pdo, string $path): array
{
    $preflight = preflight($pdo);

    if ($preflight['status'] === 'BLOCKED') {
        return [
            'status' => 'BLOCKED',
            'reason' => 'Partial patch detected; manual review required before applying SQL.',
            'preflight' => $preflight,
        ];
    }

    if ($preflight['patch_already_applied']) {
        return [
            'status' => 'SKIPPED',
            'reason' => 'Patch already applied.',
            'schema' => $preflight['schema'],
        ];
    }

    if ($preflight['duplicate_accrual_risk'] !== []) {
        return [
            'status' => 'BLOCKED',
            'reason' => 'Duplicate accrual rows would make the unique key fail.',
            'duplicates' => $preflight['duplicate_accrual_risk'],
        ];
    }

    $sql = file_get_contents($path);
    if ($sql === false) {
        throw new RuntimeException('Unable to read SQL patch: ' . $path);
    }

    foreach (splitSqlStatements($sql) as $statement) {
        $pdo->exec($statement);
    }

    return [
        'status' => 'APPLIED',
        'schema' => schemaVerification($pdo),
    ];
}

function backupFinanceTables(PDO $pdo): array
{
    $dir = __DIR__ . '/../storage/backups';
    if (! is_dir($dir) && ! mkdir($dir, 0777, true) && ! is_dir($dir)) {
        throw new RuntimeException('Unable to create backup directory: ' . $dir);
    }

    $payload = [
        'created_at' => now(),
        'database' => databaseName($pdo),
        'tables' => [],
    ];

    foreach (['affiliate_settlement_batches', 'affiliate_settlement_items', 'affiliate_commission_ledgers'] as $table) {
        $payload['tables'][$table] = $pdo->query('SELECT * FROM ' . $table)->fetchAll(PDO::FETCH_ASSOC);
    }

    $path = $dir . '/affiliate_finance_before_20260601_' . date('Ymd_His') . '.json';
    file_put_contents($path, json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

    return [
        'status' => 'OK',
        'path' => $path,
        'row_counts' => array_map('count', $payload['tables']),
    ];
}

function schemaVerification(PDO $pdo): array
{
    $expected = [
        'affiliate_settlement_batches' => [
            'settlement_code',
            'affiliate_user_id',
            'currency',
            'payment_method',
            'payment_reference',
            'payment_note',
            'proof_file_url',
            'period_start',
            'period_end',
            'requested_by',
            'approved_by',
            'paid_by',
            'cancelled_by',
            'deleted_at',
        ],
        'affiliate_commission_ledgers' => [
            'affiliate_user_id',
            'buyer_user_id',
            'source_type',
            'source_id',
            'currency',
            'status_reason',
            'settlement_id',
            'accrued_at',
            'pending_at',
            'paid_out_at',
            'voided_at',
            'deleted_at',
        ],
    ];
    $columns = [];

    foreach ($expected as $table => $tableColumns) {
        $existing = existingColumns($pdo, $table);
        $columns[$table] = [
            'expected' => $tableColumns,
            'present' => array_values(array_intersect($tableColumns, $existing)),
            'missing' => array_values(array_diff($tableColumns, $existing)),
        ];
    }

    return [
        'database' => databaseName($pdo),
        'columns' => $columns,
        'history_table_exists' => tableExists($pdo, 'affiliate_settlement_histories'),
        'unique_accrual_source_exists' => constraintExists($pdo, 'affiliate_commission_ledgers', 'uniq_affiliate_commission_ledgers_accrual_source'),
        'settlement_code_unique_exists' => constraintExists($pdo, 'affiliate_settlement_batches', 'uniq_affiliate_settlement_batches_code'),
        'history_indexes' => indexes($pdo, 'affiliate_settlement_histories'),
    ];
}

function smoke(PDO $pdo, TransactionService $transactions, AffiliateService $affiliates): array
{
    $schema = schemaVerification($pdo);
    foreach ($schema['columns'] as $table => $result) {
        if ($result['missing'] !== []) {
            return [
                'status' => 'BLOCKED',
                'reason' => 'Schema patch is not applied.',
                'table' => $table,
                'missing' => $result['missing'],
            ];
        }
    }

    $runId = 'uat_aff_fin_' . date('Ymd_His');
    $now = now();
    $passwordHash = password_hash('SmokePass123!', PASSWORD_DEFAULT);

    $admin = createUser($pdo, [
        'role' => 'admin',
        'name' => 'UAT Affiliate Finance Admin ' . $runId,
        'email' => $runId . '_admin@projectb.local',
        'password_hash' => $passwordHash,
    ]);
    $seller = createUser($pdo, [
        'role' => 'seller',
        'name' => 'UAT Affiliate Finance Seller ' . $runId,
        'email' => $runId . '_seller@projectb.local',
        'password_hash' => $passwordHash,
    ]);
    $buyer = createUser($pdo, [
        'role' => 'buyer',
        'name' => 'UAT Affiliate Finance Buyer ' . $runId,
        'email' => $runId . '_buyer@projectb.local',
        'password_hash' => $passwordHash,
    ]);
    $affiliateUser = createUser($pdo, [
        'role' => 'affiliate_admin',
        'name' => 'UAT Affiliate Finance Affiliate ' . $runId,
        'email' => $runId . '_affiliate@projectb.local',
        'password_hash' => $passwordHash,
    ]);
    $showroomId = createShowroom($pdo, $seller['id'], $runId);
    $affiliateId = createAffiliate($pdo, $affiliateUser['id'], $seller['id'], $runId);
    $ruleId = createCommissionRule($pdo, $seller['id']);
    $adminUser = userById($pdo, $admin['id']);
    $affiliateUserRow = userById($pdo, $affiliateUser['id']);
    $sellerUserRow = userById($pdo, $seller['id']);

    $carOneId = createCar($pdo, $seller['id'], $showroomId, $runId . '-one', 100000000);
    $transactionOneId = createTransaction($pdo, $buyer['id'], $seller['id'], $carOneId, $affiliateId, $runId . '-one', 100000000);
    $transactions->updateStatus($adminUser, $transactionOneId, ['transaction_status' => 'paid']);
    $transactions->updateStatus($adminUser, $transactionOneId, ['transaction_status' => 'paid']);
    $ledgerOne = ledgerByTransaction($pdo, $transactionOneId);
    $ledgerOneCount = ledgerCountByTransaction($pdo, $transactionOneId);
    $commissionNotification = notificationBySource($pdo, $affiliateUser['id'], 'affiliate_admin', 'commission_accrued', 'affiliate_commission', (string) $ledgerOne['id']);
    $adminLedgers = $affiliates->adminLedgers($adminUser, ['limit' => 20]);
    $affiliateLedgers = $affiliates->myLedgers($affiliateUserRow, ['limit' => 20]);

    $settlementOne = $affiliates->createSettlementBatch($adminUser, [
        'affiliate_id' => $affiliateId,
        'ledger_ids' => [(int) $ledgerOne['id']],
        'payment_method' => 'bank_transfer',
        'payment_reference' => $runId . '-pending',
        'payment_note' => 'UAT settlement create',
        'notes' => 'UAT settlement create',
    ]);
    $ledgerOnePending = ledgerById($pdo, (int) $ledgerOne['id']);
    $settlementOneDetail = $affiliates->settlementDetail($adminUser, (int) $settlementOne['id']);

    $settledOne = $affiliates->updateSettlementBatchStatus($adminUser, (int) $settlementOne['id'], [
        'status' => 'settled',
        'payment_method' => 'bank_transfer',
        'payment_reference' => $runId . '-paid',
        'payment_note' => 'UAT paid note',
        'proof_file_url' => 'https://example.test/proofs/' . $runId . '.jpg',
    ]);
    $ledgerOnePaid = ledgerById($pdo, (int) $ledgerOne['id']);
    $settlementPaidNotification = notificationBySource($pdo, $affiliateUser['id'], 'affiliate_admin', 'settlement_paid', 'affiliate_settlement', (string) $settlementOne['id']);

    $carTwoId = createCar($pdo, $seller['id'], $showroomId, $runId . '-two', 80000000);
    $transactionTwoId = createTransaction($pdo, $buyer['id'], $seller['id'], $carTwoId, $affiliateId, $runId . '-two', 80000000);
    $transactions->updateStatus($sellerUserRow, $transactionTwoId, ['transaction_status' => 'paid']);
    $ledgerTwo = ledgerByTransaction($pdo, $transactionTwoId);
    $settlementTwo = $affiliates->createSettlementBatch($adminUser, [
        'affiliate_id' => $affiliateId,
        'ledger_ids' => [(int) $ledgerTwo['id']],
        'payment_reference' => $runId . '-cancel',
        'payment_note' => 'UAT cancel setup',
        'notes' => 'UAT cancel setup',
    ]);
    $cancelledTwo = $affiliates->updateSettlementBatchStatus($adminUser, (int) $settlementTwo['id'], [
        'status' => 'cancelled',
        'payment_note' => 'UAT cancel note',
    ]);
    $ledgerTwoCancelled = ledgerById($pdo, (int) $ledgerTwo['id']);

    $affiliateSettlementList = $affiliates->mySettlements($affiliateUserRow, ['limit' => 20, 'eligible_limit' => 20]);
    $scopingOther = $affiliates->myLedgers($affiliateUserRow, ['limit' => 100]);

    return [
        'status' => 'PASS',
        'run_id' => $runId,
        'cleanup_policy' => 'left_as_uat_evidence',
        'test_data' => [
            'admin_user_id' => $admin['id'],
            'seller_user_id' => $seller['id'],
            'buyer_user_id' => $buyer['id'],
            'affiliate_user_id' => $affiliateUser['id'],
            'showroom_id' => $showroomId,
            'affiliate_id' => $affiliateId,
            'commission_rule_id' => $ruleId,
            'car_ids' => [$carOneId, $carTwoId],
            'transaction_ids' => [$transactionOneId, $transactionTwoId],
            'ledger_ids' => [(int) $ledgerOne['id'], (int) $ledgerTwo['id']],
            'settlement_ids' => [(int) $settlementOne['id'], (int) $settlementTwo['id']],
        ],
        'commission_accrual' => [
            'ledger_status' => $ledgerOne['ledger_status'],
            'ledger_count_for_transaction_after_duplicate_paid' => $ledgerOneCount,
            'affiliate_id' => (int) $ledgerOne['affiliate_id'],
            'affiliate_user_id' => (int) $ledgerOne['affiliate_user_id'],
            'transaction_id' => (int) $ledgerOne['transaction_id'],
            'car_id_via_transaction' => $carOneId,
            'base_amount' => (float) $ledgerOne['base_amount'],
            'commission_type' => $ledgerOne['commission_type'],
            'commission_value_snapshot' => (float) $ledgerOne['commission_value_snapshot'],
            'commission_amount' => (float) $ledgerOne['commission_amount'],
            'currency' => $ledgerOne['currency'],
            'notification_link' => $commissionNotification['link_url'] ?? null,
            'result' => $ledgerOne['ledger_status'] === 'accrued'
                && $ledgerOneCount === 1
                && (float) $ledgerOne['commission_amount'] === 5000000.0
                && ($commissionNotification['link_url'] ?? null) === '#/affiliate/ledger'
                ? 'PASS'
                : 'FAIL',
        ],
        'admin_settlement_create' => [
            'settlement_status' => $settlementOne['status'],
            'total_amount' => (float) $settlementOne['total_amount'],
            'ledger_status_after_create' => $ledgerOnePending['ledger_status'],
            'ledger_settlement_id' => isset($ledgerOnePending['settlement_id']) ? (int) $ledgerOnePending['settlement_id'] : null,
            'history_count' => count($settlementOneDetail['histories'] ?? []),
            'result' => $settlementOne['status'] === 'pending'
                && $ledgerOnePending['ledger_status'] === 'pending'
                && (int) $ledgerOnePending['settlement_id'] === (int) $settlementOne['id']
                && count($settlementOneDetail['histories'] ?? []) >= 1
                ? 'PASS'
                : 'FAIL',
        ],
        'admin_settlement_settle' => [
            'settlement_status' => $settledOne['status'],
            'ledger_status_after_settle' => $ledgerOnePaid['ledger_status'],
            'settled_at' => $settledOne['settled_at'] ?? null,
            'paid_by' => $settledOne['paid_by'] ?? null,
            'payment_reference' => $settledOne['payment_reference'] ?? null,
            'proof_file_url' => $settledOne['proof_file_url'] ?? null,
            'history_count' => count($settledOne['histories'] ?? []),
            'notification_link' => $settlementPaidNotification['link_url'] ?? null,
            'result' => $settledOne['status'] === 'settled'
                && $ledgerOnePaid['ledger_status'] === 'paid_out'
                && ($settledOne['settled_at'] ?? null) !== null
                && (int) ($settledOne['paid_by'] ?? 0) === (int) $admin['id']
                && ($settlementPaidNotification['link_url'] ?? null) === '#/affiliate/settlements'
                ? 'PASS'
                : 'FAIL',
        ],
        'admin_settlement_cancel' => [
            'settlement_status' => $cancelledTwo['status'],
            'ledger_status_after_cancel' => $ledgerTwoCancelled['ledger_status'],
            'ledger_settlement_id_after_cancel' => $ledgerTwoCancelled['settlement_id'] ?? null,
            'cancelled_at' => $cancelledTwo['cancelled_at'] ?? null,
            'cancelled_by' => $cancelledTwo['cancelled_by'] ?? null,
            'history_count' => count($cancelledTwo['histories'] ?? []),
            'result' => $cancelledTwo['status'] === 'cancelled'
                && $ledgerTwoCancelled['ledger_status'] === 'accrued'
                && $ledgerTwoCancelled['settlement_id'] === null
                && ($cancelledTwo['cancelled_at'] ?? null) !== null
                && (int) ($cancelledTwo['cancelled_by'] ?? 0) === (int) $admin['id']
                ? 'PASS'
                : 'FAIL',
        ],
        'affiliate_scoping' => [
            'affiliate_ledger_count' => count($scopingOther['ledgers']),
            'foreign_ledgers_visible' => count(array_filter($scopingOther['ledgers'], static fn (array $ledger): bool => (int) $ledger['affiliate_id'] !== $affiliateId)),
            'settlement_count' => count($affiliateSettlementList['settlements']),
            'eligible_ledger_count' => count($affiliateSettlementList['eligible_ledgers']),
            'result' => count(array_filter($scopingOther['ledgers'], static fn (array $ledger): bool => (int) $ledger['affiliate_id'] !== $affiliateId)) === 0
                ? 'PASS'
                : 'FAIL',
        ],
        'admin_api_service_views' => [
            'admin_ledgers_count' => count($adminLedgers['ledgers']),
            'affiliate_ledgers_count' => count($affiliateLedgers['ledgers']),
            'result' => count($adminLedgers['ledgers']) >= 1 && count($affiliateLedgers['ledgers']) >= 1 ? 'PASS' : 'FAIL',
        ],
    ];
}

function createUser(PDO $pdo, array $data): array
{
    $stmt = $pdo->prepare(
        'INSERT INTO users
            (role, name, phone_number, email, password_hash, address, account_status,
             otp_code, otp_expires_at, security_key, is_approved, created_at, updated_at, deleted_at)
         VALUES
            (:role, :name, :phone_number, :email, :password_hash, :address, :account_status,
             NULL, NULL, NULL, 1, :created_at, :updated_at, NULL)'
    );
    $now = now();
    $stmt->execute([
        'role' => $data['role'],
        'name' => $data['name'],
        'phone_number' => '628' . random_int(1000000000, 9999999999),
        'email' => $data['email'],
        'password_hash' => $data['password_hash'],
        'address' => 'UAT Affiliate Finance disposable data',
        'account_status' => 'active',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    return ['id' => (int) $pdo->lastInsertId()] + $data;
}

function createShowroom(PDO $pdo, int $sellerUserId, string $runId): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO showrooms
            (user_id, name, address, phone_number, bank_account_number, bank_type, bank_account_name, created_at, updated_at, deleted_at)
         VALUES
            (:user_id, :name, :address, :phone_number, :bank_account_number, :bank_type, :bank_account_name, :created_at, :updated_at, NULL)'
    );
    $now = now();
    $stmt->execute([
        'user_id' => $sellerUserId,
        'name' => 'UAT Affiliate Finance Showroom ' . $runId,
        'address' => 'UAT Disposable Address',
        'phone_number' => '628123456789',
        'bank_account_number' => '000' . random_int(100000, 999999),
        'bank_type' => 'BCA',
        'bank_account_name' => 'UAT Affiliate Finance Seller',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    return (int) $pdo->lastInsertId();
}

function createAffiliate(PDO $pdo, int $affiliateUserId, int $sellerUserId, string $runId): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO affiliates
            (user_id, seller_user_id, referral_code, commission_type, commission_percent,
             commission_flat, total_clicks, total_transactions, total_commission, status,
             created_at, updated_at, deleted_at)
         VALUES
            (:user_id, :seller_user_id, :referral_code, :commission_type, :commission_percent,
             :commission_flat, 0, 0, 0.00, :status, :created_at, :updated_at, NULL)'
    );
    $now = now();
    $stmt->execute([
        'user_id' => $affiliateUserId,
        'seller_user_id' => $sellerUserId,
        'referral_code' => $runId,
        'commission_type' => 'percent',
        'commission_percent' => '5.00',
        'commission_flat' => '0.00',
        'status' => 'active',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    return (int) $pdo->lastInsertId();
}

function createCommissionRule(PDO $pdo, int $sellerUserId): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO affiliate_commission_rules
            (seller_user_id, car_id, commission_type, commission_percent, commission_flat, status, created_at, updated_at, deleted_at)
         VALUES
            (:seller_user_id, NULL, :commission_type, :commission_percent, 0.00, :status, :created_at, :updated_at, NULL)'
    );
    $now = now();
    $stmt->execute([
        'seller_user_id' => $sellerUserId,
        'commission_type' => 'percent',
        'commission_percent' => '5.00',
        'status' => 'active',
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    return (int) $pdo->lastInsertId();
}

function createCar(PDO $pdo, int $sellerUserId, int $showroomId, string $suffix, int $price): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO cars
            (seller_user_id, showroom_id, listing_status, stock, license_plate_number, brand_name, model_name,
             sub_model_name, primary_color, secondary_color, color_variation, document_type, registration_date,
             transmission, engine_number, chassis_number, location_name, engine_capacity_cc, mileage_km, seat_count,
             previous_owner_count, has_service_book, key_count, description, price_cash, price_discount, price_credit,
             inspection_summary_status, published_at, created_at, updated_at, deleted_at)
         VALUES
            (:seller_user_id, :showroom_id, "published", 1, :license_plate_number, "UAT", "Affiliate Finance",
             :sub_model_name, "Putih", NULL, NULL, "new", NULL, "AT", :engine_number, :chassis_number,
             "UAT Local", 1500, 1000, 5, 1, 1, 2, :description, :price_cash, NULL, NULL,
             "not_checked", :published_at, :created_at, :updated_at, NULL)'
    );
    $now = now();
    $stmt->execute([
        'seller_user_id' => $sellerUserId,
        'showroom_id' => $showroomId,
        'license_plate_number' => strtoupper(substr($suffix, -12)),
        'sub_model_name' => $suffix,
        'engine_number' => 'ENG-' . $suffix,
        'chassis_number' => 'CHS-' . $suffix,
        'description' => 'Disposable UAT affiliate finance car ' . $suffix,
        'price_cash' => $price,
        'published_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    return (int) $pdo->lastInsertId();
}

function createTransaction(PDO $pdo, int $buyerUserId, int $sellerUserId, int $carId, int $affiliateId, string $suffix, int $price): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO transactions
            (transaction_code, buyer_user_id, seller_user_id, car_id, affiliate_id, affiliate_referral_code_snapshot,
             car_price, payment_type, dp_amount, remaining_amount, transaction_status, midtrans_order_id,
             midtrans_token, midtrans_redirect_url, expires_at, paid_at, created_at, updated_at, deleted_at)
         VALUES
            (:transaction_code, :buyer_user_id, :seller_user_id, :car_id, :affiliate_id, :affiliate_referral_code_snapshot,
             :car_price, "full", NULL, 0, "pending_payment", NULL, NULL, NULL, :expires_at, NULL, :created_at, NULL, NULL)'
    );
    $now = now();
    $stmt->execute([
        'transaction_code' => 'TRX-' . strtoupper($suffix),
        'buyer_user_id' => $buyerUserId,
        'seller_user_id' => $sellerUserId,
        'car_id' => $carId,
        'affiliate_id' => $affiliateId,
        'affiliate_referral_code_snapshot' => substr($suffix, 0, 50),
        'car_price' => $price,
        'expires_at' => date('Y-m-d H:i:s', strtotime('+1 day')),
        'created_at' => $now,
    ]);

    return (int) $pdo->lastInsertId();
}

function userById(PDO $pdo, int $id): array
{
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (! $user) {
        throw new RuntimeException('User not found: ' . $id);
    }

    return $user;
}

function ledgerByTransaction(PDO $pdo, int $transactionId): array
{
    $stmt = $pdo->prepare('SELECT * FROM affiliate_commission_ledgers WHERE transaction_id = :transaction_id AND entry_type = "accrual" AND deleted_at IS NULL ORDER BY id DESC LIMIT 1');
    $stmt->execute(['transaction_id' => $transactionId]);
    $ledger = $stmt->fetch(PDO::FETCH_ASSOC);
    if (! $ledger) {
        throw new RuntimeException('Ledger not found for transaction: ' . $transactionId);
    }

    return $ledger;
}

function ledgerById(PDO $pdo, int $ledgerId): array
{
    $stmt = $pdo->prepare('SELECT * FROM affiliate_commission_ledgers WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $ledgerId]);
    $ledger = $stmt->fetch(PDO::FETCH_ASSOC);
    if (! $ledger) {
        throw new RuntimeException('Ledger not found: ' . $ledgerId);
    }

    return $ledger;
}

function ledgerCountByTransaction(PDO $pdo, int $transactionId): int
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM affiliate_commission_ledgers WHERE transaction_id = :transaction_id AND entry_type = "accrual" AND deleted_at IS NULL');
    $stmt->execute(['transaction_id' => $transactionId]);

    return (int) $stmt->fetchColumn();
}

function notificationBySource(PDO $pdo, int $userId, string $role, string $type, string $sourceType, string $sourceId): ?array
{
    $stmt = $pdo->prepare(
        'SELECT * FROM notifications
         WHERE user_id = :user_id AND role = :role AND type = :type
         AND source_type = :source_type AND source_id = :source_id
         AND deleted_at IS NULL
         LIMIT 1'
    );
    $stmt->execute([
        'user_id' => $userId,
        'role' => $role,
        'type' => $type,
        'source_type' => $sourceType,
        'source_id' => $sourceId,
    ]);
    $notification = $stmt->fetch(PDO::FETCH_ASSOC);

    return $notification ?: null;
}

function duplicateAccruals(PDO $pdo): array
{
    $stmt = $pdo->query(
        'SELECT transaction_id, affiliate_id, COUNT(*) AS total
         FROM affiliate_commission_ledgers
         WHERE transaction_id IS NOT NULL
         AND affiliate_id IS NOT NULL
         AND entry_type = "accrual"
         GROUP BY transaction_id, affiliate_id
         HAVING COUNT(*) > 1
         LIMIT 20'
    );

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function existingColumns(PDO $pdo, string $table): array
{
    $stmt = $pdo->prepare('SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?');
    $stmt->execute([databaseName($pdo), $table]);

    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function tableExists(PDO $pdo, string $table): bool
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ? AND table_name = ?');
    $stmt->execute([databaseName($pdo), $table]);

    return (int) $stmt->fetchColumn() > 0;
}

function constraintExists(PDO $pdo, string $table, string $constraint): bool
{
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_schema = ? AND table_name = ? AND constraint_name = ?');
    $stmt->execute([databaseName($pdo), $table, $constraint]);

    return (int) $stmt->fetchColumn() > 0;
}

function indexes(PDO $pdo, string $table): array
{
    if (! tableExists($pdo, $table)) {
        return [];
    }

    $stmt = $pdo->prepare('SELECT DISTINCT index_name FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? ORDER BY index_name');
    $stmt->execute([databaseName($pdo), $table]);

    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function databaseName(PDO $pdo): string
{
    return (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
}

function splitSqlStatements(string $sql): array
{
    return array_values(array_filter(array_map('trim', explode(';', $sql)), static fn (string $statement): bool => $statement !== ''));
}

function now(): string
{
    return date('Y-m-d H:i:s');
}

function output(array $payload): void
{
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;
}
