<?php

declare(strict_types=1);

namespace App\Modules\Sliders\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Sliders\Requests\ListSlidersRequest;
use App\Modules\Sliders\Requests\SliderPayloadRequest;
use App\Modules\Sliders\Requests\UploadSliderImageRequest;
use App\Modules\Sliders\Services\SliderService;

class SliderController extends Controller
{
    private SliderService $service;

    public function __construct(SliderService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function publicIndex(Request $request): JsonResponse
    {
        $filters = (new ListSlidersRequest($request))->validate();
        $result = $this->service->publicList($filters);

        return JsonResponse::success([
            'sliders' => $result['sliders'],
        ], 'Data slider publik berhasil diambil.', $result['meta']);
    }

    public function adminIndex(Request $request): JsonResponse
    {
        $filters = (new ListSlidersRequest($request))->validate();
        $result = $this->service->adminList($this->user($request), $filters);

        return JsonResponse::success([
            'sliders' => $result['sliders'],
        ], 'Data slider admin berhasil diambil.', $result['meta']);
    }

    public function show(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'slider' => $this->service->detail($this->user($request), (int) $request->routeParam('id')),
        ], 'Detail slider berhasil diambil.');
    }

    public function create(Request $request): JsonResponse
    {
        $payload = (new SliderPayloadRequest($request, true))->validate();

        return JsonResponse::success([
            'slider' => $this->service->create($this->user($request), $payload),
        ], 'Slider berhasil dibuat.', [], 201);
    }

    public function update(Request $request): JsonResponse
    {
        $payload = (new SliderPayloadRequest($request))->validate();

        return JsonResponse::success([
            'slider' => $this->service->update($this->user($request), (int) $request->routeParam('id'), $payload),
        ], 'Slider berhasil diperbarui.');
    }

    public function delete(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'slider' => $this->service->delete($this->user($request), (int) $request->routeParam('id')),
        ], 'Slider berhasil diarsipkan.');
    }

    public function toggle(Request $request): JsonResponse
    {
        return JsonResponse::success([
            'slider' => $this->service->toggle($this->user($request), (int) $request->routeParam('id')),
        ], 'Status slider berhasil diperbarui.');
    }

    public function reorder(Request $request): JsonResponse
    {
        $items = $request->input('items', []);
        $result = $this->service->reorder($this->user($request), is_array($items) ? $items : []);

        return JsonResponse::success([
            'sliders' => $result['sliders'],
        ], 'Urutan slider berhasil diperbarui.', $result['meta']);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $payload = (new UploadSliderImageRequest($request))->validate();
        $asset = $this->service->uploadImage($this->user($request), $payload);

        return JsonResponse::success([
            'asset' => $asset,
            'url' => $asset['url'] ?? null,
        ], 'Gambar slider berhasil diupload.', [], 201);
    }
}
