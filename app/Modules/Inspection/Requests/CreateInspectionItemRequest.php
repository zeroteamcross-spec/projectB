<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Requests;

use App\Core\Validation\FormRequest;

class CreateInspectionItemRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'template_id' => 'required|integer|min_value:1',
            'result_status' => 'required|string|in:good,fair,bad,not_available',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
        ];
    }
}
