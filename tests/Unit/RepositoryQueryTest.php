<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Modules\Cars\Repositories\CarRepository;
use App\Modules\MasterData\Repositories\MasterDataRepository;
use App\Modules\Transactions\Repositories\TransactionRepository;
use Tests\TestCase;

class RepositoryQueryTest extends TestCase
{
    public function run(): void
    {
        $this->carRepositoryFiltersPublishedCatalogRows();
        $this->transactionRepositoryFindsTransactionByPaymentLogProviderOrderId();
        $this->masterDataUpdateTargetsSingleRowById();
    }

    private function carRepositoryFiltersPublishedCatalogRows(): void
    {
        $pdo = $this->sqlite();
        $this->createCarsTable($pdo);
        $pdo->exec("INSERT INTO cars
            (id, seller_user_id, showroom_id, listing_status, stock, brand_name, model_name,
             sub_model_name, primary_color, secondary_color, color_variation, document_type,
             registration_date, transmission, engine_number, chassis_number, location_name,
             engine_capacity_cc, mileage_km, seat_count, previous_owner_count, has_service_book,
             key_count, description, youtube_url, price_cash, price_discount, price_credit,
             inspection_summary_status, published_at, created_at, updated_at, deleted_at)
            VALUES
            (1, 7, NULL, 'published', 1, 'Toyota', 'Avanza', NULL, NULL, NULL, NULL, NULL,
             NULL, 'automatic', NULL, NULL, 'Jakarta', NULL, NULL, NULL, NULL, 0, 1, NULL,
             NULL, 150000000, NULL, NULL, 'not_checked', NULL, '2026-01-01 00:00:00', NULL, NULL),
            (2, 7, NULL, 'draft', 1, 'Toyota', 'Yaris', NULL, NULL, NULL, NULL, NULL,
             NULL, 'manual', NULL, NULL, 'Bandung', NULL, NULL, NULL, NULL, 0, 1, NULL,
             NULL, 120000000, NULL, NULL, 'not_checked', NULL, '2026-01-01 00:00:00', NULL, NULL),
            (3, 8, NULL, 'published', 1, 'Honda', 'Brio', NULL, NULL, NULL, NULL, NULL,
             NULL, 'manual', NULL, NULL, 'Jakarta', NULL, NULL, NULL, NULL, 0, 1, NULL,
             NULL, 100000000, NULL, NULL, 'not_checked', NULL, '2026-01-01 00:00:00', NULL, '2026-01-02 00:00:00')");

        $repository = new CarRepository($pdo);
        $rows = $repository->list(['listing_status' => 'published', 'keyword' => 'avan'], 10, 0);

        $this->assertSame(1, count($rows));
        $this->assertSame('Avanza', $rows[0]['model_name']);
        $this->assertSame(1, $repository->count(['listing_status' => 'published']));
    }

    private function transactionRepositoryFindsTransactionByPaymentLogProviderOrderId(): void
    {
        $pdo = $this->sqlite();
        $this->createTransactionTables($pdo);
        $pdo->exec("INSERT INTO users (id, role, name, email, deleted_at) VALUES
            (1, 'buyer', 'Buyer', 'buyer@example.test', NULL),
            (2, 'seller', 'Seller', 'seller@example.test', NULL)");
        $pdo->exec("INSERT INTO cars (id, seller_user_id, listing_status, brand_name, model_name, deleted_at)
            VALUES (10, 2, 'published', 'Toyota', 'Avanza', NULL)");
        $pdo->exec("INSERT INTO transactions
            (id, transaction_code, buyer_user_id, seller_user_id, car_id, car_price, payment_type,
             dp_amount, remaining_amount, transaction_status, midtrans_order_id, midtrans_token,
             midtrans_redirect_url, expires_at, paid_at, created_at, updated_at, deleted_at)
            VALUES
            (99, 'TRX-001', 1, 2, 10, 150000000, 'full', NULL, 0, 'pending_payment',
             NULL, NULL, NULL, NULL, NULL, '2026-01-01 00:00:00', NULL, NULL)");
        $pdo->exec("INSERT INTO transaction_payment_logs
            (id, transaction_id, provider_name, provider_order_id, logged_at, created_at)
            VALUES (5, 99, 'midtrans', 'MID-ORDER-001', '2026-01-01 00:00:00', '2026-01-01 00:00:00')");

        $transaction = (new TransactionRepository($pdo))->findByProviderOrderId('MID-ORDER-001');

        $this->assertNotNull($transaction);
        $this->assertSame(99, (int) $transaction['id']);
        $this->assertSame('TRX-001', $transaction['transaction_code']);
    }

    private function masterDataUpdateTargetsSingleRowById(): void
    {
        $pdo = $this->sqlite();
        $pdo->exec('CREATE TABLE master_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            master_key TEXT NOT NULL,
            data_json TEXT NOT NULL,
            api_version_id INTEGER NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE api_versions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            resource_name TEXT NOT NULL,
            display_name TEXT NULL,
            version_number INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NULL
        )');
        $pdo->exec("INSERT INTO master_data (id, master_key, data_json, api_version_id, created_at, deleted_at)
            VALUES
            (1, 'colors', '{\"items\":[\"red\"]}', NULL, '2026-01-01 00:00:00', NULL),
            (2, 'colors', '{\"items\":[\"blue\"]}', NULL, '2026-01-01 00:00:00', NULL)");

        $repository = new MasterDataRepository($pdo);
        $repository->update(1, ['items' => ['green']], null);

        $rows = $pdo->query('SELECT id, data_json FROM master_data ORDER BY id')->fetchAll();

        $this->assertSame('{"items":["green"]}', $rows[0]['data_json']);
        $this->assertSame('{"items":["blue"]}', $rows[1]['data_json']);
    }

    private function createCarsTable(\PDO $pdo): void
    {
        $pdo->exec('CREATE TABLE cars (
            id INTEGER PRIMARY KEY,
            seller_user_id INTEGER, showroom_id INTEGER NULL, listing_status TEXT, stock INTEGER,
            license_plate_number TEXT NULL, brand_name TEXT, model_name TEXT, sub_model_name TEXT NULL,
            primary_color TEXT NULL, secondary_color TEXT NULL, color_variation TEXT NULL,
            document_type TEXT NULL, registration_date TEXT NULL, transmission TEXT NULL,
            engine_number TEXT NULL, chassis_number TEXT NULL, location_name TEXT NULL,
            engine_capacity_cc INTEGER NULL, mileage_km INTEGER NULL, seat_count INTEGER NULL,
            previous_owner_count INTEGER NULL, has_service_book INTEGER, key_count INTEGER,
            description TEXT NULL, youtube_url TEXT NULL, price_cash INTEGER NULL, price_discount INTEGER NULL,
            price_credit INTEGER NULL,
            dp_amount INTEGER NULL, inspection_summary_status TEXT, published_at TEXT NULL,
            created_at TEXT, updated_at TEXT NULL, deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE car_images (
            id INTEGER PRIMARY KEY,
            car_id INTEGER,
            file_path TEXT,
            is_cover INTEGER,
            sort_order INTEGER,
            deleted_at TEXT NULL
        )');
    }

    private function createTransactionTables(\PDO $pdo): void
    {
        $pdo->exec('CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            role TEXT,
            name TEXT,
            email TEXT,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE cars (
            id INTEGER PRIMARY KEY,
            seller_user_id INTEGER,
            showroom_id INTEGER NULL,
            listing_status TEXT,
            brand_name TEXT,
            model_name TEXT,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE car_images (
            id INTEGER PRIMARY KEY,
            car_id INTEGER,
            file_path TEXT,
            is_cover INTEGER,
            sort_order INTEGER,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE transactions (
            id INTEGER PRIMARY KEY,
            transaction_code TEXT,
            buyer_user_id INTEGER,
            seller_user_id INTEGER,
            car_id INTEGER,
            car_price INTEGER,
            payment_type TEXT,
            payment_method TEXT NULL,
            dp_amount INTEGER NULL,
            remaining_amount INTEGER NULL,
            transaction_status TEXT,
            affiliate_id INTEGER NULL,
            affiliate_referral_code_snapshot TEXT NULL,
            midtrans_order_id TEXT NULL,
            midtrans_token TEXT NULL,
            midtrans_redirect_url TEXT NULL,
            expires_at TEXT NULL,
            paid_at TEXT NULL,
            returned_at TEXT NULL,
            return_reason TEXT NULL,
            manual_transfer_proof_path TEXT NULL,
            manual_transfer_note TEXT NULL,
            manual_transfer_submitted_at TEXT NULL,
            manual_transfer_confirmed_at TEXT NULL,
            manual_transfer_confirmed_by INTEGER NULL,
            manual_transfer_rejected_at TEXT NULL,
            manual_transfer_rejected_reason TEXT NULL,
            created_at TEXT,
            updated_at TEXT NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE showrooms (
            id INTEGER PRIMARY KEY,
            name TEXT NULL,
            bank_account_number TEXT NULL,
            bank_type TEXT NULL,
            bank_account_name TEXT NULL
        )');
        $pdo->exec('CREATE TABLE transaction_payment_logs (
            id INTEGER PRIMARY KEY,
            transaction_id INTEGER,
            provider_name TEXT,
            provider_order_id TEXT NULL,
            provider_transaction_id TEXT NULL,
            payment_method TEXT NULL,
            transaction_status TEXT NULL,
            gross_amount INTEGER NULL,
            logged_at TEXT,
            created_at TEXT
        )');
        $pdo->exec('CREATE TABLE affiliates (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            seller_user_id INTEGER,
            referral_code TEXT,
            status TEXT
        )');
    }
}
