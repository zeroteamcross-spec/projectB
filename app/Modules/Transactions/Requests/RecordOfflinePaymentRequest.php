<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Requests;

use App\Core\Validation\FormRequest;

class RecordOfflinePaymentRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'payment_amount' => 'required|integer|min_value:1',
            'paid_at' => 'required|string',
            'note' => 'nullable|string|max:500',
        ];
    }
}
