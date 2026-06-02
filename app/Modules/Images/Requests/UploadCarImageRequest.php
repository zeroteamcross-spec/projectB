<?php

declare(strict_types=1);

namespace App\Modules\Images\Requests;

use App\Core\Exceptions\ValidationException;
use App\Core\Request;

class UploadCarImageRequest
{
    private const MAX_SIZE_BYTES = 5242880;

    private const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
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
            $errors['image'] = 'The image file is required.';
        } elseif (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $errors['image'] = 'The image upload failed.';
        } else {
            $size = (int) ($file['size'] ?? 0);

            if ($size < 1) {
                $errors['image'] = 'The image file is empty.';
            }

            if ($size > self::MAX_SIZE_BYTES) {
                $errors['image'] = 'The image file must not be greater than 5 MB.';
            }

            $mimeType = $this->detectMimeType($file);

            if (! in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
                $errors['mime_type'] = 'The image file must be jpeg, png, or webp.';
            }
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return [
            'image' => $file,
            'mime_type' => $this->detectMimeType($file),
            'is_cover' => $this->toBoolean($this->request->input('is_cover', false)),
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

    private function toBoolean($value): bool
    {
        if (is_bool($value)) {
            return $value;
        }

        return in_array($value, [1, '1', 'true', 'yes', 'on'], true);
    }
}
