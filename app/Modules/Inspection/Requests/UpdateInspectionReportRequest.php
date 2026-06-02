<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Requests;

use App\Core\Validation\FormRequest;

class UpdateInspectionReportRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'report_status' => 'nullable|string|in:draft,completed,published',
            'summary_notes' => 'nullable|string',
            'inspected_at' => 'nullable|date',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        $allowedFields = ['report_status', 'summary_notes', 'inspected_at'];

        if (array_intersect(array_keys($data), $allowedFields) === []) {
            $errors['payload'] = 'At least one inspection report field must be provided.';
        }
    }
}
