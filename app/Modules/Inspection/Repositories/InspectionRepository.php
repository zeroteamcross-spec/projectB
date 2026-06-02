<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Repositories;

use PDO;

class InspectionRepository
{
    private const CAR_SELECT_COLUMNS = 'id, seller_user_id, showroom_id, listing_status, stock,
        license_plate_number, brand_name, model_name, sub_model_name, primary_color,
        secondary_color, color_variation, document_type, registration_date, transmission,
        engine_number, chassis_number, location_name, engine_capacity_cc, mileage_km,
        seat_count, previous_owner_count, has_service_book, key_count, description,
        price_cash, price_discount, price_credit, inspection_summary_status, published_at,
        created_at, updated_at';

    private PDO $pdo;

    public function __construct(PDO $pdo)
    {
        $this->pdo = $pdo;
    }

    public function carOwner(int $carId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, seller_user_id, listing_status FROM cars WHERE id = :id AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['id' => $carId]);
        $car = $stmt->fetch();

        return $car ?: null;
    }

    public function sellerCars(int $sellerUserId, int $limit): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT ' . self::CAR_SELECT_COLUMNS . '
             FROM cars
             WHERE seller_user_id = :seller_user_id
             AND deleted_at IS NULL
             ORDER BY id DESC
             LIMIT :limit'
        );
        $stmt->bindValue('seller_user_id', $sellerUserId, PDO::PARAM_INT);
        $stmt->bindValue('limit', $limit, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function latestReportByCar(int $carId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, car_id, inspector_user_id, report_status, summary_notes,
                    inspected_at, created_at, updated_at
             FROM inspection_reports
             WHERE car_id = :car_id
             AND deleted_at IS NULL
             ORDER BY id DESC
             LIMIT 1'
        );
        $stmt->execute(['car_id' => $carId]);
        $report = $stmt->fetch();

        return $report ?: null;
    }

    public function latestReportsByCars(array $carIds): array
    {
        $carIds = array_values(array_unique(array_map('intval', $carIds)));

        if ($carIds === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($carIds), '?'));
        $stmt = $this->pdo->prepare(
            'SELECT reports.id, reports.car_id, reports.inspector_user_id, reports.report_status,
                    reports.summary_notes, reports.inspected_at, reports.created_at, reports.updated_at
             FROM inspection_reports AS reports
             INNER JOIN (
                SELECT car_id, MAX(id) AS latest_id
                FROM inspection_reports
                WHERE deleted_at IS NULL
                AND car_id IN (' . $placeholders . ')
                GROUP BY car_id
             ) AS latest ON latest.latest_id = reports.id
             ORDER BY reports.car_id ASC'
        );
        $stmt->execute($carIds);

        return $stmt->fetchAll();
    }

    public function findReport(int $reportId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, car_id, inspector_user_id, report_status, summary_notes,
                    inspected_at, created_at, updated_at
             FROM inspection_reports
             WHERE id = :id
             AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $reportId]);
        $report = $stmt->fetch();

        return $report ?: null;
    }

    public function itemsByReport(int $reportId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT items.id, items.inspection_report_id, items.template_id,
                    items.item_name_snapshot, items.result_status, items.description,
                    items.notes, items.created_at, items.updated_at,
                    templates.category_name AS template_category_name,
                    templates.item_name AS template_item_name
             FROM inspection_report_items AS items
             LEFT JOIN inspection_templates AS templates ON templates.id = items.template_id
             WHERE items.inspection_report_id = :inspection_report_id
             ORDER BY templates.sort_order ASC, items.id ASC'
        );
        $stmt->execute(['inspection_report_id' => $reportId]);

        return $stmt->fetchAll();
    }

    public function itemsByReports(array $reportIds): array
    {
        $reportIds = array_values(array_unique(array_map('intval', $reportIds)));

        if ($reportIds === []) {
            return [];
        }

        $placeholders = implode(', ', array_fill(0, count($reportIds), '?'));
        $stmt = $this->pdo->prepare(
            'SELECT items.id, items.inspection_report_id, items.template_id,
                    items.item_name_snapshot, items.result_status, items.description,
                    items.notes, items.created_at, items.updated_at,
                    templates.category_name AS template_category_name,
                    templates.item_name AS template_item_name
             FROM inspection_report_items AS items
             LEFT JOIN inspection_templates AS templates ON templates.id = items.template_id
             WHERE items.inspection_report_id IN (' . $placeholders . ')
             ORDER BY items.inspection_report_id ASC, templates.sort_order ASC, items.id ASC'
        );
        $stmt->execute($reportIds);

        return $stmt->fetchAll();
    }

    public function findItem(int $reportId, int $itemId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, inspection_report_id, template_id, item_name_snapshot,
                    result_status, description, notes, created_at, updated_at
             FROM inspection_report_items
             WHERE id = :id
             AND inspection_report_id = :inspection_report_id
             LIMIT 1'
        );
        $stmt->execute([
            'id' => $itemId,
            'inspection_report_id' => $reportId,
        ]);
        $item = $stmt->fetch();

        return $item ?: null;
    }

    public function findTemplate(int $templateId): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, category_name, item_name, description, sort_order, is_active
             FROM inspection_templates
             WHERE id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $templateId]);
        $template = $stmt->fetch();

        return $template ?: null;
    }

    public function listTemplates(bool $activeOnly = true): array
    {
        $sql = 'SELECT id, category_name, item_name, description, sort_order, is_active, created_at, updated_at
                FROM inspection_templates';

        if ($activeOnly) {
            $sql .= ' WHERE is_active = 1';
        }

        $sql .= ' ORDER BY sort_order ASC, id ASC';
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();

        return $stmt->fetchAll();
    }

    public function findTemplateByName(string $categoryName, string $itemName): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, category_name, item_name, description, sort_order, is_active
             FROM inspection_templates
             WHERE category_name = :category_name
             AND item_name = :item_name
             LIMIT 1'
        );
        $stmt->execute([
            'category_name' => $categoryName,
            'item_name' => $itemName,
        ]);
        $template = $stmt->fetch();

        return $template ?: null;
    }

    public function createTemplate(string $categoryName, string $itemName, ?string $description = null, int $sortOrder = 0): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO inspection_templates
                (category_name, item_name, description, sort_order, is_active, created_at, updated_at)
             VALUES
                (:category_name, :item_name, :description, :sort_order, 1, :created_at, NULL)'
        );
        $stmt->execute([
            'category_name' => $categoryName,
            'item_name' => $itemName,
            'description' => $description,
            'sort_order' => $sortOrder,
            'created_at' => date('Y-m-d H:i:s'),
        ]);

        return (int) $this->pdo->lastInsertId();
    }

    public function updateTemplateDefinition(int $templateId, string $categoryName, string $itemName, ?string $description, int $sortOrder): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE inspection_templates
             SET category_name = :category_name,
                 item_name = :item_name,
                 description = :description,
                 sort_order = :sort_order,
                 is_active = 1,
                 updated_at = :updated_at
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $templateId,
            'category_name' => $categoryName,
            'item_name' => $itemName,
            'description' => $description,
            'sort_order' => $sortOrder,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function updateTemplateCanon(int $templateId, string $categoryName, string $itemName, ?string $description, int $sortOrder, bool $isActive): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE inspection_templates
             SET category_name = :category_name,
                 item_name = :item_name,
                 description = :description,
                 sort_order = :sort_order,
                 is_active = :is_active,
                 updated_at = :updated_at
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $templateId,
            'category_name' => $categoryName,
            'item_name' => $itemName,
            'description' => $description,
            'sort_order' => $sortOrder,
            'is_active' => $isActive ? 1 : 0,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    public function deactivateTemplatesExcept(array $templateIds): int
    {
        $templateIds = array_values(array_unique(array_map('intval', $templateIds)));

        if ($templateIds === []) {
            return 0;
        }

        $placeholders = implode(', ', array_fill(0, count($templateIds), '?'));
        $stmt = $this->pdo->prepare(
            'UPDATE inspection_templates
             SET is_active = 0, updated_at = ?
             WHERE id NOT IN (' . $placeholders . ')'
        );
        $stmt->execute(array_merge([date('Y-m-d H:i:s')], $templateIds));

        return $stmt->rowCount();
    }

    public function createReport(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO inspection_reports
                (car_id, inspector_user_id, report_status, summary_notes,
                 inspected_at, created_at, updated_at)
             VALUES
                (:car_id, :inspector_user_id, :report_status, :summary_notes,
                 :inspected_at, :created_at, :updated_at)'
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function updateReport(int $reportId, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE inspection_reports
             SET report_status = :report_status,
                 summary_notes = :summary_notes,
                 inspected_at = :inspected_at,
                 updated_at = :updated_at
             WHERE id = :id'
        );
        $data['id'] = $reportId;
        $stmt->execute($data);
    }

    public function createItem(array $data): int
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO inspection_report_items
                (inspection_report_id, template_id, item_name_snapshot,
                 result_status, description, notes, created_at, updated_at)
             VALUES
                (:inspection_report_id, :template_id, :item_name_snapshot,
                 :result_status, :description, :notes, :created_at, :updated_at)'
        );
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function updateItem(int $itemId, array $data): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE inspection_report_items
             SET result_status = :result_status,
                 description = :description,
                 notes = :notes,
                 updated_at = :updated_at
             WHERE id = :id'
        );
        $data['id'] = $itemId;
        $stmt->execute($data);
    }

    public function updateCarInspectionSummary(int $carId, string $summaryStatus): void
    {
        $stmt = $this->pdo->prepare(
            'UPDATE cars SET inspection_summary_status = :status, updated_at = :updated_at WHERE id = :id'
        );
        $stmt->execute([
            'id' => $carId,
            'status' => $summaryStatus,
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }
}
