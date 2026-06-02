<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Requests;

use App\Core\Validation\FormRequest;

class GenerateReferralCodeRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'prefix' => 'nullable|string|max:20',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (isset($data['prefix']) && ! preg_match('/^[A-Z0-9_-]+$/i', (string) $data['prefix'])) {
            $errors['prefix'] = 'The prefix field may only contain letters, numbers, underscore, and dash.';
        }
    }
}
