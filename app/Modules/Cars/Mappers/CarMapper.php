<?php

declare(strict_types=1);

namespace App\Modules\Cars\Mappers;

class CarMapper
{
    public static function toArray(array $car): array
    {
        return [
            'id' => (int) $car['id'],
            'seller_user_id' => (int) $car['seller_user_id'],
            'showroom_id' => isset($car['showroom_id']) ? (int) $car['showroom_id'] : null,
            'listing_status' => $car['listing_status'],
            'stock' => (int) $car['stock'],
            'license_plate_number' => $car['license_plate_number'],
            'brand_name' => $car['brand_name'],
            'model_name' => $car['model_name'],
            'sub_model_name' => $car['sub_model_name'],
            'primary_color' => $car['primary_color'],
            'secondary_color' => $car['secondary_color'],
            'color_variation' => $car['color_variation'],
            'document_type' => $car['document_type'],
            'registration_date' => $car['registration_date'],
            'transmission' => $car['transmission'],
            'engine_number' => $car['engine_number'],
            'chassis_number' => $car['chassis_number'],
            'location_name' => $car['location_name'],
            'engine_capacity_cc' => self::nullableInt($car['engine_capacity_cc']),
            'mileage_km' => self::nullableInt($car['mileage_km']),
            'seat_count' => self::nullableInt($car['seat_count']),
            'previous_owner_count' => self::nullableInt($car['previous_owner_count']),
            'has_service_book' => (bool) $car['has_service_book'],
            'key_count' => (int) $car['key_count'],
            'description' => $car['description'],
            'youtube_url' => $car['youtube_url'] ?? null,
            'price_cash' => self::nullableInt($car['price_cash']),
            'price_discount' => self::nullableInt($car['price_discount']),
            'price_credit' => self::nullableInt($car['price_credit']),
            'dp_amount' => self::nullableInt($car['dp_amount'] ?? null),
            'inspection_summary_status' => $car['inspection_summary_status'],
            'published_at' => $car['published_at'],
            'created_at' => $car['created_at'],
            'updated_at' => $car['updated_at'],
            'car_cover_image' => $car['car_cover_image'] ?? null,
            'cover_image' => $car['car_cover_image'] ?? null,
            'cover_image_url' => $car['car_cover_image'] ?? null,
            'images' => $car['images'] ?? [],
        ];
    }

    public static function many(array $cars): array
    {
        return array_map(static fn (array $car): array => self::toArray($car), $cars);
    }

    private static function nullableInt($value): ?int
    {
        return $value === null ? null : (int) $value;
    }
}
