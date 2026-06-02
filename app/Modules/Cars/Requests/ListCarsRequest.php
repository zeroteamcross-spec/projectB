<?php

declare(strict_types=1);

namespace App\Modules\Cars\Requests;

use App\Core\Validation\FormRequest;

class ListCarsRequest extends FormRequest
{
    protected function data(): array
    {
        return $this->request->query();
    }

    protected function rules(): array
    {
        return [
            'page' => 'nullable|integer|min_value:1',
            'limit' => 'nullable|integer|min_value:1|max_value:100',
            'listing_status' => 'nullable|string|in:draft,published,reserved,sold,archived',
            'seller_user_id' => 'nullable|integer',
            'showroom_id' => 'nullable|integer',
            'brand_name' => 'nullable|string|max:100',
            'model_name' => 'nullable|string|max:100',
            'location_name' => 'nullable|string|max:225',
            'transmission' => 'nullable|string|max:50',
            'document_type' => 'nullable|string|in:new,old',
            'inspection_summary_status' => 'nullable|string|in:not_checked,partial,completed',
            'min_price_cash' => 'nullable|integer',
            'max_price_cash' => 'nullable|integer',
            'keyword' => 'nullable|string|max:100',
        ];
    }
}
