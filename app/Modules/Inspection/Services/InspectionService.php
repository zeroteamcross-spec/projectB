<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Services;

use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ForbiddenException;
use App\Modules\Inspection\Mappers\InspectionMapper;
use App\Modules\Inspection\Policies\InspectionPolicy;
use App\Modules\Inspection\Repositories\InspectionRepository;
use App\Modules\Notifications\Services\NotificationService;
use PDO;
use Throwable;

class InspectionService
{
    private PDO $pdo;

    private InspectionRepository $repository;

    private ?bool $resultStatusSchemaSynced = null;

    private ?NotificationService $notificationService;

    public function __construct(PDO $pdo, InspectionRepository $repository, ?NotificationService $notificationService = null)
    {
        $this->pdo = $pdo;
        $this->repository = $repository;
        $this->notificationService = $notificationService;
    }

    public function detailByCar(int $carId, ?array $user): array
    {
        $car = $this->requireCar($carId);
        $report = $this->repository->latestReportByCar($carId);

        if (! $report) {
            throw new NotFoundException('Laporan inspeksi tidak ditemukan.');
        }

        InspectionPolicy::ensureCanView($user, $car, $report);

        return InspectionMapper::report($report, $this->repository->itemsByReport((int) $report['id']));
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

    public function createTemplate(array $user, array $data): array
    {
        $this->ensureAdmin($user);
        $templateId = $this->repository->createTemplate(
            trim((string) $data['category_name']),
            trim((string) $data['item_name']),
            trim((string) ($data['description'] ?? '')) ?: null,
            (int) $data['sort_order']
        );

        if (! $this->toBoolean($data['is_active'])) {
            $this->repository->updateTemplateCanon(
                $templateId,
                trim((string) $data['category_name']),
                trim((string) $data['item_name']),
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

        $this->repository->updateTemplateCanon(
            $templateId,
            trim((string) $data['category_name']),
            trim((string) $data['item_name']),
            trim((string) ($data['description'] ?? '')) ?: null,
            (int) $data['sort_order'],
            $this->toBoolean($data['is_active'])
        );

        return InspectionMapper::template($this->repository->findTemplate($templateId) ?? $template);
    }

    public function sellerOverview(array $user, array $filters = []): array
    {
        if (($user['role'] ?? null) !== 'seller') {
            throw new ForbiddenException('Akses overview inspeksi seller tidak diizinkan.');
        }

        $limit = max(1, min((int) ($filters['limit'] ?? 100), 100));
        $cars = $this->repository->sellerCars((int) $user['id'], $limit);
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
            $reportsByCarId[(int) $report['car_id']] = InspectionMapper::report(
                $report,
                $itemsByReportId[(int) $report['id']] ?? []
            );
        }

        $masterItems = InspectionMapper::templates($this->repository->listTemplates(true));

        return [
            'cars' => InspectionMapper::carSummaries($cars),
            'reports_by_car_id' => $reportsByCarId,
            'templates' => $masterItems,
            'master_sections' => $this->masterSections($masterItems),
            'summary' => $this->overviewSummary($cars, $reportsByCarId),
        ];
    }

    public function createReport(int $carId, array $user, array $data): array
    {
        $car = $this->requireCar($carId);
        InspectionPolicy::ensureCanManage($user, $car);
        $this->ensureResultStatusSchema();
        $now = date('Y-m-d H:i:s');
        $reportStatus = $data['report_status'] ?? 'completed';

        try {
            $this->pdo->beginTransaction();

            $reportId = $this->repository->createReport([
                'car_id' => $carId,
                'inspector_user_id' => (int) $user['id'],
                'report_status' => $reportStatus,
                'summary_notes' => $data['summary_notes'] ?? null,
                'inspected_at' => $data['inspected_at'] ?? $now,
                'created_at' => $now,
                'updated_at' => null,
            ]);

            foreach ($data['items'] as $item) {
                $template = $this->resolveTemplate($item);

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

        return InspectionMapper::report($report, $this->repository->itemsByReport($reportId));
    }

    public function updateReport(int $reportId, array $user, array $data): array
    {
        $report = $this->requireReport($reportId);
        $car = $this->requireCar((int) $report['car_id']);
        InspectionPolicy::ensureCanManage($user, $car);

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
        $this->ensureResultStatusSchema();
        $template = $this->resolveTemplate($data);
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

        return InspectionMapper::report($updatedReport, $items);
    }

    private function requireReport(int $reportId): array
    {
        $report = $this->repository->findReport($reportId);

        if (! $report) {
            throw new NotFoundException('Laporan inspeksi tidak ditemukan.');
        }

        return $report;
    }

    private function resolveTemplate(array $item): array
    {
        $template = $this->repository->findTemplate((int) ($item['template_id'] ?? 0));

        if (! $template || ! (bool) ($template['is_active'] ?? false)) {
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

    private function refreshReportAndSummary(int $reportId): array
    {
        $report = $this->requireReport($reportId);
        $items = $this->repository->itemsByReport($reportId);
        $this->syncCarInspectionSummary($report, $items);

        return InspectionMapper::report($report, $items);
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
            $status = $car['inspection_summary_status'] ?? 'not_checked';

            if ($status === 'completed') {
                $completed++;
            } elseif ($status === 'partial') {
                $partial++;
            } else {
                $notChecked++;
            }

            $report = $reportsByCarId[(int) $car['id']] ?? null;
            if (($report['report_status'] ?? null) === 'published') {
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
