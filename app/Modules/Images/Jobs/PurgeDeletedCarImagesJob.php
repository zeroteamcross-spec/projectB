<?php

declare(strict_types=1);

namespace App\Modules\Images\Jobs;

use App\Infrastructure\Storage\StorageServiceInterface;
use App\Modules\Images\Repositories\CarImageRepository;
use DateTimeImmutable;
use Throwable;

class PurgeDeletedCarImagesJob
{
    private CarImageRepository $images;

    private StorageServiceInterface $storage;

    private string $logPath;

    private int $retentionDays;

    private int $batchSize;

    public function __construct(
        CarImageRepository $images,
        StorageServiceInterface $storage,
        ?string $logPath = null,
        int $retentionDays = 30,
        int $batchSize = 100
    ) {
        $this->images = $images;
        $this->storage = $storage;
        $this->logPath = $logPath ?? (string) config('storage.cleanup_log_path', base_path('storage/logs/car_images_cleanup.log'));
        $this->retentionDays = max(1, (int) config('storage.deleted_image_retention_days', $retentionDays));
        $this->batchSize = max(1, $batchSize);
    }

    public function run(?int $retentionDays = null, ?int $batchSize = null): array
    {
        $retentionDays = max(1, $retentionDays ?? $this->retentionDays);
        $batchSize = max(1, $batchSize ?? $this->batchSize);
        $cutoff = (new DateTimeImmutable('-' . $retentionDays . ' days'))->format('Y-m-d H:i:s');
        $images = $this->images->softDeletedBefore($cutoff, $batchSize);
        $summary = [
            'retention_days' => $retentionDays,
            'cutoff' => $cutoff,
            'scanned' => count($images),
            'purged' => 0,
            'missing' => 0,
            'failed' => 0,
            'results' => [],
        ];

        foreach ($images as $image) {
            $result = $this->purgeImage($image);
            $summary[$result['status']]++;
            $summary['results'][] = $result;
            $this->writeLog($result + [
                'retention_days' => $retentionDays,
                'cutoff' => $cutoff,
            ]);
        }

        return $summary;
    }

    private function purgeImage(array $image): array
    {
        $result = [
            'logged_at' => date('Y-m-d H:i:s'),
            'image_id' => (int) $image['id'],
            'car_id' => (int) $image['car_id'],
            'file_path' => $image['file_path'],
            'deleted_at' => $image['deleted_at'],
            'status' => 'purged',
            'message' => 'Deleted physical file for soft-deleted car image.',
        ];

        try {
            if (! $this->storage->delete((string) $image['file_path'])) {
                $result['status'] = 'missing';
                $result['message'] = 'Physical file was already missing.';
            }
        } catch (Throwable $exception) {
            $result['status'] = 'failed';
            $result['message'] = $exception->getMessage();
        }

        return $result;
    }

    private function writeLog(array $entry): void
    {
        $directory = dirname($this->logPath);

        if (! is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        file_put_contents(
            $this->logPath,
            json_encode($entry, JSON_UNESCAPED_SLASHES) . PHP_EOL,
            FILE_APPEND | LOCK_EX
        );
    }
}
