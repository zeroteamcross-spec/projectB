<?php

declare(strict_types=1);

use App\Core\Application;
use App\Infrastructure\Database\ConnectionFactory;
use App\Infrastructure\Payment\Midtrans\MidtransConfig;
use App\Infrastructure\Payment\Midtrans\MidtransHttpClient;
use App\Infrastructure\Payment\Midtrans\MidtransPaymentAdapter;
use App\Infrastructure\Payment\PaymentProviderInterface;
use App\Infrastructure\Storage\LocalStorageService;
use App\Infrastructure\Storage\StorageServiceInterface;

require_once __DIR__ . '/helpers.php';

load_env(base_path('.env'));

require_once __DIR__ . '/autoload.php';

$app = new Application(base_path(), config('app', []));
$app->container()->singleton(\PDO::class, static fn () => ConnectionFactory::make());
$app->container()->singleton(MidtransConfig::class, static fn () => MidtransConfig::fromConfig());
$app->container()->singleton(MidtransHttpClient::class);
$app->container()->singleton(PaymentProviderInterface::class, MidtransPaymentAdapter::class);
$app->container()->singleton(StorageServiceInterface::class, static fn () => new LocalStorageService(
    (string) config('storage.uploads_path', base_path('storage/uploads')),
    (string) config('storage.public_uploads_prefix', '/storage/uploads')
));
$app->loadRoutes(base_path('routes/api.php'));

return $app;
