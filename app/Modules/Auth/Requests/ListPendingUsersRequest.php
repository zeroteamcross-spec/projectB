<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use App\Core\Validation\FormRequest;

class ListPendingUsersRequest extends FormRequest
{
    protected function data(): array
    {
        return $this->request->query();
    }

    protected function rules(): array
    {
        return [
            'limit' => 'nullable|integer|min_value:1|max_value:500',
        ];
    }
}
