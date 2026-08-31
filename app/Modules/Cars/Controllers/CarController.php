<?php

declare(strict_types=1);

namespace App\Modules\Cars\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Cars\Requests\CreateCarRequest;
use App\Modules\Cars\Requests\ListCarsRequest;
use App\Modules\Cars\Requests\MarkCarSoldExternalRequest;
use App\Modules\Cars\Requests\UpdateCarRequest;
use App\Modules\Cars\Services\CarService;

class CarController extends Controller
{
    private CarService $service;

    public function __construct(CarService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function index(Request $request): JsonResponse
    {
        $filters = (new ListCarsRequest($request))->validate();
        $result = $this->service->catalog($filters);

        return JsonResponse::success([
            'cars' => $result['cars'],
        ], 'Data katalog mobil berhasil diambil.', $result['meta']);
    }

    public function show(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'car' => $this->service->detail((int) $request->routeParam('id'), $request->user()),
        ], 'Detail mobil berhasil diambil.');
    }

    public function sellerIndex(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $filters = (new ListCarsRequest($request))->validate();
        $result = $this->service->sellerCars($user, $filters);

        return JsonResponse::success([
            'cars' => $result['cars'],
        ], 'Data mobil seller berhasil diambil.', $result['meta']);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $filters = (new ListCarsRequest($request))->validate();
        $result = $this->service->adminCars($user, $filters);

        return JsonResponse::success([
            'cars' => $result['cars'],
        ], 'Data mobil admin berhasil diambil.', $result['meta']);
    }

    public function create(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new CreateCarRequest($request))->validate();

        return JsonResponse::success([
            'car' => $this->service->create($user, $payload),
        ], 'Mobil berhasil dibuat.', [], 201);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpdateCarRequest($request))->validate();

        return JsonResponse::success([
            'car' => $this->service->update($user, (int) $request->routeParam('id'), $payload),
        ], 'Mobil berhasil diperbarui.');
    }

    public function archive(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'car' => $this->service->archive($user, (int) $request->routeParam('id')),
        ], 'Mobil berhasil diarsipkan.');
    }

    public function markSoldExternal(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new MarkCarSoldExternalRequest($request))->validate();

        return JsonResponse::success([
            'car' => $this->service->markSoldExternal($user, (int) $request->routeParam('id'), $payload['note']),
        ], 'Mobil berhasil ditandai terjual di luar sistem.');
    }
}
