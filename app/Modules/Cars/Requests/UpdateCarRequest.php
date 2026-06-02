<?php

declare(strict_types=1);

namespace App\Modules\Cars\Requests;

use App\Core\Validation\FormRequest;

class UpdateCarRequest extends FormRequest
{
    use CarPayloadRules;

    protected function rules(): array
    {
        return $this->carRules(false);
    }

    protected function after(array $data, array &$errors): void
    {
        $this->validateCarPayload($data, $errors, false);
    }
}
