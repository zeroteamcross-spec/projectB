<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\DraftRepository;

class DraftService
{
    private DraftRepository $drafts;
    private DraftValidator $validator;

    public function __construct(DraftRepository $drafts, ?DraftValidator $validator = null)
    {
        $this->drafts = $drafts;
        $this->validator = $validator ?? new DraftValidator();
    }

    public function load(string $route): ?array
    {
        return $this->drafts->get($route);
    }

    public function store(string $route, array $draft, ?int $updatedBy = null): bool
    {
        $draft['updatedBy'] = $updatedBy;
        $draft['updatedAt'] = date('Y-m-d H:i:s');

        return $this->drafts->save($route, $draft);
    }

    public function validate(array $draft): bool
    {
        return $this->validator->validate($draft);
    }

    public function clear(string $route): bool
    {
        return $this->drafts->delete($route);
    }

    public function recover(string $route): ?array
    {
        $this->drafts->delete($route);

        return $this->drafts->get($route);
    }
}
