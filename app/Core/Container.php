<?php

declare(strict_types=1);

namespace App\Core;

use App\Core\Exceptions\HttpException;
use ReflectionClass;
use ReflectionNamedType;

class Container
{
    private array $bindings = [];

    private array $instances = [];

    public function instance(string $abstract, $instance): self
    {
        $this->instances[$abstract] = $instance;

        return $this;
    }

    public function bind(string $abstract, $concrete = null): self
    {
        $this->bindings[$abstract] = [
            'concrete' => $concrete ?? $abstract,
            'shared' => false,
        ];

        return $this;
    }

    public function singleton(string $abstract, $concrete = null): self
    {
        $this->bindings[$abstract] = [
            'concrete' => $concrete ?? $abstract,
            'shared' => true,
        ];

        return $this;
    }

    public function has(string $abstract): bool
    {
        return isset($this->instances[$abstract]) || isset($this->bindings[$abstract]) || class_exists($abstract);
    }

    public function make(string $abstract)
    {
        if (isset($this->instances[$abstract])) {
            return $this->instances[$abstract];
        }

        $binding = $this->bindings[$abstract] ?? null;
        $concrete = $binding['concrete'] ?? $abstract;
        $object = is_callable($concrete) && ! is_string($concrete)
            ? $concrete($this)
            : $this->build((string) $concrete);

        if (($binding['shared'] ?? false) === true) {
            $this->instances[$abstract] = $object;
        }

        return $object;
    }

    private function build(string $className)
    {
        if (! class_exists($className)) {
            throw new HttpException('Container target not found: ' . $className, 500);
        }

        $reflection = new ReflectionClass($className);

        if (! $reflection->isInstantiable()) {
            throw new HttpException('Container target is not instantiable: ' . $className, 500);
        }

        $constructor = $reflection->getConstructor();

        if ($constructor === null) {
            return new $className();
        }

        $arguments = [];

        foreach ($constructor->getParameters() as $parameter) {
            $type = $parameter->getType();

            if ($type instanceof ReflectionNamedType && ! $type->isBuiltin()) {
                $arguments[] = $this->make($type->getName());
                continue;
            }

            if ($parameter->isDefaultValueAvailable()) {
                $arguments[] = $parameter->getDefaultValue();
                continue;
            }

            throw new HttpException(
                'Unable to resolve dependency $' . $parameter->getName() . ' for ' . $className,
                500
            );
        }

        return $reflection->newInstanceArgs($arguments);
    }
}
