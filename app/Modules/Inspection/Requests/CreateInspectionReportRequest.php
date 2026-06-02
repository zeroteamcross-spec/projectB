<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Requests;

use App\Core\Validation\FormRequest;

class CreateInspectionReportRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'report_status' => 'nullable|string|in:draft,completed,published',
            'summary_notes' => 'nullable|string',
            'inspected_at' => 'nullable|date',
            'items' => 'required|array',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (! isset($data['items']) || ! is_array($data['items']) || $data['items'] === []) {
            $errors['items'] = 'The items field must contain at least one inspection item.';
        } else {
            foreach ($data['items'] as $index => $item) {
                $this->validateItem($item, $index, $errors);
            }
        }
    }

    private function validateItem($item, int $index, array &$errors): void
    {
        if (! is_array($item)) {
            $errors['items.' . $index] = 'Each inspection item must be an object.';
            return;
        }

        if (! isset($item['template_id']) || filter_var($item['template_id'], FILTER_VALIDATE_INT) === false) {
            $errors['items.' . $index . '.template_id'] = 'The template_id field must be an integer.';
        }

        if (empty($item['result_status']) || ! in_array($item['result_status'], ['good', 'fair', 'bad', 'not_available'], true)) {
            $errors['items.' . $index . '.result_status'] = 'The result_status field must be good, fair, bad, or not_available.';
        }

        foreach (['description', 'notes'] as $field) {
            if (isset($item[$field]) && ! is_string($item[$field])) {
                $errors['items.' . $index . '.' . $field] = 'The ' . $field . ' field must be a string.';
            }
        }
    }
}
