<?php

declare(strict_types=1);

namespace App\Modules\Sliders\Services;

class SliderTemplateRegistry
{
    public const TEMPLATES = [
        'elegant_gradient',
        'glassmorphism',
        'minimal_product',
        'full_image',
    ];

    public const POSITIONS = [
        'landing_hero',
        'buyer_home',
        'public_home',
    ];

    public const ANIMATIONS = [
        'fade',
        'slide',
        'zoom',
        'rise',
        'none',
    ];
}
