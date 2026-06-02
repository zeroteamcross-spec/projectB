<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use App\Core\Validation\FormRequest;

class LoginRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'email' => 'required|email|max:100',
            'password' => 'required|string|min:6|max:255',
            'remember' => 'nullable|boolean',
        ];
    }
}
