<?php

declare(strict_types=1);

namespace App\Modules\Favorites\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Favorites\Requests\StoreFavoriteRequest;
use App\Modules\Favorites\Services\FavoriteService;
use App\Modules\Favorites\Support\FavoritesSchema;

class FavoriteController extends Controller
{
    private FavoriteService $service;

    private FavoritesSchema $schema;

    public function __construct(FavoriteService $service, FavoritesSchema $schema)
    {
        parent::__construct();

        $this->service = $service;
        $this->schema = $schema;
    }

    public function index(Request $request): JsonResponse
    {
        $this->schema->ensure();

        return JsonResponse::success(
            $this->service->list($this->user($request)),
            'Daftar favorit berhasil diambil.'
        );
    }

    public function store(Request $request): JsonResponse
    {
        $this->schema->ensure();
        $user = $this->user($request);
        $payload = (new StoreFavoriteRequest($request))->validate();

        return JsonResponse::success(
            $this->service->add($user, (int) $payload['car_id']),
            'Mobil berhasil ditambahkan ke favorit.',
            [],
            201
        );
    }

    public function destroy(Request $request): JsonResponse
    {
        $this->schema->ensure();

        return JsonResponse::success(
            $this->service->remove($this->user($request), (int) $request->routeParam('car_id')),
            'Mobil berhasil dihapus dari favorit.'
        );
    }
}
