<?php

declare(strict_types=1);

namespace App\Modules\Sliders\Requests;

use App\Core\Request;

class ListSlidersRequest
{
    private Request $request;

    public function __construct(Request $request)
    {
        $this->request = $request;
    }

    public function validate(): array
    {
        return [
            'keyword' => trim((string) $this->request->query('keyword', '')),
            'position_key' => trim((string) ($this->request->query('position_key', $this->request->query('position', '')))),
            'template_key' => trim((string) $this->request->query('template_key', '')),
            'animation_key' => trim((string) $this->request->query('animation_key', '')),
            'is_active' => $this->normalizeBooleanFilter($this->request->query('is_active', '')),
            'page' => max(1, (int) $this->request->query('page', 1)),
            'limit' => max(1, min((int) $this->request->query('limit', 100), 100)),
        ];
    }

    private function normalizeBooleanFilter($value)
    {
        if ($value === '' || $value === null) {
            return '';
        }

        return in_array($value, [1, '1', true, 'true', 'yes', 'on'], true) ? 1 : 0;
    }
}
