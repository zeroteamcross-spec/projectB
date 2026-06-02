<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Requests;

use App\Core\Validation\FormRequest;

class UpsertShowroomRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'name' => 'nullable|string|max:225',
            'address' => 'nullable|string|max:512',
            'phone_number' => 'nullable|string|max:25',
            'bank_account_number' => 'nullable|string|max:50',
            'bank_type' => 'nullable|string|max:100',
            'bank_account_name' => 'nullable|string|max:225',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        $allowedFields = [
            'name',
            'address',
            'phone_number',
            'bank_account_number',
            'bank_type',
            'bank_account_name',
        ];

        if (array_intersect(array_keys($data), $allowedFields) === []) {
            $errors['payload'] = 'At least one showroom field must be provided.';
        }
    }
}
