<?php

declare(strict_types=1);

namespace App\Modules\Users\Requests;

use App\Core\Validation\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'name' => 'nullable|string|max:200',
            'phone_number' => 'nullable|string|max:25',
            'email' => 'nullable|email|max:100',
            'address' => 'nullable|string|max:512',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        $allowedFields = ['name', 'phone_number', 'email', 'address'];

        if (array_intersect(array_keys($data), $allowedFields) === []) {
            $errors['payload'] = 'At least one profile field must be provided.';
        }
    }
}
