<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Requests;

use App\Core\Validation\FormRequest;

class CreateAffiliateSettlementRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'affiliate_id' => 'required|integer',
            'ledger_ids' => 'required|array',
            'notes' => 'nullable|string|max:1000',
            'payment_method' => 'nullable|string|max:80',
            'payment_reference' => 'nullable|string|max:160',
            'payment_note' => 'nullable|string|max:1000',
            'proof_file_url' => 'nullable|string|max:500',
            'period_start' => 'nullable|string|max:20',
            'period_end' => 'nullable|string|max:20',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        $ledgerIds = $data['ledger_ids'] ?? null;

        if (!is_array($ledgerIds) || $ledgerIds === []) {
            $errors['ledger_ids'] = 'Pilih minimal satu ledger untuk settlement.';
            return;
        }

        foreach ($ledgerIds as $index => $ledgerId) {
            if (!is_numeric($ledgerId) || (int) $ledgerId <= 0) {
                $errors["ledger_ids.$index"] = 'Ledger id harus integer positif.';
            }
        }
    }
}
