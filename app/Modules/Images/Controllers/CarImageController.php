<?php

declare(strict_types=1);

namespace App\Modules\Images\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Images\Requests\UploadCarImageRequest;
use App\Modules\Images\Services\CarImageService;

class CarImageController extends Controller
{
    private CarImageService $service;

    public function __construct(CarImageService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function index(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'images' => $this->service->listByCar((int) $request->routeParam('car_id'), $request->user()),
        ], 'Data gambar mobil berhasil diambil.');
    }

    public function upload(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UploadCarImageRequest($request))->validate();

        return JsonResponse::success([
            'image' => $this->service->upload((int) $request->routeParam('car_id'), $user, $payload),
        ], 'Gambar mobil berhasil diupload.', [], 201);
    }

    public function setCover(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'image' => $this->service->setCover(
                (int) $request->routeParam('car_id'),
                (int) $request->routeParam('image_id'),
                $user
            ),
        ], 'Cover gambar mobil berhasil diperbarui.');
    }

    public function reorder(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $items = $request->input('items', []);

        return JsonResponse::success([
            'images' => $this->service->reorder((int) $request->routeParam('car_id'), $user, is_array($items) ? $items : []),
        ], 'Urutan gambar mobil berhasil diperbarui.');
    }

    public function delete(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'image' => $this->service->delete(
                (int) $request->routeParam('car_id'),
                (int) $request->routeParam('image_id'),
                $user
            ),
        ], 'Gambar mobil berhasil dihapus.');
    }
}
