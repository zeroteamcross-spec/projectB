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

        if (empty($data['showroom']['slug']) || ! is_string($data['showroom']['slug'])) {
            $errors['showroom.slug'] = 'Slug showroom wajib diisi.';
        }

        if (empty($data['showroom']['city_name']) || ! is_string($data['showroom']['city_name'])) {
            $errors['showroom.city_name'] = 'Kota showroom wajib dipilih.';
        }

        $this->validateOptionalShowroomString($data, 'slug', 80, $errors);
        $this->validateOptionalShowroomString($data, 'city_name', 100, $errors);
        $this->validateOptionalShowroomString($data, 'address', 512, $errors);
        $this->validateOptionalShowroomString($data, 'phone_number', 25, $errors);
        $this->validateOptionalShowroomString($data, 'bank_type', 100, $errors);
        $this->validateOptionalShowroomString($data, 'bank_account_number', 50, $errors);
        $this->validateOptionalShowroomString($data, 'bank_account_name', 225, $errors);
    }

    private function validateOptionalShowroomString(array $data, string $field, int $maxLength, array &$errors): void
    {
        $key = 'showroom.' . $field;

        if (isset($errors[$key]) || ! isset($data['showroom'][$field])) {
            return;
        }

        $value = $data['showroom'][$field];

        if ($value === null || $value === '') {
            return;
        }

        if (! is_string($value)) {
            $errors[$key] = 'The ' . $key . ' field must be a string.';
            return;
        }

        if (strlen($value) > $maxLength) {
            $errors[$key] = 'The ' . $key . ' field must not be greater than ' . $maxLength . ' characters.';
        }
    }
}
