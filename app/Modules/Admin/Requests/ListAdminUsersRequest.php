<?php

declare(strict_types=1);

namespace App\Modules\Admin\Requests;

use App\Core\Validation\FormRequest;

class ListAdminUsersRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'keyword' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', 'string', 'in:buyer,seller,affiliate_admin,admin'],
            'limit' => ['nullable', 'integer', 'min_value:1', 'max_value:100'],
        ];
    }

    protected function data(): array
    {
        return [
            'keyword' => $this->request->query('keyword'),
            'role' => $this->request->query('role'),
            'limit' => $this->request->query('limit'),
        ];
    }
}
