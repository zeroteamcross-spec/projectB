<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Services;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Infrastructure\Payment\Midtrans\MidtransHttpClient;
use App\Infrastructure\Storage\StorageServiceInterface;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\Auth\Repositories\AuthUserRepository;
use App\Modules\MasterData\Services\MasterDataService;
use App\Modules\Showrooms\Repositories\ShowroomRepository;
use Throwable;

class ShowroomService
{
    /**
     * Sama seperti bank yang didukung untuk pembayaran transaksi mobil (lihat
     * MidtransPaymentAdapter::applyPaymentMethod()) -- Virtual Account saja,
     * sesuai cakupan yang disepakati untuk pembayaran paket SaaS ini.
     */
    private const MIDTRANS_VA_BANKS = ['bca', 'bni', 'bri', 'mandiri'];

    /**
     * Kata yang tidak boleh jadi slug showroom karena URL-nya kini langsung
     * di root ("carlynk.id/{slug}") -- bertabrakan dengan rute sistem yang
     * juga hidup di root (dashboard peran, auth, path API, dst). Daftar ini
     * harus sejalan dengan RESERVED_ROOT_SLUGS di
     * public/assets/js/modules/public/routes.js.
     */
    private const RESERVED_SLUGS = [
        'admin', 'super-admin', 'seller', 'buyer', 'affiliate',
        'login', 'google-login', 'auth', 'api', 'cars', 'transactions',
        'profile', 'notifications', 'public', 'showrooms', 'af', 'a', 's',
        'daftar-showroom', 'saas-landing', 'carlynk-landing', 'contoh-katalog', 'health',
        'uploads', 'assets', 'tester', 'app',
    ];

    private ShowroomRepository $showrooms;

    private MasterDataService $masterData;

    private StorageServiceInterface $storage;

    private MidtransHttpClient $midtransHttp;

    private AuthUserRepository $users;

    public function __construct(
        ShowroomRepository $showrooms,
        MasterDataService $masterData,
        StorageServiceInterface $storage,
        MidtransHttpClient $midtransHttp,
        AuthUserRepository $users
    ) {
        $this->showrooms = $showrooms;
        $this->masterData = $masterData;
        $this->storage = $storage;
        $this->midtransHttp = $midtransHttp;
        $this->users = $users;
    }

    public function mine(array $user): array
    {
        $this->ensureSeller($user);
        $showroom = $this->showrooms->findByUserId((int) $user['id']);

        if (! $showroom) {
            throw new NotFoundException('Showroom belum tersedia.');
        }

        return $this->serializeShowroom($showroom);
    }

    public function show(int $id, array $user): array
    {
        $showroom = $this->showrooms->findById($id);

        if (! $showroom) {
            throw new NotFoundException('Showroom tidak ditemukan.');
        }

        if (($user['role'] ?? null) !== 'admin' && (int) $showroom['user_id'] !== (int) $user['id']) {
            throw new ForbiddenException('Akses showroom tidak diizinkan.');
        }

        return $this->serializeShowroom($showroom);
    }

    /**
     * Admin menonaktifkan showroom -- mis. menunggak lama, melanggar aturan.
     * Sengaja TIDAK menyentuh account_status seller (login tetap jalan)
     * supaya seller masih bisa masuk dashboard dan melihat alasannya, tapi
     * halaman showroom publik & katalog mobilnya diarahkan ke halaman
     * maintenance (lihat ShowroomController::validateSlug() dan
     * CarService::catalog()).
     */
    public function deactivate(array $actor, int $showroomId, string $reason): array
    {
        AuthPolicy::requireAdmin($actor);
        $showroom = $this->showrooms->findById($showroomId);

        if (! $showroom) {
            throw new NotFoundException('Showroom tidak ditemukan.');
        }

        $reason = trim($reason);
        if ($reason === '') {
            throw new ValidationException(['reason' => 'Alasan menonaktifkan showroom wajib diisi.']);
        }

        $this->showrooms->updateActivation($showroomId, false, $reason, (int) $actor['id'], date('Y-m-d H:i:s'));

        return $this->serializeShowroom($this->showrooms->findById($showroomId));
    }

    public function activate(array $actor, int $showroomId): array
    {
        AuthPolicy::requireAdmin($actor);
        $showroom = $this->showrooms->findById($showroomId);

        if (! $showroom) {
            throw new NotFoundException('Showroom tidak ditemukan.');
        }

        $this->showrooms->updateActivation($showroomId, true, null, null, date('Y-m-d H:i:s'));

        return $this->serializeShowroom($this->showrooms->findById($showroomId));
    }

    public function upsertMine(array $user, array $data): array
    {
        $this->ensureSeller($user);
        $existing = $this->showrooms->findByUserId((int) $user['id']);

        if ($existing) {
            // Harga/periode tagihan TIDAK BOLEH dipercaya dari klien -- kalau
            // tidak, showroom bisa mengaku pilih paket apa saja dengan harga
            // berapa saja (termasuk 0 atau negatif) lewat request yang
            // dimodifikasi manual. Begitu selected_plan_name dikirim, nilai
            // harga & periode selalu diambil ulang dari Master Harga di sini,
            // bukan dari $data.
            $hasPlanSelection = array_key_exists('selected_plan_name', $data);
            $plan = $hasPlanSelection ? $this->resolveSelectedPlan($data['selected_plan_name']) : null;
            // Ganti paket (mis. upgrade/downgrade) berarti harga berubah, jadi
            // pembayaran & bukti transfer yang lama tidak lagi berlaku untuk
            // paket yang baru -- harus bayar ulang, bukan otomatis "sudah lunas".
            $planChanged = $hasPlanSelection && ($plan['name'] ?? null) !== $existing['selected_plan_name'];

            $payload = [
                'slug' => $existing['slug'] ?: $this->generateSlug((string) ($data['name'] ?? $existing['name']), (int) $existing['id']),
                'name' => $data['name'] ?? $existing['name'],
                'address' => array_key_exists('address', $data) ? $data['address'] : $existing['address'],
                'city_name' => array_key_exists('city_name', $data) ? $data['city_name'] : $existing['city_name'],
                'phone_number' => array_key_exists('phone_number', $data) ? $data['phone_number'] : $existing['phone_number'],
                'bank_account_number' => array_key_exists('bank_account_number', $data)
                    ? $data['bank_account_number']
                    : $existing['bank_account_number'],
                'bank_type' => array_key_exists('bank_type', $data) ? $data['bank_type'] : $existing['bank_type'],
                'bank_account_name' => array_key_exists('bank_account_name', $data)
                    ? $data['bank_account_name']
                    : $existing['bank_account_name'],
                'icon_url' => array_key_exists('icon_url', $data) ? $data['icon_url'] : $existing['icon_url'],
                'header_logo_url' => array_key_exists('header_logo_url', $data)
                    ? $data['header_logo_url']
                    : $existing['header_logo_url'],
                'tab_title' => array_key_exists('tab_title', $data) ? $data['tab_title'] : $existing['tab_title'],
                // Paket harga dipilih persis sekali, sesaat setelah showroom
                // mendaftar (lihat routes.js public.showroom-register alur
                // pilih-paket) -- namanya dan harganya disalin (snapshot) ke
                // sini, bukan disimpan sebagai referensi ke Master Harga,
                // supaya kalau Admin nanti mengubah/menghapus paket itu di
                // Master Harga, riwayat pilihan showroom lama tidak ikut
                // berubah.
                'selected_plan_name' => $hasPlanSelection ? $plan['name'] : $existing['selected_plan_name'],
                'selected_plan_price' => $hasPlanSelection ? $plan['price'] : $existing['selected_plan_price'],
                'selected_plan_billing_period' => $hasPlanSelection
                    ? $plan['billing_period']
                    : $existing['selected_plan_billing_period'],
                'selected_plan_selected_at' => $hasPlanSelection ? date('Y-m-d H:i:s') : $existing['selected_plan_selected_at'],
                'subscription_payment_status' => $planChanged ? 'unpaid' : $existing['subscription_payment_status'],
                'subscription_proof_path' => $planChanged ? null : $existing['subscription_proof_path'],
                'subscription_proof_note' => $planChanged ? null : $existing['subscription_proof_note'],
                'subscription_proof_submitted_at' => $planChanged ? null : $existing['subscription_proof_submitted_at'],
                'subscription_confirmed_at' => $planChanged ? null : $existing['subscription_confirmed_at'],
                'subscription_confirmed_by' => $planChanged ? null : $existing['subscription_confirmed_by'],
                'subscription_rejected_at' => $planChanged ? null : $existing['subscription_rejected_at'],
                'subscription_rejected_reason' => $planChanged ? null : $existing['subscription_rejected_reason'],
                'subscription_next_due_at' => $planChanged ? null : $existing['subscription_next_due_at'],
                // Sesi VA lama menagih harga PAKET LAMA -- kalau tetap
                // dibiarkan, membayarnya tidak akan pernah cocok dengan paket
                // yang baru dipilih. Diputus sama seperti bukti transfer
                // manual di atas.
                'subscription_payment_method' => $planChanged ? 'manual' : ($existing['subscription_payment_method'] ?? 'manual'),
                'subscription_midtrans_order_id' => $planChanged ? null : $existing['subscription_midtrans_order_id'],
                'subscription_midtrans_transaction_id' => $planChanged ? null : $existing['subscription_midtrans_transaction_id'],
                'subscription_midtrans_payment_data' => $planChanged ? null : $existing['subscription_midtrans_payment_data'],
                'subscription_midtrans_expires_at' => $planChanged ? null : $existing['subscription_midtrans_expires_at'],
                'subscription_midtrans_paid_at' => $planChanged ? null : $existing['subscription_midtrans_paid_at'],
            ];

            $this->showrooms->update((int) $existing['id'], $payload);

            return $this->mine($user);
        }

        $data['slug'] = $this->generateSlug((string) $data['name']);
        $showroomId = $this->showrooms->create((int) $user['id'], $data);

        return $this->show((int) $showroomId, $user);
    }

    /**
     * Showroom mengunggah bukti transfer untuk paket yang sudah dipilih.
     * Bisa dipanggil ulang selama belum dikonfirmasi Admin -- upload baru
     * menimpa bukti lama dan mencabut penolakan sebelumnya, sama seperti
     * pola transfer manual transaksi mobil.
     */
    public function submitSubscriptionProof(array $user, array $data): array
    {
        $this->ensureSeller($user);
        $showroom = $this->showrooms->findByUserId((int) $user['id']);

        if (! $showroom) {
            throw new NotFoundException('Showroom belum tersedia.');
        }

        if (($showroom['selected_plan_name'] ?? null) === null) {
            throw new ValidationException([
                'selected_plan_name' => 'Pilih paket harga dulu sebelum mengunggah bukti transfer.',
            ]);
        }

        // "paid" cuma menahan upload ulang kalau siklus tagihan saat ini
        // belum jatuh tempo -- begitu jatuh tempo (perpanjangan berikutnya),
        // showroom yang sama harus bisa unggah bukti transfer lagi.
        if (($showroom['subscription_payment_status'] ?? 'unpaid') === 'paid' && ! $this->isSubscriptionDue($showroom)) {
            throw new ValidationException([
                'subscription_payment_status' => 'Pembayaran paket ini sudah dikonfirmasi.',
            ]);
        }

        $showroomId = (int) $showroom['id'];
        $stored = $this->storage->storeUploadedFile($data['proof'], 'showrooms/' . $showroomId . '/subscription');
        $now = date('Y-m-d H:i:s');

        try {
            $this->showrooms->updateSubscriptionSubmission($showroomId, [
                'subscription_proof_path' => $stored['file_path'],
                'subscription_proof_note' => ($data['note'] ?? '') !== '' ? $data['note'] : null,
                'subscription_proof_submitted_at' => $now,
                'updated_at' => $now,
            ]);
        } catch (Throwable $exception) {
            $this->storage->delete($stored['file_path']);
            throw $exception;
        }

        return $this->mine($user);
    }

    /**
     * Admin mengonfirmasi bukti transfer paket sudah dicek. Dipisah dari
     * approval akun showroom (lihat AuthService::approveUsers()) -- keduanya
     * dua keputusan berbeda yang kebetulan sering diambil bersamaan.
     */
    public function confirmSubscriptionPayment(array $actor, int $showroomId): array
    {
        AuthPolicy::requireAdmin($actor);
        $showroom = $this->showrooms->findById($showroomId);

        if (! $showroom) {
            throw new NotFoundException('Showroom tidak ditemukan.');
        }

        // Dulu memeriksa subscription_proof_path secara langsung -- tidak lagi
        // cukup sejak pembayaran Midtrans otomatis juga bisa berujung ke
        // status ini TANPA file bukti (lihat updateSubscriptionMidtransPaid()).
        // "pending_verification" sudah berarti ada sesuatu untuk ditinjau,
        // baik itu bukti transfer manual maupun VA yang sudah dibayar.
        if (($showroom['subscription_payment_status'] ?? null) !== 'pending_verification') {
            throw new ValidationException([
                'subscription_payment_status' => 'Showroom belum mengunggah bukti transfer atau membayar via Midtrans.',
            ]);
        }

        $now = date('Y-m-d H:i:s');
        // Siklus berikutnya dihitung dari due date SEBELUMNYA (kalau ada),
        // bukan dari "sekarang" -- supaya tanggal jatuh tempo tetap di
        // tanggal yang sama tiap bulan/tahun walau konfirmasinya telat
        // beberapa hari, tidak makin bergeser tiap siklus.
        $anchor = $showroom['subscription_next_due_at'] ?? $showroom['subscription_confirmed_at'] ?? $now;
        $nextDueAt = $this->addBillingInterval($anchor, $showroom['selected_plan_billing_period'] ?? null);

        // Disalin ke riwayat SEBELUM kolom siklus-berjalan di bawah menimpanya
        // -- sekali ditimpa, bukti/detail VA siklus ini tidak bisa dilihat lagi
        // lewat showrooms saja (lihat findSubscriptionPaymentHistory()).
        $this->recordSubscriptionPaymentHistory($showroom, 'paid', $now, (int) $actor['id'], null);

        $this->showrooms->updateSubscriptionConfirmation($showroomId, [
            'subscription_confirmed_at' => $now,
            'subscription_confirmed_by' => (int) $actor['id'],
            'subscription_next_due_at' => $nextDueAt,
            'updated_at' => $now,
        ]);

        return $this->serializeShowroom($this->showrooms->findById($showroomId));
    }

    /**
     * Riwayat pembayaran paket showroom -- siklus-siklus SEBELUMNYA, bukan
     * yang sedang berjalan (itu sudah ada di serializeShowroom() lewat
     * subscription_payment_status dkk).
     */
    public function subscriptionHistory(array $user): array
    {
        $this->ensureSeller($user);
        $showroom = $this->showrooms->findByUserId((int) $user['id']);

        if (! $showroom) {
            throw new NotFoundException('Showroom belum tersedia.');
        }

        return $this->serializeSubscriptionHistory($this->showrooms->findSubscriptionPaymentHistory((int) $showroom['id']));
    }

    public function subscriptionHistoryForAdmin(array $actor, int $showroomId): array
    {
        AuthPolicy::requireAdmin($actor);

        if (! $this->showrooms->findById($showroomId)) {
            throw new NotFoundException('Showroom tidak ditemukan.');
        }

        return $this->serializeSubscriptionHistory($this->showrooms->findSubscriptionPaymentHistory($showroomId));
    }

    private function recordSubscriptionPaymentHistory(array $showroom, string $status, string $decidedAt, ?int $decidedBy, ?string $rejectedReason): void
    {
        $this->showrooms->insertSubscriptionPaymentHistory([
            'showroom_id' => (int) $showroom['id'],
            'plan_name' => $showroom['selected_plan_name'] ?? null,
            'plan_price' => $showroom['selected_plan_price'] ?? null,
            'plan_billing_period' => $showroom['selected_plan_billing_period'] ?? null,
            'payment_method' => $showroom['subscription_payment_method'] ?? 'manual',
            'proof_path' => $showroom['subscription_proof_path'] ?? null,
            'proof_note' => $showroom['subscription_proof_note'] ?? null,
            'proof_submitted_at' => $showroom['subscription_proof_submitted_at'] ?? null,
            'midtrans_order_id' => $showroom['subscription_midtrans_order_id'] ?? null,
            'midtrans_transaction_id' => $showroom['subscription_midtrans_transaction_id'] ?? null,
            'midtrans_payment_data' => $showroom['subscription_midtrans_payment_data'] ?? null,
            'midtrans_paid_at' => $showroom['subscription_midtrans_paid_at'] ?? null,
            'status' => $status,
            'decided_at' => $decidedAt,
            'decided_by' => $decidedBy,
            'rejected_reason' => $rejectedReason,
            'created_at' => $decidedAt,
        ]);
    }

    private function serializeSubscriptionHistory(array $rows): array
    {
        return array_map(static function (array $row): array {
            $paymentData = is_string($row['midtrans_payment_data'] ?? null)
                ? (json_decode((string) $row['midtrans_payment_data'], true) ?: [])
                : [];

            return [
                'id' => (int) $row['id'],
                'plan_name' => $row['plan_name'] ?? null,
                'plan_price' => isset($row['plan_price']) ? (float) $row['plan_price'] : null,
                'plan_billing_period' => $row['plan_billing_period'] ?? null,
                'payment_method' => $row['payment_method'] ?? 'manual',
                'proof_path' => $row['proof_path'] ?? null,
                'proof_note' => $row['proof_note'] ?? null,
                'proof_submitted_at' => $row['proof_submitted_at'] ?? null,
                'midtrans_order_id' => $row['midtrans_order_id'] ?? null,
                'midtrans_payment_data' => $paymentData,
                'midtrans_paid_at' => $row['midtrans_paid_at'] ?? null,
                'status' => $row['status'],
                'decided_at' => $row['decided_at'],
                'decided_by_name' => $row['decided_by_name'] ?? null,
                'rejected_reason' => $row['rejected_reason'] ?? null,
            ];
        }, $rows);
    }

    /**
     * Semua showroom yang sudah disetujui Admin dan siklus tagihannya perlu
     * ditinjau -- sudah jatuh tempo, atau sudah unggah bukti perpanjangan
     * dan menunggu dikonfirmasi.
     */
    public function dueSubscriptions(array $actor): array
    {
        AuthPolicy::requireAdmin($actor);

        return array_map(
            fn (array $showroom): array => $this->serializeShowroom($showroom),
            $this->showrooms->findDueSubscriptions()
        );
    }

    /**
     * Admin menolak bukti transfer -- nominal tidak cocok, bukti tidak
     * jelas, dsb. Kolom siklus-berjalan (subscription_proof_path dkk)
     * dikosongkan supaya showroom harus unggah yang baru, tapi datanya
     * tersimpan permanen di showroom_subscription_payments sebelum itu
     * terjadi -- lihat recordSubscriptionPaymentHistory().
     */
    public function rejectSubscriptionPayment(array $actor, int $showroomId, array $data): array
    {
        AuthPolicy::requireAdmin($actor);
        $showroom = $this->showrooms->findById($showroomId);

        if (! $showroom) {
            throw new NotFoundException('Showroom tidak ditemukan.');
        }

        // Sama seperti confirmSubscriptionPayment() -- proof_path saja tidak
        // lagi cukup sejak pembayaran Midtrans bisa masuk ke status ini tanpa
        // file bukti.
        if (($showroom['subscription_payment_status'] ?? null) !== 'pending_verification') {
            throw new ValidationException([
                'subscription_payment_status' => 'Showroom belum mengunggah bukti transfer atau membayar via Midtrans.',
            ]);
        }

        $reason = trim((string) ($data['reason'] ?? ''));

        if ($reason === '') {
            throw new ValidationException(['reason' => 'Alasan penolakan wajib diisi.']);
        }

        $now = date('Y-m-d H:i:s');

        // Disalin ke riwayat SEBELUM kolom siklus-berjalan di bawah menimpanya
        // -- sama seperti confirmSubscriptionPayment(). File buktinya SENGAJA
        // TIDAK dihapus lagi (beda dari perilaku sebelum ada riwayat ini) --
        // baris riwayat di atas menyimpan proof_path yang sama, jadi
        // menghapus filenya sekarang akan membuat link "Lihat bukti transfer"
        // di riwayat menunjuk ke file yang sudah tidak ada.
        $this->recordSubscriptionPaymentHistory($showroom, 'rejected', $now, (int) $actor['id'], $reason);

        $this->showrooms->updateSubscriptionRejection($showroomId, [
            'subscription_rejected_at' => $now,
            'subscription_rejected_reason' => $reason,
            'updated_at' => $now,
        ]);

        return $this->serializeShowroom($this->showrooms->findById($showroomId));
    }

    /**
     * Showroom memilih bayar via Virtual Account Midtrans, sebagai alternatif
     * transfer manual -- dipakai baik saat registrasi (pilih paket pertama
     * kali) maupun perpanjangan (siklus berikutnya di halaman Langganan).
     * Belum mengubah subscription_payment_status: itu baru terjadi kalau
     * pembayarannya benar-benar dikonfirmasi lewat callback Midtrans (lihat
     * handleSubscriptionMidtransCallback()), bukan begitu VA dibuat.
     */
    public function createSubscriptionMidtransPayment(array $user, string $bank): array
    {
        $this->ensureSeller($user);
        $showroom = $this->showrooms->findByUserId((int) $user['id']);

        if (! $showroom) {
            throw new NotFoundException('Showroom belum tersedia.');
        }

        if (($showroom['selected_plan_name'] ?? null) === null) {
            throw new ValidationException([
                'selected_plan_name' => 'Pilih paket harga dulu sebelum membuat pembayaran.',
            ]);
        }

        if (($showroom['subscription_payment_status'] ?? 'unpaid') === 'paid' && ! $this->isSubscriptionDue($showroom)) {
            throw new ValidationException([
                'subscription_payment_status' => 'Pembayaran paket ini sudah dikonfirmasi.',
            ]);
        }

        $bank = strtolower(trim($bank));
        if (! in_array($bank, self::MIDTRANS_VA_BANKS, true)) {
            throw new ValidationException([
                'bank' => 'Bank Virtual Account tidak didukung.',
            ]);
        }

        $showroomId = (int) $showroom['id'];
        $amount = (int) round((float) $showroom['selected_plan_price']);
        $orderId = 'SUBSCR-' . $showroomId . '-' . time() . '-' . strtoupper(bin2hex(random_bytes(2)));

        $payload = [
            'payment_type' => 'bank_transfer',
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => $amount,
            ],
            'bank_transfer' => [
                'bank' => $bank,
            ],
            'customer_details' => [
                'first_name' => $user['name'] ?? $showroom['name'] ?? 'Showroom',
                'email' => $user['email'] ?? null,
                'phone' => $showroom['phone_number'] ?? null,
            ],
            // Tagihan paket, bukan transaksi mobil yang perlu "sekarang juga" --
            // 24 jam supaya showroom sempat transfer tanpa terburu-buru,
            // konsisten dengan cara orang membayar tagihan bulanan.
            'custom_expiry' => [
                'expiry_duration' => 24,
                'unit' => 'hour',
            ],
            'item_details' => [[
                'id' => 'SUBSCRIPTION-' . $showroomId,
                'price' => $amount,
                'quantity' => 1,
                'name' => 'Paket ' . $showroom['selected_plan_name'],
            ]],
            'metadata' => [
                'purpose' => 'showroom_subscription',
                'showroom_id' => $showroomId,
                'plan_name' => $showroom['selected_plan_name'],
            ],
        ];

        $response = $this->midtransHttp->post('/v2/charge', $payload);
        $paymentData = $this->extractVaPaymentData($response);
        $now = date('Y-m-d H:i:s');
        $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $this->showrooms->updateSubscriptionMidtransCharge($showroomId, [
            'subscription_midtrans_order_id' => $orderId,
            'subscription_midtrans_transaction_id' => $response['transaction_id'] ?? null,
            'subscription_midtrans_payment_data' => json_encode($paymentData, JSON_UNESCAPED_SLASHES),
            'subscription_midtrans_expires_at' => $expiresAt,
            'updated_at' => $now,
        ]);

        return $this->serializeShowroom($this->showrooms->findById($showroomId));
    }

    /**
     * Callback Midtrans untuk pembayaran paket showroom -- endpoint TERPISAH
     * dari callback transaksi mobil (lihat TransactionController::providerCallback())
     * supaya order_id-nya tidak pernah perlu disatukan dengan tabel transaksi
     * mobil. Sengaja selalu "acknowledged" walau order_id-nya tidak dikenali
     * (Midtrans akan mengulang kalau responsnya bukan 2xx).
     *
     * Beda dari transfer manual (yang statusnya berhenti di
     * "pending_verification" sampai Admin mengecek foto bukti transfer secara
     * manual): signature callback ini sudah diverifikasi HMAC dengan server
     * key (lihat MidtransCallbackHandler::verifySignature()), jadi pembayaran
     * ini sudah pasti nyata begitu sampai di sini -- tidak ada foto yang bisa
     * dipalsukan untuk diperiksa manusia. Pembayaran langsung dikonfirmasi
     * ("paid") dan akun showroom langsung disetujui di sini juga, tanpa
     * menunggu klik Admin.
     */
    public function handleSubscriptionMidtransCallback(array $payload): array
    {
        $orderId = (string) ($payload['order_id'] ?? '');
        $showroom = $orderId !== '' ? $this->showrooms->findBySubscriptionMidtransOrderId($orderId) : null;

        if (! $showroom) {
            return [
                'acknowledged' => true,
                'processed' => false,
                'order_id' => $orderId,
            ];
        }

        $status = (string) ($payload['transaction_status'] ?? '');
        $isSuccess = in_array($status, ['capture', 'settlement'], true)
            && in_array((string) ($payload['fraud_status'] ?? 'accept'), ['accept', ''], true);

        if (! $isSuccess) {
            return [
                'acknowledged' => true,
                'processed' => false,
                'order_id' => $orderId,
                'transaction_status' => $status,
            ];
        }

        $showroomId = (int) $showroom['id'];
        $now = date('Y-m-d H:i:s');
        $paymentData = $this->decodeMidtransPaymentData($showroom['subscription_midtrans_payment_data'] ?? null);
        $paymentData['transaction_status'] = $status;

        $this->showrooms->updateSubscriptionMidtransPaid($showroomId, [
            'subscription_proof_submitted_at' => $now,
            'subscription_midtrans_transaction_id' => $payload['transaction_id'] ?? $showroom['subscription_midtrans_transaction_id'] ?? null,
            'subscription_midtrans_payment_data' => json_encode($paymentData, JSON_UNESCAPED_SLASHES),
            'subscription_midtrans_paid_at' => $now,
            'updated_at' => $now,
        ]);

        // Anchor & riwayat sama persis seperti confirmSubscriptionPayment()
        // (jalur konfirmasi manual Admin) -- bedanya cuma decided_by null,
        // menandai ini keputusan sistem/otomatis, bukan admin tertentu.
        $showroom = $this->showrooms->findById($showroomId);
        $anchor = $showroom['subscription_next_due_at'] ?? $showroom['subscription_confirmed_at'] ?? $now;
        $nextDueAt = $this->addBillingInterval($anchor, $showroom['selected_plan_billing_period'] ?? null);

        $this->recordSubscriptionPaymentHistory($showroom, 'paid', $now, null, null);

        // is_active (nonaktifkan showroom oleh Admin, lihat deactivate()) TIDAK
        // disentuh di sini dengan sengaja -- itu keputusan Admin yang berdiri
        // sendiri (mis. showroom melanggar aturan), pembayaran yang lunas
        // tidak boleh diam-diam menghidupkan lagi showroom yang sudah
        // dinonaktifkan admin untuk alasan lain.
        $this->showrooms->updateSubscriptionConfirmation($showroomId, [
            'subscription_confirmed_at' => $now,
            'subscription_confirmed_by' => null,
            'subscription_next_due_at' => $nextDueAt,
            'updated_at' => $now,
        ]);

        // Approval akun cuma relevan untuk pendaftaran PERTAMA KALI (belum
        // is_approved) -- pembayaran perpanjangan (akun sudah aktif) tidak
        // menyentuh ini sama sekali.
        $user = $this->users->findById((int) $showroom['user_id']);
        if ($user && ! (bool) ($user['is_approved'] ?? false)) {
            $this->users->approveUsers([(int) $showroom['user_id']]);
        }

        return [
            'acknowledged' => true,
            'processed' => true,
            'order_id' => $orderId,
            'showroom' => $this->serializeShowroom($this->showrooms->findById($showroomId)),
        ];
    }

    private function extractVaPaymentData(array $response): array
    {
        $data = [
            'va_number' => null,
            'bank' => null,
        ];

        if (isset($response['va_numbers'][0])) {
            $data['bank'] = $response['va_numbers'][0]['bank'] ?? null;
            $data['va_number'] = $response['va_numbers'][0]['va_number'] ?? null;
        }

        if (isset($response['permata_va_number'])) {
            $data['bank'] = 'permata';
            $data['va_number'] = $response['permata_va_number'];
        }

        return $data;
    }

    private function decodeMidtransPaymentData($raw): array
    {
        $decoded = is_string($raw) ? json_decode($raw, true) : null;

        return is_array($decoded) ? $decoded : [];
    }

    public function validateSlug(string $slug): array
    {
        $normalized = $this->normalizeSlug($slug);
        $this->assertSlugFormat($normalized);
        $showroom = $this->showrooms->findPublicContextBySlug($normalized);

        return [
            'slug' => $normalized,
            'is_valid' => $showroom !== null,
            'seller_user_id' => $showroom ? (int) $showroom['user_id'] : null,
            'contact_whatsapp' => $showroom ? ($showroom['phone_number'] ?: $showroom['seller_phone_number']) : null,
            'seller' => $showroom ? [
                'id' => (int) $showroom['user_id'],
                'name' => $showroom['seller_name'] ?? null,
                'email' => $showroom['seller_email'] ?? null,
                'phone_number' => $showroom['seller_phone_number'] ?? null,
            ] : null,
            'showroom' => $showroom ? [
                'id' => (int) $showroom['id'],
                'slug' => $showroom['slug'],
                'name' => $showroom['name'] ?? null,
                'address' => $showroom['address'] ?? null,
                'city_name' => $showroom['city_name'] ?? null,
                'phone_number' => $showroom['phone_number'] ?? null,
                'icon_url' => $showroom['icon_url'] ?? null,
                'header_logo_url' => $showroom['header_logo_url'] ?? null,
                'tab_title' => $showroom['tab_title'] ?? null,
                // Dipakai buat mengalihkan halaman showroom publik ke halaman
                // maintenance -- alasannya sengaja tidak disertakan di sini,
                // itu catatan internal admin, bukan untuk buyer.
                'is_active' => (bool) ($showroom['is_active'] ?? 1),
            ] : null,
        ];
    }

    /**
     * Cari paket yang namanya cocok & aktif di Master Harga, lalu kembalikan
     * harga/periode tagihan dari sana -- satu-satunya sumber kebenaran untuk
     * nilai yang di-snapshot ke showroom. Nama paket yang tidak ditemukan
     * (typo, sudah dihapus admin, atau dikarang manual) ditolak, bukan
     * diterima apa adanya.
     */
    private function resolveSelectedPlan($planName): array
    {
        $planName = is_string($planName) ? trim($planName) : '';

        if ($planName === '') {
            return ['name' => null, 'price' => null, 'billing_period' => null];
        }

        $plans = [];

        try {
            $master = $this->masterData->get('pricing.plans');
            $plans = $master['data']['plans'] ?? [];
        } catch (NotFoundException $exception) {
            $plans = [];
        }

        foreach ($plans as $candidate) {
            $isMatch = ($candidate['name'] ?? null) === $planName;
            $isActive = ($candidate['status'] ?? 'active') === 'active';

            if ($isMatch && $isActive) {
                return [
                    'name' => $candidate['name'],
                    'price' => (float) ($candidate['price'] ?? 0),
                    'billing_period' => $candidate['billing_period'] ?? null,
                ];
            }
        }

        throw new ValidationException([
            'selected_plan_name' => "Paket '{$planName}' tidak ditemukan atau sudah tidak aktif.",
        ]);
    }

    /**
     * true kalau siklus tagihan saat ini sudah lewat tanggal jatuh temponya.
     * Sengaja dihitung langsung di sini (bukan lewat cron yang menulis ulang
     * status), supaya tidak ada proses terjadwal yang perlu dijaga -- setiap
     * kali data showroom ini dibaca, "jatuh tempo atau tidak" selalu akurat.
     */
    private function isSubscriptionDue(array $showroom): bool
    {
        $dueAt = $showroom['subscription_next_due_at'] ?? null;

        if ($dueAt === null) {
            return false;
        }

        return strtotime((string) $dueAt) <= time();
    }

    /**
     * Tanggal jatuh tempo berikutnya, dihitung dari $anchor + satu periode
     * tagihan. selected_plan_billing_period nilainya bebas teks dari Master
     * Harga ("/bulan", "/tahun", dst) -- cuma dicocokkan kata kuncinya di
     * sini, default ke bulanan kalau tidak dikenali supaya tetap ada tanggal
     * jatuh tempo daripada gagal diam-diam.
     */
    private function addBillingInterval(string $anchor, ?string $billingPeriod): string
    {
        $normalized = strtolower((string) $billingPeriod);
        $interval = str_contains($normalized, 'tahun') ? 'P1Y' : 'P1M';

        $date = new \DateTimeImmutable($anchor);

        return $date->add(new \DateInterval($interval))->format('Y-m-d H:i:s');
    }

    private function ensureSeller(array $user): void
    {
        if (! in_array(($user['role'] ?? null), ['seller', 'super_admin'], true)) {
            throw new ForbiddenException('Hanya seller yang dapat mengelola showroom.');
        }
    }

    private function serializeShowroom(array $showroom): array
    {
        return [
            'id' => (int) $showroom['id'],
            'user_id' => (int) $showroom['user_id'],
            'slug' => $showroom['slug'] ?? null,
            'name' => $showroom['name'],
            'address' => $showroom['address'],
            'city_name' => $showroom['city_name'] ?? null,
            'phone_number' => $showroom['phone_number'],
            'bank_account_number' => $showroom['bank_account_number'],
            'bank_type' => $showroom['bank_type'],
            'bank_account_name' => $showroom['bank_account_name'],
            'icon_url' => $showroom['icon_url'] ?? null,
            'header_logo_url' => $showroom['header_logo_url'] ?? null,
            'tab_title' => $showroom['tab_title'] ?? null,
            'selected_plan_name' => $showroom['selected_plan_name'] ?? null,
            'selected_plan_price' => isset($showroom['selected_plan_price']) ? (float) $showroom['selected_plan_price'] : null,
            'selected_plan_billing_period' => $showroom['selected_plan_billing_period'] ?? null,
            'selected_plan_selected_at' => $showroom['selected_plan_selected_at'] ?? null,
            'subscription_payment_status' => $showroom['subscription_payment_status'] ?? 'unpaid',
            'subscription_proof_path' => $showroom['subscription_proof_path'] ?? null,
            'subscription_proof_note' => $showroom['subscription_proof_note'] ?? null,
            'subscription_proof_submitted_at' => $showroom['subscription_proof_submitted_at'] ?? null,
            'subscription_confirmed_at' => $showroom['subscription_confirmed_at'] ?? null,
            'subscription_confirmed_by' => isset($showroom['subscription_confirmed_by']) ? (int) $showroom['subscription_confirmed_by'] : null,
            'subscription_rejected_at' => $showroom['subscription_rejected_at'] ?? null,
            'subscription_rejected_reason' => $showroom['subscription_rejected_reason'] ?? null,
            'subscription_next_due_at' => $showroom['subscription_next_due_at'] ?? null,
            'subscription_is_due' => $this->isSubscriptionDue($showroom),
            'subscription_payment_method' => $showroom['subscription_payment_method'] ?? 'manual',
            'subscription_midtrans_order_id' => $showroom['subscription_midtrans_order_id'] ?? null,
            'subscription_midtrans_payment_data' => $this->decodeMidtransPaymentData($showroom['subscription_midtrans_payment_data'] ?? null),
            'subscription_midtrans_expires_at' => $showroom['subscription_midtrans_expires_at'] ?? null,
            'subscription_midtrans_paid_at' => $showroom['subscription_midtrans_paid_at'] ?? null,
            'is_active' => (bool) ($showroom['is_active'] ?? 1),
            'deactivated_reason' => $showroom['deactivated_reason'] ?? null,
            'deactivated_at' => $showroom['deactivated_at'] ?? null,
            'seller_name' => $showroom['seller_name'] ?? null,
            'seller_email' => $showroom['seller_email'] ?? null,
            'created_at' => $showroom['created_at'],
            'updated_at' => $showroom['updated_at'],
        ];
    }

    public function ensureSellerAccess(array $user): void
    {
        $this->ensureSeller($user);
    }

    private function generateSlug(string $name, ?int $ignoreShowroomId = null): string
    {
        $base = $this->normalizeSlug($name);

        if ($base === '') {
            $base = 'showroom';
        }

        for ($attempt = 0; $attempt < 20; $attempt++) {
            // Kata cadangan diperlakukan sama seperti tabrakan slug lain --
            // langsung dapat suffix acak di percobaan pertama juga, bukan
            // cuma saat sudah dipakai showroom lain.
            $suffix = ($attempt === 0 && ! in_array($base, self::RESERVED_SLUGS, true))
                ? ''
                : '-' . strtolower(bin2hex(random_bytes(2)));
            $slug = substr($base, 0, 60 - strlen($suffix)) . $suffix;

            if (! $this->showrooms->slugExists($slug, $ignoreShowroomId)) {
                return $slug;
            }
        }

        throw new ValidationException(['slug' => 'Unable to generate unique showroom slug.']);
    }

    private function normalizeSlug(string $value): string
    {
        $slug = strtolower(trim($value));
        $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
        $slug = trim($slug, '-');

        return $slug;
    }

    private function assertSlugFormat(string $slug): void
    {
        if ($slug === '' || ! preg_match('/^[a-z0-9-]+$/', $slug)) {
            throw new ValidationException([
                'slug' => 'Slug showroom hanya boleh berisi huruf kecil, angka, dan dash.',
            ]);
        }
    }
}
