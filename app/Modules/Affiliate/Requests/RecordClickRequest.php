<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Requests;

use App\Core\Validation\FormRequest;

class RecordClickRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'referral_code' => 'required|string|min:3|max:50',
            'landing_url' => 'nullable|string|max:1000',
        ];
    }
}
