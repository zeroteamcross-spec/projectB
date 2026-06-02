<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Requests;

use App\Core\Validation\FormRequest;

class UpdateInspectionItemRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'result_status' => 'required|string|in:good,fair,bad,not_available',
            'description' => 'nullable|string',
            'notes' => 'nullable|string',
            'report_status' => 'nullable|string|in:draft,completed,published',
            'summary_notes' => 'nullable|string',
        ];
    }
}
