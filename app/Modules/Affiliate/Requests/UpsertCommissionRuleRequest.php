<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Requests;

use App\Core\Validation\FormRequest;

class UpsertCommissionRuleRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'car_id' => 'nullable|integer',
            'commission_type' => 'required|string|in:percent,flat',
            'commission_value' => 'required',
            'status' => 'required|string|in:active,inactive',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        $value = $data['commission_value'] ?? null;

        if (! is_numeric($value) || (float) $value < 0) {
            $errors['commission_value'] = 'The commission_value field must be zero or greater.';
            return;
        }

        if (($data['commission_type'] ?? null) === 'percent' && (float) $value > 100) {
            $errors['commission_value'] = 'The commission_value field must be between 0 and 100 for percent rules.';
        }
    }
}
