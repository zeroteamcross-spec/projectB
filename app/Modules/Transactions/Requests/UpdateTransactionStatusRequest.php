<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Requests;

use App\Core\Validation\FormRequest;

class UpdateTransactionStatusRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'transaction_status' => 'required|string|in:pending_payment,dp_paid,paid,completed,expired,cancelled',
            'notes' => 'nullable|string',
        ];
    }
}
