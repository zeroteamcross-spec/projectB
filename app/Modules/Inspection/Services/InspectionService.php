<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Services;

use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\ValidationException;
use App\Modules\Inspection\Mappers\InspectionMapper;
use App\Modules\Inspection\Policies\InspectionPolicy;
use App\Modules\Inspection\Repositories\InspectionRepository;
use App\Modules\Notifications\Services\NotificationService;
use App\Modules\Showrooms\Policies\ShowroomPolicy;
use App\Modules\Showrooms\Repositories\ShowroomRepository;
use PDO;
use Throwable;

class InspectionService
{
    private PDO $pdo;

    private InspectionRepository $repository;

    private ?ShowroomRepository $showrooms;

    private ?bool $resultStatusSchemaSynced = null;

    private ?NotificationService $notificationService;

    public function __construct(
        PDO $pdo,
        InspectionRepository $repository,
        ?NotificationService $notificationService = null,
        ?ShowroomRepository $showrooms = null
    )
    {
        $this->pdo = $pdo;
        $this->repository = $repository;
        $this->notificationService = $notificationService;
        $this->showrooms = $showrooms;
    }

    public function detailByCar(int $carId, ?array $user): array
    {
        $car = $this->requireCar($carId);
        $report = $this->repository->latestReportByCar($carId);

        if (! $report) {
            throw new NotFoundException('Laporan inspeksi tidak ditemukan.');
        }

        InspectionPolicy::ensureCanView($user, $car, $report);

        return InspectionMapper::report(
            $report,
            $this->repository->itemsByReport((int) $report['id']),
            (int) ($car['showroom_id'] ?? 0)
        );
    }

    public function templates(): array
    {
        return InspectionMapper::templates($this->repository->listTemplates(true));
    }

    public function adminTemplates(array $user): array
    {
        $this->ensureAdmin($user);

        return InspectionMapper::templates($this->repository->listTemplates(false));
    }

    public function templatesForCar(int $carId, array $user): array
    {
        $car = $this->requireCar($carId);
        InspectionPolicy::ensureCanManage($user, $car);
        $showroomId = (int) ($car['showroom_id'] ?? 0);

        if ($showroomId <= 0) {
            return [];
        }

        return InspectionMapper::templates($this->repository->listTemplates(true, $showroomId));
    }

    public function showroomTemplates(int $showroomId, array $user, bool $includeInactive = true): array
    {
        $showroom = $this->requireShowroom($showroomId);
        $this->ensureShowroomCanRead($showroom, $user);

        return InspectionMapper::templates($this->repository->listTemplates(! $includeInactive, $showroomId));
    }

    public function createShowroomTemplate(int $showroomId, array $user, array $data): array
    {
        $showroom = $this->requireShowroom($showroomId);
        $this->ensureShowroomOwner($showroom, $user);
        $categoryName = trim((string) $data['category_name']);
        $itemName = trim((string) $data['item_name']);

        if ($this->repository->findTemplateByName($categoryName, $itemName, $showroomId)) {
            throw new ValidationException([
                'item_name' => 'Item inspeksi dengan section dan nama yang sama sudah ada di cabang ini.',
            ]);
        }

        $templateId = $this->repository->createTemplate(
            $categoryName,
            $itemName,
            trim((string) ($data['description'] ?? '')) ?: null,
            (int) $data['sort_order'],
            $showroomId
        );

        if (! $this->toBoolean($data['is_active'])) {
            $this->repository->updateTemplateCanon(
                $templateId,
                $categoryName,
                $itemName,
                trim((string) ($data['description'] ?? '')) ?: null,
                (int) $data['sort_order'],
                false
            );
        }

        return InspectionMapper::template($this->repository->findTemplate($templateId));
    }

    public function updateShowroomTemplate(int $showroomId, int $templateId, array $user, array $data): array
    {
        $showroom = $this->requireShowroom($showroomId);
        $this->ensureShowroomOwner($showroom, $user);
        $template = $this->repository->findTemplate($templateId);

        if (! $template || (int) ($template['showroom_id'] ?? 0) !== $showroomId) {
            throw new NotFoundException('Master item inspeksi cabang tidak ditemukan.');
        }

        $categoryName = trim((string) $data['category_name']);
        $itemName = trim((string) $data['item_name']);
        $duplicate = $this->repository->findTemplateByName($categoryName, $itemName, $showroomId);
        if ($duplicate && (int) $duplicate['id'] !== $templateId) {
            throw new ValidationException([
                'item_name' => 'Item inspeksi dengan section dan nama yang sama sudah ada di cabang ini.',
            ]);
        }

        $this->repository->updateTemplateCanon(
            $templateId,
            $categoryName,
            $itemName,
            trim((string) ($data['description'] ?? '')) ?: null,
            (int) $data['sort_order'],
            $this->toBoolean($data['is_active'])
        );

        return InspectionMapper::template($this->repository->findTemplate($templateId) ?? $template);
    }

    public function copyShowroomTemplates(int $targetShowroomId, array $user, int $sourceShowroomId): array
    {
        if ($sourceShowroomId <= 0 || $sourceShowroomId === $targetShowroomId) {
            throw new ValidationException([
                'source_showroom_id' => 'Cabang sumber dan tujuan harus berbeda.',
            ]);
        }

        $target = $this->requireShowroom($targetShowroomId);
        $source = $this->requireShowroom($sourceShowroomId);
        $this->ensureShowroomOwner($target, $user);
        $this->ensureShowroomOwner($source, $user);
        $sourceTemplates = $this->repository->listTemplates(false, $sourceShowroomId);
        $created = 0;

        try {
            $this->pdo->beginTransaction();

            foreach ($sourceTemplates as $template) {
                $existing = $this->repository->findTemplateByName(
                    (string) $template['category_name'],
                    (string) $template['item_name'],
                    $targetShowroomId
                );

                if ($existing) {
                    continue;
                }

                $this->repository->createTemplate(
                    (string) $template['category_name'],
                    (string) $template['item_name'],
                    $template['description'] !== null ? (string) $template['description'] : null,
                    (int) ($template['sort_order'] ?? 0),
                    $targetShowroomId
                );
                $created++;

                $newTemplate = $this->repository->findTemplateByName(
                    (string) $template['category_name'],
                    (string) $template['item_name'],
                    $targetShowroomId
                );
                if ($newTemplate && ! (bool) ($template['is_active'] ?? false)) {
                    $this->repository->updateTemplateCanon(
                        (int) $newTemplate['id'],
                        (string) $template['category_name'],
                        (string) $template['item_name'],
                        $template['description'] !== null ? (string) $template['description'] : null,
                        (int) ($template['sort_order'] ?? 0),
                        false
                    );
                }
            }

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return [
            'source_showroom_id' => $sourceShowroomId,
            'target_showroom_id' => $targetShowroomId,
            'source_count' => count($sourceTemplates),
            'created_count' => $created,
            'skipped_count' => count($sourceTemplates) - $created,
            'templates' => InspectionMapper::templates($this->repository->listTemplates(false, $targetShowroomId)),
        ];
    }

    public function createTemplate(array $user, array $data): array
    {
        $this->ensureAdmin($user);
        $categoryName = trim((string) $data['category_name']);
        $itemName = trim((string) $data['item_name']);
        if ($this->repository->findTemplateByName($categoryName, $itemName)) {
            throw new ValidationException([
                'item_name' => 'Item inspeksi dengan section dan nama yang sama sudah ada di master admin.',
            ]);
        }

        $templateId = $this->repository->createTemplate(
            $categoryName,
            $itemName,
            trim((string) ($data['description'] ?? '')) ?: null,
            (int) $data['sort_order']
        );

        if (! $this->toBoolean($data['is_active'])) {
            $this->repository->updateTemplateCanon(
                $templateId,
                $categoryName,
                $itemName,
                trim((string) ($data['description'] ?? '')) ?: null,
                (int) $data['sort_order'],
                false
            );
        }

        return InspectionMapper::template($this->repository->findTemplate($templateId));
    }

    public function updateTemplate(int $templateId, array $user, array $data): array
    {
        $this->ensureAdmin($user);
        $template = $this->repository->findTemplate($templateId);

        if (! $template) {
            throw new NotFoundException('Master item inspeksi tidak ditemukan.');
        }

        if (($template['showroom_id'] ?? null) !== null) {
            throw new ForbiddenException('Master item inspeksi cabang dikelola dari menu showroom.');
        }

        $categoryName = trim((string) $data['category_name']);
        $itemName = trim((string) $data['item_name']);
        $duplicate = $this->repository->findTemplateByName($categoryName, $itemName);
        if ($duplicate && (int) $duplicate['id'] !== $templateId) {
            throw new ValidationException([
                'item_name' => 'Item inspeksi dengan section dan nama yang sama sudah ada di master admin.',
            ]);
        }

        $this->repository->updateTemplateCanon(
            $templateId,
            $categoryName,
            $itemName,
            trim((string) ($data['description'] ?? '')) ?: null,
            (int) $data['sort_order'],
            $this->toBoolean($data['is_active'])
        );

        return InspectionMapper::template($this->repository->findTemplate($templateId) ?? $template);
    }

    public function sellerOverview(array $user, array $filters = []): array
    {
        if (! in_array(($user['role'] ?? null), ['seller', 'super_admin', 'seller_staff'], true)) {
            throw new ForbiddenException('Akses overview inspeksi seller tidak diizinkan.');
        }

        $limit = max(1, min((int) ($filters['limit'] ?? 100), 100));
        $cars = ($user['role'] ?? null) === 'seller_staff'
            ? $this->repository->staffCars((int) ($user['staff_showroom_id'] ?? 0), $limit)
            : $this->repository->sellerCars((int) $user['id'], $limit);
        $carIds = array_map(static fn (array $car): int => (int) $car['id'], $cars);
        $reports = $this->repository->latestReportsByCars($carIds);
        $reportIds = array_map(static fn (array $report): int => (int) $report['id'], $reports);
        $items = $this->repository->itemsByReports($reportIds);
        $itemsByReportId = [];

        foreach ($items as $item) {
            $itemsByReportId[(int) $item['inspection_report_id']][] = $item;
        }

        $reportsByCarId = [];

        foreach ($reports as $report) {
            $car = $this->findCarFromList($cars, (int) $report['car_id']);
            $reportsByCarId[(int) $report['car_id']] = InspectionMapper::report(
                $report,
                $itemsByReportId[(int) $report['id']] ?? [],
                (int) ($car['showroom_id'] ?? 0)
            );
        }

        $templatesByShowroomId = [];
        $carSummaries = [];

        foreach ($cars as $car) {
            $showroomId = (int) ($car['showroom_id'] ?? 0);
            $report = $reportsByCarId[(int) $car['id']] ?? null;
            $isCurrent = (bool) ($report['is_current_master'] ?? false);

            if ($showroomId > 0 && ! array_key_exists((string) $showroomId, $templatesByShowroomId)) {
                $templatesByShowroomId[(string) $showroomId] = InspectionMapper::templates(
                    $this->repository->listTemplates(true, $showroomId)
                );
            }

            $carSummaries[] = InspectionMapper::carSummary($car, $report !== null && ! $isCurrent);
        }

        $masterItems = [];
        foreach ($templatesByShowroomId as $templates) {
            $masterItems = array_merge($masterItems, $templates);
        }

        return [
            'cars' => $carSummaries,
            'reports_by_car_id' => $reportsByCarId,
            'templates' => [],
            'templates_by_showroom_id' => $templatesByShowroomId,
            'master_sections' => $this->masterSections($masterItems),
            'summary' => $this->overviewSummary($cars, $reportsByCarId),
        ];
    }

    public function createReport(int $carId, array $user, array $data): array
    {
        $car = $this->requireCar($carId);
        InspectionPolicy::ensureCanManage($user, $car);
        $showroomId = (int) ($car['showroom_id'] ?? 0);
        if ($showroomId <= 0 || $this->repository->listTemplates(true, $showroomId) === []) {
            throw new ValidationException([
                'inspection_master' => 'Master Inspeksi showroom belum dibuat.',
            ]);
        }
        $this->ensureResultStatusSchema();
        $now = date('Y-m-d H:i:s');
        $reportStatus = $data['report_status'] ?? 'completed';

        try {
            $this->pdo->beginTransaction();

            $reportId = $this->repository->createReport([
                'car_id' => $carId,
                'inspector_user_id' => (int) $user['id'],
                'inspection_master_showroom_id' => $showroomId,
                'report_status' => $reportStatus,
                'summary_notes' => $data['summary_notes'] ?? null,
                'inspected_at' => $data['inspected_at'] ?? $now,
                'created_at' => $now,
                'updated_at' => null,
            ]);

            foreach ($data['items'] as $item) {
                $template = $this->resolveTemplate($item, $showroomId);

                $this->repository->createItem([
                    'inspection_report_id' => $reportId,
                    'template_id' => (int) $template['id'],
                    'item_name_snapshot' => $template['item_name'],
                    'result_status' => $item['result_status'],
                    'description' => $item['description'] ?? $template['description'] ?? null,
                    'notes' => $item['notes'] ?? null,
                    'created_at' => $now,
                    'updated_at' => null,
                ]);
            }

            $summaryStatus = $this->summaryStatus($reportStatus, count($data['items']));
            $this->repository->updateCarInspectionSummary($carId, $summaryStatus);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        $report = $this->repository->findReport($reportId);
        $this->notifyInspectionNeeded($car, $summaryStatus ?? null);

        return InspectionMapper::report(
            $report,
            $this->repository->itemsByReport($reportId),
            $showroomId
        );
    }

    public function updateReport(int $reportId, array $user, array $data): array
    {
        $report = $this->requireReport($reportId);
        $car = $this->requireCar((int) $report['car_id']);
        InspectionPolicy::ensureCanManage($user, $car);
        $this->ensureCurrentMasterReport($report, $car);

        try {
            $this->pdo->beginTransaction();

            $this->repository->updateReport($reportId, [
                'report_status' => $data['report_status'] ?? $report['report_status'],
                'summary_notes' => array_key_exists('summary_notes', $data) ? $data['summary_notes'] : $report['summary_notes'],
                'inspected_at' => $data['inspected_at'] ?? $report['inspected_at'],
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            $result = $this->refreshReportAndSummary($reportId);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return $result;
    }

    public function createItem(int $reportId, array $user, array $data): array
    {
        $report = $this->requireReport($reportId);
        $car = $this->requireCar((int) $report['car_id']);
        InspectionPolicy::ensureCanManage($user, $car);
        $this->ensureCurrentMasterReport($report, $car);
        $this->ensureResultStatusSchema();
        $template = $this->resolveTemplate($data, (int) $car['showroom_id']);
        $now = date('Y-m-d H:i:s');

        try {
            $this->pdo->beginTransaction();

            $this->repository->createItem([
                'inspection_report_id' => $reportId,
                'template_id' => (int) $template['id'],
                'item_name_snapshot' => $template['item_name'],
                'result_status' => $data['result_status'],
                'description' => $data['description'] ?? $template['description'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_at' => $now,
                'updated_at' => null,
            ]);

            $result = $this->refreshReportAndSummary($reportId);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return $result;
    }

    public function updateItem(int $reportId, int $itemId, array $user, array $data): array
    {
        $report = $this->requireReport($reportId);

        $car = $this->requireCar((int) $report['car_id']);
        InspectionPolicy::ensureCanManage($user, $car);
        $this->ensureCurrentMasterReport($report, $car);
        $this->ensureResultStatusSchema();
        $item = $this->repository->findItem($reportId, $itemId);

        if (! $item) {
            throw new NotFoundException('Item inspeksi tidak ditemukan.');
        }

        try {
            $this->pdo->beginTransaction();

            $this->repository->updateItem($itemId, [
                'result_status' => $data['result_status'],
                'description' => $data['description'] ?? $item['description'],
                'notes' => $data['notes'] ?? $item['notes'],
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            if (isset($data['report_status']) || array_key_exists('summary_notes', $data)) {
                $this->repository->updateReport($reportId, [
                    'report_status' => $data['report_status'] ?? $report['report_status'],
                    'summary_notes' => array_key_exists('summary_notes', $data) ? $data['summary_notes'] : $report['summary_notes'],
                    'inspected_at' => $report['inspected_at'],
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);
            }

            $updatedReport = $this->repository->findReport($reportId);
            $items = $this->repository->itemsByReport($reportId);
            $this->syncCarInspectionSummary($updatedReport, $items);

            $this->pdo->commit();
        } catch (Throwable $exception) {
            if ($this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }

            throw $exception;
        }

        return InspectionMapper::report($updatedReport, $items, (int) ($car['showroom_id'] ?? 0));
    }

    private function requireReport(int $reportId): array
    {
        $report = $this->repository->findReport($reportId);

        if (! $report) {
            throw new NotFoundException('Laporan inspeksi tidak ditemukan.');
        }

        return $report;
    }

    private function resolveTemplate(array $item, int $showroomId): array
    {
        $template = $this->repository->findTemplate((int) ($item['template_id'] ?? 0));

        if (! $template
            || (int) ($template['showroom_id'] ?? 0) !== $showroomId
            || ! (bool) ($template['is_active'] ?? false)
        ) {
            throw new NotFoundException('Master item inspeksi tidak ditemukan atau sudah nonaktif.');
        }

        return $template;
    }

    private function ensureAdmin(array $user): void
    {
        if (($user['role'] ?? null) !== 'admin') {
            throw new ForbiddenException('Akses master inspeksi tidak diizinkan.');
        }
    }

    private function toBoolean($value): bool
    {
        return $value === true || $value === 1 || $value === '1';
    }

    private function requireCar(int $carId): array
    {
        $car = $this->repository->carOwner($carId);

        if (! $car) {
            throw new NotFoundException('Mobil tidak ditemukan.');
        }

        return $car;
    }

    private function requireShowroom(int $showroomId): array
    {
        if ($this->showrooms === null) {
            throw new NotFoundException('Showroom belum tersedia.');
        }

        $showroom = $this->showrooms->findById($showroomId);
        if (! $showroom) {
            throw new NotFoundException('Showroom tidak ditemukan.');
        }

        return $showroom;
    }

    private function ensureShowroomCanRead(array $showroom, array $user): void
    {
        if (! in_array(($user['role'] ?? null), ['seller', 'seller_staff', 'admin', 'super_admin'], true)) {
            throw new ForbiddenException('Akses master inspeksi showroom tidak diizinkan.');
        }

        ShowroomPolicy::ensureOwnedOrStaffAssigned($showroom, $user);
    }

    private function ensureShowroomOwner(array $showroom, array $user): void
    {
        if (($user['role'] ?? null) !== 'seller') {
            throw new ForbiddenException('Hanya owner showroom yang dapat mengelola master inspeksi.');
        }

        ShowroomPolicy::ensureOwnedByUser($showroom, $user);
    }

    private function ensureCurrentMasterReport(array $report, array $car): void
    {
        $showroomId = (int) ($car['showroom_id'] ?? 0);
        $reportShowroomId = (int) ($report['inspection_master_showroom_id'] ?? 0);

        if ($showroomId <= 0 || $reportShowroomId !== $showroomId) {
            throw new ValidationException([
                'inspection_master' => 'Inspeksi lama wajib dibuat ulang berdasarkan master inspeksi showroom.',
            ]);
        }
    }

    private function refreshReportAndSummary(int $reportId): array
    {
        $report = $this->requireReport($reportId);
        $items = $this->repository->itemsByReport($reportId);
        $this->syncCarInspectionSummary($report, $items);

        $car = $this->requireCar((int) $report['car_id']);

        return InspectionMapper::report($report, $items, (int) ($car['showroom_id'] ?? 0));
    }

    private function syncCarInspectionSummary(array $report, array $items): void
    {
        $summaryStatus = $this->summaryStatus($report['report_status'], count($items));
        $this->repository->updateCarInspectionSummary((int) $report['car_id'], $summaryStatus);
        $this->notifyInspectionNeeded($this->requireCar((int) $report['car_id']), $summaryStatus);
    }

    private function summaryStatus(string $reportStatus, int $itemCount): string
    {
        if ($itemCount < 1) {
            return 'not_checked';
        }

        return in_array($reportStatus, ['completed', 'published'], true) ? 'completed' : 'partial';
    }

    private function notifyInspectionNeeded(array $car, ?string $summaryStatus): void
    {
        if ($this->notificationService === null || ! in_array($summaryStatus, ['not_checked', 'partial'], true)) {
            return;
        }

        $this->notificationService->createInspectionNeededNotification(array_merge($car, [
            'inspection_summary_status' => $summaryStatus,
        ]));
    }

    private function overviewSummary(array $cars, array $reportsByCarId): array
    {
        $total = count($cars);
        $completed = 0;
        $partial = 0;
        $notChecked = 0;
        $publishedReports = 0;

        foreach ($cars as $car) {
            $report = $reportsByCarId[(int) $car['id']] ?? null;
            $status = $report && ($report['is_current_master'] ?? false)
                ? ($car['inspection_summary_status'] ?? 'not_checked')
                : 'not_checked';

            if ($status === 'completed') {
                $completed++;
            } elseif ($status === 'partial') {
                $partial++;
            } else {
                $notChecked++;
            }

            if ($report && ($report['is_current_master'] ?? false) && ($report['report_status'] ?? null) === 'published') {
                $publishedReports++;
            }
        }

        return [
            'total_cars' => $total,
            'completed' => $completed,
            'partial' => $partial,
            'not_checked' => $notChecked,
            'published_reports' => $publishedReports,
        ];
    }

    private function findCarFromList(array $cars, int $carId): ?array
    {
        foreach ($cars as $car) {
            if ((int) ($car['id'] ?? 0) === $carId) {
                return $car;
            }
        }

        return null;
    }

    private function masterSections(array $items): array
    {
        $sections = [];

        foreach ($items as $item) {
            $key = $item['category_name'] ?? 'general';

            if (! isset($sections[$key])) {
                $sections[$key] = [
                    'section_key' => $key,
                    'label' => $this->sectionLabel($key),
                    'sort_order' => (int) floor(((int) ($item['sort_order'] ?? 0)) / 100) * 100,
                    'items' => [],
                ];
            }

            $sections[$key]['items'][] = $item;
        }

        usort($sections, static fn (array $left, array $right): int => $left['sort_order'] <=> $right['sort_order']);

        return array_values($sections);
    }

    private function sectionLabel(string $key): string
    {
        return [
            'road_test' => 'Pemeriksaan tes jalan',
            'exterior' => 'Eksterior',
            'interior' => 'Interior',
            'underbody_engine' => 'Bawah body dan bawah kap depan',
            'documents' => 'Dokumen dan kelengkapan',
        ][$key] ?? ucwords(str_replace('_', ' ', $key));
    }

    private function ensureResultStatusSchema(): void
    {
        if ($this->resultStatusSchemaSynced === true) {
            return;
        }

        $stmt = $this->pdo->query("SHOW COLUMNS FROM inspection_report_items LIKE 'result_status'");
        $column = $stmt ? $stmt->fetch() : null;
        $type = strtolower((string) ($column['Type'] ?? $column['type'] ?? ''));

        if (strpos($type, "'not_available'") !== false) {
            $this->resultStatusSchemaSynced = true;
            return;
        }

        $this->pdo->exec(
            "ALTER TABLE inspection_report_items
             MODIFY result_status ENUM('good', 'fair', 'bad', 'not_available') NOT NULL"
        );

        $this->resultStatusSchemaSynced = true;
    }
}
