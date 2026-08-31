<?php

declare(strict_types=1);

namespace App\Modules\Cars\Requests;

use App\Core\Validation\FormRequest;

class MarkCarSoldExternalRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'note' => 'required|string|max:1000',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (isset($errors['note'])) {
            return;
        }

        if (strlen(trim((string) ($data['note'] ?? ''))) < 5) {
            $errors['note'] = 'Keterangan minimal 5 karakter.';
        }
    }
}
