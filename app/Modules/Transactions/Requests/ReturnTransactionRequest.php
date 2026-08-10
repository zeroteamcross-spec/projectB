<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Requests;

use App\Core\Validation\FormRequest;

class ReturnTransactionRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'return_reason' => 'required|string|max:500',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (isset($errors['return_reason'])) {
            return;
        }

        // Alasan retur masuk ke jejak audit, jadi tidak boleh sekadar spasi
        // atau satu dua huruf.
        if (strlen(trim((string) ($data['return_reason'] ?? ''))) < 5) {
            $errors['return_reason'] = 'Alasan retur minimal 5 karakter.';
        }
    }
}
