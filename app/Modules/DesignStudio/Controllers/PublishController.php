<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Core\Exceptions\ValidationException;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\DesignStudio\Services\PublishService;

class PublishController extends Controller
{
    private PublishService $service;

    public function __construct(PublishService $service)
    {
        parent::__construct();
        $this->service = $service;
    }

    public function publish(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        AuthPolicy::requireRole($actor, ['super_admin']);

        $route = (string) $request->query('route', '');

        if ($route === '') {
            throw new ValidationException([
                'route' => 'Parameter route wajib diisi.',
            ]);
        }

        $publishNote = (string) $request->input('publishNote', '');

        if (strlen(trim($publishNote)) < 5 || strlen(trim($publishNote)) > 500) {
            throw new ValidationException([
                'publishNote' => 'Publish note wajib diisi antara 5 hingga 500 karakter.',
            ]);
        }

        $actorId = isset($actor['id']) ? (int) $actor['id'] : null;

        if ($actorId === null) {
            return JsonResponse::error('User ID tidak valid.', [], 400);
        }

        try {
            $snapshot = $this->service->publish($route, $actorId, $publishNote);
        } catch (\Throwable $e) {
            return JsonResponse::error('Exception: ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine(), [], 500);
        }

        if ($snapshot === null) {
            return JsonResponse::error('Gagal menerbitkan draf layout. Pastikan draf ada dan valid.', [], 500);
        }

        return JsonResponse::success([
            'route' => $route,
            'published' => $snapshot,
        ], 'Draf layout berhasil diterbitkan.');
    }

    public function loadPublished(Request $request): JsonResponse
    {
        $route = (string) $request->query('route', '');

        if ($route === '') {
            throw new ValidationException([
                'route' => 'Parameter route wajib diisi.',
            ]);
        }

        $snapshot = $this->service->getPublished($route);

        if ($snapshot === null) {
            return JsonResponse::success([
                'route' => $route,
                'published' => null,
            ], 'Belum ada layout yang diterbitkan untuk rute ini.');
        }

        return JsonResponse::success([
            'route' => $route,
            'published' => $snapshot,
        ], 'Layout terbitan berhasil dimuat.');
    }
}
