<?php

declare(strict_types=1);

namespace App\Core;

class JsonResponse extends Response
{
    public function __construct(array $payload, int $statusCode = 200, array $headers = [])
    {
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if ($body === false) {
            $body = '{"success":false,"message":"Unable to encode JSON response","data":null,"meta":{},"errors":[]}';
            $statusCode = 500;
        }

        parent::__construct(
            $body,
            $statusCode,
            array_merge(['Content-Type' => 'application/json; charset=utf-8'], $headers)
        );
    }

    public static function success($data = null, string $message = 'OK', array $meta = [], int $statusCode = 200): self
    {
        return new self([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => $meta === [] ? (object) [] : $meta,
            'errors' => [],
        ], $statusCode);
    }

    public static function error(
        string $message,
        array $errors = [],
        int $statusCode = 400,
        $data = null,
        array $meta = []
    ): self {
        return new self([
            'success' => false,
            'message' => $message,
            'data' => $data,
            'meta' => $meta === [] ? (object) [] : $meta,
            'errors' => $errors,
        ], $statusCode);
    }
}
