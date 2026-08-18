import { brandConfig } from "./brandConfig.js";
import { getAsset } from "./assetRegistry.js";
import { createIcon } from "./iconRegistry.js";

/**
 * Brand di pojok kiri atas, satu aturan untuk semua shell.
 *
 * Kalau ada logo yang diunggah lewat Konfigurasi WEB, **hanya gambar itu yang
 * tampil**: tanpa kotak, tanpa lingkaran, tanpa icon, tanpa nama aplikasi.
 * Logo biasanya sudah memuat namanya sendiri, dan membungkusnya dalam kotak
 * berwarna lalu menempelkan teks di sebelahnya membuat tiga lambang bertumpuk.
 * Nama aplikasi pindah ke atribut alt supaya pembaca layar tetap mendapatkannya.
 *
 * Kalau belum ada logo, tampilannya kembali seperti semula: kotak berisi icon,
 * dengan nama aplikasi di sebelahnya.
 *
 * Ditulis di satu tempat karena tiga shell -- header aplikasi, header publik,
 * dan sidebar -- masing-masing punya salinannya sendiri. Memperbaiki satu tidak
 * menyentuh dua sisanya, dan itu persis yang sempat terjadi: header diperbaiki
 * sementara halaman login masih menampilkan kotak, icon kecil, dan teks.
 *
 * @param {HTMLElement} mark  Wadah lambang.
 * @param {Array<HTMLElement|null>} teks  Simpul teks yang disembunyikan saat ada logo.
 */
/**
 * Batas logo: persegi panjang, bukan persegi.
 *
 * Dibatasi tinggi DAN lebar, dan yang lebih dulu mentok itulah yang mengikat.
 * Logo memanjang -- wordmark dengan rasio hampir 6:1 -- terikat lebar dan
 * mengisi kolomnya penuh; logo persegi terikat tinggi. Satu aturan menangani
 * keduanya tanpa perlu tahu bentuk berkasnya.
 *
 * Kotak persegi yang dipakai sebelumnya memaksa wordmark menyusut sampai
 * setinggi 15px di dalam kotak 90px, jadi terlihat kecil justru karena
 * kotaknya besar.
 */
export const KELAS_GAMBAR_LOGO = "block h-auto w-auto max-h-12 max-w-[200px] object-contain";

export function renderBrandLockup(mark, teks = [], {
  markClass = "",
  imageClass = KELAS_GAMBAR_LOGO,
  // Kelas wadah saat logonya tampil. Sengaja terpisah dari markClass: kotak
  // yang dipakai versi icon harus hilang, tapi pemanggil kadang masih perlu
  // menempelkan aturan sendiri -- header aplikasi menyembunyikannya di desktop
  // karena logonya sudah pindah ke sidebar.
  // w-full dan flex-1 keduanya perlu, bukan hiasan. Gambar ber-w-auto tanpa
  // ukuran bawaan menyusut sampai 0x0 kalau wadahnya tidak punya lebar pasti --
  // ada di DOM, tidak terlihat sama sekali. flex-1 mengurusnya saat wadahnya di
  // dalam baris flex (header), w-full saat di dalam grid (sidebar).
  markLogoClass = "flex w-full min-w-0 flex-1 items-center",
  iconName = null,
  iconClass = "block h-5 w-5 leading-none",
  // Rail sidebar yang diciutkan hanya selebar 56px. Wordmark memanjang di sana
  // akan setinggi 9px dan tidak terbaca, jadi pemanggil bisa meminta versi
  // icon meski logonya ada.
  pakaiLogo = true,
  // Showroom bisa punya logo sendiri yang cuma tampil di halaman showroom
  // itu -- kalau diisi, ini menang atas logo global Konfigurasi WEB, tapi
  // tetap lewat getAsset() yang sama di bawah.
  logoUrlOverride = "",
} = {}) {
  if (!mark) {
    return false;
  }

  mark.replaceChildren();
  const logoSumber = logoUrlOverride || brandConfig.uploadedLogoUrl;
  const logo = pakaiLogo ? getAsset(logoSumber) : "";
  const simpulTeks = teks.filter(Boolean);

  if (logo) {
    // Kelas wadahnya diganti seluruhnya, bukan ditambahi: apa pun kotak,
    // lingkaran, atau gradien yang dipasang pemanggil harus hilang, bukan
    // sekadar diperkecil.
    mark.className = markLogoClass;
    tampilkan(mark);

    const image = document.createElement("img");
    image.src = logo;
    image.alt = brandConfig.appName;
    image.className = imageClass;

    // Kalau berkas logonya hilang atau rusak, brand akan kosong sama sekali --
    // gambarnya tidak tampil dan teksnya sudah disembunyikan. Jadi kegagalan
    // muat mengembalikan tampilan ke kotak icon berikut nama aplikasi.
    image.addEventListener("error", () => {
      mark.className = markClass;
      mark.replaceChildren(createIcon(iconName ?? brandConfig.logoIcon, { className: iconClass }));
      simpulTeks.forEach(tampilkan);
    }, { once: true });

    mark.append(image);
    simpulTeks.forEach(sembunyikan);

    return true;
  }

  mark.className = markClass;
  tampilkan(mark);
  mark.append(createIcon(iconName ?? brandConfig.logoIcon, { className: iconClass }));

  simpulTeks.forEach(tampilkan);

  return false;
}

/**
 * Atribut `hidden` saja tidak cukup di sini.
 *
 * `[hidden] { display: none }` dan `.grid { display: grid }` punya kekhususan
 * yang sama, jadi yang menang adalah urutan di stylesheet -- dan utilitas
 * Tailwind ditulis setelah preflight. Pembungkus teks di header publik memakai
 * kelas `grid`, sehingga ia tetap tampil meski atributnya sudah dipasang.
 * Header aplikasi kebetulan lolos karena elemennya <strong> tanpa utilitas
 * display sama sekali.
 *
 * Style inline menang atas keduanya, jadi itu yang dipakai. Atributnya tetap
 * ikut dipasang supaya pembaca layar juga melewatinya.
 */
function sembunyikan(simpul) {
  simpul.hidden = true;
  simpul.style.display = "none";
}

function tampilkan(simpul) {
  simpul.hidden = false;
  simpul.style.removeProperty("display");
}
