/**
 * Korsel landing.
 *
 * Dibuat untuk konten yang belum lengkap: desainnya memperlihatkan tiga titik
 * tapi baru menyertakan slide pertama. Karena itu markup-nya tidak merender
 * titik maupun panah selama slidenya cuma satu, dan pemasang di sini langsung
 * mundur tanpa memasang apa pun. Begitu slide berikutnya ditambahkan di
 * content.js, keduanya hidup sendiri.
 *
 * Geser jari ditangani lewat Pointer Events, bukan Touch Events, supaya
 * seretan tetikus di layar sentuh hibrida ikut jalan. Gulir vertikal tidak
 * boleh ikut tersandera, jadi arah seretan diputuskan dulu dari lima piksel
 * pertama.
 */

const AMBANG_GESER = 48;
const AMBANG_ARAH = 5;

export function pasangKorsel(akar) {
  const pembersih = Array.from(akar.querySelectorAll("[data-korsel]"))
    .map(pasangSatu)
    .filter(Boolean);

  return () => pembersih.splice(0).forEach((bersihkan) => bersihkan());
}

function pasangSatu(wadah) {
  const rel = wadah.querySelector("[data-korsel-rel]");
  const slide = rel ? Array.from(rel.children) : [];

  // Satu slide berarti bagian statis biasa. Tidak ada yang perlu dipasang.
  if (!rel || slide.length < 2) {
    return null;
  }

  const titik = Array.from(wadah.querySelectorAll("[data-korsel-titik]"));
  const panah = Array.from(wadah.querySelectorAll("[data-korsel-panah]"));
  let indeks = 0;

  const tampilkan = (ke) => {
    indeks = (ke + slide.length) % slide.length;
    rel.style.transform = `translateX(-${indeks * 100}%)`;
    titik.forEach((t, i) => t.setAttribute("aria-current", String(i === indeks)));
    slide.forEach((s, i) => s.setAttribute("aria-hidden", String(i !== indeks)));
  };

  const lepas = [];

  titik.forEach((tombol, i) => {
    const klik = () => tampilkan(i);
    tombol.addEventListener("click", klik);
    lepas.push(() => tombol.removeEventListener("click", klik));
  });

  panah.forEach((tombol) => {
    const arah = tombol.dataset.korselPanah === "kiri" ? -1 : 1;
    const klik = () => tampilkan(indeks + arah);
    tombol.addEventListener("click", klik);
    lepas.push(() => tombol.removeEventListener("click", klik));
  });

  // Panah kiri/kanan hanya saat korselnya sedang difokus, supaya tidak
  // membajak tombol panah untuk seluruh halaman.
  const tekan = (e) => {
    if (e.key === "ArrowLeft") {
      tampilkan(indeks - 1);
    } else if (e.key === "ArrowRight") {
      tampilkan(indeks + 1);
    } else {
      return;
    }
    e.preventDefault();
  };
  wadah.addEventListener("keydown", tekan);
  lepas.push(() => wadah.removeEventListener("keydown", tekan));

  lepas.push(pasangGeser(wadah, {
    maju: () => tampilkan(indeks + 1),
    mundur: () => tampilkan(indeks - 1),
    posisi: () => indeks,
    rel,
    jumlah: slide.length,
  }));

  tampilkan(0);

  return () => lepas.splice(0).forEach((bersihkan) => bersihkan());
}

function pasangGeser(wadah, { maju, mundur, posisi, rel, jumlah }) {
  let mulaiX = 0;
  let mulaiY = 0;
  let aktif = false;
  let mendatar = null;

  const turun = (e) => {
    if (!e.isPrimary) {
      return;
    }
    aktif = true;
    mendatar = null;
    mulaiX = e.clientX;
    mulaiY = e.clientY;
  };

  const gerak = (e) => {
    if (!aktif) {
      return;
    }

    const dx = e.clientX - mulaiX;
    const dy = e.clientY - mulaiY;

    // Arah baru diputuskan setelah jari benar-benar bergerak. Sebelum itu
    // halaman tetap boleh bergulir seperti biasa.
    if (mendatar === null) {
      if (Math.abs(dx) < AMBANG_ARAH && Math.abs(dy) < AMBANG_ARAH) {
        return;
      }
      mendatar = Math.abs(dx) > Math.abs(dy);
      if (mendatar) {
        wadah.setPointerCapture?.(e.pointerId);
        rel.style.transition = "none";
      }
    }

    if (!mendatar) {
      return;
    }

    // Seretan melewati slide pertama atau terakhir diberi tahanan, sebagai
    // isyarat bahwa ujungnya sudah tercapai.
    const ujung = (posisi() === 0 && dx > 0) || (posisi() === jumlah - 1 && dx < 0);
    const geser = ujung ? dx * 0.32 : dx;
    rel.style.transform = `translateX(calc(-${posisi() * 100}% + ${geser}px))`;
  };

  const selesai = (e) => {
    if (!aktif) {
      return;
    }
    aktif = false;
    rel.style.transition = "";

    if (!mendatar) {
      return;
    }

    wadah.releasePointerCapture?.(e.pointerId);
    const dx = e.clientX - mulaiX;

    if (dx <= -AMBANG_GESER) {
      maju();
    } else if (dx >= AMBANG_GESER) {
      mundur();
    } else {
      rel.style.transform = `translateX(-${posisi() * 100}%)`;
    }
  };

  wadah.addEventListener("pointerdown", turun);
  wadah.addEventListener("pointermove", gerak);
  wadah.addEventListener("pointerup", selesai);
  wadah.addEventListener("pointercancel", selesai);

  return () => {
    wadah.removeEventListener("pointerdown", turun);
    wadah.removeEventListener("pointermove", gerak);
    wadah.removeEventListener("pointerup", selesai);
    wadah.removeEventListener("pointercancel", selesai);
  };
}
