<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Requests;

use App\Core\Validation\FormRequest;

class UpdateAffiliateSettlementStatusRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'status' => 'nullable|string|in:settled,cancelled',
            'notes' => 'nullable|string|max:1000',
            'payment_method' => 'nullable|string|max:80',
            'payment_reference' => 'nullable|string|max:160',
            'payment_note' => 'nullable|string|max:1000',
            'proof_file_url' => 'nullable|string|max:500',
        ];
    }
}
