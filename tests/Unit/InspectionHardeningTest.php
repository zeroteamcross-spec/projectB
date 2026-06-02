<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\ValidationException;
use App\Core\Request;
use App\Modules\Inspection\Policies\InspectionPolicy;
use App\Modules\Inspection\Requests\CreateInspectionItemRequest;
use App\Modules\Inspection\Requests\CreateInspectionReportRequest;
use App\Modules\Inspection\Requests\UpdateInspectionItemRequest;
use App\Modules\Inspection\Requests\UpdateInspectionReportRequest;
use Tests\TestCase;

class InspectionHardeningTest extends TestCase
{
    public function run(): void
    {
        $this->sellerCanManageOwnCarInspectionOnly();
        $this->adminCanManageAllInspectionReports();
        $this->publicCanViewPublishedReportForPublishedCarOnly();
        $this->createReportRequiresItems();
        $this->createReportRequiresTemplateId();
        $this->createItemRequiresTemplateId();
        $this->updateReportRequiresAtLeastOneField();
        $this->updateItemRequiresCanonResultStatus();
    }

    private function sellerCanManageOwnCarInspectionOnly(): void
    {
        InspectionPolicy::ensureCanManage([
            'id' => 7,
            'role' => 'seller',
        ], [
            'id' => 10,
            'seller_user_id' => 7,
            'listing_status' => 'draft',
        ]);

        $this->expectException(ForbiddenException::class, static function (): void {
            InspectionPolicy::ensureCanManage([
                'id' => 8,
                'role' => 'seller',
            ], [
                'id' => 10,
                'seller_user_id' => 7,
                'listing_status' => 'draft',
            ]);
        });
    }

    private function adminCanManageAllInspectionReports(): void
    {
        InspectionPolicy::ensureCanManage([
            'id' => 1,
            'role' => 'admin',
        ], [
            'id' => 10,
            'seller_user_id' => 7,
            'listing_status' => 'draft',
        ]);

        $this->assertTrue(true);
    }

    private function publicCanViewPublishedReportForPublishedCarOnly(): void
    {
        InspectionPolicy::ensureCanView(null, [
            'id' => 10,
            'seller_user_id' => 7,
            'listing_status' => 'published',
        ], [
            'id' => 99,
            'report_status' => 'published',
        ]);

        $this->expectException(ForbiddenException::class, static function (): void {
            InspectionPolicy::ensureCanView(null, [
                'id' => 10,
                'seller_user_id' => 7,
                'listing_status' => 'draft',
            ], [
                'id' => 99,
                'report_status' => 'published',
            ]);
        });
    }

    private function createReportRequiresItems(): void
    {
        $request = new Request('POST', '/api/cars/1/inspection-reports', '/api/cars/1/inspection-reports', [], [
            'report_status' => 'completed',
            'items' => [],
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new CreateInspectionReportRequest($request))->validate();
        }, 'items');
    }

    private function createReportRequiresTemplateId(): void
    {
        $request = new Request('POST', '/api/cars/1/inspection-reports', '/api/cars/1/inspection-reports', [], [
            'items' => [
                [
                    'result_status' => 'good',
                ],
            ],
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new CreateInspectionReportRequest($request))->validate();
        }, 'items.0.template_id');
    }

    private function updateItemRequiresCanonResultStatus(): void
    {
        $request = new Request('PATCH', '/api/inspection-reports/1/items/2', '/api/inspection-reports/1/items/2', [], [
            'result_status' => 'excellent',
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new UpdateInspectionItemRequest($request))->validate();
        }, 'result_status');
    }

    private function createItemRequiresTemplateId(): void
    {
        $request = new Request('POST', '/api/inspection-reports/1/items', '/api/inspection-reports/1/items', [], [
            'result_status' => 'fair',
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new CreateInspectionItemRequest($request))->validate();
        }, 'template_id');
    }

    private function updateReportRequiresAtLeastOneField(): void
    {
        $request = new Request('PATCH', '/api/inspection-reports/1', '/api/inspection-reports/1', [], []);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new UpdateInspectionReportRequest($request))->validate();
        }, 'payload');
    }
}
