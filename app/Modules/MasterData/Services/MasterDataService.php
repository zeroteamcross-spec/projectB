<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Services;

use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Modules\ApiVersion\Repositories\ApiVersionRepository;
use App\Modules\ApiVersion\Services\ApiVersionService;
use App\Modules\MasterData\Repositories\MasterDataRepository;
use PDO;
use Throwable;

class MasterDataService
{
    private const RELATIONAL_KEYS = [
        'users',
        'showrooms',
        'cars',
        'car_images',
        'inspection_templates',
        'inspection_reports',
        'inspection_report_items',
        'transactions',
        'transaction_payment_logs',
        'affiliates',
        'affiliate_click_logs',
        'affiliate_commission_ledgers',
    ];

    private PDO $pdo;

    private MasterDataRepository $masters;

    private ApiVersionService $versions;

    public function __construct(PDO $pdo, MasterDataRepository $masters, ApiVersionService $versions)
    {
        $this->pdo = $pdo;
        $this->masters = $masters;
        $this->versions = $versions;
    }

    public function get(string $masterKey): array
    {
        $master = $this->masters->findByKey($this->normalizeKey($masterKey));

        if (! $master) {
            throw new NotFoundException('Master data tidak ditemukan.');
        }

        return $this->map($master);
    }

    public function upsert(string $masterKey, array $payload): array
    {
        $masterKey = $this->normalizeKey($masterKey);
        $this->ensureAllowedMasterKey($masterKey);
        $bumpVersion = array_key_exists('bump_version', $payload) ? (bool) $payload['bump_version'] : true;

        try {
            $this->pdo->beginTransaction();
            $version = $bumpVersion ? $this->versions->bump($masterKey, $payload['display_name'] ?? null) : null;
            $existing = $this->masters->findByKey($masterKey);
            $apiVersionId = $version['id'] ?? ($existing['api_version_id'] ?? null);

            if ($existing) {
                $this->masters->update((int) $existing['id'], $payload['data'], $apiVersionId ? (int) $apiVersionId : null);
            } else {
                $this->masters->create($masterKey, $payload['data'], $apiVersionId ? (int) $apiVersionId : null);
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return $this->get($masterKey);
    }

    private function normalizeKey(string $masterKey): string
    {
        return strtolower(trim($masterKey));
    }

    private function ensureAllowedMasterKey(string $masterKey): void
    {
        if (in_array($masterKey, self::RELATIONAL_KEYS, true)) {
            throw new ValidationException([
                'master_key' => 'This resource must remain relational and cannot be stored in master_data.',
            ]);
        }

        if (! preg_match('/^[a-z0-9_.-]+$/', $masterKey)) {
            throw new ValidationException([
                'master_key' => 'The master key may only contain lowercase letters, numbers, dot, dash, and underscore.',
            ]);
        }
    }

    private function map(array $master): array
    {
        return [
            'id' => (int) $master['id'],
            'master_key' => $master['master_key'],
            'data' => json_decode((string) $master['data_json'], true) ?: [],
            'created_at' => $master['created_at'],
            'updated_at' => $master['updated_at'],
            'version' => isset($master['version_number'])
                ? [
                    'id' => isset($master['api_version_id']) ? (int) $master['api_version_id'] : null,
                    'resource_name' => $master['resource_name'],
                    'display_name' => $master['display_name'],
                    'version_number' => (int) $master['version_number'],
                ]
                : null,
        ];
    }
}
