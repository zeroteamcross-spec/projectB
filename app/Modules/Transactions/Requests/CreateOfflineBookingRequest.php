<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Requests;

use App\Core\Validation\FormRequest;

class CreateOfflineBookingRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'car_id' => 'required|integer|min_value:1',
            'buyer_name' => 'required|string|max:200',
            'buyer_phone_number' => 'nullable|string|max:25',
            'buyer_email' => 'nullable|email|max:100',
            'buyer_username' => 'required|string|min:3|max:50',
            'buyer_password' => 'required|string|min:8|max:72',
            'payment_amount' => 'required|integer|min_value:1',
            'paid_at' => 'required|string',
            'note' => 'nullable|string|max:500',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (trim((string) ($data['buyer_phone_number'] ?? '')) === ''
            && trim((string) ($data['buyer_email'] ?? '')) === '') {
            $errors['buyer_phone_number'] = 'Nomor telepon atau email Buyer wajib diisi.';
        }
    }
}
