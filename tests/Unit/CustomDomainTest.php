<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Modules\Showrooms\Repositories\ShowroomRepository;
use Tests\TestCase;

/**
 * Backlog #7 (lihat plan groovy-napping-thacker.md): showroom bisa memakai
 * domain sendiri, tapi domain itu baru boleh benar-benar melayani trafik
 * setelah statusnya 'active' (admin sudah menyiapkan nginx/SSL manual).
 * ShowroomService sendiri butuh dependency berat untuk dikonstruksi (pola
 * sama seperti ShowroomMultiBranchTest/AutoSuspendOverdueTest) -- test di
 * sini fokus ke query repository yang murni.
 */
class CustomDomainTest extends TestCase
{
    public function run(): void
    {
        $this->findByCustomDomainOnlyMatchesActiveStatus();
        $this->findByCustomDomainReturnsNullWhenNotFound();
        $this->customDomainExistsChecksOtherShowroomsOnly();
    }

    private function findByCustomDomainOnlyMatchesActiveStatus(): void
    {
        $pdo = $this->sqlite();
        $this->createShowroomsTable($pdo);
        $this->seedShowroom($pdo, 1, 'toko-jaya', 'www.tokomobiljaya.com', 'active');
        $this->seedShowroom($pdo, 2, 'toko-lain', 'www.tokolain.com', 'verified');

        $repository = new ShowroomRepository($pdo);

        $active = $repository->findByCustomDomain('www.tokomobiljaya.com');
        $this->assertNotNull($active);
        $this->assertSame('toko-jaya', $active['slug']);

        $verified = $repository->findByCustomDomain('www.tokolain.com');
        $this->assertSame(null, $verified, 'Domain berstatus verified (belum active) tidak boleh ikut resolve trafik.');
    }

    private function findByCustomDomainReturnsNullWhenNotFound(): void
    {
        $pdo = $this->sqlite();
        $this->createShowroomsTable($pdo);

        $repository = new ShowroomRepository($pdo);

        $this->assertSame(null, $repository->findByCustomDomain('tidak-terdaftar.com'));
    }

    private function customDomainExistsChecksOtherShowroomsOnly(): void
    {
        $pdo = $this->sqlite();
        $this->createShowroomsTable($pdo);
        $this->seedShowroom($pdo, 1, 'toko-jaya', 'www.tokomobiljaya.com', 'active');

        $repository = new ShowroomRepository($pdo);

        $this->assertTrue($repository->customDomainExists('www.tokomobiljaya.com'));
        $this->assertSame(false, $repository->customDomainExists('www.tokomobiljaya.com', 1), 'Showroom yang sama boleh "bentrok" dengan domainnya sendiri (kasus update).');
        $this->assertSame(false, $repository->customDomainExists('www.belumadayangpakai.com'));
    }

    private function seedShowroom(\PDO $pdo, int $id, string $slug, string $domain, string $status): void
    {
        $pdo->prepare(
            'INSERT INTO showrooms (id, user_id, slug, custom_domain, custom_domain_status, name, deleted_at)
             VALUES (:id, 1, :slug, :domain, :status, :name, NULL)'
        )->execute(['id' => $id, 'slug' => $slug, 'domain' => $domain, 'status' => $status, 'name' => $slug]);
    }

    private function createShowroomsTable(\PDO $pdo): void
    {
        $pdo->exec('CREATE TABLE showrooms (
            id INTEGER PRIMARY KEY,
            user_id INTEGER,
            slug TEXT NULL,
            custom_domain TEXT NULL,
            custom_domain_status TEXT NULL,
            custom_domain_requested_at TEXT NULL,
            custom_domain_verified_at TEXT NULL,
            custom_domain_activated_at TEXT NULL,
            name TEXT NULL,
            deleted_at TEXT NULL
        )');
    }
}
