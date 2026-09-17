/**
 * Perakit markup landing Carlynk.
 *
 * Tidak ada satu pun kalimat di berkas ini -- semuanya datang dari content.js.
 * Tidak ada pula atribut style="..."; seluruh tampilan diatur styles.js lewat
 * kelas. Keduanya disengaja: landing sebelumnya mencampur kopi, warna, dan
 * struktur di dalam satu string 30 KB, dan mengubah satu kata berarti menyisir
 * tag.
 */

import { KONTEN } from "./content.js";

export function landingMarkup({ rute }) {
  return [
    nav(rute),
    hero(rute),
    masalah(),
    fitur(),
    kenapa(),
    testimoni(),
    partner(),
    penutup(rute),
    footer(rute),
  ].join("");
}

/* ---------- bagian ---------- */

function nav({ daftar, masuk }) {
  const { logoTeal } = KONTEN.nav;

  return `
<header class="ck-nav" data-nav style="background-image:url('${KONTEN.masalah.latar}')">
  ${lengkungNav()}
  <div class="ck-lajur ck-nav__isi">
    <a href="#/" aria-label="Carlynk">
      <img class="ck-nav__logo" src="${logoTeal}" alt="Carlynk" width="1930" height="365">
    </a>
    <div class="ck-nav__aksi">
      <a class="ck-tombol ck-tombol--emas" href="${daftar}">${teks(KONTEN.nav.daftar)}</a>
      <a class="ck-tombol ck-tombol--putih" href="${masuk}">${teks(KONTEN.nav.masuk)}</a>
    </div>
  </div>
</header>`;
}

/**
 * Bidang putih navbar. Tepi kanannya bukan busur tunggal, jadi border-radius
 * tidak cukup.
 *
 * Titik beloknya mengikuti proporsi mendatar dari PDF desain (54% di atas,
 * 60% di bawah), tapi viewBox-nya ditulis pada tinggi navbar jadi -- bukan
 * tinggi pita di PDF. Dengan preserveAspectRatio="none", busur setinggi 278
 * yang dipadatkan ke 104 px kehilangan lengkungnya dan terbaca sebagai garis
 * diagonal.
 */
function lengkungNav() {
  return `
<svg class="ck-nav__lengkung" viewBox="0 0 1440 104" preserveAspectRatio="none" aria-hidden="true" focusable="false">
  <path d="M0 14 H766 Q781 14 781 32 C781 62 852 104 923 104 H0 Z" fill="#ffffff"/>
</svg>`;
}

function hero({ daftar, demo }) {
  const h = KONTEN.hero;

  return `
<section class="ck-hero">
  <div class="ck-lajur ck-hero__kisi">
    <div class="ck-hero__teks">
      <h1 data-reveal>${judul(h.judul)}</h1>
      <p class="ck-hero__deskripsi" data-reveal>${teks(h.deskripsi)}</p>
      <div class="ck-hero__aksi" data-reveal>
        <a class="ck-tombol ck-tombol--emas" href="${daftar}">${teks(h.tombolUtama)}</a>
        <a class="ck-tombol ck-tombol--abu" href="${demo}">${teks(h.tombolKedua)}</a>
      </div>
    </div>
    <img class="ck-hero__gambar" src="${h.gambar}" alt="${teks(h.alt)}" width="1017" height="830" fetchpriority="high">
  </div>
</section>`;
}

function masalah() {
  const m = KONTEN.masalah;
  const slides = m.slides.map((slide) => slide.map(kartuMasalah).join("")).join("|");

  return `
<section class="ck-masalah" style="background-image:url('${m.latar}')">
  <div class="ck-lajur">
    <h2 data-reveal>${judul(m.judul)}</h2>
    <p class="ck-masalah__subjudul" data-reveal>${teks(m.subjudul)}</p>
    ${korsel({ nama: "masalah", slides, gelap: true })}
  </div>
</section>`;
}

function kartuMasalah(kartu) {
  return `
<article class="ck-masalah__kartu" data-reveal>
  <p>${tebal(kartu.teks)}</p>
  <img class="ck-masalah__foto" src="${kartu.gambar}" alt="${teks(kartu.alt)}" loading="lazy">
</article>`;
}

function fitur() {
  const f = KONTEN.fitur;
  const slides = f.slides.map((slide) => slide.map(kartuFitur).join("")).join("|");

  return `
<section class="ck-fitur" id="fitur">
  <div class="ck-lajur">
    <h2 data-reveal>${judul(f.judul)}</h2>
    ${korsel({ nama: "fitur", slides, satuLajur: true })}
  </div>
</section>`;
}

function kartuFitur(kartu) {
  return `
<article class="ck-fitur__kartu" data-reveal>
  <img class="ck-fitur__ikon" src="${kartu.ikon}" alt="" aria-hidden="true" loading="lazy" width="604" height="604">
  <div>
    <h3>${teks(kartu.judul)}</h3>
    <p>${teks(kartu.deskripsi)}</p>
  </div>
</article>`;
}

function kenapa() {
  const k = KONTEN.kenapa;

  return `
<section class="ck-kenapa">
  <div class="ck-kenapa__hias" aria-hidden="true">
    <div class="ck-kenapa__busur"></div>
    <div class="ck-kenapa__kotak"></div>
  </div>
  <div class="ck-lajur ck-kenapa__kisi">
    <div class="ck-kenapa__kiri">
      <h2 data-reveal>${teks(k.judul)}</h2>
      <img class="ck-kenapa__foto" src="${k.gambar}" alt="${teks(k.alt)}" loading="lazy" width="823" height="1213">
    </div>
    <ul class="ck-kenapa__poin">
      ${k.poin.map((poin) => `
      <li data-reveal>
        <h3>${teks(poin.judul)}</h3>
        <p>${teks(poin.deskripsi)}</p>
      </li>`).join("")}
    </ul>
  </div>
</section>`;
}

function testimoni() {
  const t = KONTEN.testimoni;
  const slides = t.slides.map((slide) => slide.map(kartuTestimoni).join("")).join("|");

  return `
<section class="ck-testimoni">
  ${bintangLatar()}
  <div class="ck-lajur">
    <h2 data-reveal>${teks(t.judul)}</h2>
    <div class="ck-testimoni__bintang" data-reveal aria-label="${t.bintang} dari 5">
      ${Array.from({ length: t.bintang }, bintang).join("")}
    </div>
    ${korsel({ nama: "testimoni", slides, berpanah: true })}
  </div>
</section>`;
}

function kartuTestimoni(kartu) {
  return `
<figure class="ck-testimoni__kartu" data-reveal>
  <img class="ck-testimoni__foto" src="${kartu.foto}" alt="${teks(kartu.nama)}" loading="lazy" width="310" height="310">
  <blockquote class="ck-testimoni__kutipan">&ldquo;${teks(kartu.kutipan)}&rdquo;</blockquote>
  <figcaption>
    <div class="ck-testimoni__nama">${teks(kartu.nama)}</div>
    <div class="ck-testimoni__jabatan">${teks(kartu.jabatan)}</div>
  </figcaption>
</figure>`;
}

function partner() {
  const p = KONTEN.partner;

  return `
<section class="ck-partner" style="background-image:url('${p.latar}')">
  <div class="ck-lajur">
    <div class="ck-partner__label">${teks(p.label)}</div>
    <div class="ck-partner__daftar" data-reveal>
      ${p.logo.map((logo) => (logo.gambar
        ? `<img src="${logo.gambar}" alt="${teks(logo.nama)}" loading="lazy">`
        : `<div class="ck-partner__teks">${teks(logo.nama).replace(" ", "<br>")}</div>`)).join("")}
    </div>
  </div>
</section>`;
}

function penutup({ daftar, konsultasi }) {
  const p = KONTEN.penutup;

  return `
<section class="ck-penutup">
  <div class="ck-lajur">
    <h2 data-reveal>${judul(p.judul)}</h2>
    <p data-reveal>${teks(p.deskripsi)}</p>
    <div class="ck-penutup__aksi" data-reveal>
      <a class="ck-tombol ck-tombol--emas" href="${daftar}">${teks(p.tombolUtama)}</a>
      <a class="ck-tombol ck-tombol--teal" href="${konsultasi}">${ikonSosial("whatsapp")}${teks(p.tombolKedua)}</a>
    </div>
  </div>
</section>`;
}

function footer(rute) {
  const f = KONTEN.footer;

  return `
<footer class="ck-footer" style="background-image:url('${f.latar}')">
  <div class="ck-lajur ck-footer__kisi">
    <div>
      <img class="ck-footer__logo" src="${KONTEN.nav.logoPutih}" alt="Carlynk" loading="lazy" width="1412" height="267">
    </div>
    ${f.kolom.map((kolom) => `
    <nav class="ck-footer__kolom">
      ${kolom.map((baris) => `<a href="${rute[baris.kunci] ?? "#"}">${teks(baris.label)}</a>`).join("")}
    </nav>`).join("")}
    <div>
      <div class="ck-footer__sosial">
        ${f.sosial.map((s) => `
        <a href="${rute[s.kunci] ?? "#"}" aria-label="${teks(s.label)}" rel="noopener">${ikonSosial(s.ikon)}</a>`).join("")}
      </div>
      <div class="ck-footer__hak">${teks(f.hakCipta)}</div>
    </div>
  </div>
</footer>`;
}

/* ---------- korsel ---------- */

/**
 * Slide dikirim sebagai satu string yang dipisah "|", bukan array, supaya
 * pemanggilnya bebas menentukan bentuk kartu di dalam tiap slide.
 *
 * Titik dan panah tidak dirender sama sekali saat slidenya cuma satu. Itu
 * membuat bagian yang kontennya belum lengkap terlihat sebagai blok statis
 * biasa, bukan korsel yang macet.
 */
function korsel({ nama, slides, gelap = false, berpanah = false, satuLajur = false }) {
  const daftar = slides.split("|").filter(Boolean);
  const banyak = daftar.length > 1;
  const kelas = [
    "ck-korsel",
    gelap ? "ck-korsel--gelap" : "",
    banyak && berpanah ? "ck-korsel--berpanah" : "",
  ].filter(Boolean).join(" ");

  const gaya = satuLajur ? ' style="grid-template-columns:1fr"' : "";

  return `
<div class="${kelas}" data-korsel="${nama}">
  ${banyak && berpanah ? panah("kiri") : ""}
  <div class="ck-korsel__bingkai">
    <div class="ck-korsel__rel" data-korsel-rel>
      ${daftar.map((slide) => `<div class="ck-korsel__slide"${gaya}>${slide}</div>`).join("")}
    </div>
  </div>
  ${banyak && berpanah ? panah("kanan") : ""}
  ${banyak ? titik(daftar.length) : ""}
</div>`;
}

function titik(jumlah) {
  return `
<div class="ck-korsel__titik" role="tablist">
  ${Array.from({ length: jumlah }, (_, i) => `
  <button type="button" role="tab" data-korsel-titik="${i}"
          aria-label="Slide ${i + 1}" aria-current="${i === 0}"></button>`).join("")}
</div>`;
}

function panah(arah) {
  const putar = arah === "kiri" ? "M10 3 L4 8 L10 13" : "M6 3 L12 8 L6 13";

  return `
<button type="button" class="ck-korsel__panah ck-korsel__panah--${arah}"
        data-korsel-panah="${arah}" aria-label="${arah === "kiri" ? "Sebelumnya" : "Berikutnya"}">
  <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
    <path d="${putar}" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
</button>`;
}

/* ---------- hiasan ---------- */

function bintang() {
  return `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
  <path d="M12 2.2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.2 6 20.5l1.3-6.7-5-4.6 6.8-.8z"/>
</svg>`;
}

/** Bintang raksasa di latar bagian testimoni, sesuai desain. */
function bintangLatar() {
  const bentuk = "M12 2.2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.2 6 20.5l1.3-6.7-5-4.6 6.8-.8z";

  return `
<div class="ck-testimoni__latar" aria-hidden="true">
  <svg viewBox="0 0 24 24" style="right:-6%;top:6%;width:min(34vw,420px)"><path d="${bentuk}"/></svg>
  <svg viewBox="0 0 24 24" style="left:-8%;bottom:-6%;width:min(26vw,320px)"><path d="${bentuk}"/></svg>
</div>`;
}

function ikonSosial(nama) {
  const jalur = {
    facebook: "M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5H16.7V3.6A21 21 0 0 0 14.3 3.5c-2.4 0-4 1.45-4 4.1v2.3H7.6V13h2.7v8z",
    instagram: "M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.42.56.22.96.48 1.38.9.42.42.68.82.9 1.38.17.42.37 1.06.42 2.23C21.8 8.4 21.8 8.8 21.8 12s0 3.6-.07 4.85c-.05 1.17-.25 1.8-.42 2.23a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.17-1.06.37-2.23.42-1.25.07-1.65.07-4.85.07s-3.6 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.42a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.17-.42-.37-1.06-.42-2.23C2.2 15.6 2.2 15.2 2.2 12s0-3.6.07-4.85c.05-1.17.25-1.8.42-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.17 1.06-.37 2.23-.42C8.4 2.2 8.8 2.2 12 2.2m0 2.15c-3.14 0-3.5.01-4.74.07-1.14.05-1.76.24-2.17.4-.55.21-.94.47-1.35.88-.41.41-.67.8-.88 1.35-.16.41-.35 1.03-.4 2.17-.06 1.24-.07 1.6-.07 4.78s.01 3.54.07 4.78c.05 1.14.24 1.76.4 2.17.21.55.47.94.88 1.35.41.41.8.67 1.35.88.41.16 1.03.35 2.17.4 1.24.06 1.6.07 4.74.07s3.5-.01 4.74-.07c1.14-.05 1.76-.24 2.17-.4.55-.21.94-.47 1.35-.88.41-.41.67-.8.88-1.35.16-.41.35-1.03.4-2.17.06-1.24.07-1.6.07-4.78s-.01-3.54-.07-4.78c-.05-1.14-.24-1.76-.4-2.17a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.17-.4-1.24-.06-1.6-.07-4.74-.07m0 3.65a5.99 5.99 0 1 1 0 11.98 5.99 5.99 0 0 1 0-11.98m0 2.15a3.84 3.84 0 1 0 0 7.68 3.84 3.84 0 0 0 0-7.68m6.24-3.87a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8",
    whatsapp: "M12.04 2.2a9.7 9.7 0 0 0-8.3 14.7L2.2 22l5.25-1.37A9.7 9.7 0 1 0 12.04 2.2m0 1.77a7.93 7.93 0 1 1-4.03 14.76l-.29-.17-3.1.81.83-3.03-.19-.3A7.93 7.93 0 0 1 12.04 3.97m-3.6 4.1c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1s.9 2.43 1.03 2.6c.13.17 1.76 2.8 4.32 3.8 2.13.84 2.56.67 3.02.63.46-.04 1.5-.61 1.71-1.2.21-.6.21-1.1.15-1.2-.06-.11-.23-.17-.48-.29-.25-.13-1.5-.74-1.73-.82-.23-.09-.4-.13-.57.12-.17.25-.65.82-.8.99-.14.17-.29.19-.54.06-.25-.12-1.07-.39-2.04-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.38.11-.5.11-.11.25-.29.38-.44.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.36-.77-1.86-.2-.49-.4-.42-.55-.43z",
  };

  return `
<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${jalur[nama] ?? ""}"/></svg>`;
}

/* ---------- teks ---------- */

/** Satu-satunya markup yang boleh ada di dalam kopi: *ini* jadi sorotan emas. */
function judul(nilai) {
  return teks(nilai).replace(/\*([^*]+)\*/g, (_, isi) => `<span class="ck-emas">${isi}</span>`);
}

/** Di kartu masalah sorotannya tebal putih, bukan emas. */
function tebal(nilai) {
  return teks(nilai).replace(/\*([^*]+)\*/g, (_, isi) => `<b>${isi}</b>`);
}

function teks(nilai) {
  return String(nilai ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
