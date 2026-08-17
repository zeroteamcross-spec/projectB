<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Requests;

use App\Core\Exceptions\ValidationException;
use App\Core\Request;

class SubmitManualTransferProofRequest
{
    private const MAX_SIZE_BYTES = 5242880;

    private const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
    ];

    private Request $request;

    public function __construct(Request $request)
    {
        $this->request = $request;
    }

    public function validate(): array
    {
        $errors = [];
        $file = $this->request->file('proof');

        if (! is_array($file)) {
            $errors['proof'] = 'Bukti transfer wajib diunggah.';
        } elseif (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $errors['proof'] = 'Unggah bukti transfer gagal.';
        } else {
            $size = (int) ($file['size'] ?? 0);

            if ($size < 1) {
                $errors['proof'] = 'Berkas bukti transfer kosong.';
            }

            if ($size > self::MAX_SIZE_BYTES) {
                $errors['proof'] = 'Berkas bukti transfer maksimal 5 MB.';
            }

            $mimeType = $this->detectMimeType($file);

            if (! in_array($mimeType, self::ALLOWED_MIME_TYPES, true)) {
                $errors['mime_type'] = 'Bukti transfer harus berupa jpeg, png, webp, atau pdf.';
            }
        }

        if ($errors !== []) {
            throw new ValidationException($errors);
        }

        return [
            'proof' => $file,
            'note' => trim((string) $this->request->input('note', '')),
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
