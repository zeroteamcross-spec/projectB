<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Controllers;

use App\Core\Controller;
use App\Core\JsonResponse;
use App\Core\Request;
use App\Core\Response;
use App\Modules\Transactions\Requests\CompleteTransactionRequest;
use App\Modules\Transactions\Requests\CreateTransactionRequest;
use App\Modules\Transactions\Requests\ProviderCallbackRequest;
use App\Modules\Transactions\Requests\UpdateFulfillmentChecklistRequest;
use App\Modules\Transactions\Requests\UpdateTransactionStatusRequest;
use App\Infrastructure\Payment\Midtrans\MidtransCallbackHandler;
use App\Modules\Transactions\Services\TransactionService;

class TransactionController extends Controller
{
    private TransactionService $service;

    private MidtransCallbackHandler $callbackHandler;

    public function __construct(TransactionService $service, MidtransCallbackHandler $callbackHandler)
    {
        parent::__construct();

        $this->service = $service;
        $this->callbackHandler = $callbackHandler;
    }

    public function create(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new CreateTransactionRequest($request))->validate();

        return JsonResponse::success([
            'transaction' => $this->service->create($user, $payload),
        ], 'Transaksi berhasil dibuat.', [], 201);
    }

    public function list(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $result = $this->service->list($user, $request->query());

        return JsonResponse::success([
            'transactions' => $result['transactions'],
        ], 'Daftar transaksi berhasil diambil.', $result['meta']);
    }

    public function detail(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'transaction' => $this->service->detail($user, (int) $request->routeParam('transaction_id')),
        ], 'Transaksi berhasil diambil.');
    }

    public function status(Request $request): JsonResponse
    {
        $user = $this->user($request);

        return JsonResponse::success([
            'transaction' => $this->service->status($user, (int) $request->routeParam('transaction_id')),
        ], 'Status transaksi berhasil diambil.');
    }

    public function downloadPaymentQr(Request $request): Response
    {
        $user = $this->user($request);
        $file = $this->service->downloadPaymentQr($user, (int) $request->routeParam('transaction_id'));

        return (new Response($file['body'], 200, [
            'Content-Type' => $file['content_type'],
            'Content-Disposition' => 'attachment; filename="' . $file['filename'] . '"',
            'Cache-Control' => 'private, max-age=300',
            'X-Content-Type-Options' => 'nosniff',
        ]));
    }

    public function updateStatus(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpdateTransactionStatusRequest($request))->validate();

        return JsonResponse::success([
            'transaction' => $this->service->updateStatus($user, (int) $request->routeParam('transaction_id'), $payload),
        ], 'Status transaksi berhasil diperbarui.');
    }

    public function updateFulfillmentChecklist(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new UpdateFulfillmentChecklistRequest($request))->validate();

        return JsonResponse::success([
            'transaction' => $this->service->updateFulfillmentChecklist($user, (int) $request->routeParam('transaction_id'), $payload),
        ], 'Checklist transaksi berhasil diperbarui.');
    }

    public function completePayment(Request $request): JsonResponse
    {
        $user = $this->user($request);
        $payload = (new CompleteTransactionRequest($request))->validate();

        return JsonResponse::success([
            'transaction' => $this->service->completePayment($user, (int) $request->routeParam('transaction_id'), $payload),
        ], 'Pelunasan transaksi berhasil diproses.');
    }

    public function providerCallback(Request $request): JsonResponse
    {
        if ($request->input() === []) {
            return JsonResponse::success(
                ['acknowledged' => true, 'processed' => false],
                'Midtrans callback endpoint is ready.'
            );
        }

        $payload = (new ProviderCallbackRequest($request))->validate();
        $payload = $this->callbackHandler->normalize($payload);

        return JsonResponse::success(
            $this->service->handleProviderCallback($payload),
            'Callback provider berhasil diproses.'
        );
    }
}
