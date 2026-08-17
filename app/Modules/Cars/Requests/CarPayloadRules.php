<?php

declare(strict_types=1);

namespace App\Modules\Cars\Requests;

trait CarPayloadRules
{
    protected function carRules(bool $creating): array
    {
        $required = $creating ? 'required' : 'nullable';

        return [
            'seller_user_id' => 'nullable|integer',
            'showroom_id' => 'nullable|integer',
            'listing_status' => 'nullable|string|in:draft,published,reserved,sold,view_sold,archived',
            'stock' => 'nullable|integer|min_value:0',
            'license_plate_number' => 'nullable|string|max:100',
            'brand_name' => $required . '|string|max:100',
            'model_name' => $required . '|string|max:100',
            'sub_model_name' => 'nullable|string|max:100',
            'primary_color' => 'nullable|string|max:50',
            'secondary_color' => 'nullable|string|max:50',
            'color_variation' => 'nullable|string|max:50',
            'document_type' => 'nullable|string|in:new,old',
            'registration_date' => 'nullable|date|max:10',
            'transmission' => 'nullable|string|max:50',
            'engine_number' => 'nullable|string|max:100',
            'chassis_number' => 'nullable|string|max:100',
            'location_name' => 'nullable|string|max:225',
            'engine_capacity_cc' => 'nullable|integer|min_value:0',
            'mileage_km' => 'nullable|integer|min_value:0',
            'seat_count' => 'nullable|integer|min_value:0',
            'previous_owner_count' => 'nullable|integer|min_value:0',
            'has_service_book' => 'nullable|boolean',
            'key_count' => 'nullable|integer|min_value:0',
            'description' => 'nullable|string',
            'youtube_url' => 'nullable|string|max:300',
            'price_cash' => 'nullable|integer|min_value:0',
            'price_discount' => 'nullable|integer|min_value:0',
            'price_credit' => 'nullable|integer|min_value:0',
            // Booking Fee. Wajib saat membuat mobil karena tanpa ini mobil
            // tidak bisa ditransaksikan sama sekali.
            'dp_amount' => $required . '|integer|min_value:1',
            'inspection_summary_status' => 'nullable|string|in:not_checked,partial,completed',
        ];
    }

    protected function validateCarPayload(array $data, array &$errors, bool $creating): void
    {
        if (! empty($data['registration_date']) && ! preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $data['registration_date'])) {
            $errors['registration_date'] = 'The registration_date field must use YYYY-MM-DD format.';
        }

        foreach (['stock', 'engine_capacity_cc', 'mileage_km', 'seat_count', 'previous_owner_count', 'key_count'] as $field) {
            if (isset($data[$field]) && (int) $data[$field] < 0) {
                $errors[$field] = 'The ' . $field . ' field must not be negative.';
            }
        }

        foreach (['price_cash', 'price_discount', 'price_credit'] as $field) {
            if (isset($data[$field]) && (int) $data[$field] < 0) {
                $errors[$field] = 'The ' . $field . ' field must not be negative.';
            }
        }

        foreach (['brand_name', 'model_name'] as $field) {
            if (! $creating && array_key_exists($field, $data) && ($data[$field] === null || $data[$field] === '')) {
                $errors[$field] = 'The ' . $field . ' field cannot be empty.';
            }
        }

        $this->validateBookingFee($data, $errors, $creating);

        if (! $creating) {
            $allowed = array_keys($this->carRules(false));
            if (array_intersect(array_keys($data), $allowed) === []) {
                $errors['payload'] = 'At least one car field must be provided.';
            }
        }
    }

    /**
     * Booking Fee harus masuk akal terhadap harga: lebih dari nol, dan lebih
     * kecil dari harga cash. Booking Fee yang sama atau melebihi harga berarti
     * pelunasan, bukan pengikat unit.
     */
    private function validateBookingFee(array $data, array &$errors, bool $creating): void
    {
        $diisi = array_key_exists('dp_amount', $data) && $data['dp_amount'] !== null && $data['dp_amount'] !== '';

        if (! $diisi) {
            if ($creating) {
                $errors['dp_amount'] = 'Booking Fee wajib diisi.';
            }

            return;
        }

        $bookingFee = (int) $data['dp_amount'];

        if ($bookingFee <= 0) {
            $errors['dp_amount'] = 'Booking Fee harus lebih besar dari 0.';
            return;
        }

        $hargaCash = array_key_exists('price_cash', $data) && $data['price_cash'] !== null && $data['price_cash'] !== ''
            ? (int) $data['price_cash']
            : null;

        if ($hargaCash !== null && $hargaCash > 0 && $bookingFee >= $hargaCash) {
            $errors['dp_amount'] = 'Booking Fee harus lebih kecil dari harga cash.';
        }
    }
}
