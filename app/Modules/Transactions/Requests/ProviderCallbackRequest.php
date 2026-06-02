<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Requests;

use App\Core\Validation\FormRequest;

class ProviderCallbackRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'order_id' => 'required|string|max:100',
            'transaction_id' => 'nullable|string|max:100',
            'payment_type' => 'nullable|string|max:50',
            'transaction_status' => 'required|string|max:50',
            'gross_amount' => 'nullable',
            'status_code' => 'nullable|string|max:10',
            'signature_key' => 'nullable|string',
            'provider_name' => 'nullable|string|max:50',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (isset($data['gross_amount']) && (! is_numeric($data['gross_amount']) || (float) $data['gross_amount'] < 0)) {
            $errors['gross_amount'] = 'The gross_amount field must be zero or greater.';
        }
    }
}
