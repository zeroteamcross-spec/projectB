<?php

declare(strict_types=1);

namespace App\Modules\Admin\Requests;

use App\Core\Validation\FormRequest;

class StartImpersonationRequest extends FormRequest
{
    protected function data(): array
    {
        $data = $this->request->input();

        if (! array_key_exists('target_user_id', $data)) {
            $routeTarget = $this->request->routeParam('affiliate_user_id');

            if (($routeTarget === null || $routeTarget === '') && $this->request->routeParam('seller_user_id') !== null) {
                $routeTarget = $this->request->routeParam('seller_user_id');
            }

            if ($routeTarget !== null && $routeTarget !== '') {
                $data['target_user_id'] = $routeTarget;
            }
        }

        return $data;
    }

    protected function rules(): array
    {
        return [
            'target_user_id' => ['required', 'integer', 'min_value:1'],
            'reason' => ['nullable', 'string', 'max:255'],
        ];
    }
}
