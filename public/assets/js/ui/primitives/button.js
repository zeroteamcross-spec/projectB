import { cx, tw } from "../theme/tailwindClasses.js";
import { applyDesignHook } from "../../theme/designStudioHooks.js";

/**
 * Aturan warna tombol seluruh aplikasi: hijau untuk "Ya", merah untuk "Tidak",
 * biru primary untuk yang bukan keduanya.
 *
 * "Ya" berarti aksi yang memajukan sesuatu — menyimpan, mendaftar, masuk,
 * melanjutkan, menyetujui. "Tidak" berarti aksi yang membatalkan, menutup,
 * mundur, atau menghapus. Sisanya (buka detail, salin link, pindah halaman)
 * netral dan memakai biru, supaya merah tetap berarti "hati-hati" dan tidak
 * tenggelam jadi warna sehari-hari.
 *
 * Klasifikasinya dibaca dari label karena varian lama tidak bisa dipercaya:
 * 168 tombol memakai variant "secondary" untuk dua maksud yang berlawanan,
 * mulai dari "Batal" sampai "Copy link". Memanggil Button dengan variant
 * "ya" | "tidak" | "netral" secara eksplisit tetap menang atas tebakan ini.
 */
const POLA_TIDAK = /\b(batal|batalkan|tutup|kembali|hapus|archive|arsip|retur|tolak|logout|keluar|cancel|close|reset|kosongkan|stop|hentikan|buang|nonaktifkan)\b/i;
// Diperiksa sebelum POLA_YA supaya "Lihat Detail" tidak ikut tertangkap kata
// "lihat" yang tidak ada di mana-mana, lalu jatuh ke variant "primary" dan
// jadi hijau. Semua kata di sini cuma memindahkan mata, tidak mengubah data.
const POLA_NETRAL = /\b(detail|lihat|buka|tampilkan|preview|pratinjau|foto|galeri|inspeksi|salin|copy|unduh|download|cari|filter|urutkan|muat|selengkapnya|kelola|edit|review|riwayat|dashboard|beranda|katalog|sebelumnya|berikutnya|previous)\b/i;
const POLA_YA = /\b(simpan|save|daftar|daftarkan|masuk|login|lanjut|lanjutkan|next|tambah|tambahkan|buat|kirim|submit|approve|setujui|selesai|selesaikan|booking|bayar|terapkan|pilih|unggah|upload|publish|tayangkan|aktifkan|konfirmasi|ya)\b/i;

const VARIAN_EKSPLISIT = new Set(["ya", "tidak", "netral", "ghost"]);

export function Button({ label, variant = "primary", disabled = false, onClick = null, designHook = null } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = cx(tw.button.base, tw.button[peranTombol(label, variant)] ?? tw.button.netral);
  button.disabled = disabled;
  button.textContent = label ?? "Aksi";
  applyDesignHook(button, designHook);

  if (onClick) {
    button.addEventListener("click", onClick);
  }

  return button;
}

/**
 * Menentukan peran warna sebuah tombol.
 *
 * Urutannya sengaja: varian eksplisit lebih dulu, lalu label, baru varian lama
 * sebagai jaring pengaman. Label diperiksa sebelum variant "primary"/"danger"
 * supaya tombol seperti Button({ label: "Batal", variant: "primary" }) tetap
 * merah — maksud katanya lebih dipercaya daripada varian yang ditulis penelepon.
 */
export function peranTombol(label, variant = "primary") {
  if (VARIAN_EKSPLISIT.has(variant)) {
    return variant;
  }

  const teks = String(label ?? "");

  if (POLA_TIDAK.test(teks)) {
    return "tidak";
  }

  if (POLA_NETRAL.test(teks)) {
    return "netral";
  }

  if (POLA_YA.test(teks)) {
    return "ya";
  }

  if (variant === "danger") {
    return "tidak";
  }

  if (variant === "primary") {
    return "ya";
  }

  return "netral";
}
