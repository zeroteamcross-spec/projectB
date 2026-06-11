<?php

declare(strict_types=1);

namespace App\Modules\DesignStudio\Services;

use Throwable;

class DraftRecoveryService
{
    public function recover(string $draftPath, array $defaultDraft, callable $writeDraft): array
    {
        $warning = null;

        if (is_file($draftPath)) {
            $corruptedPath = dirname($draftPath) . DIRECTORY_SEPARATOR . 'draft.corrupted.json';

            try {
                if (is_file($corruptedPath)) {
                    $corruptedPath = dirname($draftPath) . DIRECTORY_SEPARATOR . 'draft.corrupted.' . date('YmdHis') . '.json';
                }

                if (! @rename($draftPath, $corruptedPath)) {
                    $warning = 'Draft recovery could not rename corrupted draft.';
                }
            } catch (Throwable $exception) {
                $warning = 'Draft recovery could not rename corrupted draft.';
            }
        }

        $writeDraft($defaultDraft);

        return [
            'draft' => $defaultDraft,
            'warning' => $warning ?? 'Corrupted draft was recovered.',
        ];
    }
}
