<?php

declare(strict_types=1);

namespace App\Core\Controllers;

use App\Core\Container;
use App\Core\JsonResponse;
use App\Core\Request;
use PDO;
use Throwable;

/**
 * Diagnostik database untuk memastikan sebuah deployment benar-benar tersambung.
 *
 * Sengaja dijaga ketat. Berkas diagnosa yang ditaruh sembarangan di public/
 * pernah bocor di garasi-mobil.com dan harus dicabut buru-buru, jadi di sini:
 *
 *   - tanpa DIAGNOSTIC_TOKEN di .env, rutenya menjawab 404 seolah tidak ada;
 *   - tokennya dibandingkan dengan hash_equals, bukan ==;
 *   - tidak ada satu pun nilai .env yang dikembalikan, termasuk host dan user;
 *   - pesan galat PDO tidak diteruskan mentah, hanya kode SQLSTATE-nya, karena
 *     pesan aslinya bisa memuat DSN.
 *
 * Ringkasan sehat/tidaknya sendiri sudah tersedia tanpa token di /api/health.
 */
class DiagnosticsController
{
    /**
     * Tabel yang harus ada supaya aplikasi bisa dipakai. Dicek keberadaannya,
     * bukan isinya -- database yang tersambung tapi kosong adalah kegagalan
     * yang berbeda dari database yang tidak tersambung, dan keduanya perlu
     * bisa dibedakan dari layar.
     */
    private const TABEL_INTI = [
        'users',
        'showrooms',
        'cars',
        'transactions',
        'master_data',
    ];

    private Container $container;

    public function __construct(Container $container)
    {
        $this->container = $container;
    }

    public function database(Request $request): JsonResponse
    {
        $token = (string) config('app.diagnostic_token', '');

        if ($token === '') {
            return JsonResponse::error('Not found.', [], 404);
        }

        $diberikan = (string) ($request->query('token') ?? '');

        if (! hash_equals($token, $diberikan)) {
            return JsonResponse::error('Not found.', [], 404);
        }

        return $this->laporan();
    }

    private function laporan(): JsonResponse
    {
        try {
            /** @var PDO $pdo */
            $pdo = $this->container->make(PDO::class);
        } catch (Throwable $exception) {
            return JsonResponse::error('Database tidak tersambung.', [], 503, [
                'terhubung' => false,
                'sqlstate' => $this->sqlstate($exception),
                'petunjuk' => 'Periksa DB_DATABASE, DB_USERNAME, dan DB_PASSWORD di .env server.',
            ]);
        }

        $namaDatabase = (string) ($pdo->query('SELECT DATABASE()')->fetchColumn() ?: '');
        $tabel = $this->daftarTabel($pdo, $namaDatabase);

        $hilang = array_values(array_diff(self::TABEL_INTI, $tabel));

        return JsonResponse::success([
            'terhubung' => true,
            'database' => $namaDatabase,
            'versi_server' => $pdo->getAttribute(PDO::ATTR_SERVER_VERSION),
            'jumlah_tabel' => count($tabel),
            'tabel_inti_hilang' => $hilang,
            'siap_dipakai' => $hilang === [],
            'jumlah_baris' => $this->jumlahBaris($pdo, $tabel),
            'baris_tema_ada' => $this->barisTemaAda($pdo, $tabel),
        ], $hilang === []
            ? 'Database tersambung dan tabel intinya lengkap.'
            : 'Database tersambung, tapi tabel intinya belum lengkap.');
    }

    /** @return list<string> */
    private function daftarTabel(PDO $pdo, string $namaDatabase): array
    {
        if ($namaDatabase === '') {
            return [];
        }

        $statement = $pdo->prepare(
            'SELECT table_name FROM information_schema.tables WHERE table_schema = :skema'
        );
        $statement->execute(['skema' => $namaDatabase]);

        return array_map('strval', $statement->fetchAll(PDO::FETCH_COLUMN) ?: []);
    }

    /**
     * @param list<string> $tabel
     * @return array<string, int>
     */
    private function jumlahBaris(PDO $pdo, array $tabel): array
    {
        $hasil = [];

        foreach (self::TABEL_INTI as $nama) {
            if (! in_array($nama, $tabel, true)) {
                continue;
            }

            try {
                // Nama tabel berasal dari konstanta di berkas ini, bukan dari
                // input, jadi aman disisipkan langsung -- placeholder PDO tidak
                // bisa dipakai untuk pengenal tabel.
                $hasil[$nama] = (int) $pdo->query('SELECT COUNT(*) FROM `' . $nama . '`')->fetchColumn();
            } catch (Throwable $exception) {
                $hasil[$nama] = -1;
            }
        }

        return $hasil;
    }

    /** @param list<string> $tabel */
    private function barisTemaAda(PDO $pdo, array $tabel): bool
    {
        if (! in_array('master_data', $tabel, true)) {
            return false;
        }

        try {
            $statement = $pdo->prepare(
                'SELECT COUNT(*) FROM master_data WHERE master_key = :kunci AND deleted_at IS NULL'
            );
            $statement->execute(['kunci' => 'design_studio.theme_config']);

            return ((int) $statement->fetchColumn()) > 0;
        } catch (Throwable $exception) {
            return false;
        }
    }

    private function sqlstate(Throwable $exception): string
    {
        $sekarang = $exception;

        while ($sekarang !== null) {
            if ($sekarang instanceof \PDOException && is_string($sekarang->getCode()) && $sekarang->getCode() !== '') {
                return $sekarang->getCode();
            }

            $sekarang = $sekarang->getPrevious();
        }

        return 'unknown';
    }
}
