<?php

declare(strict_types=1);

namespace App\Core;

class Responder
{
    public function success($data = null, string $message = 'OK', array $meta = [], int $statusCode = 200): JsonResponse
    {
        return JsonResponse::success($data, $message, $meta, $statusCode);
    }

    public function created($data = null, string $message = 'Created', array $meta = []): JsonResponse
    {
        return $this->success($data, $message, $meta, 201);
    }

    public function error(
        string $message,
        array $errors = [],
        int $statusCode = 400,
        $data = null,
        array $meta = []
    ): JsonResponse {
        return JsonResponse::error($message, $errors, $statusCode, $data, $meta);
    }
}
