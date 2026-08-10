<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ValidationException;
use App\Core\Request;
use App\Modules\Cars\Requests\CreateCarRequest;
use App\Modules\Cars\Requests\UpdateCarRequest;
use App\Modules\Transactions\Requests\ReturnTransactionRequest;
use Tests\TestCase;

class BookingFeeAndReturnTest extends TestCase
{
    public function run(): void
    {
        $this->bookingFeeIsRequiredWhenCreatingCar();
        $this->bookingFeeMustBePositive();
        $this->bookingFeeMustBeBelowCashPrice();
        $this->validBookingFeeIsAccepted();
        $this->updateDoesNotForceBookingFeeButStillValidatesIt();
        $this->returnRequestRequiresMeaningfulReason();
    }

    private function bookingFeeIsRequiredWhenCreatingCar(): void
    {
        $request = $this->carRequest([
            'brand_name' => 'Toyota',
            'model_name' => 'Avanza',
            'price_cash' => 200000000,
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new CreateCarRequest($request))->validate();
        }, 'dp_amount');
    }

    private function bookingFeeMustBePositive(): void
    {
        foreach ([0, -1] as $nilai) {
            $request = $this->carRequest([
                'brand_name' => 'Toyota',
                'model_name' => 'Avanza',
                'price_cash' => 200000000,
                'dp_amount' => $nilai,
            ]);

            $this->expectException(ValidationException::class, static function () use ($request): void {
                (new CreateCarRequest($request))->validate();
            }, 'dp_amount');
        }
    }

    private function bookingFeeMustBeBelowCashPrice(): void
    {
        foreach ([200000000, 250000000] as $nilai) {
            $request = $this->carRequest([
                'brand_name' => 'Toyota',
                'model_name' => 'Avanza',
                'price_cash' => 200000000,
                'dp_amount' => $nilai,
            ]);

            $this->expectException(ValidationException::class, static function () use ($request): void {
                (new CreateCarRequest($request))->validate();
            }, 'dp_amount');
        }
    }

    private function validBookingFeeIsAccepted(): void
    {
        $request = $this->carRequest([
            'brand_name' => 'Toyota',
            'model_name' => 'Avanza',
            'price_cash' => 200000000,
            'dp_amount' => 5000000,
        ]);

        $payload = (new CreateCarRequest($request))->validate();
        $this->assertSame(5000000, (int) $payload['dp_amount']);
    }

    private function updateDoesNotForceBookingFeeButStillValidatesIt(): void
    {
        // Menyunting field lain tanpa menyentuh Booking Fee harus tetap lolos.
        $tanpaBookingFee = $this->carRequest(['location_name' => 'Bandung'], 'PATCH');
        $payload = (new UpdateCarRequest($tanpaBookingFee))->validate();
        $this->assertSame('Bandung', $payload['location_name']);

        // Tetapi bila diisi, aturannya sama ketatnya.
        $bookingFeeNol = $this->carRequest(['dp_amount' => 0], 'PATCH');
        $this->expectException(ValidationException::class, static function () use ($bookingFeeNol): void {
            (new UpdateCarRequest($bookingFeeNol))->validate();
        }, 'dp_amount');

        $melebihiHarga = $this->carRequest(['price_cash' => 100000000, 'dp_amount' => 100000000], 'PATCH');
        $this->expectException(ValidationException::class, static function () use ($melebihiHarga): void {
            (new UpdateCarRequest($melebihiHarga))->validate();
        }, 'dp_amount');
    }

    private function returnRequestRequiresMeaningfulReason(): void
    {
        foreach (['', '   ', 'ab'] as $alasan) {
            $request = new Request('POST', '/api/transactions/1/return', '/api/transactions/1/return', [], [
                'return_reason' => $alasan,
            ]);

            $this->expectException(ValidationException::class, static function () use ($request): void {
                (new ReturnTransactionRequest($request))->validate();
            }, 'return_reason');
        }

        $valid = new Request('POST', '/api/transactions/1/return', '/api/transactions/1/return', [], [
            'return_reason' => 'Buyer membatalkan pembelian.',
        ]);
        $payload = (new ReturnTransactionRequest($valid))->validate();
        $this->assertSame('Buyer membatalkan pembelian.', $payload['return_reason']);
    }

    private function carRequest(array $body, string $method = 'POST'): Request
    {
        return new Request($method, '/api/seller/cars', '/api/seller/cars', [], $body);
    }
}
