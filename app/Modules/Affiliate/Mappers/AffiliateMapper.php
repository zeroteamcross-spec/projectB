<?php

declare(strict_types=1);

namespace App\Modules\Affiliate\Mappers;

class AffiliateMapper
{
    public static function affiliate(array $affiliate): array
    {
        return [
            'id' => (int) $affiliate['id'],
            'user_id' => (int) $affiliate['user_id'],
            'seller_user_id' => (int) $affiliate['seller_user_id'],
            'referral_code' => $affiliate['referral_code'],
            'commission_type' => $affiliate['commission_type'],
            'commission_percent' => (float) $affiliate['commission_percent'],
            'commission_flat' => (float) $affiliate['commission_flat'],
            'total_clicks' => (int) $affiliate['total_clicks'],
            'total_transactions' => (int) $affiliate['total_transactions'],
            'total_commission' => (float) $affiliate['total_commission'],
            'status' => $affiliate['status'],
            'created_at' => $affiliate['created_at'],
            'updated_at' => $affiliate['updated_at'],
            'phone_number' => $affiliate['user_phone_number'] ?? null,
            'user' => isset($affiliate['user_name'])
                ? [
                    'id' => (int) $affiliate['user_id'],
                    'name' => $affiliate['user_name'],
                    'email' => $affiliate['user_email'],
                    'role' => $affiliate['user_role'],
                    'phone_number' => $affiliate['user_phone_number'] ?? null,
                ]
                : null,
            'seller' => isset($affiliate['seller_name'])
                ? [
                    'id' => (int) $affiliate['seller_user_id'],
                    'name' => $affiliate['seller_name'],
                    'email' => $affiliate['seller_email'],
                ]
                : null,
            'showroom' => isset($affiliate['showroom_id']) && $affiliate['showroom_id'] !== null
                ? [
                    'id' => (int) $affiliate['showroom_id'],
                    'name' => $affiliate['showroom_name'] ?? null,
                ]
                : null,
        ];
    }

    public static function affiliates(array $affiliates): array
    {
        return array_map(static fn (array $affiliate): array => self::affiliate($affiliate), $affiliates);
    }

    public static function ledger(array $ledger): array
    {
        return [
            'id' => (int) $ledger['id'],
            'affiliate_id' => (int) $ledger['affiliate_id'],
            'affiliate_user_id' => isset($ledger['affiliate_user_id']) && $ledger['affiliate_user_id'] !== null ? (int) $ledger['affiliate_user_id'] : null,
            'transaction_id' => isset($ledger['transaction_id']) ? (int) $ledger['transaction_id'] : null,
            'seller_user_id' => isset($ledger['seller_user_id']) && $ledger['seller_user_id'] !== null ? (int) $ledger['seller_user_id'] : null,
            'showroom_id' => isset($ledger['showroom_id']) && $ledger['showroom_id'] !== null ? (int) $ledger['showroom_id'] : null,
            'buyer_user_id' => isset($ledger['buyer_user_id']) && $ledger['buyer_user_id'] !== null ? (int) $ledger['buyer_user_id'] : null,
            'source_type' => $ledger['source_type'] ?? null,
            'source_id' => $ledger['source_id'] ?? null,
            'entry_type' => $ledger['entry_type'],
            'amount' => (float) $ledger['amount'],
            'commission_amount' => isset($ledger['commission_amount']) ? (float) $ledger['commission_amount'] : (float) $ledger['amount'],
            'currency' => $ledger['currency'] ?? 'IDR',
            'notes' => $ledger['notes'],
            'rule_source' => $ledger['rule_source'] ?? null,
            'commission_type' => $ledger['commission_type'] ?? null,
            'commission_value_snapshot' => isset($ledger['commission_value_snapshot']) ? (float) $ledger['commission_value_snapshot'] : null,
            'base_amount' => isset($ledger['base_amount']) ? (float) $ledger['base_amount'] : null,
            'ledger_status' => $ledger['ledger_status'] ?? null,
            'status_reason' => $ledger['status_reason'] ?? null,
            'settlement_id' => isset($ledger['settlement_id']) && $ledger['settlement_id'] !== null ? (int) $ledger['settlement_id'] : null,
            'finality_event' => $ledger['finality_event'] ?? null,
            'accrued_at' => $ledger['accrued_at'] ?? null,
            'pending_at' => $ledger['pending_at'] ?? null,
            'paid_out_at' => $ledger['paid_out_at'] ?? null,
            'voided_at' => $ledger['voided_at'] ?? null,
            'created_at' => $ledger['created_at'],
            'updated_at' => $ledger['updated_at'] ?? null,
            'transaction' => isset($ledger['transaction_code'])
                ? [
                    'id' => isset($ledger['transaction_id']) ? (int) $ledger['transaction_id'] : null,
                    'transaction_code' => $ledger['transaction_code'],
                    'payment_type' => $ledger['payment_type'] ?? null,
                    'transaction_status' => $ledger['transaction_status'] ?? null,
                    'base_amount' => isset($ledger['base_amount'])
                        ? (float) $ledger['base_amount']
                        : (isset($ledger['car_price']) ? (float) $ledger['car_price'] : null),
                ]
                : null,
            'car' => isset($ledger['car_id']) && $ledger['car_id'] !== null
                ? [
                    'id' => (int) $ledger['car_id'],
                    'brand_name' => $ledger['brand_name'] ?? null,
                    'model_name' => $ledger['model_name'] ?? null,
                    'sub_model_name' => $ledger['sub_model_name'] ?? null,
                ]
                : null,
            'seller' => isset($ledger['seller_user_id']) && $ledger['seller_user_id'] !== null
                ? [
                    'id' => (int) $ledger['seller_user_id'],
                    'name' => $ledger['seller_name'] ?? null,
                    'email' => $ledger['seller_email'] ?? null,
                ]
                : null,
            'showroom' => isset($ledger['showroom_id']) && $ledger['showroom_id'] !== null
                ? [
                    'id' => (int) $ledger['showroom_id'],
                    'name' => $ledger['showroom_name'] ?? null,
                ]
                : null,
            'affiliate' => isset($ledger['referral_code'])
                ? [
                    'id' => (int) $ledger['affiliate_id'],
                    'user_id' => isset($ledger['affiliate_user_id']) && $ledger['affiliate_user_id'] !== null ? (int) $ledger['affiliate_user_id'] : null,
                    'referral_code' => $ledger['referral_code'],
                    'name' => $ledger['affiliate_name'] ?? null,
                    'email' => $ledger['affiliate_email'] ?? null,
                ]
                : null,
        ];
    }

    public static function ledgers(array $ledgers): array
    {
        return array_map(static fn (array $ledger): array => self::ledger($ledger), $ledgers);
    }

    public static function settlement(array $batch): array
    {
        return [
            'id' => (int) $batch['id'],
            'settlement_code' => $batch['settlement_code'] ?? ('AFS-' . (int) $batch['id']),
            'affiliate_id' => (int) $batch['affiliate_id'],
            'affiliate_user_id' => isset($batch['affiliate_user_id']) && $batch['affiliate_user_id'] !== null ? (int) $batch['affiliate_user_id'] : null,
            'requested_amount' => (float) $batch['requested_amount'],
            'total_amount' => (float) $batch['requested_amount'],
            'currency' => $batch['currency'] ?? 'IDR',
            'ledger_count' => (int) $batch['ledger_count'],
            'status' => $batch['status'],
            'payment_method' => $batch['payment_method'] ?? null,
            'payment_reference' => $batch['payment_reference'] ?? null,
            'payment_note' => $batch['payment_note'] ?? null,
            'proof_file_url' => $batch['proof_file_url'] ?? null,
            'period_start' => $batch['period_start'] ?? null,
            'period_end' => $batch['period_end'] ?? null,
            'requested_by' => isset($batch['requested_by']) && $batch['requested_by'] !== null ? (int) $batch['requested_by'] : null,
            'approved_by' => isset($batch['approved_by']) && $batch['approved_by'] !== null ? (int) $batch['approved_by'] : null,
            'paid_by' => isset($batch['paid_by']) && $batch['paid_by'] !== null ? (int) $batch['paid_by'] : null,
            'cancelled_by' => isset($batch['cancelled_by']) && $batch['cancelled_by'] !== null ? (int) $batch['cancelled_by'] : null,
            'notes' => $batch['notes'] ?? null,
            'requested_at' => $batch['requested_at'] ?? null,
            'settled_at' => $batch['settled_at'] ?? null,
            'cancelled_at' => $batch['cancelled_at'] ?? null,
            'created_at' => $batch['created_at'] ?? null,
            'updated_at' => $batch['updated_at'] ?? null,
            'affiliate' => isset($batch['referral_code'])
                ? [
                    'id' => (int) $batch['affiliate_id'],
                    'referral_code' => $batch['referral_code'],
                    'name' => $batch['affiliate_name'] ?? null,
                    'email' => $batch['affiliate_email'] ?? null,
                ]
                : null,
            'ledger_ids' => array_values(array_map(
                static fn ($item): int => is_array($item) ? (int) ($item['ledger_id'] ?? $item['id'] ?? 0) : (int) $item,
                $batch['items'] ?? $batch['ledger_ids'] ?? []
            )),
            'items' => self::settlementItems($batch['items'] ?? []),
            'histories' => self::settlementHistories($batch['histories'] ?? []),
        ];
    }

    public static function settlements(array $batches): array
    {
        return array_map(static fn (array $batch): array => self::settlement($batch), $batches);
    }

    private static function settlementItems(array $items): array
    {
        return array_map(static fn (array $item): array => [
            'id' => isset($item['id']) ? (int) $item['id'] : null,
            'settlement_batch_id' => isset($item['settlement_batch_id']) ? (int) $item['settlement_batch_id'] : null,
            'ledger_id' => isset($item['ledger_id']) ? (int) $item['ledger_id'] : null,
            'amount_snapshot' => isset($item['amount_snapshot']) ? (float) $item['amount_snapshot'] : null,
            'ledger_status' => $item['ledger_status'] ?? null,
            'transaction_id' => isset($item['transaction_id']) && $item['transaction_id'] !== null ? (int) $item['transaction_id'] : null,
            'transaction_code' => $item['transaction_code'] ?? null,
            'payment_type' => $item['payment_type'] ?? null,
            'transaction_status' => $item['transaction_status'] ?? null,
            'dp_amount' => isset($item['dp_amount']) && $item['dp_amount'] !== null ? (float) $item['dp_amount'] : null,
            'remaining_amount' => isset($item['remaining_amount']) && $item['remaining_amount'] !== null ? (float) $item['remaining_amount'] : null,
            'created_at' => $item['created_at'] ?? null,
        ], $items);
    }

    private static function settlementHistories(array $histories): array
    {
        return array_map(static fn (array $history): array => [
            'id' => (int) $history['id'],
            'settlement_id' => (int) $history['settlement_id'],
            'from_status' => $history['from_status'] ?? null,
            'to_status' => $history['to_status'] ?? null,
            'note' => $history['note'] ?? null,
            'actor_user_id' => isset($history['actor_user_id']) && $history['actor_user_id'] !== null ? (int) $history['actor_user_id'] : null,
            'actor' => isset($history['actor_user_id']) && $history['actor_user_id'] !== null
                ? [
                    'id' => (int) $history['actor_user_id'],
                    'name' => $history['actor_name'] ?? null,
                    'email' => $history['actor_email'] ?? null,
                ]
                : null,
            'created_at' => $history['created_at'] ?? null,
        ], $histories);
    }
}
