<?php

declare(strict_types=1);

namespace Tests;

use PDO;
use Throwable;

abstract class TestCase
{
    abstract public function run(): void;

    protected function assertTrue(bool $condition, string $message = 'Expected condition to be true.'): void
    {
        if (! $condition) {
            throw new TestFailure($message);
        }
    }

    protected function assertSame($expected, $actual, string $message = ''): void
    {
        if ($expected !== $actual) {
            throw new TestFailure($message !== '' ? $message : sprintf(
                'Expected %s, got %s.',
                var_export($expected, true),
                var_export($actual, true)
            ));
        }
    }

    protected function assertNotNull($actual, string $message = 'Expected value not to be null.'): void
    {
        if ($actual === null) {
            throw new TestFailure($message);
        }
    }

    protected function expectException(string $className, callable $callback, ?string $errorKey = null): void
    {
        try {
            $callback();
        } catch (Throwable $exception) {
            if (! $exception instanceof $className) {
                throw new TestFailure(sprintf(
                    'Expected exception %s, got %s.',
                    $className,
                    get_class($exception)
                ));
            }

            if ($errorKey !== null && method_exists($exception, 'errors')) {
                $errors = $exception->errors();

                if (! array_key_exists($errorKey, $errors)) {
                    throw new TestFailure(sprintf(
                        'Expected validation error key %s, got keys: %s.',
                        $errorKey,
                        implode(', ', array_keys($errors))
                    ));
                }
            }

            return;
        }

        throw new TestFailure(sprintf('Expected exception %s was not thrown.', $className));
    }

    protected function sqlite(): PDO
    {
        $pdo = new PDO('sqlite::memory:');
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

        return $pdo;
    }
}

class TestFailure extends \RuntimeException
{
}
