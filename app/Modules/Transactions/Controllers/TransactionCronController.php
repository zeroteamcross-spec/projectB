<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Modules\Transactions\Services\TransactionService;

class TransactionCronController extends Controller
{
    private TransactionService $service;

    public function __construct(TransactionService $service)
    {
        parent::__construct();

        $this->service = $service;
    }

    public function expirePending(Request $request): JsonResponse
    {
        $result = $this->service->expirePendingTransactions();

        return JsonResponse::success($result, 'Transaksi expired berhasil diproses.');
    }
}
