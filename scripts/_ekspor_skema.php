<?php

declare(strict_types=1);

/**
 * Helper sementara: menulis struktur database yang sedang aktif ke
 * scripts/sql/00_skema_dasar.sql. Dijalankan sekali dari mesin yang punya
 * database sehat, lalu dihapus.
 */

$app = require __DIR__ . '/../bootstrap/app.php';

/** @var PDO $pdo */
$pdo = $app->container()->make(PDO::class);

$namaDatabase = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
$tabel = $pdo->query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"')->fetchAll(PDO::FETCH_COLUMN);
sort($tabel);

$baris = [];
$baris[] = '-- Skema dasar projectB.';
$baris[] = '--';
$baris[] = '-- Berkas ini membuat seluruh tabel inti dari nol. Sebelum ada berkas ini,';
$baris[] = '-- scripts/sql hanya berisi migrasi inkremental -- semuanya mengubah tabel';
$baris[] = '-- yang sudah ada -- sehingga deployment baru tidak bisa dibangun dari repo';
$baris[] = '-- saja. Itu yang bikin carlynk.id berdiri dengan database kosong.';
$baris[] = '--';
$baris[] = '-- Dihasilkan dari SHOW CREATE TABLE, struktur saja tanpa data.';
$baris[] = '-- Semua pakai IF NOT EXISTS, jadi aman dijalankan ulang di database yang';
$baris[] = '-- sudah terisi.';
$baris[] = '--';
$baris[] = '-- Urutannya menyusul relasi antar tabel, jadi pemeriksaan foreign key';
$baris[] = '-- dimatikan selama impor.';
$baris[] = '';
$baris[] = 'SET FOREIGN_KEY_CHECKS = 0;';
$baris[] = '';

foreach ($tabel as $nama) {
    $sql = (string) $pdo->query('SHOW CREATE TABLE `' . $nama . '`')->fetch(PDO::FETCH_NUM)[1];

    // AUTO_INCREMENT yang terbawa dari database sumber tidak ada gunanya di
    // database kosong, dan cuma bikin diff berisik tiap kali diekspor ulang.
    $sql = preg_replace('/\s+AUTO_INCREMENT=\d+/', '', $sql);
    $sql = preg_replace('/^CREATE TABLE /', 'CREATE TABLE IF NOT EXISTS ', (string) $sql);

    $baris[] = $sql . ';';
    $baris[] = '';
}

$baris[] = 'SET FOREIGN_KEY_CHECKS = 1;';
$baris[] = '';

file_put_contents(__DIR__ . '/sql/00_skema_dasar.sql', implode("\n", $baris));

echo 'Skema ' . $namaDatabase . ': ' . count($tabel) . ' tabel ditulis ke scripts/sql/00_skema_dasar.sql' . PHP_EOL;
