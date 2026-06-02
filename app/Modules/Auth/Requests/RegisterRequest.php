<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use App\Core\Validation\FormRequest;

class RegisterRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'role' => 'required|string|in:buyer,seller',
            'name' => 'required|string|max:200',
            'phone_number' => 'nullable|string|max:25',
            'email' => 'required|email|max:100',
            'password' => 'required|string|min:6|max:255',
            'address' => 'nullable|string|max:512',
            'showroom' => 'nullable|array',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (($data['role'] ?? null) !== 'seller') {
            return;
        }

        if (! isset($data['showroom']) || ! is_array($data['showroom'])) {
            $errors['showroom'] = 'The showroom field is required for seller registration.';
            return;
        }

        if (empty($data['showroom']['name']) || ! is_string($data['showroom']['name'])) {
            $errors['showroom.name'] = 'The showroom.name field is required.';
        }

        if (isset($data['showroom']['name']) && strlen((string) $data['showroom']['name']) > 225) {
            $errors['showroom.name'] = 'The showroom.name field must not be greater than 225 characters.';
        }
    }
}
