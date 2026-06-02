<?php

declare(strict_types=1);

namespace App\Core\Validation;

class Validator
{
    public function validate(array $data, array $rules): array
    {
        $errors = [];

        foreach ($rules as $field => $fieldRules) {
            $fieldRules = is_array($fieldRules) ? $fieldRules : explode('|', (string) $fieldRules);
            $value = $data[$field] ?? null;

            if ($this->isNullableAndEmpty($value, $fieldRules)) {
                continue;
            }

            foreach ($fieldRules as $rule) {
                $this->applyRule((string) $field, $value, (string) $rule, $errors);
            }
        }

        return $errors;
    }

    private function isNullableAndEmpty($value, array $rules): bool
    {
        return in_array('nullable', $rules, true) && ($value === null || $value === '');
    }

    private function applyRule(string $field, $value, string $rule, array &$errors): void
    {
        if ($rule === '' || isset($errors[$field])) {
            return;
        }

        [$name, $parameter] = array_pad(explode(':', $rule, 2), 2, null);

        if ($name === 'nullable') {
            return;
        }

        if ($name === 'required' && ($value === null || $value === '')) {
            $errors[$field] = 'The ' . $field . ' field is required.';
            return;
        }

        if ($value === null || $value === '') {
            return;
        }

        if ($name === 'string' && ! is_string($value)) {
            $errors[$field] = 'The ' . $field . ' field must be a string.';
        }

        if ($name === 'email' && ! filter_var($value, FILTER_VALIDATE_EMAIL)) {
            $errors[$field] = 'The ' . $field . ' field must be a valid email address.';
        }

        if ($name === 'boolean' && ! is_bool($value) && ! in_array($value, [0, 1, '0', '1'], true)) {
            $errors[$field] = 'The ' . $field . ' field must be true or false.';
        }

        if ($name === 'array' && ! is_array($value)) {
            $errors[$field] = 'The ' . $field . ' field must be an array.';
        }

        if ($name === 'filled' && ($value === null || $value === '')) {
            $errors[$field] = 'The ' . $field . ' field must not be empty.';
        }

        if ($name === 'integer' && filter_var($value, FILTER_VALIDATE_INT) === false) {
            $errors[$field] = 'The ' . $field . ' field must be an integer.';
        }

        if ($name === 'numeric' && ! is_numeric($value)) {
            $errors[$field] = 'The ' . $field . ' field must be numeric.';
        }

        if ($name === 'date' && strtotime((string) $value) === false) {
            $errors[$field] = 'The ' . $field . ' field must be a valid date.';
        }

        if ($name === 'min' && is_string($value) && strlen($value) < (int) $parameter) {
            $errors[$field] = 'The ' . $field . ' field must be at least ' . $parameter . ' characters.';
        }

        if ($name === 'max' && is_string($value) && strlen($value) > (int) $parameter) {
            $errors[$field] = 'The ' . $field . ' field must not be greater than ' . $parameter . ' characters.';
        }

        if ($name === 'min_value' && is_numeric($value) && (float) $value < (float) $parameter) {
            $errors[$field] = 'The ' . $field . ' field must be at least ' . $parameter . '.';
        }

        if ($name === 'max_value' && is_numeric($value) && (float) $value > (float) $parameter) {
            $errors[$field] = 'The ' . $field . ' field must not be greater than ' . $parameter . '.';
        }

        if ($name === 'in' && $parameter !== null) {
            $allowed = explode(',', $parameter);

            if (! in_array((string) $value, $allowed, true)) {
                $errors[$field] = 'The ' . $field . ' field is invalid.';
            }
        }
    }
}
