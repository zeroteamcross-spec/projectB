<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Mappers;

class InspectionMapper
{
    public static function carSummary(array $car): array
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
            'price_cash' => self::nullableInt($car['price_cash']),
            'price_discount' => self::nullableInt($car['price_discount']),
            'price_credit' => self::nullableInt($car['price_credit']),
            'inspection_summary_status' => $car['inspection_summary_status'],
            'published_at' => $car['published_at'],
            'created_at' => $car['created_at'],
            'updated_at' => $car['updated_at'],
        ];
    }

    public static function carSummaries(array $cars): array
    {
        return array_map(static fn (array $car): array => self::carSummary($car), $cars);
    }

    public static function report(array $report, array $items = []): array
    {
        return [
            'id' => (int) $report['id'],
            'car_id' => (int) $report['car_id'],
            'inspector_user_id' => (int) $report['inspector_user_id'],
            'report_status' => $report['report_status'],
            'summary_notes' => $report['summary_notes'],
            'inspected_at' => $report['inspected_at'],
            'created_at' => $report['created_at'],
            'updated_at' => $report['updated_at'],
            'items' => self::items($items),
        ];
    }

    public static function item(array $item): array
    {
        return [
            'id' => (int) $item['id'],
            'inspection_report_id' => (int) $item['inspection_report_id'],
            'template_id' => (int) $item['template_id'],
            'item_name_snapshot' => $item['item_name_snapshot'],
            'item_name' => $item['item_name_snapshot'] ?: ($item['template_item_name'] ?? null),
            'result_status' => $item['result_status'],
            'description' => $item['description'],
            'notes' => $item['notes'],
            'created_at' => $item['created_at'],
            'updated_at' => $item['updated_at'],
            'template' => isset($item['template_item_name'])
                ? [
                    'id' => (int) $item['template_id'],
                    'category_name' => $item['template_category_name'],
                    'item_name' => $item['template_item_name'],
                ]
                : null,
        ];
    }

    public static function items(array $items): array
    {
        return array_map(static fn (array $item): array => self::item($item), $items);
    }

    public static function template(array $template): array
    {
        return [
            'id' => (int) $template['id'],
            'category_name' => $template['category_name'],
            'item_name' => $template['item_name'],
            'description' => $template['description'],
            'sort_order' => (int) ($template['sort_order'] ?? 0),
            'is_active' => (bool) ($template['is_active'] ?? true),
            'created_at' => $template['created_at'] ?? null,
            'updated_at' => $template['updated_at'] ?? null,
        ];
    }

    public static function templates(array $templates): array
    {
        return array_map(static fn (array $template): array => self::template($template), $templates);
    }

    private static function nullableInt($value): ?int
    {
        return $value === null ? null : (int) $value;
    }
}
