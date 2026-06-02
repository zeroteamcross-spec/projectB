<?php

declare(strict_types=1);

namespace App\Modules\Inspection\Jobs;

use App\Modules\Inspection\Repositories\InspectionRepository;

class SeedInspectionTemplatesJob
{
    private const DEFAULT_TEMPLATES = [
        ['category_name' => 'road_test', 'item_name' => 'Akselerasi dan perpindahan transmisi', 'description' => 'Respons akselerasi, perpindahan gigi, dan gejala hentakan saat tes jalan.', 'sort_order' => 10],
        ['category_name' => 'road_test', 'item_name' => 'Kemudi dan pengereman', 'description' => 'Stabilitas setir, bunyi kaki-kaki, dan respons pengereman.', 'sort_order' => 20],
        ['category_name' => 'road_test', 'item_name' => 'Indikator dashboard saat berjalan', 'description' => 'Lampu peringatan, temperatur, dan indikator abnormal saat kendaraan digunakan.', 'sort_order' => 30],
        ['category_name' => 'exterior', 'item_name' => 'Body exterior', 'description' => 'Kondisi panel body, cat, baret, penyok, dan bekas perbaikan.', 'sort_order' => 110],
        ['category_name' => 'exterior', 'item_name' => 'Lampu exterior', 'description' => 'Headlamp, stoplamp, sein, foglamp, dan rumah lampu.', 'sort_order' => 120],
        ['category_name' => 'exterior', 'item_name' => 'Kaca dan spion', 'description' => 'Kaca depan, kaca samping, spion, retak, dan mekanisme lipat/adjustment.', 'sort_order' => 130],
        ['category_name' => 'exterior', 'item_name' => 'Ban dan velg', 'description' => 'Ketebalan ban, usia ban, velg, dan indikasi aus tidak merata.', 'sort_order' => 140],
        ['category_name' => 'interior', 'item_name' => 'Interior cabin', 'description' => 'Kondisi jok, dashboard, trim interior, plafon, dan bau kabin.', 'sort_order' => 210],
        ['category_name' => 'interior', 'item_name' => 'AC dan blower', 'description' => 'Dingin AC, arah hembusan, suara blower, dan panel kontrol.', 'sort_order' => 220],
        ['category_name' => 'interior', 'item_name' => 'Audio dan fitur elektrik', 'description' => 'Head unit, speaker, power window, central lock, dan fitur elektrik utama.', 'sort_order' => 230],
        ['category_name' => 'interior', 'item_name' => 'Sabuk pengaman dan airbag indicator', 'description' => 'Kondisi seatbelt dan indikator keselamatan pada dashboard.', 'sort_order' => 240],
        ['category_name' => 'underbody_engine', 'item_name' => 'Engine condition', 'description' => 'Kondisi mesin, suara mesin, rembesan oli, dan getaran idle.', 'sort_order' => 310],
        ['category_name' => 'underbody_engine', 'item_name' => 'Ruang mesin dan cairan', 'description' => 'Oli, coolant, minyak rem, aki, selang, dan belt yang terlihat.', 'sort_order' => 320],
        ['category_name' => 'underbody_engine', 'item_name' => 'Bawah body', 'description' => 'Kolong kendaraan, karat, bekas benturan, dan rembesan dari bawah.', 'sort_order' => 330],
        ['category_name' => 'underbody_engine', 'item_name' => 'Suspensi dan kaki-kaki', 'description' => 'Shockbreaker, bushing, tie rod, ball joint, dan bunyi abnormal.', 'sort_order' => 340],
        ['category_name' => 'documents', 'item_name' => 'Vehicle documents', 'description' => 'Kelengkapan STNK, BPKB, faktur, nomor rangka, dan nomor mesin.', 'sort_order' => 410],
        ['category_name' => 'documents', 'item_name' => 'Service book dan kunci', 'description' => 'Buku servis, riwayat servis, jumlah kunci, dan remote.', 'sort_order' => 420],
    ];

    private InspectionRepository $repository;

    public function __construct(InspectionRepository $repository)
    {
        $this->repository = $repository;
    }

    public function run(): array
    {
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $activeTemplateIds = [];

        foreach (self::DEFAULT_TEMPLATES as $template) {
            $existing = $this->repository->findTemplateByName($template['category_name'], $template['item_name']);

            if ($existing) {
                $this->repository->updateTemplateDefinition(
                    (int) $existing['id'],
                    $template['category_name'],
                    $template['item_name'],
                    $template['description'],
                    $template['sort_order']
                );
                $activeTemplateIds[] = (int) $existing['id'];
                $updated++;
                continue;
            }

            $activeTemplateIds[] = $this->repository->createTemplate(
                $template['category_name'],
                $template['item_name'],
                $template['description'],
                $template['sort_order']
            );
            $created++;
        }

        $deactivated = $this->repository->deactivateTemplatesExcept($activeTemplateIds);

        return [
            'created' => $created,
            'updated' => $updated,
            'skipped' => $skipped,
            'deactivated' => $deactivated,
            'templates' => $this->repository->listTemplates(true),
        ];
    }
}
