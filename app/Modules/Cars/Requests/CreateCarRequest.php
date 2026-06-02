<?php

declare(strict_types=1);

namespace App\Modules\Cars\Requests;

use App\Core\Validation\FormRequest;

class CreateCarRequest extends FormRequest
{
    use CarPayloadRules;

    protected function rules(): array
    {
        return $this->carRules(true);
    }

    protected function after(array $data, array &$errors): void
    {
        $this->validateCarPayload($data, $errors, true);
    }
}
