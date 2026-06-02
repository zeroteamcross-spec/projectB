<?php

declare(strict_types=1);

namespace App\Modules\Auth\Requests;

use App\Core\Validation\FormRequest;

class ApproveUsersRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'user_ids' => 'required|array',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (! isset($data['user_ids']) || ! is_array($data['user_ids'])) {
            return;
        }

        if ($data['user_ids'] === []) {
            $errors['user_ids'] = 'The user_ids field must contain at least one id.';
            return;
        }

        foreach ($data['user_ids'] as $index => $userId) {
            if (filter_var($userId, FILTER_VALIDATE_INT) === false || (int) $userId < 1) {
                $errors['user_ids.' . $index] = 'Each user id must be a positive integer.';
            }
        }
    }
}
