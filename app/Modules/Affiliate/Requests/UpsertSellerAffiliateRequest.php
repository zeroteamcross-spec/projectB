<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Requests;

use App\Core\Validation\FormRequest;

class UpsertSellerAffiliateRequest extends FormRequest
{
    protected function rules(): array
    {
        $isCreate = $this->request->method() === 'POST';

        return [
            'name' => 'required|string|min:2|max:200',
            'email' => 'required|email|max:100',
            'phone_number' => 'required|string|max:25',
            'referral_code' => 'required|string|min:3|max:50',
            'status' => 'required|string|in:active,inactive',
            'password' => ($isCreate ? 'required' : 'nullable') . '|string|min:6|max:255',
            'password_confirmation' => ($isCreate ? 'required' : 'nullable') . '|string|max:255',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (isset($data['referral_code']) && ! preg_match('/^[A-Z0-9_-]+$/i', (string) $data['referral_code'])) {
            $errors['referral_code'] = 'The referral_code field may only contain letters, numbers, underscore, and dash.';
        }

        $password = (string) ($data['password'] ?? '');
        $confirmation = (string) ($data['password_confirmation'] ?? '');

        if ($password !== '' && $password !== $confirmation) {
            $errors['password_confirmation'] = 'The password confirmation does not match.';
        }
    }
}
