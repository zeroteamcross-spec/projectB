<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Container;
use App\Core\Request;
use App\Core\Router;
use App\Core\Auth\AuthContext;
use Tests\TestCase;

class DesignStudioV2DraftTest extends TestCase
{
    public function run(): void
    {
        $app = require base_path('bootstrap/app.php');
        $container = $app->container();
        
        // Setup SQLite memory PDO
        $pdo = new \PDO('sqlite::memory:');
        $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
        
        $pdo->exec("CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT,
            name TEXT,
            phone_number TEXT,
            email TEXT,
            password_hash TEXT,
            address TEXT,
            account_status TEXT,
            is_approved INTEGER,
            created_at TEXT,
            updated_at TEXT,
            deleted_at TEXT
        )");
        
        $pdo->exec("CREATE TABLE user_auth_tokens (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            selector TEXT,
            hashed_validator TEXT,
            expires_at TEXT,
            last_used_at TEXT,
            created_at TEXT,
            updated_at TEXT,
            revoked_at TEXT
        )");

        // Seed mock users
        $pdo->exec("INSERT INTO users (id, role, name, email, password_hash, account_status, is_approved, created_at) VALUES (2, 'buyer', 'Demo Buyer', 'buyer@example.test', 'hash', 'active', 1, '2026-06-11 12:00:00')");
        $pdo->exec("INSERT INTO users (id, role, name, email, password_hash, account_status, is_approved, created_at) VALUES (99, 'super_admin', 'Demo Super Admin', 'superadmin@example.test', 'hash', 'active', 1, '2026-06-11 12:00:00')");
        
        // Seed mock remember tokens
        $buyerHash = hash('sha256', 'buyervalid');
        $superHash = hash('sha256', 'supervalid');
        $expiresAt = date('Y-m-d H:i:s', time() + 86400);
        
        $pdo->exec("INSERT INTO user_auth_tokens (user_id, selector, hashed_validator, expires_at, created_at) VALUES (2, 'buyerselect', '{$buyerHash}', '{$expiresAt}', '2026-06-11 12:00:00')");
        $pdo->exec("INSERT INTO user_auth_tokens (user_id, selector, hashed_validator, expires_at, created_at) VALUES (99, 'superselect', '{$superHash}', '{$expiresAt}', '2026-06-11 12:00:00')");

        // Bind mock PDO to container
        $container->singleton(\PDO::class, static fn () => $pdo);

        // Bind TestDraftRepository, TestPublishRepository, and TestVersionHistoryRepository to enable operations safely during tests
        $container->singleton(\App\Modules\DesignStudio\Repositories\DraftRepository::class, TestDraftRepository::class);
        $container->singleton(\App\Modules\DesignStudio\Repositories\PublishRepository::class, TestPublishRepository::class);
        $container->singleton(\App\Modules\DesignStudio\Repositories\VersionHistoryRepository::class, TestVersionHistoryRepository::class);

        $this->assertDraftRouteRequiresAuth($app);
        $this->assertDraftRouteRequiresSuperAdmin($app);
        $this->assertDraftRouteSavesAndLoadsForSuperAdmin($app);

        $this->assertPublishRouteRequiresAuth($app);
        $this->assertPublishRouteRequiresSuperAdmin($app);
        $this->assertPublishRoutePublishesForSuperAdmin($app);

        $this->assertRollbackRoutesRequireAuth($app);
        $this->assertRollbackRoutesRequireSuperAdmin($app);
        $this->assertRollbackRoutesExecuteForSuperAdmin($app);
    }

    private function assertDraftRouteRequiresAuth(\App\Core\Application $app): void
    {
        $response = $app->handle(new Request('GET', '/api/design-studio-v2/draft', '/api/design-studio-v2/draft'));
        $this->assertSame(401, $response->statusCode());
    }

    private function assertDraftRouteRequiresSuperAdmin(\App\Core\Application $app): void
    {
        $cookies = ['remember_me' => 'buyerselect:buyervalid'];
        $request = new Request('GET', '/api/design-studio-v2/draft?route=home', '/api/design-studio-v2/draft', ['route' => 'home'], [], [], [], $cookies);

        $response = $app->handle($request);
        $this->assertSame(403, $response->statusCode());
    }

    private function assertDraftRouteSavesAndLoadsForSuperAdmin(\App\Core\Application $app): void
    {
        $cookies = ['remember_me' => 'superselect:supervalid'];

        // Clean up draft first to ensure clean state
        $requestLoad = new Request('GET', '/api/design-studio-v2/draft?route=test-route', '/api/design-studio-v2/draft', ['route' => 'test-route'], [], [], [], $cookies);

        $responseLoad = $app->handle($requestLoad);
        $this->assertSame(200, $responseLoad->statusCode());

        // Save layout draft
        $draftPayload = [
            'schemaVersion' => 1,
            'route' => 'test-route',
            'elements' => [
                'navbar' => [
                    'mobile' => [],
                    'tablet' => [],
                    'desktop' => [
                        'color' => '#ffffff',
                    ]
                ]
            ]
        ];

        $requestSave = new Request('POST', '/api/design-studio-v2/draft?route=test-route', '/api/design-studio-v2/draft', ['route' => 'test-route'], $draftPayload, [], [], $cookies);

        $responseSave = $app->handle($requestSave);
        $this->assertSame(200, $responseSave->statusCode());
        $payloadSave = json_decode($responseSave->body(), true);
        $this->assertSame(true, $payloadSave['success']);

        // Load layout draft and verify
        $responseLoadAgain = $app->handle($requestLoad);
        $this->assertSame(200, $responseLoadAgain->statusCode());
        $payloadLoad = json_decode($responseLoadAgain->body(), true);
        $this->assertSame('#ffffff', $payloadLoad['data']['draft']['elements']['navbar']['desktop']['color']);

        // Clean up test draft folder
        $testFolder = base_path('storage/test-design-studio');
        if (is_dir($testFolder)) {
            $this->rrmdir($testFolder);
        }
    }

    private function assertPublishRouteRequiresAuth(\App\Core\Application $app): void
    {
        $response = $app->handle(new Request('POST', '/api/design-studio-v2/publish', '/api/design-studio-v2/publish'));
        $this->assertSame(401, $response->statusCode());
    }

    private function assertPublishRouteRequiresSuperAdmin(\App\Core\Application $app): void
    {
        $cookies = ['remember_me' => 'buyerselect:buyervalid'];
        $request = new Request('POST', '/api/design-studio-v2/publish?route=home', '/api/design-studio-v2/publish', ['route' => 'home'], [], [], [], $cookies);

        $response = $app->handle($request);
        $this->assertSame(403, $response->statusCode());
    }

    private function assertPublishRoutePublishesForSuperAdmin(\App\Core\Application $app): void
    {
        $cookies = ['remember_me' => 'superselect:supervalid'];

        // Try publishing first (empty/default draft is auto-created, should succeed with 200)
        $requestPublish = new Request('POST', '/api/design-studio-v2/publish?route=test-route-publish', '/api/design-studio-v2/publish', ['route' => 'test-route-publish'], ['publishNote' => 'Initial Publish Note'], [], [], $cookies);
        $responsePublish = $app->handle($requestPublish);
        $this->assertSame(200, $responsePublish->statusCode());
        $payloadPublish1 = json_decode($responsePublish->body(), true);
        $this->assertSame(true, $payloadPublish1['success']);
        $this->assertSame([], $payloadPublish1['data']['published']['elements']);

        // First save a layout draft so we can publish it with some elements
        $draftPayload = [
            'schemaVersion' => 1,
            'route' => 'test-route-publish',
            'elements' => [
                'header' => [
                    'mobile' => [],
                    'tablet' => [],
                    'desktop' => [
                        'fontSize' => 24,
                    ]
                ]
            ]
        ];
        $requestSave = new Request('POST', '/api/design-studio-v2/draft?route=test-route-publish', '/api/design-studio-v2/draft', ['route' => 'test-route-publish'], $draftPayload, [], [], $cookies);
        $responseSave = $app->handle($requestSave);
        $this->assertSame(200, $responseSave->statusCode());

        // Now publish the updated draft
        $responsePublishSuccess = $app->handle($requestPublish);
        $this->assertSame(200, $responsePublishSuccess->statusCode());
        $payloadPublish = json_decode($responsePublishSuccess->body(), true);
        $this->assertSame(true, $payloadPublish['success']);
        $this->assertSame('test-route-publish', $payloadPublish['data']['published']['route']);
        $this->assertSame('Initial Publish Note', $payloadPublish['data']['published']['publishNote']);
        $this->assertSame(24, $payloadPublish['data']['published']['elements']['header']['desktop']['fontSize']);

        // Clean up test draft folder
        $testFolder = base_path('storage/test-design-studio');
        if (is_dir($testFolder)) {
            $this->rrmdir($testFolder);
        }
    }

    private function rrmdir(string $dir): void
    {
        if (is_dir($dir)) {
            $objects = scandir($dir);
            foreach ($objects as $object) {
                if ($object !== "." && $object !== "..") {
                    if (is_dir($dir . DIRECTORY_SEPARATOR . $object) && !is_link($dir . "/" . $object)) {
                        $this->rrmdir($dir . DIRECTORY_SEPARATOR . $object);
                    } else {
                        @unlink($dir . DIRECTORY_SEPARATOR . $object);
                    }
                }
            }
            @rmdir($dir);
        }
    }

    private function assertRollbackRoutesRequireAuth(\App\Core\Application $app): void
    {
        $response1 = $app->handle(new Request('GET', '/api/design-studio-v2/history', '/api/design-studio-v2/history'));
        $this->assertSame(401, $response1->statusCode());

        $response2 = $app->handle(new Request('GET', '/api/design-studio-v2/rollback/preview', '/api/design-studio-v2/rollback/preview'));
        $this->assertSame(401, $response2->statusCode());

        $response3 = $app->handle(new Request('POST', '/api/design-studio-v2/rollback', '/api/design-studio-v2/rollback'));
        $this->assertSame(401, $response3->statusCode());
    }

    private function assertRollbackRoutesRequireSuperAdmin(\App\Core\Application $app): void
    {
        $cookies = ['remember_me' => 'buyerselect:buyervalid'];

        $request1 = new Request('GET', '/api/design-studio-v2/history?route=test-route-rollback', '/api/design-studio-v2/history', ['route' => 'test-route-rollback'], [], [], [], $cookies);
        $response1 = $app->handle($request1);
        $this->assertSame(403, $response1->statusCode());

        $request2 = new Request('GET', '/api/design-studio-v2/rollback/preview?route=test-route-rollback&targetVersion=1', '/api/design-studio-v2/rollback/preview', ['route' => 'test-route-rollback', 'targetVersion' => 1], [], [], [], $cookies);
        $response2 = $app->handle($request2);
        $this->assertSame(403, $response2->statusCode());

        $request3 = new Request('POST', '/api/design-studio-v2/rollback?route=test-route-rollback', '/api/design-studio-v2/rollback', ['route' => 'test-route-rollback'], ['targetVersion' => 1, 'rollbackNote' => 'Rollback note here'], [], [], $cookies);
        $response3 = $app->handle($request3);
        $this->assertSame(403, $response3->statusCode());
    }

    private function assertRollbackRoutesExecuteForSuperAdmin(\App\Core\Application $app): void
    {
        $cookies = ['remember_me' => 'superselect:supervalid'];
        $route = 'test-route-rollback';

        // 1. Save and publish version 1
        $draft1 = [
            'schemaVersion' => 1,
            'route' => $route,
            'elements' => [
                'navbar' => [
                    'mobile' => [], 'tablet' => [], 'desktop' => ['color' => '#111111']
                ]
            ]
        ];
        $reqSave1 = new Request('POST', "/api/design-studio-v2/draft?route={$route}", '/api/design-studio-v2/draft', ['route' => $route], $draft1, [], [], $cookies);
        $this->assertSame(200, $app->handle($reqSave1)->statusCode());

        $reqPub1 = new Request('POST', "/api/design-studio-v2/publish?route={$route}", '/api/design-studio-v2/publish', ['route' => $route], ['publishNote' => 'Publish version 1'], [], [], $cookies);
        $this->assertSame(200, $app->handle($reqPub1)->statusCode());

        // 2. Save and publish version 2 (with different styles)
        $draft2 = [
            'schemaVersion' => 1,
            'route' => $route,
            'elements' => [
                'navbar' => [
                    'mobile' => [], 'tablet' => [], 'desktop' => ['color' => '#222222']
                ]
            ]
        ];
        $reqSave2 = new Request('POST', "/api/design-studio-v2/draft?route={$route}", '/api/design-studio-v2/draft', ['route' => $route], $draft2, [], [], $cookies);
        $this->assertSame(200, $app->handle($reqSave2)->statusCode());

        $reqPub2 = new Request('POST', "/api/design-studio-v2/publish?route={$route}", '/api/design-studio-v2/publish', ['route' => $route], ['publishNote' => 'Publish version 2'], [], [], $cookies);
        $this->assertSame(200, $app->handle($reqPub2)->statusCode());

        // 3. Test history timeline endpoint
        $reqHist = new Request('GET', "/api/design-studio-v2/history?route={$route}", '/api/design-studio-v2/history', ['route' => $route], [], [], [], $cookies);
        $resHist = $app->handle($reqHist);
        $this->assertSame(200, $resHist->statusCode());
        $payloadHist = json_decode($resHist->body(), true);
        $this->assertSame(true, $payloadHist['success']);
        $this->assertSame(2, count($payloadHist['data']));
        $this->assertSame(1, $payloadHist['data'][0]['version']);
        $this->assertSame(2, $payloadHist['data'][1]['version']);

        // 4. Test rollback preview endpoint
        $reqPrev = new Request('GET', "/api/design-studio-v2/rollback/preview?route={$route}&targetVersion=1", '/api/design-studio-v2/rollback/preview', ['route' => $route, 'targetVersion' => 1], [], [], [], $cookies);
        $resPrev = $app->handle($reqPrev);
        $this->assertSame(200, $resPrev->statusCode());
        $payloadPrev = json_decode($resPrev->body(), true);
        $this->assertSame(true, $payloadPrev['success']);
        $this->assertSame(1, $payloadPrev['data']['targetVersion']);
        $this->assertSame(2, $payloadPrev['data']['currentVersion']);

        // 5. Test rollback execution endpoint
        $reqRoll = new Request('POST', "/api/design-studio-v2/rollback?route={$route}", '/api/design-studio-v2/rollback', ['route' => $route], ['targetVersion' => 1, 'rollbackNote' => 'Rollback to version 1'], [], [], $cookies);
        $resRoll = $app->handle($reqRoll);
        $this->assertSame(200, $resRoll->statusCode());
        $payloadRoll = json_decode($resRoll->body(), true);
        $this->assertSame(true, $payloadRoll['success']);
        $this->assertSame(3, $payloadRoll['data']['published']['version']); // version increments to 3
        $this->assertSame(true, $payloadRoll['data']['published']['rollback']);
        $this->assertSame(1, $payloadRoll['data']['published']['rollbackTarget']);
        $this->assertSame('#111111', $payloadRoll['data']['published']['elements']['navbar']['desktop']['color']); // rolled back color

        // 6. Test GET published layout endpoint (publicly accessible)
        $reqPubLoad = new Request('GET', "/api/design-studio-v2/published?route={$route}", '/api/design-studio-v2/published', ['route' => $route]);
        $resPubLoad = $app->handle($reqPubLoad);
        $this->assertSame(200, $resPubLoad->statusCode());
        $payloadPubLoad = json_decode($resPubLoad->body(), true);
        $this->assertSame(true, $payloadPubLoad['success']);
        $this->assertSame(3, $payloadPubLoad['data']['published']['version']);

        // Clean up test draft folder
        $testFolder = base_path('storage/test-design-studio');
        if (is_dir($testFolder)) {
            $this->rrmdir($testFolder);
        }
    }
}

class TestDraftRepository extends \App\Modules\DesignStudio\Repositories\DraftRepository
{
    public function __construct()
    {
        parent::__construct(base_path('storage/test-design-studio'));
    }

    public function isEnabled(): bool
    {
        return true;
    }
}

class TestPublishRepository extends \App\Modules\DesignStudio\Repositories\PublishRepository
{
    public function __construct()
    {
        parent::__construct(base_path('storage/test-design-studio'));
    }

    public function isEnabled(): bool
    {
        return true;
    }
}

class TestVersionHistoryRepository extends \App\Modules\DesignStudio\Repositories\VersionHistoryRepository
{
    public function __construct()
    {
        parent::__construct(base_path('storage/test-design-studio'));
    }

    public function isEnabled(): bool
    {
        return true;
    }
}
