<?php

declare(strict_types=1);

namespace App\Modules\Staff\Requests;

use App\Core\Validation\FormRequest;

class UpsertStaffRequest extends FormRequest
{
    protected function rules(): array
    {
        $isCreate = $this->request->method() === 'POST';

        return [
            'name' => 'required|string|min:2|max:200',
            'email' => 'required|email|max:100',
            'phone_number' => 'required|string|max:25',
            'status' => 'required|string|in:active,inactive',
            'password' => ($isCreate ? 'required' : 'nullable') . '|string|min:6|max:255',
            'password_confirmation' => ($isCreate ? 'required' : 'nullable') . '|string|max:255',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        $password = (string) ($data['password'] ?? '');
        $confirmation = (string) ($data['password_confirmation'] ?? '');

        if ($password !== '' && $password !== $confirmation) {
            $errors['password_confirmation'] = 'The password confirmation does not match.';
        }
    }
}
