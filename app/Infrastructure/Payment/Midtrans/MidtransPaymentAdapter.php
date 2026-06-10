<?php

declare(strict_types=1);

namespace App\Infrastructure\Payment\Midtrans;

use App\Core\Exceptions\HttpException;
use App\Core\Exceptions\ValidationException;
use App\Infrastructure\Payment\PaymentProviderException;
use App\Infrastructure\Payment\PaymentProviderInterface;
use Throwable;

class MidtransPaymentAdapter implements PaymentProviderInterface
{
    private MidtransConfig $config;

    private MidtransHttpClient $http;

    public function __construct(?MidtransConfig $config = null, ?MidtransHttpClient $http = null)
    {
        $this->config = $config ?? MidtransConfig::fromConfig();
        $this->http = $http ?? new MidtransHttpClient($this->config);
    }

    public function createInitialPayment(array $transaction, array $customer, string $paymentMethod): array
    {
        $amount = ($transaction['payment_type'] ?? null) === 'dp'
            ? (int) $transaction['dp_amount']
            : (int) $transaction['car_price'];

        $orderId = $this->orderId('ORDER', $transaction);
        $payload = $this->basePayload($transaction, $customer, $orderId, $amount, 'initial_payment');
        $payload['item_details'] = [[
            'id' => 'CAR-' . (int) $transaction['car_id'],
            'price' => $amount,
            'quantity' => 1,
            'name' => $this->itemName($transaction),
        ]];

        $this->applyPaymentMethod($payload, $paymentMethod);

        return $this->formatSession(
            $transaction,
            $paymentMethod,
            $amount,
            $payload,
            $this->charge($payload, $paymentMethod, $amount)
        );
    }

    public function createCompletionPayment(array $transaction, array $customer, string $paymentMethod): array
    {
        $amount = (int) ($transaction['remaining_amount'] ?? 0);

        if ($amount <= 0) {
            throw new ValidationException([
                'remaining_amount' => 'Transaction has no remaining payment amount.',
            ]);
        }

        $orderId = $this->orderId('PELUNASAN', $transaction);
        $payload = $this->basePayload($transaction, $customer, $orderId, $amount, 'completion_payment');
        $payload['item_details'] = [[
            'id' => 'PELUNASAN-' . (int) $transaction['id'],
            'price' => $amount,
            'quantity' => 1,
            'name' => 'Pelunasan Mobil',
        ]];

        $this->applyPaymentMethod($payload, $paymentMethod);

        return $this->formatSession(
            $transaction,
            $paymentMethod,
            $amount,
            $payload,
            $this->charge($payload, $paymentMethod, $amount)
        );
    }

    public function checkStatus(string $providerOrderId): array
    {
        return $this->http->get('/v2/' . rawurlencode($providerOrderId) . '/status');
    }

    private function charge(array $payload, string $paymentMethod, int $amount): array
    {
        try {
            return $this->http->post('/v2/charge', $payload);
        } catch (Throwable $exception) {
            $responsePayload = [
                'error' => $exception->getMessage(),
                'exception' => get_class($exception),
            ];

            if ($exception instanceof HttpException) {
                $responsePayload['meta'] = $exception->meta();
            }

            throw new PaymentProviderException('Midtrans payment session failed.', [
                'provider_name' => 'midtrans',
                'provider_order_id' => $payload['transaction_details']['order_id'] ?? null,
                'provider_transaction_id' => null,
                'payment_method' => $paymentMethod,
                'transaction_status' => 'create_session_failed',
                'gross_amount' => $amount,
                'payload_request' => $payload,
                'payload_response' => $responsePayload,
            ]);
        }
    }

    private function basePayload(array $transaction, array $customer, string $orderId, int $amount, string $purpose): array
    {
        return [
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $amount,
            ],
            'customer_details' => [
                'first_name' => $customer['name'] ?? 'Customer',
                'email' => $customer['email'] ?? 'customer@example.com',
                'phone' => $customer['phone_number'] ?? null,
            ],
            'custom_expiry' => [
                'expiry_duration' => 24,
                'unit' => 'hour',
            ],
            'metadata' => [
                'purpose' => $purpose,
                'transaction_id' => (int) $transaction['id'],
                'transaction_code' => $transaction['transaction_code'],
                'car_id' => (int) $transaction['car_id'],
                'payment_type' => $transaction['payment_type'],
            ],
        ];
    }

    private function applyPaymentMethod(array &$payload, string $paymentMethod): void
    {
        if (in_array($paymentMethod, ['bca_va', 'bni_va', 'bri_va', 'mandiri_va'], true)) {
            $payload['payment_type'] = 'bank_transfer';
            $payload['bank_transfer'] = [
                'bank' => explode('_', $paymentMethod)[0],
            ];
            return;
        }

        if ($paymentMethod === 'qris') {
            $payload['payment_type'] = 'qris';
            return;
        }

        if ($paymentMethod === 'gopay') {
            $payload['payment_type'] = 'gopay';
            $payload['gopay'] = [
                'enable_callback' => true,
                'callback_url' => $this->config->callbackUrl(),
            ];
            return;
        }

        if ($paymentMethod === 'shopeepay') {
            $payload['payment_type'] = 'shopeepay';
            $payload['shopeepay'] = [
                'callback_url' => $this->config->callbackUrl(),
            ];
            return;
        }

        throw new ValidationException([
            'payment_method' => 'Unsupported Midtrans payment method.',
        ]);
    }

    private function formatSession(array $transaction, string $paymentMethod, int $amount, array $requestPayload, array $responsePayload): array
    {
        return [
            'provider_name' => 'midtrans',
            'provider_order_id' => $requestPayload['transaction_details']['order_id'],
            'provider_transaction_id' => $responsePayload['transaction_id'] ?? null,
            'payment_method' => $paymentMethod,
            'transaction_status' => $responsePayload['transaction_status'] ?? 'pending',
            'gross_amount' => $amount,
            'midtrans_token' => $responsePayload['token'] ?? null,
            'midtrans_redirect_url' => $responsePayload['redirect_url'] ?? $this->redirectUrl($responsePayload),
            'expires_at' => date('Y-m-d H:i:s', strtotime('+1 day')),
            'payment_data' => $this->paymentData($responsePayload),
            'payload_request' => $requestPayload,
            'payload_response' => $responsePayload,
        ];
    }

    private function orderId(string $prefix, array $transaction): string
    {
        return $prefix . '-' . $transaction['transaction_code'] . '-' . strtoupper(bin2hex(random_bytes(2)));
    }

    private function itemName(array $transaction): string
    {
        $prefix = ($transaction['payment_type'] ?? null) === 'dp' ? 'Down Payment' : 'Pembayaran Full';

        return $prefix . ' Mobil';
    }

    private function redirectUrl(array $responsePayload): ?string
    {
        foreach (($responsePayload['actions'] ?? []) as $action) {
            if (($action['name'] ?? null) === 'deeplink-redirect' || ($action['name'] ?? null) === 'get-status') {
                return $action['url'] ?? null;
            }
        }

        return null;
    }

    private function paymentData(array $responsePayload): array
    {
        $data = [
            'va_number' => null,
            'bank' => null,
            'bill_key' => $responsePayload['bill_key'] ?? null,
            'biller_code' => $responsePayload['biller_code'] ?? null,
            'qr_string' => $responsePayload['qr_string'] ?? null,
            'deeplink_url' => null,
            'actions' => $responsePayload['actions'] ?? [],
        ];

        if (isset($responsePayload['va_numbers'][0])) {
            $data['bank'] = $responsePayload['va_numbers'][0]['bank'] ?? null;
            $data['va_number'] = $responsePayload['va_numbers'][0]['va_number'] ?? null;
        }

        if (isset($responsePayload['permata_va_number'])) {
            $data['bank'] = 'permata';
            $data['va_number'] = $responsePayload['permata_va_number'];
        }

        foreach (($responsePayload['actions'] ?? []) as $action) {
            if (($action['name'] ?? null) === 'generate-qr-code') {
                $data['qr_string'] = $action['url'] ?? $data['qr_string'];
            }

            if (($action['name'] ?? null) === 'deeplink-redirect') {
                $data['deeplink_url'] = $action['url'] ?? null;
            }
        }

        return $data;
    }
}
