<?php

declare(strict_types=1);

namespace App\Modules\Sliders\Requests;

use App\Core\Exceptions\ValidationException;
use App\Core\Request;

class UploadSliderImageRequest
{
    private const MAX_SIZE_BYTES = 5242880;

    private const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
    ];

    private const ALLOWED_EXTENSIONS = [
        'jpg',
        'jpeg',
        'png',
        'webp',
    ];

    private Request $request;

    public function __construct(Request $request)
    {
        $this->request = $request;
    }

    public function validate(): array
    {
        $errors = [];
        $file = $this->request->file('image');

        if (! is_array($file)) {
            $errors['image'] = 'File gambar slider wajib diisi.';
        } elseif (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $errors['image'] = 'Upload gambar slider gagal.';
        } else {
            $size = (int) ($file['size'] ?? 0);
            $mimeType = $this->detectMimeType($file);

            if ($size < 1) {
                $errors['image'] = 'File gambar slider kosong.';
            }

            if ($size > self::MAX_SIZE_BYTES) {
                $errors['image'] = 'File gambar slider maksimal 5 MB.';
            }

            if (! in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
                $errors['mime_type'] = 'Format gambar harus jpg, jpeg, png, atau webp.';
            }

            $extension = strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION));
            if (! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
                $errors['extension'] = 'Ekstensi gambar harus jpg, jpeg, png, atau webp.';
            }
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return [
            'image' => $file,
            'mime_type' => $this->detectMimeType($file),
        ];
    }

    private function detectMimeType(array $file): string
    {
        if (isset($file['tmp_name']) && is_file((string) $file['tmp_name'])) {
            $mimeType = mime_content_type((string) $file['tmp_name']);

            if (is_string($mimeType) && $mimeType !== '') {
                return $mimeType;
            }
        }

        return (string) ($file['type'] ?? '');
    }
}
