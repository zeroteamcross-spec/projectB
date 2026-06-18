<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Requests;

use App\Core\Exceptions\ValidationException;
use App\Core\Request;

class UploadAppIconRequest
{
    private const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
    ];

    private Request $request;

    public function __construct(Request $request)
    {
        $this->request = $request;
    }

    public function validate(): array
    {
        $errors = [];
        $file = $this->request->file('icon');
        $mimeType = '';

        if (! is_array($file)) {
            $errors['icon'] = 'Icon aplikasi wajib diupload.';
        } elseif (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $errors['icon'] = 'Upload icon aplikasi gagal.';
        } else {
            $size = (int) ($file['size'] ?? 0);
            if ($size <= 0) {
                $errors['icon'] = 'File icon aplikasi kosong.';
            } elseif ($size > 2 * 1024 * 1024) {
                $errors['icon'] = 'File icon aplikasi maksimal 2 MB.';
            }

            $extension = strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION));
            $mimeType = mime_content_type((string) ($file['tmp_name'] ?? '')) ?: '';
            $isSvg = $extension === 'svg' || $mimeType === 'image/svg+xml';
            if ($isSvg) {
                $svg = file_get_contents((string) ($file['tmp_name'] ?? '')) ?: '';
                if (! $this->isSafeSvg($svg)) {
                    $errors['icon'] = 'SVG icon aplikasi tidak valid atau mengandung konten tidak aman.';
                }
                $mimeType = 'image/svg+xml';
            } elseif (! in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
                $errors['mime_type'] = 'Icon aplikasi harus berupa jpeg, png, webp, atau svg.';
            }

            if (! $isSvg) {
                $sizeInfo = @getimagesize((string) ($file['tmp_name'] ?? ''));
                if (! is_array($sizeInfo)) {
                    $errors['icon'] = 'File icon aplikasi bukan gambar valid.';
                } elseif ((int) $sizeInfo[0] < 64 || (int) $sizeInfo[1] < 64) {
                    $errors['dimensions'] = 'Dimensi icon aplikasi minimal 64x64 px.';
                }
            }
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return [
            'icon' => $file,
            'mime_type' => $mimeType,
        ];
    }

    private function isSafeSvg(string $svg): bool
    {
        $content = trim($svg);
        $lower = strtolower($content);

        if ($content === '' || strpos($lower, '<svg') === false) {
            return false;
        }

        $blockedPatterns = [
            '/<\s*script\b/i',
            '/<\s*foreignobject\b/i',
            '/\son[a-z]+\s*=/i',
            '/javascript\s*:/i',
            '/data\s*:\s*text\/html/i',
            '/<\s*iframe\b/i',
            '/<\s*object\b/i',
            '/<\s*embed\b/i',
            '/<!doctype/i',
        ];

        foreach ($blockedPatterns as $pattern) {
            if (preg_match($pattern, $content)) {
                return false;
            }
        }

        return true;
    }
}
