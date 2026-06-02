<?php

declare(strict_types=1);

namespace App\Modules\Images\Mappers;

class CarImageMapper
{
    public static function toArray(array $image): array
    {
        return [
            'id' => (int) $image['id'],
            'car_id' => (int) $image['car_id'],
            'user_id' => (int) $image['user_id'],
            'file_path' => $image['file_path'],
            'file_name' => $image['file_name'],
            'file_size' => isset($image['file_size']) ? (int) $image['file_size'] : null,
            'mime_type' => $image['mime_type'],
            'sort_order' => (int) $image['sort_order'],
            'is_cover' => (bool) $image['is_cover'],
            'created_at' => $image['created_at'],
            'updated_at' => $image['updated_at'],
        ];
    }

    public static function many(array $images): array
    {
        return array_map(static fn (array $image): array => self::toArray($image), $images);
    }
}
