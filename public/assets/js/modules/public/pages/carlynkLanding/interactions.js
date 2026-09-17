/**
 * Perilaku landing Carlynk.
 *
 * Markup dipasang sekali oleh lifecycle SPA dan tidak dirender ulang, jadi
 * tidak ada MutationObserver di sini. Setiap pemasang mengembalikan fungsi
 * pembersihnya sendiri supaya pindah rute tidak meninggalkan listener.
 */

import { pasangKorsel } from "./carousel.js";

export function pasangInteraksi(akar) {
  const pembersih = [
    pasangReveal(akar),
    pasangNavMenyusut(akar),
    pasangKorsel(akar),
  ];

  return () => pembersih.splice(0).forEach((bersihkan) => bersihkan?.());
}

/**
 * Animasi masuk saat elemen tergulir ke layar.
 *
 * Kelas awalnya sudah ditulis di stylesheet, bukan dipasang dari sini, supaya
 * tidak ada kedipan di frame pertama sebelum skrip sempat jalan.
 */
function pasangReveal(akar) {
  const simpul = Array.from(akar.querySelectorAll("[data-reveal]"));

  if (!simpul.length) {
    return () => {};
  }

  // Tanpa IntersectionObserver semuanya langsung ditampilkan. Halaman yang
  // isinya tidak pernah muncul jauh lebih buruk daripada halaman tanpa animasi.
  if (typeof IntersectionObserver !== "function") {
    simpul.forEach((n) => n.classList.add("ck-tampil"));
    return () => {};
  }

  const io = new IntersectionObserver((entri) => {
    entri.forEach((e) => {
      if (!e.isIntersecting) {
        return;
      }
      e.target.style.transitionDelay = `${Math.min(urutanDalamInduk(e.target), 4) * 70}ms`;
      e.target.classList.add("ck-tampil");
      io.unobserve(e.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

  simpul.forEach((n) => io.observe(n));

  return () => io.disconnect();
}

function urutanDalamInduk(simpul) {
  return Array.from(simpul.parentElement?.children ?? []).indexOf(simpul);
}

/**
 * Navbar desain setinggi 161px kalau diskalakan lurus -- itu seperempat layar
 * ponsel. Di sini ia mulai 104px lalu menyusut setelah halaman digulir, jadi
 * kesan pertamanya tetap lapang tanpa memakan ruang baca sepanjang halaman.
 */
function pasangNavMenyusut(akar) {
  const nav = akar.querySelector("[data-nav]");

  if (!nav) {
    return () => {};
  }

  let menunggu = false;

  const perbarui = () => {
    menunggu = false;
    nav.classList.toggle("ck-nav--kecil", window.scrollY > 40);
  };

  const gulir = () => {
    if (menunggu) {
      return;
    }
    menunggu = true;
    requestAnimationFrame(perbarui);
  };

  perbarui();
  window.addEventListener("scroll", gulir, { passive: true });

  return () => window.removeEventListener("scroll", gulir);
}
