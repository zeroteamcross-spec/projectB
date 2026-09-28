<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Requests;

use App\Core\Validation\FormRequest;

class RequestCustomDomainRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'domain' => 'required|string|max:255',
        ];
    }
}
