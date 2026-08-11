/**
 * Gaya landing, disalin dari blok <style> paket
 * "Carlynk Automotive SaaS Landing Page".
 *
 * Paket asli adalah halaman berdiri sendiri, jadi selektornya global (*, html,
 * body, a). Di dalam SPA itu akan bocor ke rute lain, maka semuanya dibatasi ke
 * #saas_landing_root, kecuali yang memang harus di tingkat dokumen: latar
 * halaman dan scroll-behavior, yang dipasang lewat kelas KELAS_AKTIF dan
 * dilepas lagi saat landing di-unmount.
 */

export const KELAS_AKTIF = "saas-landing-active";

const ID_GAYA = "saas_landing_style";
const ID_FONT = "saas_landing_font";
const ID_PRAKONEKSI = "saas_landing_font_preconnect";
// Sora 400 tidak dipakai di mana pun -- font itu cuma untuk judul, dan judul
// paling ringan di sini sudah 600. Satu berat dibuang berarti satu berkas
// woff2 lebih sedikit yang diunduh.
const URL_FONT = "https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap";
const HOST_FONT = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

const CSS = `
#saas_landing_root, #saas_landing_root *{box-sizing:border-box}
html.${KELAS_AKTIF}{scroll-behavior:smooth}
body.${KELAS_AKTIF}{background:#faf4ed;overflow-x:clip}
#saas_landing_root{color:#1c1917;font-family:"DM Sans",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
#saas_landing_root a{color:#1e81b0;text-decoration:none}
#saas_landing_root a:hover{color:#17698f}
#saas_landing_root ::selection{background:#1e81b0;color:#ffffff}

/* --- Tata letak lajur -------------------------------------------------
   Semua bagian isi memakai model yang sama dengan showcase 01/02/03: satu
   lajur konten menempel di salah satu sisi, sisi lain dibiarkan kosong
   supaya mobil dan panorama tetap terlihat sepanjang halaman. Sisi lajur
   berselang-seling, dan kamera diarahkan ke sisi yang kosong. */
#saas_landing_root [data-lajur]{max-width:1180px;margin:0 auto;padding:0 24px;display:flex}
#saas_landing_root [data-lajur="kiri"]{justify-content:flex-start}
#saas_landing_root [data-lajur="kanan"]{justify-content:flex-end}
#saas_landing_root [data-kolom]{width:min(600px,100%);display:grid;gap:30px;align-content:start}

/* Panel teks. Latar bagian dibuat tembus pandang, jadi keterbacaan teks
   ditopang panel ini, bukan lagi blok #faf4ed penuh selebar layar. */
#saas_landing_root [data-panel]{
  background:rgba(255,255,255,.62);
  -webkit-backdrop-filter:blur(18px);
  backdrop-filter:blur(18px);
  border:1px solid rgba(28,25,23,.09);
  border-radius:24px;
  padding:34px 32px 36px;
  box-shadow:0 30px 80px rgba(28,25,23,.12);
}
#saas_landing_root [data-pita]{background:rgba(255,255,255,.62);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
#saas_landing_root [data-kaki]{background:rgba(255,255,255,.78);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px)}

@keyframes pulseRing{0%{transform:scale(.9);opacity:.6}100%{transform:scale(2.2);opacity:0}}
@keyframes tick{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes barGrow{from{transform:scaleY(.12)}to{transform:scaleY(1)}}
@keyframes caret{0%,100%{opacity:1}50%{opacity:0}}
@media (prefers-reduced-motion:reduce){#saas_landing_root *{animation-duration:.01ms !important;transition-duration:.01ms !important}}
@media (max-width:760px){
  #saas_landing_root [data-navlinks]{display:none !important}
  #saas_landing_root [data-scrollhint]{display:none !important}
  #saas_landing_root [data-hero]{min-height:88vh !important;padding:56px 0 40px !important}
  #saas_landing_root [data-heromono]{gap:10px 18px !important;font-size:11px !important;margin-top:30px !important}
  #saas_landing_halaman,#saas_landing_listing,#saas_landing_marketing{padding:72px 0 20px !important}
  #saas_landing_daftar{padding:80px 0 72px !important}
  /* Tidak ada sisi kosong yang berarti di layar sempit, jadi lajur memenuhi
     lebar penuh. */
  #saas_landing_root [data-lajur]{justify-content:center !important}
  #saas_landing_root [data-kolom]{width:100% !important}
  #saas_landing_root [data-panel]{padding:26px 22px 28px !important}
}
`;

export function pasangGaya() {
  if (!document.getElementById(ID_GAYA)) {
    const gaya = document.createElement("style");
    gaya.id = ID_GAYA;
    gaya.textContent = CSS;
    document.head.append(gaya);
  }

  // Berkas woff2 duduk di host kedua (fonts.gstatic.com) yang baru diketahui
  // setelah CSS-nya selesai diunduh. Prakoneksi menjalankan DNS dan TLS-nya
  // lebih awal, jadi teks berhenti memakai font cadangan lebih cepat.
  if (!document.getElementById(ID_PRAKONEKSI)) {
    HOST_FONT.forEach((host, i) => {
      const tautan = document.createElement("link");
      if (i === 0) {
        tautan.id = ID_PRAKONEKSI;
      }
      tautan.rel = "preconnect";
      tautan.href = host;
      tautan.crossOrigin = "anonymous";
      document.head.append(tautan);
    });
  }

  // Font dimuat di sini, bukan di index.html, supaya rute lain tidak ikut
  // menunggu permintaan ke Google Fonts saat aplikasi boot.
  if (!document.getElementById(ID_FONT)) {
    const font = document.createElement("link");
    font.id = ID_FONT;
    font.rel = "stylesheet";
    font.href = URL_FONT;
    document.head.append(font);
  }

  document.documentElement.classList.add(KELAS_AKTIF);
  document.body.classList.add(KELAS_AKTIF);
}

export function lepasGaya() {
  document.documentElement.classList.remove(KELAS_AKTIF);
  document.body.classList.remove(KELAS_AKTIF);
}
