<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Requests;

use App\Core\Validation\FormRequest;

class UpdateFulfillmentChecklistRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'items' => 'required|array',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (isset($errors['items']) || ! is_array($data['items'] ?? null)) {
            return;
        }

        foreach ($data['items'] as $index => $item) {
            if (! is_array($item)) {
                $errors['items.' . $index] = 'The items.' . $index . ' field must be an object.';
                continue;
            }

            $key = $item['key'] ?? null;
            if (! is_string($key) || trim($key) === '') {
                $errors['items.' . $index . '.key'] = 'The items.' . $index . '.key field is required.';
                continue;
            }

            if (strlen($key) > 80) {
                $errors['items.' . $index . '.key'] = 'The items.' . $index . '.key field must not be greater than 80 characters.';
            }

            if (array_key_exists('is_completed', $item) && ! is_bool($item['is_completed']) && ! in_array($item['is_completed'], [0, 1, '0', '1'], true)) {
                $errors['items.' . $index . '.is_completed'] = 'The items.' . $index . '.is_completed field must be true or false.';
            }

            if (array_key_exists('notes', $item) && $item['notes'] !== null && ! is_string($item['notes'])) {
                $errors['items.' . $index . '.notes'] = 'The items.' . $index . '.notes field must be a string.';
            }

            if (isset($item['notes']) && is_string($item['notes']) && strlen($item['notes']) > 500) {
                $errors['items.' . $index . '.notes'] = 'The items.' . $index . '.notes field must not be greater than 500 characters.';
            }
        }
    }
}
