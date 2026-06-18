<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Services;

use RuntimeException;

class MasterAssetService
{
    private const BANK_ICON_SIZE = 96;

    public function storeBankIcon(array $file, string $mimeType): array
    {
        if ($mimeType === 'image/svg+xml') {
            return $this->storeSvgBankIcon($file);
        }

        if (! function_exists('imagecreatetruecolor')) {
            throw new RuntimeException('Image processing extension is not available.');
        }

        $source = $this->createSourceImage((string) $file['tmp_name'], $mimeType);
        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);
        $cropSize = min($sourceWidth, $sourceHeight);
        $sourceX = (int) floor(($sourceWidth - $cropSize) / 2);
        $sourceY = (int) floor(($sourceHeight - $cropSize) / 2);

        $target = imagecreatetruecolor(self::BANK_ICON_SIZE, self::BANK_ICON_SIZE);
        imagealphablending($target, false);
        imagesavealpha($target, true);
        $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
        imagefill($target, 0, 0, $transparent);

        imagecopyresampled(
            $target,
            $source,
            0,
            0,
            $sourceX,
            $sourceY,
            self::BANK_ICON_SIZE,
            self::BANK_ICON_SIZE,
            $cropSize,
            $cropSize
        );

        $directory = base_path('public/uploads/master/banks');
        if (! is_dir($directory) && ! mkdir($directory, 0775, true) && ! is_dir($directory)) {
            throw new RuntimeException('Unable to create bank icon directory.');
        }

        $fileName = 'bank-icon-' . bin2hex(random_bytes(10)) . '.png';
        $path = $directory . DIRECTORY_SEPARATOR . $fileName;
        if (! imagepng($target, $path, 8)) {
            throw new RuntimeException('Unable to store bank icon.');
        }

        imagedestroy($source);
        imagedestroy($target);

        return [
            'path' => '/uploads/master/banks/' . $fileName,
            'file_name' => $fileName,
            'mime_type' => 'image/png',
            'width' => self::BANK_ICON_SIZE,
            'height' => self::BANK_ICON_SIZE,
            'size' => is_file($path) ? filesize($path) : null,
        ];
    }

    public function storeAppIcon(array $file, string $mimeType): array
    {
        if ($mimeType === 'image/svg+xml') {
            return $this->storeSvgIcon($file, 'apps', 'app-icon');
        }

        if (! function_exists('imagecreatetruecolor')) {
            throw new RuntimeException('Image processing extension is not available.');
        }

        $source = $this->createSourceImage((string) $file['tmp_name'], $mimeType);
        $sourceWidth = imagesx($source);
        $sourceHeight = imagesy($source);
        $cropSize = min($sourceWidth, $sourceHeight);
        $sourceX = (int) floor(($sourceWidth - $cropSize) / 2);
        $sourceY = (int) floor(($sourceHeight - $cropSize) / 2);

        $target = imagecreatetruecolor(self::BANK_ICON_SIZE, self::BANK_ICON_SIZE);
        imagealphablending($target, false);
        imagesavealpha($target, true);
        $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
        imagefill($target, 0, 0, $transparent);
        imagecopyresampled($target, $source, 0, 0, $sourceX, $sourceY, self::BANK_ICON_SIZE, self::BANK_ICON_SIZE, $cropSize, $cropSize);

        $directory = base_path('public/uploads/master/apps');
        if (! is_dir($directory) && ! mkdir($directory, 0775, true) && ! is_dir($directory)) {
            throw new RuntimeException('Unable to create app icon directory.');
        }

        $fileName = 'app-icon-' . bin2hex(random_bytes(10)) . '.png';
        $path = $directory . DIRECTORY_SEPARATOR . $fileName;
        if (! imagepng($target, $path, 8)) {
            throw new RuntimeException('Unable to store app icon.');
        }

        imagedestroy($source);
        imagedestroy($target);

        return [
            'path' => '/uploads/master/apps/' . $fileName,
            'file_name' => $fileName,
            'mime_type' => 'image/png',
            'width' => self::BANK_ICON_SIZE,
            'height' => self::BANK_ICON_SIZE,
            'size' => is_file($path) ? filesize($path) : null,
        ];
    }

    private function storeSvgBankIcon(array $file): array
    {
        return $this->storeSvgIcon($file, 'banks', 'bank-icon');
    }

    private function storeSvgIcon(array $file, string $directoryName, string $prefix): array
    {
        $directory = base_path('public/uploads/master/' . $directoryName);
        if (! is_dir($directory) && ! mkdir($directory, 0775, true) && ! is_dir($directory)) {
            throw new RuntimeException('Unable to create icon directory.');
        }

        $svg = file_get_contents((string) ($file['tmp_name'] ?? '')) ?: '';
        $svg = $this->normalizeSvgIcon($svg);
        $fileName = $prefix . '-' . bin2hex(random_bytes(10)) . '.svg';
        $path = $directory . DIRECTORY_SEPARATOR . $fileName;

        if (file_put_contents($path, $svg) === false) {
            throw new RuntimeException('Unable to store SVG icon.');
        }

        return [
            'path' => '/uploads/master/' . $directoryName . '/' . $fileName,
            'file_name' => $fileName,
            'mime_type' => 'image/svg+xml',
            'width' => self::BANK_ICON_SIZE,
            'height' => self::BANK_ICON_SIZE,
            'size' => is_file($path) ? filesize($path) : null,
        ];
    }

    private function normalizeSvgIcon(string $svg): string
    {
        $content = trim($svg);
        $content = preg_replace('/<\?xml[^>]*\?>/i', '', $content) ?? $content;
        $content = preg_replace('/<!doctype[^>]*>/i', '', $content) ?? $content;
        $content = preg_replace('/<!--.*?-->/s', '', $content) ?? $content;
        $content = preg_replace('/\swidth\s*=\s*([\'"])[^\'"]*\1/i', '', $content) ?? $content;
        $content = preg_replace('/\sheight\s*=\s*([\'"])[^\'"]*\1/i', '', $content) ?? $content;

        if (! preg_match('/<svg\b[^>]*\sviewBox\s*=/i', $content)) {
            $content = preg_replace('/<svg\b/i', '<svg viewBox="0 0 96 96"', $content, 1) ?? $content;
        }

        $content = preg_replace('/<svg\b/i', '<svg width="96" height="96"', $content, 1) ?? $content;

        return trim($content);
    }

    private function createSourceImage(string $path, string $mimeType)
    {
        switch ($mimeType) {
            case 'image/jpeg':
                $image = imagecreatefromjpeg($path);
                break;
            case 'image/png':
                $image = imagecreatefrompng($path);
                break;
            case 'image/webp':
                if (! function_exists('imagecreatefromwebp')) {
                    throw new RuntimeException('WebP image processing is not available.');
                }
                $image = imagecreatefromwebp($path);
                break;
            default:
                $image = false;
        }

        if (! $image) {
            throw new RuntimeException('Unable to read bank icon image.');
        }

        return $image;
    }
}
