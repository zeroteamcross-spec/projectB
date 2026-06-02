<?php

declare(strict_types=1);

namespace App\Modules\MasterData\Controllers;

use App\Core\Controller;
use App\Core\Response;
use App\Modules\MasterData\Repositories\MasterDataRepository;

class ThemeRuntimeController extends Controller
{
    private const MASTER_KEY = 'design_studio.theme_config';

    private MasterDataRepository $masters;

    public function __construct(MasterDataRepository $masters)
    {
        parent::__construct();

        $this->masters = $masters;
    }

    public function script(): Response
    {
        $record = $this->masters->findByKey(self::MASTER_KEY);
        $data = [];

        if (is_array($record) && isset($record['data_json'])) {
            $decoded = json_decode((string) $record['data_json'], true);
            $data = is_array($decoded) ? $decoded : [];
        }

        $payload = json_encode($data === [] ? (object) [] : $data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if ($payload === false) {
            $payload = '{}';
        }

        $script = <<<JS
(function bootstrapProjectBThemeRuntime(global) {
  if (typeof global.__PROJECTB_APPLY_THEME__ !== "function") {
    return;
  }

  try {
    global.__PROJECTB_APPLY_THEME__($payload);
  } catch (error) {
    console.error("ProjectB theme runtime bootstrap failed.", error);
  }
}(window));
JS;

        return new Response($script, 200, [
            'Content-Type' => 'application/javascript; charset=utf-8',
            'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        ]);
    }
}
