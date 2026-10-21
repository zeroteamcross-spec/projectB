<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use App\Core\Validation\FormRequest;

class LoginRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'email' => 'nullable|email|max:100',
            'buyer_username' => 'nullable|string|min:3|max:50',
            'password' => 'required|string|min:6|max:255',
            'remember' => 'nullable|boolean',
        ];
    }

    protected function data(): array
    {
        $data = parent::data();
        if (is_string($data['buyer_username'] ?? null)) {
            $data['buyer_username'] = strtolower(trim($data['buyer_username']));
        }

        return $data;
    }

    protected function after(array $data, array &$errors): void
    {
        $hasEmail = is_string($data['email'] ?? null) && trim($data['email']) !== '';
        $hasUsername = is_string($data['buyer_username'] ?? null) && $data['buyer_username'] !== '';

        if ($hasEmail === $hasUsername) {
            $errors['email'] = 'Isi email atau username Buyer, salah satu saja.';
        }

        if ($hasUsername && ! preg_match('/^[a-z0-9][a-z0-9._-]{2,49}$/', $data['buyer_username'])) {
            $errors['buyer_username'] = 'Username Buyer harus 3-50 karakter: huruf kecil, angka, titik, garis bawah, atau dash.';
        }
    }
}
