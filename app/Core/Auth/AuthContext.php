<?php

declare(strict_types=1);

namespace App\Core\Auth;

class AuthContext
{
    private ?array $user = null;
    private ?array $actor = null;
    private ?array $impersonation = null;

    public function setUser(array $user): void
    {
        $this->user = $user;

        if ($this->actor === null) {
            $this->actor = $user;
        }
    }

    public function fill(?array $user): void
    {
        if ($user === null) {
            $this->clear();
            return;
        }

        $this->setUser($user);
    }

    public function setActor(?array $actor): void
    {
        $this->actor = $actor;
    }

    public function setImpersonation(?array $impersonation): void
    {
        $this->impersonation = $impersonation;
    }

    public function setSession(?array $user, ?array $actor = null, ?array $impersonation = null): void
    {
        if ($user === null) {
            $this->clear();
            return;
        }

        $this->user = $user;
        $this->actor = $actor ?? $user;
        $this->impersonation = $impersonation;
    }

    public function clear(): void
    {
        $this->user = null;
        $this->actor = null;
        $this->impersonation = null;
    }

    public function user(): ?array
    {
        return $this->user;
    }

    public function actor(): ?array
    {
        return $this->actor ?? $this->user;
    }

    public function impersonation(): ?array
    {
        return $this->impersonation;
    }

    public function id(): ?int
    {
        return isset($this->user['id']) ? (int) $this->user['id'] : null;
    }

    public function role(): ?string
    {
        return isset($this->user['role']) ? (string) $this->user['role'] : null;
    }

    public function isAuthenticated(): bool
    {
        return $this->user !== null;
    }

    public function isImpersonating(): bool
    {
        return $this->impersonation !== null;
    }

    public function hasRole($roles): bool
    {
        $roles = is_array($roles) ? $roles : [$roles];

        return $this->role() !== null && in_array($this->role(), $roles, true);
    }
}
