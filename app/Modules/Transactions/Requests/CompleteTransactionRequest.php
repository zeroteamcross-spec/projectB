<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Requests;

use App\Core\Validation\FormRequest;

class CompleteTransactionRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'payment_method' => 'required|string|max:50',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (! in_array((string) ($data['payment_method'] ?? ''), self::supportedPaymentMethods(), true)) {
            $errors['payment_method'] = 'Metode pembayaran belum didukung.';
        }
    }

    private static function supportedPaymentMethods(): array
    {
        return ['bca_va', 'bni_va', 'bri_va', 'mandiri_va', 'gopay', 'qris', 'shopeepay'];
    }
}
