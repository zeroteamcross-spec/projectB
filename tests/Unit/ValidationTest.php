<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Core\Exceptions\ValidationException;
use App\Core\Request;
use App\Modules\Images\Requests\UploadCarImageRequest;
use App\Modules\MasterData\Requests\UpsertMasterDataRequest;
use App\Modules\Transactions\Requests\CreateTransactionRequest;
use Tests\TestCase;

class ValidationTest extends TestCase
{
    public function run(): void
    {
        $this->dpTransactionRequiresPositiveDpAmount();
        $this->fullTransactionPayloadIsAccepted();
        $this->masterDataRequiresArrayPayload();
        $this->imageUploadRejectsUnsupportedMimeType();
    }

    private function dpTransactionRequiresPositiveDpAmount(): void
    {
        $request = new Request('POST', '/api/transactions', '/api/transactions', [], [
            'car_id' => 10,
            'payment_type' => 'dp',
            'payment_method' => 'bank_transfer',
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new CreateTransactionRequest($request))->validate();
        }, 'dp_amount');
    }

    private function fullTransactionPayloadIsAccepted(): void
    {
        $request = new Request('POST', '/api/transactions', '/api/transactions', [], [
            'car_id' => 10,
            'payment_type' => 'full',
            'payment_method' => 'qris',
        ]);

        $payload = (new CreateTransactionRequest($request))->validate();

        $this->assertSame('full', $payload['payment_type']);
        $this->assertSame('qris', $payload['payment_method']);
    }

    private function masterDataRequiresArrayPayload(): void
    {
        $request = new Request('PUT', '/api/master-data/colors', '/api/master-data/colors', [], [
            'data' => 'red,blue',
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new UpsertMasterDataRequest($request))->validate();
        }, 'data');
    }

    private function imageUploadRejectsUnsupportedMimeType(): void
    {
        $request = new Request('POST', '/api/cars/1/images', '/api/cars/1/images', [], [], [], [
            'image' => [
                'name' => 'payload.txt',
                'type' => 'text/plain',
                'tmp_name' => __FILE__,
                'error' => UPLOAD_ERR_OK,
                'size' => 12,
            ],
        ]);

        $this->expectException(ValidationException::class, static function () use ($request): void {
            (new UploadCarImageRequest($request))->validate();
        }, 'mime_type');
    }
}
