<?php

declare(strict_types=1);

namespace App\Infrastructure\Storage;

use RuntimeException;

class LocalStorageService implements StorageServiceInterface
{
    private string $rootPath;

    private string $publicPrefix;

    public function __construct(?string $rootPath = null, string $publicPrefix = '/storage/uploads')
    {
        $this->rootPath = $rootPath ?? base_path('storage/uploads');
        $this->publicPrefix = rtrim($publicPrefix, '/');
    }

    public function storeUploadedFile(array $file, string $directory): array
    {
        if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            throw new RuntimeException('Uploaded file is not valid.');
        }

        $directory = trim($directory, '/');
        $targetDirectory = $this->rootPath . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $directory);

        if (! is_dir($targetDirectory) && ! mkdir($targetDirectory, 0775, true) && ! is_dir($targetDirectory)) {
            throw new RuntimeException('Unable to create upload directory.');
        }

        $extension = strtolower(pathinfo((string) ($file['name'] ?? ''), PATHINFO_EXTENSION));
        $fileName = bin2hex(random_bytes(16)) . ($extension !== '' ? '.' . $extension : '');
        $targetPath = $targetDirectory . DIRECTORY_SEPARATOR . $fileName;

        if (! move_uploaded_file((string) $file['tmp_name'], $targetPath)) {
            if (! rename((string) $file['tmp_name'], $targetPath)) {
                throw new RuntimeException('Unable to store uploaded file.');
            }
        }

        $relativePath = $directory . '/' . $fileName;

        return [
            'file_path' => $this->publicPrefix . '/' . $relativePath,
            'storage_path' => $relativePath,
            'file_name' => $fileName,
        ];
    }

    public function delete(string $relativePath): bool
    {
        $relativePath = ltrim(str_replace($this->publicPrefix, '', $relativePath), '/');
        $path = $this->rootPath . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $relativePath);

        if (is_file($path)) {
            return unlink($path);
        }

        return false;
    }
}
