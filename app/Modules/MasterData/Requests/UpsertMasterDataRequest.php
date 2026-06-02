<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Requests;

use App\Core\Validation\FormRequest;

class UpsertMasterDataRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'data' => 'required|array',
            'display_name' => 'nullable|string|max:100',
            'bump_version' => 'nullable|boolean',
        ];
    }
}
