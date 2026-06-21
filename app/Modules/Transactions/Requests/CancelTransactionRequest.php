<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Requests;

use App\Core\Validation\FormRequest;

class CancelTransactionRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'refund_bank_name' => 'nullable|string|max:100',
            'refund_account_number' => 'nullable|string|max:100',
            'refund_account_name' => 'nullable|string|max:225',
            'cancel_reason' => 'nullable|string|max:500',
        ];
    }
}
