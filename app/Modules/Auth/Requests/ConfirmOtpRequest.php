<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use App\Core\Validation\FormRequest;

class ConfirmOtpRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'phone_number' => 'required|string|max:25',
            'otp_code' => 'required|string|max:20',
            'remember' => 'nullable|boolean',
        ];
    }
}
