<?php

declare(strict_types=1);

namespace App\Core;

use App\Core\Exceptions\ValidationException;
use App\Core\Auth\AuthContext;

class Request
{
    private string $id;

    private string $method;

    private string $uri;

    private string $path;

    private array $query;

    private array $body;

    private array $headers;

    private array $files;

    private array $cookies;

    private string $rawBody;

    private array $server;

    private array $routeParams;

    private array $attributes;

    private ?AuthContext $authContext = null;

    public function __construct(
        string $method,
        string $uri,
        string $path,
        array $query = [],
        array $body = [],
        array $headers = [],
        array $files = [],
        array $cookies = [],
        string $rawBody = '',
        array $server = [],
        array $routeParams = [],
        array $attributes = []
    ) {
        $this->id = bin2hex(random_bytes(8));
        $this->method = strtoupper($method);
        $this->uri = $uri;
        $this->path = $this->normalizePath($path);
        $this->query = $query;
        $this->body = $body;
        $this->headers = $this->normalizeHeaders($headers);
        $this->files = $files;
        $this->cookies = $cookies;
        $this->rawBody = $rawBody;
        $this->server = $server;
        $this->routeParams = $routeParams;
        $this->attributes = $attributes;
    }

    public static function fromGlobals(): self
    {
        $server = $_SERVER;
        $method = $server['REQUEST_METHOD'] ?? 'GET';
        $uri = $server['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $rawBody = file_get_contents('php://input') ?: '';
        $headers = function_exists('getallheaders') ? (getallheaders() ?: []) : self::headersFromServer($server);
        $body = $_POST;
        $contentType = $headers['Content-Type'] ?? $headers['content-type'] ?? $server['CONTENT_TYPE'] ?? '';

        if (stripos((string) $contentType, 'application/json') !== false && trim($rawBody) !== '') {
            $decoded = json_decode($rawBody, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new ValidationException([
                    'body' => 'Request body must contain valid JSON.',
                ]);
            }

            if (! is_array($decoded)) {
                throw new ValidationException([
                    'body' => 'JSON request body must be an object.',
                ]);
            }

            $body = $decoded;
        }

        return new self($method, $uri, $path, $_GET, $body, $headers, $_FILES, $_COOKIE, $rawBody, $server);
    }

    public function id(): string
    {
        return $this->id;
    }

    public function method(): string
    {
        return $this->method;
    }

    public function uri(): string
    {
        return $this->uri;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function query(?string $key = null, $default = null)
    {
        if ($key === null) {
            return $this->query;
        }

        return $this->query[$key] ?? $default;
    }

    public function input(?string $key = null, $default = null)
    {
        if ($key === null) {
            return $this->body;
        }

        return $this->body[$key] ?? $default;
    }

    public function header(string $name, $default = null)
    {
        $key = strtolower($name);

        return $this->headers[$key] ?? $default;
    }

    public function bearerToken(): ?string
    {
        $authorization = $this->header('authorization');

        if (! is_string($authorization) || stripos($authorization, 'Bearer ') !== 0) {
            return null;
        }

        return trim(substr($authorization, 7));
    }

    public function isJson(): bool
    {
        $contentType = (string) $this->header('content-type', '');

        return stripos($contentType, 'application/json') !== false;
    }

    public function file(string $key)
    {
        return $this->files[$key] ?? null;
    }

    public function files(): array
    {
        return $this->files;
    }

    public function cookie(string $key, $default = null)
    {
        return $this->cookies[$key] ?? $default;
    }

    public function cookies(): array
    {
        return $this->cookies;
    }

    public function rawBody(): string
    {
        return $this->rawBody;
    }

    public function server(?string $key = null, $default = null)
    {
        if ($key === null) {
            return $this->server;
        }

        return $this->server[$key] ?? $default;
    }

    public function routeParam(string $key, $default = null)
    {
        return $this->routeParams[$key] ?? $default;
    }

    public function routeParams(): array
    {
        return $this->routeParams;
    }

    public function withRouteParams(array $params): self
    {
        $clone = clone $this;
        $clone->routeParams = $params;

        return $clone;
    }

    public function attribute(string $key, $default = null)
    {
        return $this->attributes[$key] ?? $default;
    }

    public function attributes(): array
    {
        return $this->attributes;
    }

    public function withAttribute(string $key, $value): self
    {
        $clone = clone $this;
        $clone->attributes[$key] = $value;

        if ($key === 'auth_user' && is_array($value) && $clone->authContext !== null) {
            $clone->authContext->setUser($value);
        }

        return $clone;
    }

    public function withAuthContext(AuthContext $authContext): self
    {
        $clone = clone $this;
        $clone->authContext = $authContext;

        if ($authContext->isAuthenticated()) {
            $clone->attributes['auth_user'] = $authContext->user();
        }

        return $clone;
    }

    public function auth(): ?AuthContext
    {
        return $this->authContext;
    }

    public function user(): ?array
    {
        if ($this->authContext !== null && $this->authContext->isAuthenticated()) {
            return $this->authContext->user();
        }

        $user = $this->attribute('auth_user');

        return is_array($user) ? $user : null;
    }

    private static function headersFromServer(array $server): array
    {
        $headers = [];

        foreach ($server as $key => $value) {
            if (strpos($key, 'HTTP_') === 0) {
                $header = str_replace('_', '-', strtolower(substr($key, 5)));
                $headers[$header] = $value;
            }
        }

        return $headers;
    }

    private function normalizeHeaders(array $headers): array
    {
        $normalized = [];

        foreach ($headers as $key => $value) {
            $normalized[strtolower((string) $key)] = $value;
        }

        return $normalized;
    }

    private function normalizePath(string $path): string
    {
        $path = '/' . trim($path, '/');

        return $path === '/' ? '/' : rtrim($path, '/');
    }
}
