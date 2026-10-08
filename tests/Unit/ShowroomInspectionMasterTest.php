<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\ValidationException;
use App\Core\Request;
use App\Modules\Inspection\Mappers\InspectionMapper;
use App\Modules\Inspection\Repositories\InspectionRepository;
use App\Modules\Inspection\Requests\CopyInspectionTemplatesRequest;
use App\Modules\Inspection\Services\InspectionService;
use App\Modules\Showrooms\Repositories\ShowroomRepository;
use Tests\TestCase;

class ShowroomInspectionMasterTest extends TestCase
{
    public function run(): void
    {
        $this->copyMergesWithoutOverwritingTargetItems();
        $this->copyRequiresTheSameOwnerForBothBranches();
        $this->emptyBranchBlocksNewInspectionReports();
        $this->legacyReportCannotBeUpdatedAgainstTheNewBranchMaster();
        $this->copyRequestRequiresSourceBranch();
        $this->mapperMarksOnlyTheCurrentBranchMasterAsCurrent();
    }

    private function copyMergesWithoutOverwritingTargetItems(): void
    {
        $pdo = $this->sqlite();
        $this->createTemplatesTable($pdo);
        $pdo->exec("INSERT INTO inspection_templates
            (id, showroom_id, category_name, item_name, description, sort_order, is_active, created_at)
            VALUES
            (1, 1, 'exterior', 'Cat body', 'Sumber', 10, 1, '2026-10-08 00:00:00'),
            (2, 1, 'interior', 'AC', 'Sumber nonaktif', 20, 0, '2026-10-08 00:00:00'),
            (3, 2, 'exterior', 'Cat body', 'Target dipertahankan', 99, 1, '2026-10-08 00:00:00')");

        $repository = new InspectionRepository($pdo);
        $service = new InspectionService(
            $pdo,
            $repository,
            null,
            new FixtureInspectionShowroomRepository([
                1 => ['id' => 1, 'user_id' => 7],
                2 => ['id' => 2, 'user_id' => 7],
            ])
        );

        $result = $service->copyShowroomTemplates(2, ['id' => 7, 'role' => 'seller'], 1);

        $this->assertSame(2, $result['source_count']);
        $this->assertSame(1, $result['created_count']);
        $this->assertSame(1, $result['skipped_count']);

        $templates = $repository->listTemplates(false, 2);
        $this->assertSame(2, count($templates));
        $byName = [];
        foreach ($templates as $template) {
            $byName[$template['item_name']] = $template;
        }
        $this->assertSame('Target dipertahankan', $byName['Cat body']['description']);
        $this->assertSame('AC', $byName['AC']['item_name']);
        $this->assertSame(false, (bool) $byName['AC']['is_active']);
    }

    private function copyRequiresTheSameOwnerForBothBranches(): void
    {
        $pdo = $this->sqlite();
        $this->createTemplatesTable($pdo);
        $repository = new InspectionRepository($pdo);
        $service = new InspectionService(
            $pdo,
            $repository,
            null,
            new FixtureInspectionShowroomRepository([
                1 => ['id' => 1, 'user_id' => 8],
                2 => ['id' => 2, 'user_id' => 7],
            ])
        );

        $this->expectException(ForbiddenException::class, static function () use ($service): void {
            $service->copyShowroomTemplates(2, ['id' => 7, 'role' => 'seller'], 1);
        });
    }

    private function emptyBranchBlocksNewInspectionReports(): void
    {
        $pdo = $this->sqlite();
        $this->createTemplatesTable($pdo);
        $pdo->exec('CREATE TABLE cars (
            id INTEGER PRIMARY KEY,
            seller_user_id INTEGER NOT NULL,
            showroom_id INTEGER NULL,
            listing_status TEXT NOT NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec("INSERT INTO cars (id, seller_user_id, showroom_id, listing_status)
            VALUES (41, 7, 2, 'draft')");

        $service = new InspectionService($pdo, new InspectionRepository($pdo));

        try {
            $service->createReport(41, ['id' => 7, 'role' => 'seller'], ['items' => []]);
        } catch (ValidationException $exception) {
            $this->assertSame(
                'Master Inspeksi showroom belum dibuat.',
                $exception->errors()['inspection_master'] ?? null
            );

            return;
        }

        throw new \RuntimeException('Expected empty showroom master to block report creation.');
    }

    private function legacyReportCannotBeUpdatedAgainstTheNewBranchMaster(): void
    {
        $pdo = $this->sqlite();
        $this->createTemplatesTable($pdo);
        $pdo->exec('CREATE TABLE cars (
            id INTEGER PRIMARY KEY,
            seller_user_id INTEGER NOT NULL,
            showroom_id INTEGER NULL,
            listing_status TEXT NOT NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec('CREATE TABLE inspection_reports (
            id INTEGER PRIMARY KEY,
            car_id INTEGER NOT NULL,
            inspector_user_id INTEGER NOT NULL,
            inspection_master_showroom_id INTEGER NULL,
            report_status TEXT NOT NULL,
            summary_notes TEXT NULL,
            inspected_at TEXT NULL,
            created_at TEXT NULL,
            updated_at TEXT NULL,
            deleted_at TEXT NULL
        )');
        $pdo->exec("INSERT INTO cars (id, seller_user_id, showroom_id, listing_status)
            VALUES (42, 7, 2, 'draft')");
        $pdo->exec("INSERT INTO inspection_reports
            (id, car_id, inspector_user_id, inspection_master_showroom_id, report_status, inspected_at, created_at)
            VALUES (50, 42, 7, NULL, 'completed', '2026-10-08 00:00:00', '2026-10-08 00:00:00')");

        $service = new InspectionService($pdo, new InspectionRepository($pdo));

        try {
            $service->updateReport(50, ['id' => 7, 'role' => 'seller'], ['summary_notes' => 'Tidak boleh']);
        } catch (ValidationException $exception) {
            $this->assertSame(
                'Inspeksi lama wajib dibuat ulang berdasarkan master inspeksi showroom.',
                $exception->errors()['inspection_master'] ?? null
            );

            return;
        }

        throw new \RuntimeException('Expected legacy report update to be rejected.');
    }

    private function copyRequestRequiresSourceBranch(): void
    {
        $request = new Request(
            'POST',
            '/api/showrooms/2/mine/inspection-templates/copy',
            '/api/showrooms/2/mine/inspection-templates/copy',
            [],
            []
        );

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new CopyInspectionTemplatesRequest($request))->validate();
        }, 'source_showroom_id');
    }

    private function mapperMarksOnlyTheCurrentBranchMasterAsCurrent(): void
    {
        $report = [
            'id' => 50,
            'car_id' => 42,
            'inspector_user_id' => 7,
            'inspection_master_showroom_id' => 2,
            'report_status' => 'completed',
            'summary_notes' => null,
            'inspected_at' => null,
            'created_at' => null,
            'updated_at' => null,
        ];

        $this->assertSame(true, InspectionMapper::report($report, [], 2)['is_current_master']);
        $this->assertSame(false, InspectionMapper::report($report, [], 3)['is_current_master']);
        $this->assertSame(false, InspectionMapper::report(array_merge($report, [
            'inspection_master_showroom_id' => null,
        ]), [], 2)['is_current_master']);
    }

    private function createTemplatesTable(\PDO $pdo): void
    {
        $pdo->exec('CREATE TABLE inspection_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            showroom_id INTEGER NULL,
            category_name TEXT NOT NULL,
            item_name TEXT NOT NULL,
            description TEXT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NULL,
            updated_at TEXT NULL
        )');
    }
}

final class FixtureInspectionShowroomRepository extends ShowroomRepository
{
    /** @var array<int, array<string, int>> */
    private array $fixtures;

    /** @param array<int, array<string, int>> $fixtures */
    public function __construct(array $fixtures)
    {
        $this->fixtures = $fixtures;
    }

    public function findById(int $id): ?array
    {
        return $this->fixtures[$id] ?? null;
    }
}
