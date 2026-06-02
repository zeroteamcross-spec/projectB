<?php

declare(strict_types=1);

namespace App\Modules\Sliders\Mappers;

class SliderMapper
{
    public static function toArray(array $slider): array
    {
        $description = $slider['body_text'] ?? $slider['description'] ?? null;

        return [
            'id' => (int) $slider['id'],
            'code' => $slider['code'],
            'title' => $slider['title'],
            'subtitle' => $slider['subtitle'] ?? null,
            'description' => $description,
            'body_text' => $description,
            'html_content' => $slider['html_content'] ?? null,
            'image_url' => $slider['image_url'] ?? null,
            'image_alt' => $slider['image_alt'] ?? null,
            'cta_text' => $slider['cta_text'] ?? null,
            'cta_url' => $slider['cta_url'] ?? null,
            'position_key' => $slider['position_key'],
            'position' => $slider['position_key'],
            'template_key' => $slider['template_key'],
            'animation_key' => $slider['animation_key'],
            'sort_order' => (int) $slider['sort_order'],
            'is_active' => (bool) $slider['is_active'],
            'start_at' => $slider['start_at'] ?? null,
            'end_at' => $slider['end_at'] ?? null,
            'created_by' => isset($slider['created_by']) ? (int) $slider['created_by'] : null,
            'updated_by' => isset($slider['updated_by']) ? (int) $slider['updated_by'] : null,
            'created_at' => $slider['created_at'] ?? null,
            'updated_at' => $slider['updated_at'] ?? null,
            'deleted_at' => $slider['deleted_at'] ?? null,
        ];
    }

    public static function many(array $sliders): array
    {
        return array_map(static fn (array $slider): array => self::toArray($slider), $sliders);
    }
}
