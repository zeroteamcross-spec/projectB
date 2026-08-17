<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Requests;

use App\Core\Validation\FormRequest;

class RejectManualTransferRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'reason' => 'required|string|max:500',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (isset($errors['reason'])) {
            return;
        }

        if (strlen(trim((string) ($data['reason'] ?? ''))) < 5) {
            $errors['reason'] = 'Alasan penolakan minimal 5 karakter.';
        }
    }
}
