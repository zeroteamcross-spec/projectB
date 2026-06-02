<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use App\Core\Validation\FormRequest;

class LogoutRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'all_devices' => 'nullable|boolean',
        ];
    }
}
