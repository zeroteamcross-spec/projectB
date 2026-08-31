<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Core\Request;
use App\Modules\Cars\Repositories\CarRepository;
use App\Modules\Favorites\Policies\FavoritePolicy;
use App\Modules\Favorites\Repositories\FavoriteRepository;
use App\Modules\Favorites\Requests\StoreFavoriteRequest;
use App\Modules\Favorites\Services\FavoriteService;
use PDO;
use Tests\TestCase;

class FavoritesTest extends TestCase
{
    public function run(): void
    {
        $this->onlyBuyersCanManageFavorites();
        $this->storeRequestRequiresPositiveCarId();
        $this->addingAndRemovingKeepsOneRowPerPair();
        $this->serviceReturnsFavoritedCarsNewestFirst();
        $this->serviceHidesFavoritesThatLeftTheCatalog();
        $this->serviceRejectsCarThatIsNotPublished();
    }

    private function onlyBuyersCanManageFavorites(): void
    {
        $policy = new FavoritePolicy();
        $policy->ensureCanManage(['id' => 1, 'role' => 'buyer']);

        foreach (['seller', 'admin', 'super_admin', 'affiliate_admin', null] as $role) {
            $this->expectException(ForbiddenException::class, static function () use ($policy, $role): void {
                $policy->ensureCanManage(['id' => 1, 'role' => $role]);
            });
        }
    }

    private function storeRequestRequiresPositiveCarId(): void
    {
        $missing = new Request('POST', '/api/favorites', '/api/favorites', [], []);
        $this->expectException(ValidationException::class, static function () use ($missing): void {
            (new StoreFavoriteRequest($missing))->validate();
        }, 'car_id');

        $zero = new Request('POST', '/api/favorites', '/api/favorites', [], ['car_id' => 0]);
        $this->expectException(ValidationException::class, static function () use ($zero): void {
            (new StoreFavoriteRequest($zero))->validate();
        }, 'car_id');

        $valid = new Request('POST', '/api/favorites', '/api/favorites', [], ['car_id' => 12]);
        $this->assertSame(12, (int) (new StoreFavoriteRequest($valid))->validate()['car_id']);
    }

    private function addingAndRemovingKeepsOneRowPerPair(): void
    {
        $pdo = $this->sqlite();
        $this->createFavoritesTable($pdo);
        $repository = new FavoriteRepository($pdo);

        $repository->add(1, 10);
        $repository->add(1, 10);
        $this->assertSame(1, $this->countRows($pdo));
        $this->assertTrue($repository->isFavorited(1, 10));

        $repository->remove(1, 10);
        $this->assertSame(1, $this->countRows($pdo), 'Un-favoriting must soft delete, not drop the row.');
        $this->assertTrue(! $repository->isFavorited(1, 10));
        $this->assertSame([], $repository->activeCarIds(1));

        $repository->add(1, 10);
        $this->assertSame(1, $this->countRows($pdo), 'Re-favoriting must revive the existing row.');
        $this->assertSame([10], $repository->activeCarIds(1));
    }

    private function serviceReturnsFavoritedCarsNewestFirst(): void
    {
        [$pdo, $service] = $this->makeService();
        $pdo->exec("INSERT INTO car_favorites (user_id, car_id, created_at, updated_at, deleted_at) VALUES
            (1, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00', NULL),
            (1, 2, '2026-01-02 00:00:00', '2026-01-02 00:00:00', NULL),
            (2, 1, '2026-01-03 00:00:00', '2026-01-03 00:00:00', NULL)");

        $state = $service->list(['id' => 1, 'role' => 'buyer']);

        $this->assertSame([2, 1], $state['car_ids'], 'Most recently favorited car comes first.');
        $this->assertSame(2, $state['total']);
        $this->assertSame('Yaris', $state['cars'][0]['model_name']);
        $this->assertSame('Avanza', $state['cars'][1]['model_name']);

        $other = $service->list(['id' => 2, 'role' => 'buyer']);
        $this->assertSame([1], $other['car_ids'], 'Favorites are scoped per user.');
    }

    private function serviceHidesFavoritesThatLeftTheCatalog(): void
    {
        [$pdo, $service] = $this->makeService();
        $pdo->exec("INSERT INTO car_favorites (user_id, car_id, created_at, updated_at, deleted_at) VALUES
            (1, 1, '2026-01-01 00:00:00', '2026-01-01 00:00:00', NULL),
            (1, 3, '2026-01-02 00:00:00', '2026-01-02 00:00:00', NULL)");

        $state = $service->list(['id' => 1, 'role' => 'buyer']);

        $this->assertSame([3, 1], $state['car_ids'], 'The favorite row is kept even when the car is unpublished.');
        $this->assertSame(1, $state['total'], 'Only published cars are rendered.');
        $this->assertSame('Avanza', $state['cars'][0]['model_name']);
    }

    private function serviceRejectsCarThatIsNotPublished(): void
    {
        [, $service] = $this->makeService();
        $buyer = ['id' => 1, 'role' => 'buyer'];

        $this->expectException(NotFoundException::class, static function () use ($service, $buyer): void {
            $service->add($buyer, 3);
        });

        $this->expectException(NotFoundException::class, static function () use ($service, $buyer): void {
            $service->add($buyer, 999);
        });

        $state = $service->add($buyer, 1);
        $this->assertSame([1], $state['car_ids']);
    }

    /**
     * @return array{0: PDO, 1: FavoriteService}
     */
    private function makeService(): array
    {
        $pdo = $this->sqlite();
        $this->createFavoritesTable($pdo);
        $this->createCarsTable($pdo);
        $pdo->exec("INSERT INTO cars
            (id, seller_user_id, showroom_id, listing_status, stock, brand_name, model_name,
             has_service_book, key_count, price_cash, inspection_summary_status, created_at, deleted_at)
            VALUES
            (1, 7, 5, 'published', 1, 'Toyota', 'Avanza', 0, 1, 150000000, 'not_checked', '2026-01-01 00:00:00', NULL),
            (2, 7, 5, 'published', 1, 'Toyota', 'Yaris', 0, 1, 120000000, 'not_checked', '2026-01-01 00:00:00', NULL),
            (3, 8, 6, 'draft', 1, 'Honda', 'Brio', 0, 1, 100000000, 'not_checked', '2026-01-01 00:00:00', NULL)");

        $service = new FavoriteService(
            new FavoriteRepository($pdo),
            new CarRepository($pdo),
            new FavoritePolicy()
        );

        return [$pdo, $service];
    }

    private function countRows(PDO $pdo): int
    {
        return (int) $pdo->query('SELECT COUNT(*) FROM car_favorites')->fetchColumn();
    }

    private function createFavoritesTable(PDO $pdo): void
    {
        $pdo->exec('CREATE TABLE car_favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            car_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NULL,
            deleted_at TEXT NULL,
            UNIQUE (user_id, car_id)
        )');
    }

    private function createCarsTable(PDO $pdo): void
    {
        $pdo->exec('CREATE TABLE cars (
            id INTEGER PRIMARY KEY,
            seller_user_id INTEGER NOT NULL,
            showroom_id INTEGER NULL,
            listing_status TEXT NOT NULL,
            stock INTEGER NOT NULL DEFAULT 0,
            license_plate_number TEXT NULL,
            brand_name TEXT NULL,
            model_name TEXT NULL,
            sub_model_name TEXT NULL,
            primary_color TEXT NULL,
            secondary_color TEXT NULL,
            color_variation TEXT NULL,
            document_type TEXT NULL,
            registration_date TEXT NULL,
            transmission TEXT NULL,
            engine_number TEXT NULL,
            chassis_number TEXT NULL,
            location_name TEXT NULL,
            engine_capacity_cc INTEGER NULL,
            mileage_km INTEGER NULL,
            seat_count INTEGER NULL,
            previous_owner_count INTEGER NULL,
            has_service_book INTEGER NOT NULL DEFAULT 0,
            key_count INTEGER NOT NULL DEFAULT 0,
            description TEXT NULL,
            youtube_url TEXT NULL,
            price_cash INTEGER NULL,
            price_discount INTEGER NULL,
            price_credit INTEGER NULL,
            dp_amount INTEGER NULL,
            inspection_summary_status TEXT NULL,
            published_at TEXT NULL,
            external_sale_note TEXT NULL,
            external_sale_marked_at TEXT NULL,
            external_sale_marked_by INTEGER NULL,
            created_at TEXT NULL,
            updated_at TEXT NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE car_images (
            id INTEGER PRIMARY KEY,
            car_id INTEGER NOT NULL,
            file_path TEXT NULL,
            is_cover INTEGER NOT NULL DEFAULT 0,
            sort_order INTEGER NOT NULL DEFAULT 0,
            deleted_at TEXT NULL
        )');
    }
}
