<?php

declare(strict_types=1);

namespace App\Core\Validation;

use App\Core\Exceptions\ValidationException;
use App\Core\Request;

abstract class FormRequest
{
    protected Request $request;

    public function __construct(Request $request)
    {
        $this->request = $request;
    }

    public function validate(): array
    {
        $data = $this->data();
        $errors = (new Validator())->validate($data, $this->rules());

        $this->after($data, $errors);

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return $data;
    }

    abstract protected function rules(): array;

    protected function data(): array
    {
        return $this->request->input();
    }

    protected function after(array $data, array &$errors): void
    {
    }
}
