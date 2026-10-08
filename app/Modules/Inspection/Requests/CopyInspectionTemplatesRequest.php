<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Requests;

use App\Core\Validation\FormRequest;

class CopyInspectionTemplatesRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'source_showroom_id' => 'required|integer|min_value:1',
        ];
    }
}
