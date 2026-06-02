<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Inspection\Requests\CreateInspectionItemRequest;
use App\Modules\Inspection\Requests\CreateInspectionReportRequest;
use App\Modules\Inspection\Requests\UpdateInspectionItemRequest;
use App\Modules\Inspection\Requests\UpdateInspectionReportRequest;
use App\Modules\Inspection\Requests\UpdateInspectionTemplateRequest;
use App\Modules\Inspection\Services\InspectionService;

class InspectionController extends Controller
{
    private InspectionService $service;

    public function __construct(InspectionService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function detailByCar(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'report' => $this->service->detailByCar((int) $request->routeParam('car_id'), $request->user()),
        ], 'Laporan inspeksi berhasil diambil.');
    }

    public function templates(Request $request): JsonResponse
    {
        $templates = $this->service->templates();

        return JsonResponse::success([
            'templates' => $templates,
        ], 'Master inspeksi berhasil diambil.');
    }

    public function adminTemplates(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'templates' => $this->service->adminTemplates($this->user($request)),
        ], 'Master inspeksi admin berhasil diambil.');
    }

    public function createTemplate(Request $request): JsonResponse
    {
        $payload = (new UpdateInspectionTemplateRequest($request))->validate();

        return JsonResponse::success([
            'template' => $this->service->createTemplate($this->user($request), $payload),
        ], 'Master item inspeksi berhasil dibuat.', [], 201);
    }

    public function updateTemplate(Request $request): JsonResponse
    {
        $payload = (new UpdateInspectionTemplateRequest($request))->validate();

        return JsonResponse::success([
            'template' => $this->service->updateTemplate((int) $request->routeParam('template_id'), $this->user($request), $payload),
        ], 'Master item inspeksi berhasil diperbarui.');
    }

    public function sellerOverview(Request $request): JsonResponse
    {
        $overview = $this->service->sellerOverview($this->user($request), $request->query());

        return JsonResponse::success([
            'overview' => $overview,
        ], 'Overview inspeksi seller berhasil diambil.', [
            'limit' => (int) ($request->query('limit', 100)),
        ]);
    }

    public function createReport(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new CreateInspectionReportRequest($request))->validate();

        return JsonResponse::success([
            'report' => $this->service->createReport((int) $request->routeParam('car_id'), $user, $payload),
        ], 'Laporan inspeksi berhasil dibuat.', [], 201);
    }

    public function updateReport(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpdateInspectionReportRequest($request))->validate();

        return JsonResponse::success([
            'report' => $this->service->updateReport((int) $request->routeParam('report_id'), $user, $payload),
        ], 'Metadata laporan inspeksi berhasil diperbarui.');
    }

    public function createItem(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new CreateInspectionItemRequest($request))->validate();

        return JsonResponse::success([
            'report' => $this->service->createItem((int) $request->routeParam('report_id'), $user, $payload),
        ], 'Item inspeksi berhasil dibuat.', [], 201);
    }

    public function updateItem(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpdateInspectionItemRequest($request))->validate();

        return JsonResponse::success([
            'report' => $this->service->updateItem(
                (int) $request->routeParam('report_id'),
                (int) $request->routeParam('item_id'),
                $user,
                $payload
            ),
        ], 'Item inspeksi berhasil diperbarui.');
    }
}
