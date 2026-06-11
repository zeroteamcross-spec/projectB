<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use App\Modules\DesignStudio\Repositories\PublishRepository;

class BackupService
{
    private PublishRepository $published;

    public function __construct(PublishRepository $published)
    {
        $this->published = $published;
    }

    public function backup(string $route, array $metadata = []): array
    {
        return [
            'type' => 'design_studio_v2_backup',
            'route' => $route,
            'published' => $this->published->getPublished($route),
            'metadata' => array_merge($metadata, ['createdAt' => date('Y-m-d H:i:s')]),
        ];
    }
}
