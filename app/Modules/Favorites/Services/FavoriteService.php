<?php

declare(strict_types=1);

namespace App\Modules\Favorites\Services;

use App\Core\Exceptions\NotFoundException;
use App\Modules\Cars\Mappers\CarMapper;
use App\Modules\Cars\Repositories\CarRepository;
use App\Modules\Favorites\Policies\FavoritePolicy;
use App\Modules\Favorites\Repositories\FavoriteRepository;

class FavoriteService
{
    private FavoriteRepository $favorites;

    private CarRepository $cars;

    private FavoritePolicy $policy;

    public function __construct(
        FavoriteRepository $favorites,
        CarRepository $cars,
        FavoritePolicy $policy
    ) {
        $this->favorites = $favorites;
        $this->cars = $cars;
        $this->policy = $policy;
    }

    public function list(array $user): array
    {
        $this->policy->ensureCanManage($user);

        return $this->currentState((int) $user['id']);
    }

    public function add(array $user, int $carId): array
    {
        $this->policy->ensureCanManage($user);
        $this->assertCarIsFavoritable($carId);
        $this->favorites->add((int) $user['id'], $carId);

        return $this->currentState((int) $user['id']);
    }

    public function remove(array $user, int $carId): array
    {
        $this->policy->ensureCanManage($user);
        $this->favorites->remove((int) $user['id'], $carId);

        return $this->currentState((int) $user['id']);
    }

    /**
     * Favorited car ids stay in the table even when a car leaves the catalog,
     * but only cars that are still published are returned to the buyer.
     */
    private function currentState(int $userId): array
    {
        $favoriteCarIds = $this->favorites->activeCarIds($userId);
        $cars = $this->cars->listByIds($favoriteCarIds, ['listing_status' => 'published']);
        $carsById = [];

        foreach ($cars as $car) {
            $carsById[(int) $car['id']] = $car;
        }

        $ordered = [];

        foreach ($favoriteCarIds as $carId) {
            if (isset($carsById[$carId])) {
                $ordered[] = $carsById[$carId];
            }
        }

        return [
            'cars' => CarMapper::many($ordered),
            'car_ids' => $favoriteCarIds,
            'total' => count($ordered),
        ];
    }

    private function assertCarIsFavoritable(int $carId): void
    {
        $car = $this->cars->findById($carId);

        if (! $car || ($car['listing_status'] ?? null) !== 'published') {
            throw new NotFoundException('Mobil tidak ditemukan atau belum tayang.');
        }
    }
}
