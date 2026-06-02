<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Requests;

use App\Core\Validation\FormRequest;

class UpdateAffiliateSettingRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'referral_code' => 'nullable|string|min:3|max:50',
            'commission_type' => 'nullable|string|in:percent,flat',
            'commission_percent' => 'nullable',
            'commission_flat' => 'nullable',
            'status' => 'nullable|string|in:active,inactive',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (isset($data['referral_code']) && ! preg_match('/^[A-Z0-9_-]+$/i', (string) $data['referral_code'])) {
            $errors['referral_code'] = 'The referral_code field may only contain letters, numbers, underscore, and dash.';
        }

        if (isset($data['commission_percent']) && (! is_numeric($data['commission_percent']) || (float) $data['commission_percent'] < 0 || (float) $data['commission_percent'] > 100)) {
            $errors['commission_percent'] = 'The commission_percent field must be between 0 and 100.';
        }

        if (isset($data['commission_flat']) && (! is_numeric($data['commission_flat']) || (float) $data['commission_flat'] < 0)) {
            $errors['commission_flat'] = 'The commission_flat field must be zero or greater.';
        }
    }
}
