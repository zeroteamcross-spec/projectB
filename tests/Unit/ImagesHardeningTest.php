<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\ValidationException;
use App\Core\Request;
use App\Modules\Images\Policies\CarImagePolicy;
use App\Modules\Images\Jobs\PurgeDeletedCarImagesJob;
use App\Modules\Images\Repositories\CarImageRepository;
use App\Modules\Images\Requests\UploadCarImageRequest;
use App\Infrastructure\Storage\StorageServiceInterface;
use DateTimeImmutable;
use Tests\TestCase;

class ImagesHardeningTest extends TestCase
{
    public function run(): void
    {
        $this->sellerCanManageOnlyOwnedCarImages();
        $this->adminCanManageEveryCarImage();
        $this->publicCanViewPublishedCarImagesOnly();
        $this->uploadRequiresFile();
        $this->uploadRejectsOversizedFile();
        $this->cleanupPurgesOnlyExpiredSoftDeletedFiles();
    }

    private function sellerCanManageOnlyOwnedCarImages(): void
    {
        CarImagePolicy::ensureCanManageCarImages([
            'id' => 7,
            'role' => 'seller',
        ], [
            'id' => 10,
            'seller_user_id' => 7,
            'listing_status' => 'draft',
        ]);

        $this->expectException(ForbiddenException::class, static function (): void {
            CarImagePolicy::ensureCanManageCarImages([
                'id' => 8,
                'role' => 'seller',
            ], [
                'id' => 10,
                'seller_user_id' => 7,
                'listing_status' => 'draft',
            ]);
        });
    }

    private function adminCanManageEveryCarImage(): void
    {
        CarImagePolicy::ensureCanManageCarImages([
            'id' => 1,
            'role' => 'admin',
        ], [
            'id' => 10,
            'seller_user_id' => 7,
            'listing_status' => 'draft',
        ]);

        $this->assertTrue(true);
    }

    private function publicCanViewPublishedCarImagesOnly(): void
    {
        CarImagePolicy::ensureCanViewCarImages(null, [
            'id' => 10,
            'seller_user_id' => 7,
            'listing_status' => 'published',
        ]);

        $this->expectException(ForbiddenException::class, static function (): void {
            CarImagePolicy::ensureCanViewCarImages(null, [
                'id' => 10,
                'seller_user_id' => 7,
                'listing_status' => 'draft',
            ]);
        });
    }

    private function uploadRequiresFile(): void
    {
        $request = new Request('POST', '/api/cars/1/images', '/api/cars/1/images');

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new UploadCarImageRequest($request))->validate();
        }, 'image');
    }

    private function uploadRejectsOversizedFile(): void
    {
        $request = new Request('POST', '/api/cars/1/images', '/api/cars/1/images', [], [], [], [
            'image' => [
                'name' => 'car.jpg',
                'type' => 'image/jpeg',
                'tmp_name' => __FILE__,
                'error' => UPLOAD_ERR_OK,
                'size' => 5242881,
            ],
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new UploadCarImageRequest($request))->validate();
        }, 'image');
    }

    private function cleanupPurgesOnlyExpiredSoftDeletedFiles(): void
    {
        $pdo = $this->sqlite();
        $oldDeletedAt = (new DateTimeImmutable('-60 days'))->format('Y-m-d H:i:s');
        $recentDeletedAt = (new DateTimeImmutable('-5 days'))->format('Y-m-d H:i:s');
        $pdo->exec('CREATE TABLE car_images (
            id INTEGER PRIMARY KEY,
            car_id INTEGER,
            user_id INTEGER,
            file_path TEXT,
            file_name TEXT NULL,
            file_size INTEGER NULL,
            mime_type TEXT NULL,
            sort_order INTEGER,
            is_cover INTEGER,
            created_at TEXT,
            updated_at TEXT NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec("INSERT INTO car_images
            (id, car_id, user_id, file_path, file_name, file_size, mime_type, sort_order, is_cover, created_at, updated_at, deleted_at)
            VALUES
            (1, 10, 7, '/storage/uploads/cars/10/old.jpg', 'old.jpg', 10, 'image/jpeg', 0, 0, '2026-01-01 00:00:00', NULL, '{$oldDeletedAt}'),
            (2, 10, 7, '/storage/uploads/cars/10/recent.jpg', 'recent.jpg', 10, 'image/jpeg', 1, 0, '2026-04-10 00:00:00', NULL, '{$recentDeletedAt}'),
            (3, 10, 7, '/storage/uploads/cars/10/active.jpg', 'active.jpg', 10, 'image/jpeg', 2, 0, '2026-01-01 00:00:00', NULL, NULL)");

        $logPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'car_images_cleanup_' . bin2hex(random_bytes(4)) . '.log';
        $storage = new FakeCleanupStorage([
            '/storage/uploads/cars/10/old.jpg' => true,
        ]);
        $job = new PurgeDeletedCarImagesJob(new CarImageRepository($pdo), $storage, $logPath, 30, 100);
        $summary = $job->run(30, 100);

        $this->assertSame(1, $summary['scanned']);
        $this->assertSame(1, $summary['purged']);
        $this->assertSame(['/storage/uploads/cars/10/old.jpg'], $storage->deleted);
        $this->assertSame(3, (int) $pdo->query('SELECT COUNT(*) AS total FROM car_images')->fetch()['total']);
        $this->assertTrue(is_file($logPath), 'Cleanup job should write a log file.');

        unlink($logPath);
    }
}

class FakeCleanupStorage implements StorageServiceInterface
{
    public array $deleted = [];

    private array $existing;

    public function __construct(array $existing)
    {
        $this->existing = $existing;
    }

    public function storeUploadedFile(array $file, string $directory): array
    {
        return [];
    }

    public function delete(string $relativePath): bool
    {
        $this->deleted[] = $relativePath;

        return (bool) ($this->existing[$relativePath] ?? false);
    }
}
