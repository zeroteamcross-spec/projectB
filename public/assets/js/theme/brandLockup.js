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
export function renderBrandLockup(mark, teks = [], {
  markClass = "",
  imageClass = "block h-10 w-auto max-w-[10rem] object-contain",
  iconName = null,
  iconClass = "block h-5 w-5 leading-none",
} = {}) {
  if (!mark) {
    return false;
  }

  mark.replaceChildren();
  const logo = getAsset(brandConfig.uploadedLogoUrl);
  const simpulTeks = teks.filter(Boolean);

  if (logo) {
    // Kelas wadahnya dikosongkan, bukan diganti: apa pun kotak, lingkaran, atau
    // gradien yang dipasang pemanggil harus hilang, bukan sekadar diperkecil.
    mark.className = "inline-flex shrink-0 items-center";
    mark.hidden = false;

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
      simpulTeks.forEach((simpul) => {
        simpul.hidden = false;
      });
    }, { once: true });

    mark.append(image);

    simpulTeks.forEach((simpul) => {
      simpul.hidden = true;
    });

    return true;
  }

  mark.className = markClass;
  mark.hidden = false;
  mark.append(createIcon(iconName ?? brandConfig.logoIcon, { className: iconClass }));

  simpulTeks.forEach((simpul) => {
    simpul.hidden = false;
  });

  return false;
}
