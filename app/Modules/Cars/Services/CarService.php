<?php

declare(strict_types=1);

namespace App\Modules\Cars\Services;

use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ForbiddenException;
use App\Modules\Cars\Mappers\CarMapper;
use App\Modules\Cars\Policies\CarPolicy;
use App\Modules\Cars\Repositories\CarRepository;
use App\Modules\Notifications\Services\NotificationService;

class CarService
{
    private CarRepository $cars;

    private ?NotificationService $notificationService;

    public function __construct(CarRepository $cars, ?NotificationService $notificationService = null)
    {
        $this->cars = $cars;
        $this->notificationService = $notificationService;
    }

    public function catalog(array $filters): array
    {
        $pagination = $this->pagination($filters);
        $filters['listing_status'] = 'published';

        return $this->listWithMeta($filters, $pagination);
    }

    public function sellerCars(array $user, array $filters): array
    {
        CarPolicy::requireSeller($user);
        $pagination = $this->pagination($filters);
        $filters['seller_user_id'] = (int) $user['id'];

        return $this->listWithMeta($filters, $pagination);
    }

    public function adminCars(array $user, array $filters): array
    {
        CarPolicy::requireAdmin($user);
        $pagination = $this->pagination($filters);

        return $this->listWithMeta($filters, $pagination);
    }

    public function detail(int $id, ?array $user = null): array
    {
        $car = $this->cars->findById($id, in_array(($user['role'] ?? null), ['admin', 'super_admin'], true));

        if (! $car || (! CarPolicy::canView($car, $user))) {
            throw new NotFoundException('Mobil tidak ditemukan.');
        }

        return CarMapper::toArray($car);
    }

    public function create(array $user, array $data): array
    {
        CarPolicy::requireSellerOrAdmin($user);
        $sellerUserId = (int) ($data['seller_user_id'] ?? $user['id']);

        if (($user['role'] ?? null) !== 'admin' && $sellerUserId !== (int) $user['id']) {
            throw new ForbiddenException('Seller hanya dapat membuat mobil miliknya sendiri.');
        }

        $now = date('Y-m-d H:i:s');
        $listingStatus = $data['listing_status'] ?? 'draft';
        $payload = $this->normalizePayload($data);
        $payload['seller_user_id'] = $sellerUserId;
        $payload['showroom_id'] = array_key_exists('showroom_id', $data)
            ? $data['showroom_id']
            : $this->cars->showroomIdForSeller($sellerUserId);
        $payload['listing_status'] = $listingStatus;
        $payload['inspection_summary_status'] = $data['inspection_summary_status'] ?? 'not_checked';
        $payload['published_at'] = $listingStatus === 'published' ? $now : null;
        $payload['created_at'] = $now;
        $payload['updated_at'] = null;

        $carId = $this->cars->create($payload);
        $created = $this->cars->findById($carId, true) ?? array_merge($payload, ['id' => $carId]);

        if ($this->notificationService !== null && in_array(($user['role'] ?? null), ['admin', 'super_admin'], true) && ($created['listing_status'] ?? null) === 'published') {
            $this->notificationService->createListingApprovedNotification($created);
        }

        if ($this->notificationService !== null && in_array((string) ($created['inspection_summary_status'] ?? ''), ['not_checked', 'partial'], true)) {
            $this->notificationService->createInspectionNeededNotification($created);
        }

        return $this->detail($carId, $user);
    }

    public function update(array $user, int $id, array $data): array
    {
        $car = $this->cars->findById($id, true);
        CarPolicy::ensureCanManage($car, $user);

        $payload = $this->normalizePayload(array_merge($car, $data));

        if (array_key_exists('listing_status', $data)) {
            $payload['listing_status'] = $data['listing_status'];
            $payload['published_at'] = $data['listing_status'] === 'published'
                ? ($car['published_at'] ?? date('Y-m-d H:i:s'))
                : $car['published_at'];
        } else {
            $payload['listing_status'] = $car['listing_status'];
            $payload['published_at'] = $car['published_at'];
        }

        if (in_array(($user['role'] ?? null), ['admin', 'super_admin'], true) && array_key_exists('seller_user_id', $data)) {
            $payload['seller_user_id'] = (int) $data['seller_user_id'];
        } else {
            $payload['seller_user_id'] = (int) $car['seller_user_id'];
        }

        $payload['showroom_id'] = array_key_exists('showroom_id', $data) ? $data['showroom_id'] : $car['showroom_id'];
        $payload['inspection_summary_status'] = $data['inspection_summary_status'] ?? $car['inspection_summary_status'];
        $payload['updated_at'] = date('Y-m-d H:i:s');

        $this->cars->update($id, $payload);
        $updated = $this->cars->findById($id, true) ?? array_merge($car, $payload, ['id' => $id]);

        $this->notifyListingStatusChange($car, $updated, $user);
        $this->notifyInspectionNeeded($car, $updated);

        return $this->detail($id, $user);
    }

    public function archive(array $user, int $id): array
    {
        $car = $this->cars->findById($id, true);
        CarPolicy::ensureCanManage($car, $user);
        $this->cars->archive($id);

        return [
            'id' => $id,
            'listing_status' => 'archived',
        ];
    }

    private function listWithMeta(array $filters, array $pagination): array
    {
        $cars = $this->cars->list($filters, $pagination['limit'], $pagination['offset']);
        $total = $this->cars->count($filters);

        return [
            'cars' => CarMapper::many($cars),
            'meta' => [
                'page' => $pagination['page'],
                'limit' => $pagination['limit'],
                'total' => $total,
            ],
        ];
    }

    private function pagination(array $filters): array
    {
        $page = max(1, (int) ($filters['page'] ?? 1));
        $limit = max(1, min((int) ($filters['limit'] ?? 20), 100));

        return [
            'page' => $page,
            'limit' => $limit,
            'offset' => ($page - 1) * $limit,
        ];
    }

    private function normalizePayload(array $data): array
    {
        return [
            'stock' => (int) ($data['stock'] ?? 1),
            'license_plate_number' => $data['license_plate_number'] ?? null,
            'brand_name' => $data['brand_name'],
            'model_name' => $data['model_name'],
            'sub_model_name' => $data['sub_model_name'] ?? null,
            'primary_color' => $data['primary_color'] ?? null,
            'secondary_color' => $data['secondary_color'] ?? null,
            'color_variation' => $data['color_variation'] ?? null,
            'document_type' => $data['document_type'] ?? null,
            'registration_date' => $data['registration_date'] ?? null,
            'transmission' => $data['transmission'] ?? null,
            'engine_number' => $data['engine_number'] ?? null,
            'chassis_number' => $data['chassis_number'] ?? null,
            'location_name' => $data['location_name'] ?? null,
            'engine_capacity_cc' => isset($data['engine_capacity_cc']) ? (int) $data['engine_capacity_cc'] : null,
            'mileage_km' => isset($data['mileage_km']) ? (int) $data['mileage_km'] : null,
            'seat_count' => isset($data['seat_count']) ? (int) $data['seat_count'] : null,
            'previous_owner_count' => isset($data['previous_owner_count']) ? (int) $data['previous_owner_count'] : null,
            'has_service_book' => (int) ($data['has_service_book'] ?? 0),
            'key_count' => (int) ($data['key_count'] ?? 1),
            'description' => $data['description'] ?? null,
            'youtube_url' => $data['youtube_url'] ?? null,
            'price_cash' => isset($data['price_cash']) ? (int) $data['price_cash'] : null,
            'price_discount' => isset($data['price_discount']) ? (int) $data['price_discount'] : null,
            'price_credit' => isset($data['price_credit']) ? (int) $data['price_credit'] : null,
        ];
    }

    private function notifyListingStatusChange(array $before, array $after, array $actor): void
    {
        if ($this->notificationService === null || !in_array(($actor['role'] ?? null), ['admin', 'super_admin'], true)) {
            return;
        }

        $beforeStatus = (string) ($before['listing_status'] ?? '');
        $afterStatus = (string) ($after['listing_status'] ?? '');

        if ($beforeStatus === $afterStatus) {
            return;
        }

        if ($afterStatus === 'published') {
            $this->notificationService->createListingApprovedNotification($after);
            return;
        }

        if ($afterStatus === 'archived') {
            $this->notificationService->createListingRejectedNotification($after);
        }
    }

    private function notifyInspectionNeeded(array $before, array $after): void
    {
        if ($this->notificationService === null) {
            return;
        }

        $beforeStatus = (string) ($before['inspection_summary_status'] ?? '');
        $afterStatus = (string) ($after['inspection_summary_status'] ?? '');

        if ($afterStatus === 'completed' || $afterStatus === '' || $beforeStatus === $afterStatus) {
            return;
        }

        if (in_array($afterStatus, ['not_checked', 'partial'], true)) {
            $this->notificationService->createInspectionNeededNotification($after);
        }
    }

}
