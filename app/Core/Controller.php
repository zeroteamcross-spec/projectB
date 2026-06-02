<?php

declare(strict_types=1);

namespace App\Core;

use App\Core\Exceptions\UnauthorizedException;
use App\Core\Validation\FormRequest;

abstract class Controller
{
    protected Responder $response;

    public function __construct(?Responder $response = null)
    {
        $this->response = $response ?? new Responder();
    }

    protected function validate(FormRequest $request): array
    {
        return $request->validate();
    }

    protected function user(Request $request): array
    {
        $user = $request->user();

        if (! $user) {
            throw new UnauthorizedException('Autentikasi diperlukan.');
        }

        return $user;
    }
}
