<?php

declare(strict_types=1);

namespace App\Modules\Transactions\Mappers;

class TransactionMapper
{
    public static function transaction(array $transaction, array $paymentLogs = [], array $fulfillmentChecklist = []): array
    {
        return [
            'id' => (int) $transaction['id'],
            'transaction_code' => $transaction['transaction_code'],
            'buyer_user_id' => (int) $transaction['buyer_user_id'],
            'seller_user_id' => (int) $transaction['seller_user_id'],
            'car_id' => (int) $transaction['car_id'],
            'car_price' => (int) $transaction['car_price'],
            'payment_type' => $transaction['payment_type'],
            'payment_method' => $transaction['payment_method'] ?? null,
            'dp_amount' => isset($transaction['dp_amount']) ? (int) $transaction['dp_amount'] : null,
            'remaining_amount' => isset($transaction['remaining_amount']) ? (int) $transaction['remaining_amount'] : null,
            'transaction_status' => $transaction['transaction_status'],
            'affiliate_id' => isset($transaction['affiliate_id']) && $transaction['affiliate_id'] !== null ? (int) $transaction['affiliate_id'] : null,
            'affiliate_referral_code_snapshot' => $transaction['affiliate_referral_code_snapshot'] ?? null,
            'midtrans_order_id' => $transaction['midtrans_order_id'],
            'midtrans_token' => $transaction['midtrans_token'],
            'midtrans_redirect_url' => $transaction['midtrans_redirect_url'],
            'expires_at' => $transaction['expires_at'],
            'paid_at' => $transaction['paid_at'],
            'returned_at' => $transaction['returned_at'] ?? null,
            'return_reason' => $transaction['return_reason'] ?? null,
            'created_at' => $transaction['created_at'],
            'updated_at' => $transaction['updated_at'],
            'manual_transfer' => self::manualTransfer($transaction),
            'buyer' => isset($transaction['buyer_name'])
                ? [
                    'id' => (int) $transaction['buyer_user_id'],
                    'name' => $transaction['buyer_name'],
                    'email' => $transaction['buyer_email'],
                ]
                : null,
            'seller' => isset($transaction['seller_name'])
                ? [
                    'id' => (int) $transaction['seller_user_id'],
                    'name' => $transaction['seller_name'],
                    'email' => $transaction['seller_email'],
                ]
                : null,
            'affiliate' => isset($transaction['affiliate_id']) && $transaction['affiliate_id'] !== null
                ? [
                    'id' => (int) $transaction['affiliate_id'],
                    'referral_code' => $transaction['affiliate_referral_code_snapshot'] ?? null,
                    'name' => $transaction['affiliate_name'] ?? null,
                    'email' => $transaction['affiliate_email'] ?? null,
                ]
                : null,
            'car' => isset($transaction['brand_name'])
                ? [
                    'id' => (int) $transaction['car_id'],
                    'brand_name' => $transaction['brand_name'],
                    'model_name' => $transaction['model_name'],
                    'listing_status' => $transaction['listing_status'],
                    'cover_image' => $transaction['car_cover_image'] ?? null,
                    'cover_image_url' => $transaction['car_cover_image'] ?? null,
                ]
                : null,
            'payment_logs' => self::paymentLogs($paymentLogs),
            'payment_instruction' => self::paymentInstruction($paymentLogs, $transaction),
            'fulfillment_checklist' => self::fulfillmentChecklist($fulfillmentChecklist),
        ];
    }

    public static function transactions(array $transactions): array
    {
        return array_map(static fn (array $transaction): array => self::transaction($transaction), $transactions);
    }

    /**
     * Rekening tujuan diambil dari showrooms.bank_* -- sudah ada, diisi
     * showroom sendiri lewat form profil showroom, tidak perlu manajemen
     * rekening baru untuk transfer manual.
     */
    public static function manualTransfer(array $transaction): array
    {
        return [
            'proof_path' => $transaction['manual_transfer_proof_path'] ?? null,
            'note' => $transaction['manual_transfer_note'] ?? null,
            'submitted_at' => $transaction['manual_transfer_submitted_at'] ?? null,
            'confirmed_at' => $transaction['manual_transfer_confirmed_at'] ?? null,
            'confirmed_by' => isset($transaction['manual_transfer_confirmed_by']) && $transaction['manual_transfer_confirmed_by'] !== null
                ? (int) $transaction['manual_transfer_confirmed_by']
                : null,
            'rejected_at' => $transaction['manual_transfer_rejected_at'] ?? null,
            'rejected_reason' => $transaction['manual_transfer_rejected_reason'] ?? null,
            'bank' => [
                'showroom_name' => $transaction['showroom_name'] ?? null,
                'bank_type' => $transaction['showroom_bank_type'] ?? null,
                'bank_account_number' => $transaction['showroom_bank_account_number'] ?? null,
                'bank_account_name' => $transaction['showroom_bank_account_name'] ?? null,
            ],
        ];
    }

    public static function status(array $transaction): array
    {
        return [
            'id' => (int) $transaction['id'],
            'transaction_code' => $transaction['transaction_code'],
            'transaction_status' => $transaction['transaction_status'],
            'affiliate_id' => isset($transaction['affiliate_id']) && $transaction['affiliate_id'] !== null ? (int) $transaction['affiliate_id'] : null,
            'affiliate_referral_code_snapshot' => $transaction['affiliate_referral_code_snapshot'] ?? null,
            'payment_type' => $transaction['payment_type'],
            'car_price' => (int) $transaction['car_price'],
            'dp_amount' => isset($transaction['dp_amount']) ? (int) $transaction['dp_amount'] : null,
            'remaining_amount' => isset($transaction['remaining_amount']) ? (int) $transaction['remaining_amount'] : null,
            'expires_at' => $transaction['expires_at'],
            'paid_at' => $transaction['paid_at'],
        ];
    }

    public static function paymentLog(array $log): array
    {
        $payloadRequest = self::decodeJson($log['payload_request_json'] ?? null);
        $payloadResponse = self::decodeJson($log['payload_response_json'] ?? null);
        $payloadCallback = self::decodeJson($log['payload_callback_json'] ?? null);
        $paymentData = self::paymentDataFromPayload($payloadResponse, $payloadCallback);

        return [
            'id' => (int) $log['id'],
            'transaction_id' => (int) $log['transaction_id'],
            'provider_name' => $log['provider_name'],
            'provider_order_id' => $log['provider_order_id'],
            'provider_transaction_id' => $log['provider_transaction_id'],
            'payment_method' => $log['payment_method'],
            'transaction_status' => $log['transaction_status'],
            'gross_amount' => isset($log['gross_amount']) ? (int) $log['gross_amount'] : null,
            'payload_request' => $payloadRequest,
            'payload_response' => $payloadResponse,
            'payload_callback' => $payloadCallback,
            'payment_data' => $paymentData,
            'qr_code_url' => self::qrCodeUrl($paymentData),
            'deeplink_url' => self::deeplinkUrl($paymentData),
            'logged_at' => $log['logged_at'],
            'created_at' => $log['created_at'],
        ];
    }

    public static function paymentLogs(array $logs): array
    {
        return array_map(static fn (array $log): array => self::paymentLog($log), $logs);
    }

    public static function paymentInstruction(array $logs, array $transaction = []): ?array
    {
        foreach (self::paymentLogs($logs) as $log) {
            $paymentData = is_array($log['payment_data'] ?? null) ? $log['payment_data'] : [];
            $payloadResponse = is_array($log['payload_response'] ?? null) ? $log['payload_response'] : [];
            $hasActions = is_array($paymentData['actions'] ?? null) && $paymentData['actions'] !== [];
            $hasInstruction = $hasActions
                || ! empty($log['qr_code_url'])
                || ! empty($log['deeplink_url'])
                || ! empty($paymentData['va_number'])
                || ! empty($paymentData['bill_key'])
                || ! empty($paymentData['payment_code'])
                || ! empty($payloadResponse['redirect_url']);

            if (! $hasInstruction) {
                continue;
            }

            return [
                'provider_name' => $log['provider_name'] ?? null,
                'provider_order_id' => $log['provider_order_id'] ?? null,
                'provider_transaction_id' => $log['provider_transaction_id'] ?? null,
                'payment_method' => $log['payment_method'] ?? null,
                'transaction_status' => $log['transaction_status'] ?? null,
                'gross_amount' => $log['gross_amount'] ?? null,
                'payment_data' => $paymentData,
                'payload_response' => $payloadResponse,
                'qr_code_url' => $log['qr_code_url'] ?? null,
                'deeplink_url' => $log['deeplink_url'] ?? null,
                'redirect_url' => $payloadResponse['redirect_url'] ?? null,
                'expires_at' => $transaction['expires_at'] ?? $paymentData['expiry_time'] ?? $payloadResponse['expiry_time'] ?? null,
                'logged_at' => $log['logged_at'] ?? null,
            ];
        }

        return null;
    }

    public static function fulfillmentChecklist(array $items): array
    {
        return array_map(static fn (array $item): array => [
            'id' => isset($item['id']) ? (int) $item['id'] : null,
            'transaction_id' => isset($item['transaction_id']) ? (int) $item['transaction_id'] : null,
            'key' => $item['checklist_key'] ?? $item['key'] ?? null,
            'label' => $item['label'] ?? '',
            'is_required' => (bool) ($item['is_required'] ?? true),
            'is_completed' => (bool) ($item['is_completed'] ?? false),
            'completed_at' => $item['completed_at'] ?? null,
            'completed_by_user_id' => isset($item['completed_by_user_id']) && $item['completed_by_user_id'] !== null
                ? (int) $item['completed_by_user_id']
                : null,
            'notes' => $item['notes'] ?? null,
            'sort_order' => isset($item['sort_order']) ? (int) $item['sort_order'] : 0,
            'created_at' => $item['created_at'] ?? null,
            'updated_at' => $item['updated_at'] ?? null,
        ], $items);
    }

    private static function decodeJson(?string $payload): ?array
    {
        if (! is_string($payload) || trim($payload) === '') {
            return null;
        }

        $decoded = json_decode($payload, true);

        return is_array($decoded) ? $decoded : null;
    }

    private static function paymentDataFromPayload(?array $payloadResponse, ?array $payloadCallback): array
    {
        $source = is_array($payloadResponse) && $payloadResponse !== []
            ? $payloadResponse
            : (is_array($payloadCallback) ? $payloadCallback : []);

        $data = [
            'va_number' => null,
            'bank' => null,
            'bill_key' => $source['bill_key'] ?? null,
            'biller_code' => $source['biller_code'] ?? null,
            'payment_code' => $source['payment_code'] ?? null,
            'expiry_time' => $source['expiry_time'] ?? null,
            'qr_string' => $source['qr_string'] ?? null,
            'deeplink_url' => null,
            'actions' => is_array($source['actions'] ?? null) ? $source['actions'] : [],
        ];

        if (isset($source['va_numbers'][0]) && is_array($source['va_numbers'][0])) {
            $data['bank'] = $source['va_numbers'][0]['bank'] ?? null;
            $data['va_number'] = $source['va_numbers'][0]['va_number'] ?? null;
        }

        if (isset($source['permata_va_number'])) {
            $data['bank'] = 'permata';
            $data['va_number'] = $source['permata_va_number'];
        }

        foreach ($data['actions'] as $action) {
            if (! is_array($action)) {
                continue;
            }

            if (($action['name'] ?? null) === 'generate-qr-code' && isset($action['url'])) {
                $data['qr_string'] = $action['url'];
            }

            if (($action['name'] ?? null) === 'deeplink-redirect' && isset($action['url'])) {
                $data['deeplink_url'] = $action['url'];
            }
        }

        return $data;
    }

    private static function qrCodeUrl(array $paymentData): ?string
    {
        $value = $paymentData['qr_string'] ?? null;

        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        $trimmed = trim($value);
        if (preg_match('/^(https?:\/\/|data:image\/)/i', $trimmed) === 1) {
            return $trimmed;
        }

        return null;
    }

    private static function deeplinkUrl(array $paymentData): ?string
    {
        $value = $paymentData['deeplink_url'] ?? null;

        return is_string($value) && trim($value) !== '' ? trim($value) : null;
    }
}
