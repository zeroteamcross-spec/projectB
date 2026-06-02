<?php

declare(strict_types=1);

namespace App\Modules\Sliders\Requests;

use App\Core\Exceptions\ValidationException;
use App\Core\Request;

class SliderPayloadRequest
{
    private Request $request;

    private bool $creating;

    public function __construct(Request $request, bool $creating = false)
    {
        $this->request = $request;
        $this->creating = $creating;
    }

    public function validate(): array
    {
        $data = $this->request->input();
        $errors = [];

        if ($this->creating && trim((string) ($data['title'] ?? '')) === '') {
            $errors['title'] = 'Judul slider wajib diisi.';
        }

        foreach (['title' => 180, 'code' => 80, 'subtitle' => 220, 'cta_text' => 80, 'image_alt' => 180] as $field => $max) {
            if (isset($data[$field]) && is_string($data[$field]) && strlen($data[$field]) > $max) {
                $errors[$field] = 'Field ' . $field . ' terlalu panjang.';
            }
        }

        foreach (['body_text', 'description'] as $field) {
            if (isset($data[$field]) && is_string($data[$field]) && strlen($data[$field]) > 1000) {
                $errors[$field] = 'Deskripsi slider terlalu panjang.';
            }
        }

        if (isset($data['sort_order']) && filter_var($data['sort_order'], FILTER_VALIDATE_INT) === false) {
            $errors['sort_order'] = 'Urutan slider harus berupa angka.';
        }

        foreach (['start_at', 'end_at'] as $field) {
            if (($data[$field] ?? '') !== '' && strtotime((string) $data[$field]) === false) {
                $errors[$field] = 'Format tanggal tidak valid.';
            }
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return $data;
    }
}
