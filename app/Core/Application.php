<?php

declare(strict_types=1);

namespace App\Core;

use App\Core\Auth\AuthContext;
use App\Core\Exceptions\HttpException;
use App\Core\Middleware\MiddlewareInterface;
use Throwable;

class Application
{
    private string $basePath;

    private array $config;

    private Router $router;

    private AuthContext $authContext;

    private Container $container;

    /** @var array<int, MiddlewareInterface|callable|string> */
    private array $middleware = [];

    public function __construct(string $basePath, array $config = [])
    {
        $this->basePath = rtrim($basePath, DIRECTORY_SEPARATOR);
        $this->config = $config;
        $this->container = new Container();
        $this->authContext = new AuthContext();
        $this->router = new Router($this->container);

        $this->container
            ->instance(self::class, $this)
            ->instance(Container::class, $this->container)
            ->instance(Router::class, $this->router)
            ->instance(AuthContext::class, $this->authContext)
            ->singleton(Responder::class);

        date_default_timezone_set((string) ($this->config['timezone'] ?? 'Asia/Jakarta'));
    }

    public function basePath(string $path = ''): string
    {
        if ($path === '') {
            return $this->basePath;
        }

        return $this->basePath . DIRECTORY_SEPARATOR . ltrim(
            str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $path),
            DIRECTORY_SEPARATOR
        );
    }

    public function router(): Router
    {
        return $this->router;
    }

    public function container(): Container
    {
        return $this->container;
    }

    public function auth(): AuthContext
    {
        return $this->authContext;
    }

    public function addMiddleware($middleware): self
    {
        $this->middleware[] = $middleware;

        return $this;
    }

    public function loadRoutes(string $path): self
    {
        if (! is_file($path)) {
            return $this;
        }

        $routes = require $path;

        if (is_callable($routes)) {
            $routes($this->router);
        }

        return $this;
    }

    public function handle(Request $request): Response
    {
        try {
            $this->authContext->clear();
            $request = $request->withAuthContext($this->authContext);

            return $this->sendThroughMiddleware($request, function (Request $request): Response {
                return $this->router->dispatch($request);
            });
        } catch (Throwable $exception) {
            return $this->renderException($exception);
        }
    }

    public function run(): void
    {
        try {
            $response = $this->handle(Request::fromGlobals());
        } catch (Throwable $exception) {
            $response = $this->renderException($exception);
        }

        $response->send();
    }

    private function sendThroughMiddleware(Request $request, callable $destination): Response
    {
        $pipeline = array_reduce(
            array_reverse($this->middleware),
            function (callable $next, $middleware): callable {
                return function (Request $request) use ($middleware, $next): Response {
                    if (is_string($middleware) && class_exists($middleware)) {
                        $middleware = $this->container->make($middleware);
                    }

                    if ($middleware instanceof MiddlewareInterface) {
                        return $middleware->handle($request, $next);
                    }

                    if (is_callable($middleware)) {
                        return Response::from($middleware($request, $next));
                    }

                    throw new HttpException('Invalid middleware definition', 500);
                };
            },
            $destination
        );

        return Response::from($pipeline($request));
    }

    private function renderException(Throwable $exception): JsonResponse
    {
        if ($exception instanceof HttpException) {
            return JsonResponse::error(
                $exception->getMessage(),
                $exception->errors(),
                $exception->statusCode(),
                null,
                $exception->meta()
            );
        }

        $debug = (bool) ($this->config['debug'] ?? false);

        return JsonResponse::error(
            $debug ? $exception->getMessage() : 'Internal server error',
            $debug ? ['exception' => get_class($exception)] : [],
            500
        );
    }
}
