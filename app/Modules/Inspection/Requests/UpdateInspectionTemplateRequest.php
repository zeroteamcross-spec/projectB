<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Requests;

use App\Core\Validation\FormRequest;

class UpdateInspectionTemplateRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'category_name' => 'required|string|max:100',
            'item_name' => 'required|string|max:200',
            'description' => 'nullable|string',
            'sort_order' => 'required|integer|min_value:0',
            'is_active' => 'required|boolean',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (trim((string) ($data['category_name'] ?? '')) === '') {
            $errors['category_name'] = 'Section inspeksi wajib diisi.';
        }

        if (trim((string) ($data['item_name'] ?? '')) === '') {
            $errors['item_name'] = 'Nama item inspeksi wajib diisi.';
        }
    }
}
