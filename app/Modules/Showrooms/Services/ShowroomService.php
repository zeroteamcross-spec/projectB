<?php

declare(strict_types=1);

namespace App\Modules\Showrooms\Services;

use App\Core\Exceptions\ForbiddenException;
use App\Core\Exceptions\NotFoundException;
use App\Core\Exceptions\ValidationException;
use App\Infrastructure\Storage\StorageServiceInterface;
use App\Modules\Auth\Policies\AuthPolicy;
use App\Modules\MasterData\Services\MasterDataService;
use App\Modules\Showrooms\Repositories\ShowroomRepository;
use Throwable;

class ShowroomService
{
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
        'daftar-showroom', 'saas-landing', 'contoh-katalog', 'health',
        'uploads', 'assets', 'tester', 'app',
    ];

    private ShowroomRepository $showrooms;

    private MasterDataService $masterData;

    private StorageServiceInterface $storage;

    public function __construct(ShowroomRepository $showrooms, MasterDataService $masterData, StorageServiceInterface $storage)
    {
        $this->showrooms = $showrooms;
        $this->masterData = $masterData;
        $this->storage = $storage;
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

        if (trim((string) ($showroom['subscription_proof_path'] ?? '')) === '') {
            throw new ValidationException([
                'subscription_proof_path' => 'Showroom belum mengunggah bukti transfer.',
            ]);
        }

        if (($showroom['subscription_payment_status'] ?? null) === 'paid' && ! $this->isSubscriptionDue($showroom)) {
            throw new ValidationException([
                'subscription_payment_status' => 'Pembayaran paket ini sudah dikonfirmasi sebelumnya.',
            ]);
        }

        $now = date('Y-m-d H:i:s');
        // Siklus berikutnya dihitung dari due date SEBELUMNYA (kalau ada),
        // bukan dari "sekarang" -- supaya tanggal jatuh tempo tetap di
        // tanggal yang sama tiap bulan/tahun walau konfirmasinya telat
        // beberapa hari, tidak makin bergeser tiap siklus.
        $anchor = $showroom['subscription_next_due_at'] ?? $showroom['subscription_confirmed_at'] ?? $now;
        $nextDueAt = $this->addBillingInterval($anchor, $showroom['selected_plan_billing_period'] ?? null);

        $this->showrooms->updateSubscriptionConfirmation($showroomId, [
            'subscription_confirmed_at' => $now,
            'subscription_confirmed_by' => (int) $actor['id'],
            'subscription_next_due_at' => $nextDueAt,
            'updated_at' => $now,
        ]);

        return $this->serializeShowroom($this->showrooms->findById($showroomId));
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
     * jelas, dsb. Bukti lama dihapus dari kolomnya supaya showroom harus
     * unggah yang baru, bukan sekadar menimpa bukti yang sama.
     */
    public function rejectSubscriptionPayment(array $actor, int $showroomId, array $data): array
    {
        AuthPolicy::requireAdmin($actor);
        $showroom = $this->showrooms->findById($showroomId);

        if (! $showroom) {
            throw new NotFoundException('Showroom tidak ditemukan.');
        }

        if (trim((string) ($showroom['subscription_proof_path'] ?? '')) === '') {
            throw new ValidationException([
                'subscription_proof_path' => 'Showroom belum mengunggah bukti transfer.',
            ]);
        }

        $reason = trim((string) ($data['reason'] ?? ''));

        if ($reason === '') {
            throw new ValidationException(['reason' => 'Alasan penolakan wajib diisi.']);
        }

        $proofPath = (string) $showroom['subscription_proof_path'];
        $now = date('Y-m-d H:i:s');

        $this->showrooms->updateSubscriptionRejection($showroomId, [
            'subscription_rejected_at' => $now,
            'subscription_rejected_reason' => $reason,
            'updated_at' => $now,
        ]);
        $this->storage->delete($proofPath);

        return $this->serializeShowroom($this->showrooms->findById($showroomId));
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
