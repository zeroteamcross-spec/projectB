<?php

declare(strict_types=1);

namespace App\Modules\Images\Services;

use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Infrastructure\Storage\StorageServiceInterface;
use App\Modules\Images\Mappers\CarImageMapper;
use App\Modules\Images\Policies\CarImagePolicy;
use App\Modules\Images\Repositories\CarImageRepository;
use PDO;
use Throwable;

class CarImageService
{
    private PDO $pdo;

    private CarImageRepository $images;

    private StorageServiceInterface $storage;

    public function __construct(PDO $pdo, CarImageRepository $images, StorageServiceInterface $storage)
    {
        $this->pdo = $pdo;
        $this->images = $images;
        $this->storage = $storage;
    }

    public function listByCar(int $carId, ?array $user): array
    {
        $car = $this->requireCar($carId);
        CarImagePolicy::ensureCanViewCarImages($user, $car);

        return CarImageMapper::many($this->images->listByCar($carId));
    }

    public function upload(int $carId, array $user, array $payload): array
    {
        $car = $this->requireCar($carId);
        CarImagePolicy::ensureCanManageCarImages($user, $car);
        $stored = $this->storage->storeUploadedFile($payload['image'], 'cars/' . $carId);

        try {
            $this->pdo->beginTransaction();

            if ((bool) $payload['is_cover']) {
                $this->images->clearCover($carId);
            }

            $imageId = $this->images->create([
                'car_id' => $carId,
                'user_id' => (int) $user['id'],
                'file_path' => $stored['file_path'],
                'file_name' => $stored['file_name'],
                'file_size' => (int) ($payload['image']['size'] ?? 0),
                'mime_type' => $payload['mime_type'],
                'sort_order' => $this->images->nextSortOrder($carId),
                'is_cover' => (bool) $payload['is_cover'] ? 1 : 0,
                'created_at' => date('Y-m-d H:i:s'),
            ]);

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            $this->storage->delete($stored['file_path']);
            throw $exception;
        }

        return $this->findImage($imageId);
    }

    public function setCover(int $carId, int $imageId, array $user): array
    {
        $car = $this->requireCar($carId);
        CarImagePolicy::ensureCanManageCarImages($user, $car);
        $image = $this->findImage($imageId);

        if ((int) $image['car_id'] !== $carId) {
            throw new NotFoundException('Gambar mobil tidak ditemukan.');
        }

        try {
            $this->pdo->beginTransaction();
            $this->images->clearCover($carId);
            $this->images->setCover($imageId);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return $this->findImage($imageId);
    }

    public function reorder(int $carId, array $user, array $items): array
    {
        $car = $this->requireCar($carId);
        CarImagePolicy::ensureCanManageCarImages($user, $car);

        if ($items === []) {
            throw new ValidationException([
                'items' => 'Daftar urutan gambar wajib diisi.',
            ]);
        }

        $existing = $this->images->listByCar($carId);
        $existingIds = array_map(static fn (array $image): int => (int) $image['id'], $existing);
        $seen = [];

        try {
            $this->pdo->beginTransaction();

            foreach ($items as $index => $item) {
                $imageId = (int) ($item['id'] ?? 0);
                if ($imageId < 1 || ! in_array($imageId, $existingIds, true) || in_array($imageId, $seen, true)) {
                    throw new ValidationException([
                        'items' => 'Payload urutan gambar tidak valid.',
                    ]);
                }

                $seen[] = $imageId;
                $sortOrder = array_key_exists('sort_order', $item) ? (int) $item['sort_order'] : $index;
                $this->images->updateSortOrder($imageId, max(0, $sortOrder));
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return CarImageMapper::many($this->images->listByCar($carId));
    }

    public function delete(int $carId, int $imageId, array $user): array
    {
        $car = $this->requireCar($carId);
        CarImagePolicy::ensureCanManageCarImages($user, $car);
        $image = $this->findImage($imageId);

        if ((int) $image['car_id'] !== $carId) {
            throw new NotFoundException('Gambar mobil tidak ditemukan.');
        }

        $this->images->softDelete($imageId);

        return [
            'id' => $imageId,
            'deleted_at' => date('Y-m-d H:i:s'),
        ];
    }

    private function requireCar(int $carId): array
    {
        $car = $this->images->carOwner($carId);

        if (! $car) {
            throw new NotFoundException('Mobil tidak ditemukan.');
        }

        return $car;
    }

    private function findImage(int $imageId): array
    {
        $image = $this->images->findById($imageId);

        if (! $image) {
            throw new NotFoundException('Gambar mobil tidak ditemukan.');
        }

        return CarImageMapper::toArray($image);
    }
}
