<?php

declare(strict_types=1);

namespace App\Modules\Admin\Requests;

use App\Core\Validation\FormRequest;

/**
 * Pembuatan akun oleh super admin.
 *
 * Aturan showroomnya sengaja sama persis dengan RegisterRequest pendaftaran
 * mandiri: akun seller yang dibuat dari sini harus setara dengan yang mendaftar
 * sendiri, kalau tidak akan ada showroom tanpa slug atau tanpa kota yang lolos
 * lewat pintu belakang.
 */
class CreateAccountRequest extends FormRequest
{
    protected function rules(): array
    {
        return [
            'role' => 'required|string|in:admin,seller',
            'name' => 'required|string|max:200',
            'phone_number' => 'nullable|string|max:25',
            'email' => 'required|email|max:100',
            'password' => 'required|string|min:8|max:255',
            'address' => 'nullable|string|max:512',
            'showroom' => 'nullable|array',
        ];
    }

    protected function after(array $data, array &$errors): void
    {
        if (($data['role'] ?? null) !== 'seller') {
            return;
        }

        if (! isset($data['showroom']) || ! is_array($data['showroom'])) {
            $errors['showroom'] = 'Data showroom wajib diisi untuk akun showroom.';
            return;
        }

        foreach ([
            'name' => 'Nama showroom wajib diisi.',
            'slug' => 'Slug showroom wajib diisi.',
            'city_name' => 'Kota showroom wajib dipilih.',
        ] as $field => $pesan) {
            if (empty($data['showroom'][$field]) || ! is_string($data['showroom'][$field])) {
                $errors['showroom.' . $field] = $pesan;
            }
        }

        foreach ([
            'name' => 225,
            'slug' => 80,
            'city_name' => 100,
            'address' => 512,
            'phone_number' => 25,
            'bank_type' => 100,
            'bank_account_number' => 50,
            'bank_account_name' => 225,
        ] as $field => $maks) {
            $kunci = 'showroom.' . $field;

            if (isset($errors[$kunci]) || ! isset($data['showroom'][$field])) {
                continue;
            }

            $nilai = $data['showroom'][$field];

            if ($nilai === null || $nilai === '') {
                continue;
            }

            if (! is_string($nilai)) {
                $errors[$kunci] = 'Kolom ' . $kunci . ' harus berupa teks.';
                continue;
            }

            if (strlen($nilai) > $maks) {
                $errors[$kunci] = 'Kolom ' . $kunci . ' maksimal ' . $maks . ' karakter.';
            }
        }
    }
}
