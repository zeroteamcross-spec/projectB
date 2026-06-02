<?php

declare(strict_types=1);

$pdo = new PDO('mysql:host=localhost;port=3306;dbname=projectb_app', 'root', 'qwerty123');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$now = date('Y-m-d H:i:s');

$pendingSellerId = ensurePendingSeller($pdo, $now);
$settlementBatchId = ensureSettlementBatch($pdo, $now);

echo json_encode([
    'success' => true,
    'data' => [
        'pending_seller_id' => $pendingSellerId,
        'settlement_batch_id' => $settlementBatchId,
    ],
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . PHP_EOL;

function ensurePendingSeller(PDO $pdo, string $now): int
{
    $email = 'pending-seller@projectb.local';
    $hash = password_hash('SmokePass123!', PASSWORD_DEFAULT);

    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $id = $stmt->fetchColumn();

    if ($id) {
        $stmt = $pdo->prepare(
            'UPDATE users
             SET role = :role,
                 name = :name,
                 phone_number = :phone_number,
                 email = :email,
                 password_hash = :password_hash,
                 address = :address,
                 account_status = :account_status,
                 is_approved = :is_approved,
                 updated_at = :updated_at,
                 deleted_at = NULL
             WHERE id = :id'
        );
        $stmt->execute([
            'role' => 'seller',
            'name' => 'Pending Seller Review',
            'phone_number' => '080000000099',
            'email' => $email,
            'password_hash' => $hash,
            'address' => 'Pending queue test',
            'account_status' => 'pending',
            'is_approved' => 0,
            'updated_at' => $now,
            'id' => $id,
        ]);

        return (int) $id;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO users
            (role, name, phone_number, email, password_hash, address, account_status,
             is_approved, created_at, updated_at, deleted_at)
         VALUES
            (:role, :name, :phone_number, :email, :password_hash, :address, :account_status,
             :is_approved, :created_at, :updated_at, NULL)'
    );
    $stmt->execute([
        'role' => 'seller',
        'name' => 'Pending Seller Review',
        'phone_number' => '080000000099',
        'email' => $email,
        'password_hash' => $hash,
        'address' => 'Pending queue test',
        'account_status' => 'pending',
        'is_approved' => 0,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    return (int) $pdo->lastInsertId();
}

function ensureSettlementBatch(PDO $pdo, string $now): ?int
{
    $ledger = $pdo->query('SELECT id, affiliate_id, commission_amount FROM affiliate_commission_ledgers ORDER BY id DESC LIMIT 1')
        ->fetch(PDO::FETCH_ASSOC);

    if (!$ledger) {
        return null;
    }

    $stmt = $pdo->prepare('SELECT id FROM affiliate_settlement_batches WHERE affiliate_id = :affiliate_id ORDER BY id DESC LIMIT 1');
    $stmt->execute(['affiliate_id' => $ledger['affiliate_id']]);
    $existing = $stmt->fetchColumn();

    if ($existing) {
        return (int) $existing;
    }

    $stmt = $pdo->prepare(
        'INSERT INTO affiliate_settlement_batches
            (affiliate_id, requested_amount, ledger_count, status, notes, requested_at, created_at, updated_at)
         VALUES
            (:affiliate_id, :requested_amount, :ledger_count, :status, :notes, :requested_at, :created_at, :updated_at)'
    );
    $stmt->execute([
        'affiliate_id' => $ledger['affiliate_id'],
        'requested_amount' => $ledger['commission_amount'],
        'ledger_count' => 1,
        'status' => 'pending',
        'notes' => 'Viewport verification batch',
        'requested_at' => $now,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    $batchId = (int) $pdo->lastInsertId();

    $stmt = $pdo->prepare(
        'INSERT INTO affiliate_settlement_items
            (settlement_batch_id, ledger_id, amount_snapshot, created_at)
         VALUES
            (:settlement_batch_id, :ledger_id, :amount_snapshot, :created_at)'
    );
    $stmt->execute([
        'settlement_batch_id' => $batchId,
        'ledger_id' => $ledger['id'],
        'amount_snapshot' => $ledger['commission_amount'],
        'created_at' => $now,
    ]);

    return $batchId;
}
