<?php

declare(strict_types=1);

namespace App\Core;

class Response
{
    protected string $body;

    protected int $statusCode;

    protected array $headers;

    public function __construct(string $body = '', int $statusCode = 200, array $headers = [])
    {
        $this->body = $body;
        $this->statusCode = $statusCode;
        $this->headers = $headers;
    }

    public static function from($value): self
    {
        if ($value instanceof self) {
            return $value;
        }

        if (is_array($value)) {
            return JsonResponse::success($value);
        }

        if ($value === null) {
            return new self('', 204);
        }

        return new self((string) $value);
    }

    public function statusCode(): int
    {
        return $this->statusCode;
    }

    public function body(): string
    {
        return $this->body;
    }

    public function headers(): array
    {
        return $this->headers;
    }

    public function withHeader(string $name, string $value): self
    {
        $clone = clone $this;
        $clone->headers[$name] = $value;

        return $clone;
    }

    public function withStatus(int $statusCode): self
    {
        $clone = clone $this;
        $clone->statusCode = $statusCode;

        return $clone;
    }

    public function send(): void
    {
        if (! headers_sent()) {
            http_response_code($this->statusCode);

            foreach ($this->headers as $name => $value) {
                header($name . ': ' . $value);
            }
        }

        echo $this->body;
    }
}
