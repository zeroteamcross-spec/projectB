<?php

declare(strict_types=1);

namespace App\Infrastructure\Storage;

interface StorageServiceInterface
{
    public function storeUploadedFile(array $file, string $directory): array;

    public function delete(string $relativePath): bool;
}
