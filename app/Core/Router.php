<?php

declare(strict_types=1);

namespace App\Core;

use App\Core\Exceptions\HttpException;
use App\Core\Exceptions\NotFoundException;
use App\Core\Middleware\MiddlewareInterface;

class Router
{
    /** @var array<int, array<string, mixed>> */
    private array $routes = [];

    /** @var array<int, array{prefix:string,middleware:array}> */
    private array $groups = [];

    private ?Container $container;

    public function __construct(?Container $container = null)
    {
        $this->container = $container;
    }

    public function get(string $path, $handler, array $middleware = []): self
    {
        return $this->add('GET', $path, $handler, $middleware);
    }

    public function post(string $path, $handler, array $middleware = []): self
    {
        return $this->add('POST', $path, $handler, $middleware);
    }

    public function put(string $path, $handler, array $middleware = []): self
    {
        return $this->add('PUT', $path, $handler, $middleware);
    }

    public function patch(string $path, $handler, array $middleware = []): self
    {
        return $this->add('PATCH', $path, $handler, $middleware);
    }

    public function delete(string $path, $handler, array $middleware = []): self
    {
        return $this->add('DELETE', $path, $handler, $middleware);
    }

    public function options(string $path, $handler, array $middleware = []): self
    {
        return $this->add('OPTIONS', $path, $handler, $middleware);
    }

    public function add(string $method, string $path, $handler, array $middleware = []): self
    {
        $prefix = '';
        $groupMiddleware = [];

        foreach ($this->groups as $group) {
            $prefix .= $group['prefix'];
            $groupMiddleware = array_merge($groupMiddleware, $group['middleware']);
        }

        $path = $this->normalizePath($prefix . '/' . ltrim($path, '/'));

        $this->routes[] = [
            'method' => strtoupper($method),
            'path' => $path,
            'pattern' => $this->compilePattern($path),
            'handler' => $handler,
            'middleware' => array_merge($groupMiddleware, $middleware),
        ];

        return $this;
    }

    public function group(string $prefix, callable $routes, array $middleware = []): self
    {
        $this->groups[] = [
            'prefix' => $this->normalizePath($prefix),
            'middleware' => $middleware,
        ];

        $routes($this);

        array_pop($this->groups);

        return $this;
    }

    public function dispatch(Request $request): Response
    {
        $allowedMethods = [];

        foreach ($this->routes as $route) {
            if (! preg_match($route['pattern'], $request->path(), $matches)) {
                continue;
            }

            if ($request->method() === 'OPTIONS') {
                $allowedMethods[] = $route['method'];
                continue;
            }

            if ($route['method'] !== $request->method()) {
                $allowedMethods[] = $route['method'];
                continue;
            }

            $params = [];

            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $params[$key] = $value;
                }
            }

            $request = $request->withRouteParams($params);

            return $this->sendThroughMiddleware(
                $request,
                $route['middleware'],
                function (Request $request) use ($route): Response {
                    return Response::from($this->callHandler($route['handler'], $request));
                }
            );
        }

        if ($allowedMethods !== []) {
            if ($request->method() === 'OPTIONS') {
                return JsonResponse::success(null, 'OK', [
                    'allowed_methods' => array_values(array_unique($allowedMethods)),
                ])->withHeader('Allow', implode(', ', array_values(array_unique($allowedMethods))));
            }

            throw new HttpException('Method not allowed', 405, [], [
                'allowed_methods' => array_values(array_unique($allowedMethods)),
            ]);
        }

        throw new NotFoundException('Route not found');
    }

    private function sendThroughMiddleware(Request $request, array $middleware, callable $destination): Response
    {
        $pipeline = array_reduce(
            array_reverse($middleware),
            function (callable $next, $middleware): callable {
                return function (Request $request) use ($middleware, $next): Response {
                    if (is_string($middleware) && class_exists($middleware)) {
                        $middleware = $this->container ? $this->container->make($middleware) : new $middleware();
                    }

                    if ($middleware instanceof MiddlewareInterface) {
                        return $middleware->handle($request, $next);
                    }

                    if (is_callable($middleware)) {
                        return Response::from($middleware($request, $next));
                    }

                    throw new HttpException('Invalid route middleware definition', 500);
                };
            },
            $destination
        );

        return Response::from($pipeline($request));
    }

    private function callHandler($handler, Request $request)
    {
        if (is_array($handler) && count($handler) === 2 && is_string($handler[0])) {
            $controller = $this->container ? $this->container->make($handler[0]) : new $handler[0]();

            return $controller->{$handler[1]}($request);
        }

        if (is_string($handler) && strpos($handler, '@') !== false) {
            [$className, $method] = explode('@', $handler, 2);
            $controller = $this->container ? $this->container->make($className) : new $className();

            return $controller->{$method}($request);
        }

        if (is_callable($handler)) {
            return $handler($request);
        }

        throw new HttpException('Invalid route handler definition', 500);
    }

    private function normalizePath(string $path): string
    {
        $path = '/' . trim($path, '/');

        return $path === '/' ? '/' : rtrim($path, '/');
    }

    private function compilePattern(string $path): string
    {
        $quoted = preg_quote($path, '#');
        $pattern = preg_replace('/\\\\\{([a-zA-Z_][a-zA-Z0-9_]*)\\\\\}/', '(?P<$1>[^/]+)', $quoted);

        return '#^' . $pattern . '$#';
    }
}
