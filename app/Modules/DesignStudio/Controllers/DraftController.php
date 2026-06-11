<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Core\Exceptions\ValidationException;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\DesignStudio\Services\DraftService;

class DraftController extends Controller
{
    private DraftService $service;

    public function __construct(DraftService $service)
    {
        parent::__construct();
        $this->service = $service;
    }

    public function load(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        AuthPolicy::requireRole($actor, ['super_admin']);

        $route = (string) $request->query('route', '');

        if ($route === '') {
            throw new ValidationException([
                'route' => 'Parameter route wajib diisi.',
            ]);
        }

        $draft = $this->service->load($route);

        return JsonResponse::success([
            'route' => $route,
            'draft' => $draft,
        ], 'Daftar draf layout berhasil diambil.');
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $this->user($request);
        AuthPolicy::requireRole($actor, ['super_admin']);

        $route = (string) $request->query('route', '');

        if ($route === '') {
            throw new ValidationException([
                'route' => 'Parameter route wajib diisi.',
            ]);
        }

        $draftPayload = $request->input();

        if ($draftPayload === null || $draftPayload === []) {
            throw new ValidationException([
                'body' => 'Payload draf tidak boleh kosong.',
            ]);
        }

        $actorId = isset($actor['id']) ? (int) $actor['id'] : null;
        $success = $this->service->store($route, $draftPayload, $actorId);

        if (! $success) {
            return JsonResponse::error('Gagal menyimpan draf layout.', [], 500);
        }

        return JsonResponse::success([
            'route' => $route,
            'draft' => $this->service->load($route),
        ], 'Draf layout berhasil disimpan.');
    }
}
