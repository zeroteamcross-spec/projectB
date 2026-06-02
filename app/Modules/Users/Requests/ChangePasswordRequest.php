<?php

declare(strict_types=1);

namespace App\Modules\Users\Requests;

use App\Core\Validation\FormRequest;

class ChangePasswordRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:8',
            'new_password_confirmation' => 'required|string|min:8',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (($data['new_password'] ?? null) !== ($data['new_password_confirmation'] ?? null)) {
            $errors['new_password_confirmation'] = 'Konfirmasi password baru tidak sama.';
        }

        if (($data['current_password'] ?? null) !== null && ($data['current_password'] ?? null) === ($data['new_password'] ?? null)) {
            $errors['new_password'] = 'Password baru tidak boleh sama dengan password lama.';
        }
    }
}
