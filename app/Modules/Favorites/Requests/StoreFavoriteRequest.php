<?php

declare(strict_types=1);

namespace App\Modules\Favorites\Requests;

use App\Core\Validation\FormRequest;

class StoreFavoriteRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'car_id' => 'required|integer|min_value:1',
        ];
    }
}
