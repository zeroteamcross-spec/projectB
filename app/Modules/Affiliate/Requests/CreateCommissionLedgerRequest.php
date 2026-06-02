<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Requests;

use App\Core\Validation\FormRequest;

class CreateCommissionLedgerRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'transaction_id' => 'nullable|integer',
            'entry_type' => 'required|string|in:accrual,adjustment,payout',
            'amount' => 'required',
            'notes' => 'nullable|string',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (! isset($data['amount']) || ! is_numeric($data['amount'])) {
            $errors['amount'] = 'The amount field must be numeric.';
            return;
        }

        if (($data['entry_type'] ?? null) !== 'adjustment' && (float) $data['amount'] < 0) {
            $errors['amount'] = 'The amount field must be zero or greater for accrual and payout.';
        }
    }
}
