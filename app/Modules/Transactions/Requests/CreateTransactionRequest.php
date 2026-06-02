<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Requests;

use App\Core\Validation\FormRequest;

class CreateTransactionRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'buyer_user_id' => 'nullable|integer',
            'car_id' => 'required|integer',
            'payment_type' => 'required|string|in:dp,full',
            'dp_amount' => 'nullable',
            'payment_method' => 'required|string|max:50',
            'affiliate_referral_code' => 'nullable|string|max:50',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (! in_array((string) ($data['payment_method'] ?? ''), self::supportedPaymentMethods(), true)) {
            $errors['payment_method'] = 'Metode pembayaran belum didukung.';
        }

        if (($data['payment_type'] ?? null) === 'dp') {
            if (! isset($data['dp_amount']) || ! is_numeric($data['dp_amount']) || (int) $data['dp_amount'] <= 0) {
                $errors['dp_amount'] = 'The dp_amount field is required and must be greater than zero for DP payment.';
            }
        }

        if (isset($data['dp_amount']) && (! is_numeric($data['dp_amount']) || (int) $data['dp_amount'] < 0)) {
            $errors['dp_amount'] = 'The dp_amount field must be zero or greater.';
        }
    }

    private static function supportedPaymentMethods(): array
    {
        return ['bca_va', 'bni_va', 'bri_va', 'mandiri_va', 'gopay', 'qris', 'shopeepay'];
    }
}
