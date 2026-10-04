import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile, Workbook } from "file:///C:/Users/COMPUTER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs";

const outputDir = "C:/Users/COMPUTER/Documents/www/projectB/outputs/monthly-report-sep-2026";
const outputPath = `${outputDir}/Laporan_Bulanan_Carlynk_September_2026.xlsx`;
const weekly7Path = "C:/Users/COMPUTER/Downloads/Laporan-Mingguan-7-13-September-2026.xlsx";
const weekly14Path = "C:/Users/COMPUTER/Downloads/Laporan_Mingguan_carlynk_14-19Sep2026.xlsx";
const weekly21Path = "C:/Users/COMPUTER/Downloads/Laporan-Mingguan-21-28-September-2026.xlsx";

const green = "#0F766E";
const darkText = "#1F2937";
const mutedText = "#667085";
const bodyFill = "#F8F6F1";
const stripeFill = "#F1EBDD";
const borderColor = "#D9D9D9";
const white = "#FFFFFF";
const fontName = "Arial";

async function importWorkbook(path) {
  return SpreadsheetFile.importXlsx(await FileBlob.load(path));
}

function usedValues(workbook, sheetName) {
  const sheet = workbook.worksheets.getItem(sheetName);
  return sheet.getUsedRange().values;
}

function taskRowsFromSheet(values) {
  return values
    .slice(1)
    .filter((row) => row?.[0] !== null && row?.[0] !== undefined && row?.[0] !== "")
    .map((row) => [null, row[1] ?? "Development", row[2] ?? "", row[3] ?? "", row[4] ?? "Selesai"]);
}

function normalizeTaskRows(rows, startNo = 1) {
  return rows.map((row, index) => {
    if (row.length === 4) return [startNo + index, row[0] ?? "Development", row[1] ?? "", row[2] ?? "", row[3] ?? "Selesai"];
    return [startNo + index, row[1] ?? "Development", row[2] ?? "", row[3] ?? "", row[4] ?? "Selesai"];
  });
}

const firstWeekDevelopment = [
  ["Development", "Bangun fitur Admin tandai mobil terjual di luar sistem", "Admin dapat menandai mobil terjual di luar sistem dengan keterangan wajib yang tersimpan untuk audit.", "Selesai"],
  ["Verification", "Verifikasi fitur tandai terjual di production", "Status mobil berubah, keterangan tersimpan, dan mobil hilang dari katalog publik setelah diverifikasi langsung.", "Selesai"],
  ["Development", "Bangun halaman Bagikan Mobil untuk Marketing", "Setiap mobil published memiliki tombol Copy Link dan Bagikan WhatsApp, dengan konteks kunjungan marketing tetap terdeteksi.", "Selesai"],
  ["Verification", "Verifikasi share per mobil di production", "Link dibuka tanpa login, konteks marketing aktif otomatis, dan klik tercatat ke akun yang benar.", "Selesai"],
  ["Verification", "Audit risiko migrasi URL", "Dua putaran riset memetakan seluruh titik yang terdampak sebelum eksekusi migrasi.", "Selesai"],
  ["Development", "Migrasi URL Fase 1: navigasi internal", "Sidebar, notifikasi, login Google, dan navigasi internal dipindah ke URL bersih tanpa tanda #.", "Selesai"],
  ["Development", "Migrasi URL Fase 2: link ke luar aplikasi", "Link showroom dan referral marketing yang dibagikan melalui WhatsApp memakai URL bersih.", "Selesai"],
  ["Development", "Migrasi URL Fase 3: data lama dan bookmark", "Delapan halaman filter atau bookmark diperbaiki; notifikasi lama tetap terbuka tanpa migrasi data.", "Selesai"],
  ["Development", "Migrasi URL Fase 4: beres-beres", "Data baru langsung memakai format bersih dan konvensi lama dikonfirmasi aman.", "Selesai"],
  ["Development", "Rencana pemisahan subdomain per peran", "Peta subdomain untuk buyer, showroom, marketing, dan admin disusun sebagai dasar routing per peran.", "Selesai"],
  ["Development", "Nonaktifkan sementara Google Login Admin dan Showroom", "Persiapan subdomain membuat Google Login untuk Admin dan Showroom dinonaktifkan sementara, sedangkan password login tetap aktif.", "Selesai"],
  ["Development", "Setup DNS dan nginx tiga subdomain baru", "Subdomain showroom, buyer, dan marketing disiapkan dan diarahkan ke aplikasi Carlynk.", "Selesai"],
  ["Development", "Perluas sertifikat SSL", "Satu sertifikat mencakup admin, showroom, buyer, dan marketing.", "Selesai"],
  ["Development", "Daftarkan redirect URI Google OAuth", "URI callback untuk subdomain baru didaftarkan ke Google Console agar alur login siap digunakan.", "Selesai"],
  ["Development", "Penyesuaian kode routing lintas-subdomain", "Penjaga domain digeneralisasi untuk subdomain baru dan halaman katalog tidak lagi salah host.", "Selesai"],
  ["Verification", "Aktifkan dan uji subdomain Marketing", "Dashboard marketing, sesi, link referral, dan reload dalam sesi diverifikasi di production.", "Selesai"],
  ["Verification", "Aktifkan dan uji subdomain Showroom", "Dashboard, login, sesi showroom, dan link showroom diarahkan ke host showroom di production.", "Selesai"],
  ["Verification", "Aktifkan dan uji subdomain Buyer", "app.carlynk.id melayani buyer, termasuk login Google, redirect, dan reload dalam sesi.", "Selesai"],
  ["Development", "Pindahkan URL showroom ke root carlynk.id/{nama-showroom}", "URL showroom tidak lagi memakai prefix /showroom/; redirect otomatis dari URL lama diverifikasi di production.", "Selesai"],
  ["Development", "Samakan desain tombol Kembali ke katalog di login showroom", "Tombol bergaris bawah diubah menjadi tombol dengan desain dan posisi yang sama seperti tombol kembali ke landing page.", "Selesai"],
  ["Development", "Tampilkan logo showroom di top nav buyer", "Ikon generik pada navigasi buyer diganti logo showroom pada halaman Portfolio dan Profil.", "Selesai"],
  ["Verification", "Audit performa production", "Waktu muat dan respons API diukur langsung di production.", "Selesai"],
  ["Maintenance", "Temukan akar masalah lambat", "Token remember-me diverifikasi dengan metode yang lambat pada setiap request berlogin.", "Selesai"],
  ["Maintenance", "Ganti metode verifikasi token", "Metode verifikasi token tetap aman tetapi tidak lagi memakai metode yang dirancang untuk kata sandi manusia.", "Selesai"],
  ["Performance", "Rapikan urutan muat awal aplikasi", "Pengambilan notifikasi tidak lagi memblokir tampilan halaman pertama.", "Selesai"],
  ["Verification", "Verifikasi ulang performa di production", "Dashboard yang sebelumnya lebih dari 3 detik terukur menjadi kurang dari 1 detik.", "Selesai"],
  ["Development", "Pindahkan URL marketing ke carlynk.id/{showroom}/{marketing}", "Link marketing membawa konteks showroom dan marketing dengan format URL baru, lalu diverifikasi end-to-end.", "Selesai"],
];

const firstWeekMaintenance = [
  ["Maintenance", "Perbaiki bug tombol Katalog salah arah", "Setelah migrasi URL, tombol Katalog pada top nav profil buyer sempat menuju halaman utama, bukan katalog showroom.", "Selesai"],
  ["Maintenance", "Perbaiki tombol Kembali ke landing page salah host", "Setelah subdomain aktif, tombol dari halaman login peran diarahkan kembali ke carlynk.id, bukan tetap di subdomain yang salah.", "Selesai"],
  ["Maintenance", "Perbaiki katalog showroom macet loading di URL baru", "Konteks showroom sempat terhapus otomatis ketika diaktifkan sehingga daftar mobil tidak tampil; katalog, detail mobil, dan transaksi diverifikasi ulang.", "Selesai"],
];

const extraDevelopment = [
  ["Development", "Sesuaikan label tombol landing dan redirect saat sesi sudah aktif", "Tombol landing menyesuaikan konteks sesi dan langsung mengarahkan pengguna yang sudah aktif ke halaman yang sesuai.", "Selesai"],
  ["Build", "Rebuild bundle setelah perbaikan fokus dan sidebar", "Aset frontend dibangun ulang setelah perbaikan lintas modul pada akhir bulan.", "Selesai"],
];

const extraMaintenance = [
  ["Maintenance", "Tutup celah auto-suspend saat ganti paket belum dibayar", "Perubahan paket tidak boleh membuat status tunggakan terlewat sebelum pembayaran paket baru dikonfirmasi.", "Selesai"],
  ["Maintenance", "Pertahankan fokus dan posisi kursor saat re-render", "Input dan textarea tidak kehilangan fokus atau posisi kursor ketika state yang tidak terkait berubah.", "Selesai"],
  ["Maintenance", "Perbaiki sidebar seller saat route.role berbentuk array", "Sidebar seller kembali tampil konsisten ketika role yang diterima frontend berbentuk array.", "Selesai"],
  ["Maintenance", "Stabilkan ID kontrol lintas re-render", "preferredId dipertahankan apa adanya dan pencarian suffix yang mengubah ID dihilangkan.", "Selesai"],
  ["Maintenance", "Perbaiki interaksi checklist, fokus modal, dan tombol Tutup ganda", "Klik kartu checklist, jarak hero Marketing, fokus modal, dan duplikasi tombol Tutup diperbaiki bersama.", "Selesai"],
  ["Maintenance", "Rapikan modal Edit Profil dan deskripsi Showroom Saya", "Tombol Edit Profil dipindah ke footer modal dan deskripsi yang tidak diperlukan dihapus.", "Selesai"],
];

async function build() {
  await fs.mkdir(outputDir, { recursive: true });
  const weekly7 = await importWorkbook(weekly7Path);
  const weekly14 = await importWorkbook(weekly14Path);
  const weekly21 = await importWorkbook(weekly21Path);

  const week7Dev = taskRowsFromSheet(usedValues(weekly7, "Development"));
  const week7Maint = taskRowsFromSheet(usedValues(weekly7, "Maintenance")).map((row) => [null, "Maintenance", row[2], row[3], row[4]]);
  const week21Dev = taskRowsFromSheet(usedValues(weekly21, "Development"));
  const week21Maint = taskRowsFromSheet(usedValues(weekly21, "Maintenance")).map((row) => [null, "Maintenance", row[2], row[3], row[4]]);

  const log14 = usedValues(weekly14, "Log Commit").slice(4).filter((row) => row?.[0]);
  const log14Dev = log14
    .filter((row) => row[2] === "Fitur" || row[2] === "Build")
    .map((row) => [null, row[2], row[3], `Commit ${row[0]} · Area: ${row[4] ?? "-"}`, "Selesai"]);
  const log14Maint = log14
    .filter((row) => row[2] === "Bug")
    .map((row) => [null, "Maintenance", row[3], `Commit ${row[0]} · Area: ${row[4] ?? "-"}`, "Selesai"]);

  const e2e14 = usedValues(weekly14, "Langkah Uji E2E").slice(4).filter((row) => row?.[0]);
  const e2eDev = e2e14.map((row) => [null, "Verification", `E2E: ${row[2]} — ${row[3]}`, `${row[1]} · Hasil: ${row[4]}`, row[5] ?? "Lulus"]);
  const commissionDev = [[null, "Verification", "Validasi perhitungan komisi affiliate untuk 3 skenario", "Seluruh ledger settled dan selisih komisi 0; total komisi sistem Rp16.700.000.", "Lulus"]];

  const development = normalizeTaskRows([
    ...firstWeekDevelopment,
    ...week7Dev,
    ...log14Dev,
    ...e2eDev,
    ...commissionDev,
    ...week21Dev,
    ...extraDevelopment,
  ]);
  const maintenance = normalizeTaskRows([
    ...firstWeekMaintenance,
    ...week7Maint,
    ...log14Maint,
    ...week21Maint,
    ...extraMaintenance,
  ]);

  const workbook = Workbook.create();
  const ringkasan = workbook.worksheets.add("Ringkasan");
  const developmentSheet = workbook.worksheets.add("Development");
  const maintenanceSheet = workbook.worksheets.add("Maintenance");
  const bugSheet = workbook.worksheets.add("Bug Registry");
  const e2eSheet = workbook.worksheets.add("Langkah Uji E2E");
  const commissionSheet = workbook.worksheets.add("Validasi Komisi");
  const backlogSheet = workbook.worksheets.add("Belum Dikerjakan");

  for (const sheet of [ringkasan, developmentSheet, maintenanceSheet, bugSheet, e2eSheet, commissionSheet, backlogSheet]) {
    sheet.showGridLines = false;
    sheet.tabColor = green;
  }

  function styleTitle(sheet, title, subtitle) {
    sheet.getRange("A1").values = [[title]];
    sheet.getRange("A1").format = { font: { name: fontName, size: 16, bold: true, color: darkText } };
    sheet.getRange("A1").format.rowHeight = 26;
    sheet.getRange("A2").values = [[subtitle]];
    sheet.getRange("A2").format = { font: { name: fontName, size: 10, italic: true, color: mutedText } };
    sheet.getRange("A2").format.rowHeight = 22;
  }

  function styleTable(sheet, headerRange, bodyRange, widths) {
    sheet.getRange(headerRange).format = {
      fill: green,
      font: { name: fontName, size: 10, bold: true, color: white },
      horizontalAlignment: "center",
      verticalAlignment: "center",
      wrapText: true,
      borders: { preset: "all", style: "thin", color: white },
    };
    sheet.getRange(bodyRange).format = {
      font: { name: fontName, size: 10, color: darkText },
      verticalAlignment: "center",
      wrapText: true,
      borders: { preset: "all", style: "thin", color: borderColor },
    };
    const body = sheet.getRange(bodyRange);
    body.format.fill = bodyFill;
    sheet.getRange(headerRange).format.rowHeight = 28;
    for (const [col, width] of Object.entries(widths)) sheet.getRange(`${col}:${col}`).format.columnWidth = width;
  }

  function fitRows(sheet, startRow, rows, textIndices, charsPerLine) {
    rows.forEach((row, index) => {
      const lineEstimate = Math.max(...textIndices.map((textIndex, i) => Math.ceil(String(row[textIndex] ?? "").length / charsPerLine[i])), 1);
      const height = Math.max(30, Math.min(150, 24 + (lineEstimate - 1) * 15));
      sheet.getRange(`${startRow + index}:${startRow + index}`).format.rowHeight = height;
    });
  }

  styleTitle(ringkasan, "Laporan Bulanan carlynk.id (Siata Mobilindo)", "Periode: 1–30 September 2026  |  Lingkungan: Production  |  Branch: master");
  ringkasan.getRange("A4:C4").values = [["Indikator", "Nilai", "Keterangan"]];
  ringkasan.getRange("A5:C12").values = [
    ["Development & verification", null, "Tugas pengembangan dan verifikasi bulan ini"],
    ["Maintenance", null, "Bug, perbaikan, dan hardening bulan ini"],
    ["Total tugas", null, "Development + Maintenance"],
    ["Test otomatis terakhir", "31 / 31 lolos", "Hasil terakhir yang tercatat pada laporan 21–28 September"],
    ["Bug terdaftar dari pengujian E2E", null, "B-01 sampai B-11 pada Bug Registry"],
    ["Langkah uji E2E lulus", "10 / 10", "Dijalankan dua kali dengan akun berbeda"],
    ["Total komisi tervalidasi (Rp)", null, "3 skenario settled, selisih 0"],
    ["Bug masih terbuka", null, "Status pada Bug Registry sumber seluruhnya Diperbaiki"],
  ];
  ringkasan.getRange("B5").formulas = [["=COUNTA('Development'!$A$5:$A$200)"]];
  ringkasan.getRange("B6").formulas = [["=COUNTA('Maintenance'!$A$5:$A$200)"]];
  ringkasan.getRange("B7").formulas = [["=SUM(B5:B6)"]];
  ringkasan.getRange("B9").formulas = [["=COUNTA('Bug Registry'!$A$5:$A$100)"]];
  ringkasan.getRange("B11").formulas = [["=SUM('Validasi Komisi'!$F$5:$F$7)"]];
  ringkasan.getRange("B12").formulas = [["=COUNTIF('Bug Registry'!$G$5:$G$15,\"<>Diperbaiki\")"]];
  ringkasan.getRange("A15:C15").values = [["Keputusan akhir", null, null]];
  ringkasan.getRange("A16:C16").values = [["LAYAK PRODUCTION untuk alur yang diuji selama September: SaaS showroom, registrasi dan paket, langganan, multi-cabang, akses staf, domain custom, transaksi buyer/seller, komisi, settlement, dan landing.", null, null]];
  ringkasan.getRange("A18:C18").values = [["Catatan & di luar cakupan", null, null]];
  ringkasan.getRange("A19:C23").values = [
    ["- Uji otomatis terakhir yang tercatat adalah 31/31 lulus pada laporan 21–28 September; tidak ada hasil suite baru yang tercatat untuk 29–30 September.", null, null],
    ["- Aktivasi penuh domain custom tetap membutuhkan DNS, nginx, dan SSL manual oleh Admin; jalur produksi penuh menunggu domain showroom nyata.", null, null],
    ["- Belum diuji: beban tinggi, pentest mendalam, race condition booking bersamaan, jaringan putus saat pembayaran, dan aksesibilitas.", null, null],
    ["- Data uji QA dikembalikan atau dihapus setelah verifikasi. Pengujian menggunakan akun qa.*@carlynk-test.id dan tidak menyentuh data pengguna asli.", null, null],
    ["- Sumber rekap: laporan mingguan 31 Agustus–6 September, 7–13, 14–19, 21–28 September, serta pembaruan master 29–30 September.", null, null],
  ];
  ringkasan.getRange("A4:C4").format = { fill: green, font: { name: fontName, size: 10, bold: true, color: white }, horizontalAlignment: "center", verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: white } };
  ringkasan.getRange("A5:C12").format = { font: { name: fontName, size: 10, color: darkText }, verticalAlignment: "center", wrapText: true, borders: { preset: "all", style: "thin", color: borderColor } };
  ringkasan.getRange("A5:C12").format.fill = bodyFill;
  for (let row = 0; row < 8; row += 2) ringkasan.getRange(`A${5 + row}:C${5 + row}`).format.fill = stripeFill;
  ringkasan.getRange("A15:C15").format = { font: { name: fontName, size: 12, bold: true, color: darkText } };
  ringkasan.getRange("A16:C16").merge();
  ringkasan.getRange("A16:C16").format = { font: { name: fontName, size: 10, color: darkText }, wrapText: true, verticalAlignment: "center" };
  ringkasan.getRange("A18:C18").format = { font: { name: fontName, size: 12, bold: true, color: darkText } };
  ringkasan.getRange("A19:C23").merge(true);
  ringkasan.getRange("A19:C23").format = { font: { name: fontName, size: 10, color: darkText }, wrapText: true, verticalAlignment: "center" };
  ringkasan.getRange("B5:B7").format.font = { name: fontName, size: 12, bold: true, color: darkText };
  ringkasan.getRange("B8:B10").format.font = { name: fontName, size: 11, bold: true, color: green };
  ringkasan.getRange("B11").format = { font: { name: fontName, size: 11, bold: true, color: green }, numberFormat: "#,##0" };
  ringkasan.getRange("B12").format.font = { name: fontName, size: 11, bold: true, color: darkText };
  ringkasan.getRange("A4:A23").format.columnWidth = 48;
  ringkasan.getRange("B4:B23").format.columnWidth = 20;
  ringkasan.getRange("C4:C23").format.columnWidth = 72;
  ringkasan.getRange("A16:C16").format.rowHeight = 46;
  ringkasan.getRange("A19:C23").format.rowHeight = 30;

  function writeTaskSheet(sheet, title, subtitle, rows) {
    styleTitle(sheet, title, subtitle);
    sheet.getRange("A4:E4").values = [["No", "Kategori", "Tugas", "Keterangan", "Status"]];
    const endRow = 4 + rows.length;
    sheet.getRange(`A5:E${endRow}`).values = rows;
    styleTable(sheet, "A4:E4", `A5:E${endRow}`, { A: 8, B: 16, C: 42, D: 108, E: 16 });
    sheet.getRange(`A5:A${endRow}`).format.horizontalAlignment = "center";
    sheet.getRange(`E5:E${endRow}`).format.horizontalAlignment = "center";
    fitRows(sheet, 5, rows, [2, 3], [48, 112]);
    sheet.freezePanes.freezeRows(4);
    return endRow;
  }

  writeTaskSheet(
    developmentSheet,
    "Development September 2026",
    "Sumber: laporan mingguan 31 Agustus–6 September, 7–13, 14–19, 21–28 September serta pembaruan master 29–30 September.",
    development,
  );
  writeTaskSheet(
    maintenanceSheet,
    "Maintenance September 2026",
    "Bug, perbaikan, hardening, dan perapian yang selesai selama 1–30 September 2026.",
    maintenance,
  );

  const bugSource = usedValues(weekly14, "Bug Registry");
  styleTitle(bugSheet, "Bug Registry September 2026", "Bug yang ditemukan melalui pengujian end-to-end 15–16 September dan sudah diperbaiki di production.");
  bugSheet.getRange("A4:G4").values = [bugSource[3]];
  const bugRows = bugSource.slice(4).filter((row) => row?.[0]);
  bugSheet.getRange(`A5:G${4 + bugRows.length}`).values = bugRows;
  styleTable(bugSheet, "A4:G4", `A5:G${4 + bugRows.length}`, { A: 9, B: 12, C: 38, D: 90, E: 20, F: 12, G: 18 });
  bugSheet.getRange(`A5:B${4 + bugRows.length}`).format.horizontalAlignment = "center";
  bugSheet.getRange(`F5:G${4 + bugRows.length}`).format.horizontalAlignment = "center";
  fitRows(bugSheet, 5, bugRows, [2, 3], [42, 100]);
  bugSheet.freezePanes.freezeRows(4);

  const e2eSource = usedValues(weekly14, "Langkah Uji E2E");
  styleTitle(e2eSheet, "Langkah Uji E2E September 2026", "Putaran uji end-to-end 14–19 September dijalankan dua kali dengan akun berbeda; hasil identik.");
  e2eSheet.getRange("A4:F4").values = [e2eSource[3]];
  const e2eRows = e2eSource.slice(4).filter((row) => row?.[0]);
  e2eSheet.getRange(`A5:F${4 + e2eRows.length}`).values = e2eRows;
  styleTable(e2eSheet, "A4:F4", `A5:F${4 + e2eRows.length}`, { A: 8, B: 18, C: 28, D: 70, E: 55, F: 14 });
  e2eSheet.getRange(`A5:A${4 + e2eRows.length}`).format.horizontalAlignment = "center";
  e2eSheet.getRange(`F5:F${4 + e2eRows.length}`).format.horizontalAlignment = "center";
  fitRows(e2eSheet, 5, e2eRows, [3, 4], [78, 62]);
  e2eSheet.freezePanes.freezeRows(4);

  styleTitle(commissionSheet, "Validasi Komisi Affiliate September 2026", "Biru = input dari data transaksi uji. Komisi dihitung memakai rumus dan dibandingkan dengan angka ledger aplikasi.");
  commissionSheet.getRange("A4:H4").values = [["Marketing", "Transaksi", "Harga mobil (Rp)", "Persentase", "Komisi dihitung (Rp)", "Komisi di sistem (Rp)", "Selisih (Rp)", "Cocok?"]];
  commissionSheet.getRange("A5:H7").values = [
    ["Sari Marketing", "TRX-20260915-100129-2CA79C", 175000000, 0.02, null, 3500000, null, null],
    ["QA E2E Marketing", "TRX-20260916-101311-D78739", 160000000, 0.03, null, 4800000, null, null],
    ["QA Retest Marketing", "TRX-20260916-104613-465D43", 210000000, 0.04, null, 8400000, null, null],
  ];
  commissionSheet.getRange("E5").formulas = [["=C5*D5"]];
  commissionSheet.getRange("E5:E7").fillDown();
  commissionSheet.getRange("G5").formulas = [["=E5-F5"]];
  commissionSheet.getRange("G5:G7").fillDown();
  commissionSheet.getRange("H5").formulas = [["=IF(G5=0,\"Ya\",\"Tidak\")"]];
  commissionSheet.getRange("H5:H7").fillDown();
  commissionSheet.getRange("A8:H8").values = [["Total", null, null, null, null, null, null, null]];
  commissionSheet.getRange("C8").formulas = [["=SUM(C5:C7)"]];
  commissionSheet.getRange("E8").formulas = [["=SUM(E5:E7)"]];
  commissionSheet.getRange("F8").formulas = [["=SUM(F5:F7)"]];
  commissionSheet.getRange("G8").formulas = [["=SUM(G5:G7)"]];
  commissionSheet.getRange("H8").formulas = [["=IF(G8=0,\"Ya\",\"Tidak\")"]];
  commissionSheet.getRange("A10").values = [["Catatan: seluruh ledger di atas berstatus settled. Persentase mengikuti aturan komisi umum showroom saat transaksi."]];
  styleTable(commissionSheet, "A4:H4", "A5:H8", { A: 24, B: 34, C: 18, D: 14, E: 22, F: 22, G: 16, H: 12 });
  commissionSheet.getRange("A8:H8").format.font = { name: fontName, size: 10, bold: true, color: darkText };
  commissionSheet.getRange("C5:C8").format.numberFormat = "#,##0";
  commissionSheet.getRange("D5:D7").format.numberFormat = "0.0%";
  commissionSheet.getRange("E5:G8").format.numberFormat = "#,##0";
  commissionSheet.getRange("A10:H10").merge();
  commissionSheet.getRange("A10:H10").format = { font: { name: fontName, size: 10, italic: true, color: mutedText }, wrapText: true };
  commissionSheet.getRange("A10:H10").format.rowHeight = 32;
  commissionSheet.freezePanes.freezeRows(4);

  const backlogSource = usedValues(weekly21, "Belum Dikerjakan");
  styleTitle(backlogSheet, "Belum Dikerjakan", "Catatan pengembangan umum dari laporan 21–28 September. Keduanya belum menjadi tugas terjadwal pada periode ini.");
  backlogSheet.getRange("A4:C4").values = [["No", "Fitur", "Kenapa Dianggap Penting untuk SaaS"]];
  const backlogRows = backlogSource.slice(1).filter((row) => row?.[1]).map((row, index) => [index + 1, row[1], row[2] ?? ""]);
  backlogSheet.getRange(`A5:C${4 + backlogRows.length}`).values = backlogRows;
  styleTable(backlogSheet, "A4:C4", `A5:C${4 + backlogRows.length}`, { A: 8, B: 42, C: 110 });
  backlogSheet.getRange(`A5:A${4 + backlogRows.length}`).format.horizontalAlignment = "center";
  fitRows(backlogSheet, 5, backlogRows, [1, 2], [48, 118]);
  backlogSheet.freezePanes.freezeRows(4);

  workbook.recalculate();

  const summaryCheck = await workbook.inspect({ kind: "table", range: "Ringkasan!A1:C23", include: "values,formulas", tableMaxRows: 30, tableMaxCols: 4, maxChars: 10000 });
  console.log("SUMMARY_CHECK\n" + summaryCheck.ndjson);
  const errorCheck = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!", options: { useRegex: true, maxResults: 300 }, summary: "final formula error scan" });
  console.log("ERROR_CHECK\n" + errorCheck.ndjson);

  const renderRanges = [
    ["Ringkasan", "A1:C23", "summary"],
    ["Development", "A1:E22", "development-top"],
    ["Development", `A${Math.max(1, development.length - 8)}:E${development.length + 4}`, "development-bottom"],
    ["Maintenance", "A1:E22", "maintenance-top"],
    ["Maintenance", `A${Math.max(1, maintenance.length - 8)}:E${maintenance.length + 4}`, "maintenance-bottom"],
    ["Bug Registry", "A1:G15", "bug-registry"],
    ["Langkah Uji E2E", "A1:F14", "e2e"],
    ["Validasi Komisi", "A1:H10", "commission"],
    ["Belum Dikerjakan", "A1:C7", "backlog"],
  ];
  for (const [sheetName, range, fileLabel] of renderRanges) {
    const preview = await workbook.render({ sheetName, range, scale: 1, format: "png" });
    await fs.writeFile(`${outputDir}/preview-${fileLabel}.png`, new Uint8Array(await preview.arrayBuffer()));
  }

  await fs.mkdir(outputDir, { recursive: true });
  const output = await SpreadsheetFile.exportXlsx(workbook);
  await output.save(outputPath);
  console.log(JSON.stringify({ outputPath, developmentCount: development.length, maintenanceCount: maintenance.length, bugCount: bugRows.length, e2eCount: e2eRows.length }));
}

await build();
