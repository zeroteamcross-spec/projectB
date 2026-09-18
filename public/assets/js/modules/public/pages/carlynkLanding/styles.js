/**
 * Gaya landing Carlynk.
 *
 * Semuanya dibatasi ke #carlynk_landing_root supaya tidak bocor ke rute lain,
 * kecuali latar dokumen yang dipasang lewat kelas KELAS_AKTIF dan dilepas lagi
 * saat landing di-unmount.
 *
 * Warna dan ukuran duduk sebagai variabel di satu blok paling atas. Mengganti
 * tema berarti mengganti belasan baris di sana, bukan menyisir selektor --
 * pelajaran dari landing sebelumnya yang menaruh setiap warna sebagai
 * style="..." di dalam string HTML.
 *
 * Nilai warnanya diambil dengan mencuplik piksel dari PDF desain, bukan
 * ditaksir dari layar.
 */

export const KELAS_AKTIF = "carlynk-landing-active";

const ID_GAYA = "carlynk_landing_style";
const ID_FONT = "carlynk_landing_font";
const ID_PRAKONEKSI = "carlynk_landing_font_preconnect";

// Plus Jakarta Sans, sesuai metadata font di PDF desain. Hanya empat berat
// yang benar-benar dipakai: 400 badan, 500 label, 700 judul kartu, 800 judul
// bagian.
const URL_FONT = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap";
const HOST_FONT = ["https://fonts.googleapis.com", "https://fonts.gstatic.com"];

const CSS = `
#carlynk_landing_root{
  --ck-teal:#004950;
  --ck-teal-judul:#006069;
  --ck-teal-terang:#00707a;
  --ck-emas:#b09b77;
  --ck-emas-tombol:#bda67e;
  --ck-emas-band:#9a886a;
  --ck-langit-1:#f3fafc;
  --ck-langit-2:#eaf5f9;
  --ck-kartu:#fbfdfe;
  --ck-kartu-gelap:#002023;
  --ck-abu:#cccccc;
  --ck-tinta:#16211f;
  --ck-tinta-lembut:#4a5a58;
  --ck-garis:#d8e7ea;
  --ck-lajur:1160px;
  --ck-nav:104px;
  /* Tempat tepi lurus bidang putih berhenti dan bajinya mulai.

     Dihitung mundur dari tepi kanan lajur isi, bukan sebagai persentase lebar
     layar: yang harus tetap adalah jarak lengkung ke tombol Daftar, dan tombol
     itu menempel di kanan lajur. Kalau dipatok dari kiri, jaraknya menyempit
     sendiri begitu layar melebar.

     --ck-nav-kanan menampung padding lajur, lebar dua tombol, dan jarak
     lengkung ke tombol. Lebar bajinya sendiri lahir dari tinggi navbar
     (86,5% tinggi pita putih, dikali perbandingan 308/318). */
  --ck-nav-kanan:294px;
  --ck-nav-belok:calc(
    min(100%,calc(50% + var(--ck-lajur) / 2)) - var(--ck-nav-kanan) - var(--ck-nav) * .837
  );

  color:var(--ck-tinta);
  font-family:"Plus Jakarta Sans",system-ui,-apple-system,Segoe UI,sans-serif;
  -webkit-font-smoothing:antialiased;
  background:var(--ck-langit-1);
}
#carlynk_landing_root,#carlynk_landing_root *{box-sizing:border-box}
#carlynk_landing_root img{max-width:100%;display:block}
#carlynk_landing_root a{text-decoration:none;color:inherit}
#carlynk_landing_root ::selection{background:var(--ck-teal-judul);color:#fff}
html.${KELAS_AKTIF}{scroll-behavior:smooth}
body.${KELAS_AKTIF}{background:#f3fafc;overflow-x:clip}

#carlynk_landing_root .ck-lajur{max-width:var(--ck-lajur);margin:0 auto;padding:0 24px}
#carlynk_landing_root .ck-emas{color:var(--ck-emas)}

/* --- Tipografi -------------------------------------------------------
   Ukuran memakai clamp karena desainnya berproporsi A4: kalau judulnya
   diskalakan lurus terhadap lebar, di layar lebar jadi raksasa dan di HP
   jadi tidak terbaca. */
#carlynk_landing_root h1,#carlynk_landing_root h2,#carlynk_landing_root h3{
  margin:0;font-weight:800;letter-spacing:-.02em;line-height:1.14;color:var(--ck-teal-judul);
}
#carlynk_landing_root h1{font-size:clamp(32px,4.2vw,56px)}
#carlynk_landing_root h2{font-size:clamp(26px,3.6vw,44px)}
#carlynk_landing_root h3{font-size:clamp(19px,1.8vw,26px);font-weight:700;line-height:1.25}
#carlynk_landing_root p{margin:0;line-height:1.62}

/* --- Tombol ---------------------------------------------------------- */
#carlynk_landing_root .ck-tombol{
  display:inline-flex;align-items:center;justify-content:center;gap:10px;
  font-weight:700;font-size:15.5px;line-height:1;
  padding:16px 26px;border-radius:8px;border:1px solid transparent;
  transition:transform .14s ease,box-shadow .28s ease,background .22s ease,color .22s ease;
  cursor:pointer;white-space:nowrap;
}
#carlynk_landing_root .ck-tombol:active{transform:translateY(1px)}
#carlynk_landing_root .ck-tombol--emas{background:var(--ck-emas-tombol);color:#fff;box-shadow:0 10px 26px rgba(176,155,119,.34)}
#carlynk_landing_root .ck-tombol--emas:hover{background:#c9b28a;box-shadow:0 16px 36px rgba(176,155,119,.46)}
#carlynk_landing_root .ck-tombol--abu{background:var(--ck-abu);color:#5c5c5c}
#carlynk_landing_root .ck-tombol--abu:hover{background:#dcdcdc;color:#3f3f3f}
#carlynk_landing_root .ck-tombol--teal{background:var(--ck-teal);color:#fff;box-shadow:0 10px 26px rgba(0,73,80,.3)}
#carlynk_landing_root .ck-tombol--teal:hover{background:var(--ck-teal-terang);box-shadow:0 16px 36px rgba(0,73,80,.42)}
#carlynk_landing_root .ck-tombol--putih{background:#fff;color:var(--ck-teal-judul)}
#carlynk_landing_root .ck-tombol--putih:hover{background:#eaf5f9}

/* --- Navbar ----------------------------------------------------------
   Pita teal memakai foto showroom yang sudah ditint, dan bidang putihnya
   adalah satu SVG selebar header dengan preserveAspectRatio="none" supaya
   lengkungnya ikut melar mengikuti lebar layar. Dicoba dengan border-radius
   lebih dulu, tapi tepi kanannya bukan busur tunggal. */
#carlynk_landing_root .ck-nav{
  position:sticky;top:0;z-index:70;height:var(--ck-nav);
  background:var(--ck-latar,none) var(--ck-teal) center/cover no-repeat;
  transition:height .28s ease;
}
/* Kotak putih dan bajinya.

   Lebar kotak diukur dari tepi kanan lajur isi, bukan tepi layar: tombol
   Daftar/Masuk berhenti di situ juga, jadi keduanya tidak saling kejar
   berapa pun lebar layarnya -- tanpa itu putihnya terus melar dan menelan
   tombol di 1920 px ke atas.

   Baji lengkungnya tidak ikut melar. Tingginya mengikuti navbar, lebarnya
   lahir dari aspect-ratio, jadi perbandingan aslinya terjaga. Itu pokok
   soalnya: dulu baji dan kotak jadi satu SVG yang dibentangkan, dan
   lengkungnya terbaca melar. */
#carlynk_landing_root .ck-nav__putih,
#carlynk_landing_root .ck-nav__lengkung{
  position:absolute;top:13.5%;bottom:0;pointer-events:none;
}
#carlynk_landing_root .ck-nav__putih{
  left:0;width:var(--ck-nav-belok);background:#fff;
}
/* Tingginya dipatok, lebarnya dibiarkan lahir dari aspect-ratio. Dipasang
   dengan top+bottom sekaligus, peramban justru menghitung lebarnya dulu
   (mengisi sampai tepi kanan) lalu tingginya ikut aspect-ratio -- bajinya
   membengkak jadi 731 px. */
#carlynk_landing_root .ck-nav__lengkung{
  left:var(--ck-nav-belok);bottom:auto;
  height:86.5%;width:auto;aspect-ratio:308 / 318;
}
#carlynk_landing_root .ck-nav__isi{
  position:relative;height:100%;display:flex;align-items:center;justify-content:space-between;gap:24px;
}
#carlynk_landing_root .ck-nav__logo{height:clamp(30px,3.4vw,50px);width:auto}
#carlynk_landing_root .ck-nav__aksi{display:flex;align-items:center;gap:12px}
#carlynk_landing_root .ck-nav .ck-tombol{padding:13px 30px;font-size:15px}
#carlynk_landing_root .ck-nav--kecil{--ck-nav:74px}

/* --- Hero ------------------------------------------------------------ */
#carlynk_landing_root .ck-hero{
  background:linear-gradient(118deg,var(--ck-langit-1) 0%,var(--ck-langit-2) 55%,#e4f2f7 100%);
  padding:clamp(40px,5vw,72px) 0 clamp(48px,6vw,88px);
}
#carlynk_landing_root .ck-hero__kisi{
  display:grid;grid-template-columns:minmax(0,1.32fr) minmax(0,1fr);
  gap:clamp(24px,4vw,56px);align-items:center;
}
#carlynk_landing_root .ck-hero__teks{display:grid;gap:22px;justify-items:start}
#carlynk_landing_root .ck-hero__deskripsi{font-size:clamp(15px,1.25vw,18px);color:var(--ck-tinta);max-width:30em}
#carlynk_landing_root .ck-hero__aksi{display:flex;flex-wrap:wrap;gap:14px}
#carlynk_landing_root .ck-hero__gambar{width:100%;height:auto;filter:drop-shadow(0 30px 60px rgba(0,73,80,.16))}

/* --- Bagian masalah --------------------------------------------------- */
#carlynk_landing_root .ck-masalah{
  position:relative;background:var(--ck-latar,none) var(--ck-teal) center/cover no-repeat;
  padding:clamp(52px,6vw,86px) 0 clamp(44px,5vw,72px);color:#fff;
}
#carlynk_landing_root .ck-masalah h2{color:#fff;text-align:center;max-width:18em;margin:0 auto}
#carlynk_landing_root .ck-masalah__subjudul{
  text-align:center;margin-top:16px;font-weight:700;font-size:clamp(14px,1.2vw,17px);color:rgba(255,255,255,.9);
}
#carlynk_landing_root .ck-masalah__kartu{
  position:relative;overflow:hidden;border-radius:18px;background:var(--ck-kartu-gelap);
  min-height:250px;display:flex;align-items:flex-start;
}
#carlynk_landing_root .ck-masalah__kartu p{
  position:relative;z-index:2;padding:30px 30px 30px;max-width:62%;
  font-size:clamp(14.5px,1.15vw,17px);color:rgba(255,255,255,.92);
}
#carlynk_landing_root .ck-masalah__kartu p b{color:#fff;font-weight:700}
#carlynk_landing_root .ck-masalah__foto{
  position:absolute;right:0;bottom:0;height:100%;width:auto;max-width:none;
  object-fit:contain;object-position:bottom right;z-index:1;
}

/* --- Bagian fitur ----------------------------------------------------- */
#carlynk_landing_root .ck-fitur{
  background:linear-gradient(180deg,var(--ck-langit-2),var(--ck-langit-1));
  padding:clamp(52px,6vw,88px) 0 clamp(40px,5vw,64px);
}
#carlynk_landing_root .ck-fitur h2{text-align:center;max-width:20em;margin:0 auto}
#carlynk_landing_root .ck-fitur__kartu{
  display:flex;gap:22px;align-items:flex-start;
  background:var(--ck-kartu);border:1px solid rgba(176,155,119,.45);border-radius:16px;
  padding:22px 26px;box-shadow:0 12px 30px rgba(0,73,80,.05);
}
#carlynk_landing_root .ck-fitur__ikon{width:clamp(56px,5vw,76px);height:auto;flex:none}
#carlynk_landing_root .ck-fitur__kartu p{margin-top:6px;font-size:clamp(14.5px,1.15vw,17px);color:var(--ck-tinta)}

/* --- Kenapa Carlynk ----------------------------------------------------
   Blob dan kotak teal di sisi kiri digambar di sini, bukan diambil dari
   desain: di PDF bentuk-bentuk itu menempel jadi satu bitmap dengan orangnya. */
#carlynk_landing_root .ck-kenapa{position:relative;overflow:hidden;background:var(--ck-langit-1);padding:clamp(40px,5vw,64px) 0 0}
#carlynk_landing_root .ck-kenapa__kisi{
  position:relative;z-index:2;display:grid;
  grid-template-columns:minmax(0,.46fr) minmax(0,.54fr);
  gap:clamp(20px,3vw,44px);align-items:end;
}
/* Judulnya duduk di pojok kiri-atas lajur dan orangnya di sebelah kanannya,
   persis seperti desain. Ditumpuk lewat position:absolute, bukan didorong
   dengan margin, supaya tinggi lajur tetap ditentukan fotonya saja. */
#carlynk_landing_root .ck-kenapa__kiri{position:relative}
#carlynk_landing_root .ck-kenapa__kiri h2{position:absolute;top:0;left:0;z-index:2;max-width:5.4em}
#carlynk_landing_root .ck-kenapa__foto{width:100%;height:auto;display:block}
#carlynk_landing_root .ck-kenapa__poin{display:grid;gap:16px;padding-bottom:clamp(28px,4vw,56px)}
#carlynk_landing_root .ck-kenapa__poin li{
  list-style:none;background:var(--ck-kartu);border:1px solid var(--ck-garis);
  border-radius:14px;padding:18px 22px;box-shadow:0 10px 26px rgba(0,73,80,.04);
}
#carlynk_landing_root .ck-kenapa__poin p{margin-top:5px;font-size:clamp(14px,1.1vw,16.5px);color:var(--ck-tinta)}
#carlynk_landing_root .ck-kenapa__hias{position:absolute;left:0;bottom:0;z-index:1;pointer-events:none}
#carlynk_landing_root .ck-kenapa__busur{
  width:clamp(220px,26vw,420px);aspect-ratio:1;border-radius:50%;
  border:clamp(30px,3.4vw,54px) solid var(--ck-teal);
  transform:translate(-42%,34%);
}
#carlynk_landing_root .ck-kenapa__kotak{
  position:absolute;left:clamp(96px,11vw,176px);bottom:0;
  width:clamp(52px,6vw,96px);aspect-ratio:1;background:var(--ck-teal);
}

/* --- Testimoni -------------------------------------------------------- */
#carlynk_landing_root .ck-testimoni{position:relative;overflow:hidden;background:var(--ck-langit-1);padding:clamp(48px,6vw,80px) 0}
#carlynk_landing_root .ck-testimoni h2{text-align:center}
#carlynk_landing_root .ck-testimoni__bintang{display:flex;justify-content:center;gap:6px;margin-top:14px}
#carlynk_landing_root .ck-testimoni__bintang svg{width:clamp(20px,2vw,28px);height:auto;fill:var(--ck-emas)}
#carlynk_landing_root .ck-testimoni__latar{position:absolute;inset:0;z-index:0;pointer-events:none}
#carlynk_landing_root .ck-testimoni__latar svg{position:absolute;fill:var(--ck-emas);opacity:.22}
#carlynk_landing_root .ck-testimoni__kartu{
  position:relative;background:var(--ck-kartu);border:1px solid rgba(176,155,119,.4);
  border-radius:14px;padding:70px 26px 28px;text-align:center;
  box-shadow:0 14px 34px rgba(0,73,80,.05);margin-top:56px;
}
#carlynk_landing_root .ck-testimoni__foto{
  position:absolute;top:-56px;left:50%;transform:translateX(-50%);
  width:112px;height:112px;border-radius:50%;object-fit:cover;
  border:5px solid #fff;box-shadow:0 10px 24px rgba(0,73,80,.16);
}
#carlynk_landing_root .ck-testimoni__kutipan{font-size:clamp(14.5px,1.15vw,17px);color:var(--ck-tinta)}
#carlynk_landing_root .ck-testimoni__nama{margin-top:14px;font-weight:700;color:var(--ck-tinta)}
#carlynk_landing_root .ck-testimoni__jabatan{color:var(--ck-tinta-lembut);font-size:15px}

/* --- Partner ---------------------------------------------------------- */
#carlynk_landing_root .ck-partner{
  background:var(--ck-latar,none) var(--ck-emas-band) center/cover no-repeat;
  padding:clamp(28px,3.4vw,44px) 0;text-align:center;
}
#carlynk_landing_root .ck-partner__label{
  color:#fff;font-weight:500;letter-spacing:.42em;text-transform:uppercase;
  font-size:clamp(12px,1.1vw,15px);
}
#carlynk_landing_root .ck-partner__daftar{
  display:flex;flex-wrap:wrap;align-items:center;justify-content:space-around;
  gap:clamp(20px,4vw,56px);margin-top:clamp(18px,2.4vw,30px);
}
#carlynk_landing_root .ck-partner__daftar img{height:clamp(44px,6.4vw,92px);width:auto}
#carlynk_landing_root .ck-partner__teks{
  color:#fff;font-weight:800;font-size:clamp(20px,2.4vw,34px);line-height:1.05;
  letter-spacing:-.02em;text-transform:uppercase;
}

/* --- Penutup ---------------------------------------------------------- */
#carlynk_landing_root .ck-penutup{
  background:linear-gradient(180deg,var(--ck-langit-1),var(--ck-langit-2));
  padding:clamp(52px,6vw,86px) 0;text-align:center;
}
#carlynk_landing_root .ck-penutup h2{max-width:13em;margin:0 auto}
#carlynk_landing_root .ck-penutup p{margin:18px auto 0;max-width:34em;font-size:clamp(15px,1.2vw,17.5px)}
#carlynk_landing_root .ck-penutup__aksi{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:30px}

/* --- Footer ----------------------------------------------------------- */
#carlynk_landing_root .ck-footer{
  background:var(--ck-latar,none) var(--ck-teal) center/cover no-repeat;color:#fff;
  padding:clamp(34px,4vw,52px) 0;
}
#carlynk_landing_root .ck-footer__kisi{
  display:grid;grid-template-columns:minmax(0,1.3fr) repeat(2,minmax(0,1fr)) minmax(0,1.1fr);
  gap:clamp(20px,3vw,40px);align-items:start;
}
#carlynk_landing_root .ck-footer__logo{height:clamp(30px,2.6vw,42px);width:auto}
#carlynk_landing_root .ck-footer__kolom{display:grid;gap:10px;font-weight:700;font-size:15px}
#carlynk_landing_root .ck-footer__kolom a{opacity:.92;transition:opacity .2s ease}
#carlynk_landing_root .ck-footer__kolom a:hover{opacity:1;text-decoration:underline}
#carlynk_landing_root .ck-footer__sosial{display:flex;gap:12px}
#carlynk_landing_root .ck-footer__sosial a{
  width:34px;height:34px;border-radius:50%;background:#fff;color:var(--ck-teal);
  display:grid;place-items:center;transition:transform .2s ease;
}
#carlynk_landing_root .ck-footer__sosial a:hover{transform:translateY(-2px)}
#carlynk_landing_root .ck-footer__sosial svg{width:19px;height:19px;fill:currentColor}
#carlynk_landing_root .ck-footer__hak{margin-top:16px;font-size:14.5px;opacity:.88}

/* --- Korsel -----------------------------------------------------------
   Satu slide berisi sepasang kartu. Titik dan panah hanya dirender kalau
   slide-nya lebih dari satu, jadi selama konten slide kedua belum datang
   tampilannya persis seperti bagian statis biasa. */
#carlynk_landing_root .ck-korsel{margin-top:clamp(24px,3vw,40px)}
#carlynk_landing_root .ck-korsel__bingkai{overflow:hidden}
#carlynk_landing_root .ck-korsel__rel{
  display:flex;transition:transform .5s cubic-bezier(.22,.9,.28,1);will-change:transform;
}
#carlynk_landing_root .ck-korsel__slide{
  flex:0 0 100%;min-width:100%;
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(16px,2vw,28px);
  align-items:stretch;
}
#carlynk_landing_root .ck-korsel__titik{display:flex;justify-content:center;gap:9px;margin-top:26px}
#carlynk_landing_root .ck-korsel__titik button{
  width:9px;height:9px;padding:0;border:0;border-radius:50%;cursor:pointer;
  background:rgba(0,73,80,.24);transition:background .22s ease,transform .22s ease;
}
#carlynk_landing_root .ck-korsel__titik button[aria-current="true"]{background:var(--ck-teal);transform:scale(1.25)}
#carlynk_landing_root .ck-korsel--gelap .ck-korsel__titik button{background:rgba(255,255,255,.34)}
#carlynk_landing_root .ck-korsel--gelap .ck-korsel__titik button[aria-current="true"]{background:#fff}
#carlynk_landing_root .ck-korsel__panah{
  position:absolute;top:50%;transform:translateY(-50%);z-index:3;
  width:42px;height:42px;border-radius:50%;border:0;cursor:pointer;
  background:rgba(255,255,255,.9);color:var(--ck-teal);
  display:grid;place-items:center;box-shadow:0 8px 20px rgba(0,73,80,.14);
  transition:background .2s ease,transform .2s ease;
}
#carlynk_landing_root .ck-korsel__panah:hover{background:#fff;transform:translateY(-50%) scale(1.06)}
#carlynk_landing_root .ck-korsel__panah--kiri{left:-8px}
#carlynk_landing_root .ck-korsel__panah--kanan{right:-8px}
#carlynk_landing_root .ck-korsel__panah svg{width:17px;height:17px;fill:currentColor}
#carlynk_landing_root .ck-korsel--berpanah{position:relative}

/* --- Animasi masuk ---------------------------------------------------- */
#carlynk_landing_root [data-reveal]{opacity:0;transform:translateY(24px)}
#carlynk_landing_root [data-reveal].ck-tampil{
  opacity:1;transform:none;
  transition:opacity .8s cubic-bezier(.22,.9,.28,1),transform .8s cubic-bezier(.22,.9,.28,1);
}

@media (prefers-reduced-motion:reduce){
  #carlynk_landing_root *,#carlynk_landing_root *::before,#carlynk_landing_root *::after{
    animation-duration:.01ms !important;transition-duration:.01ms !important;
  }
  #carlynk_landing_root [data-reveal]{opacity:1;transform:none}
}

@media (max-width:1024px){
  #carlynk_landing_root{--ck-nav:88px}
  #carlynk_landing_root .ck-nav--kecil{--ck-nav:70px}
  #carlynk_landing_root .ck-hero__kisi{grid-template-columns:1fr;gap:28px}
  #carlynk_landing_root .ck-hero__gambar{max-width:540px;margin:0 auto}
  #carlynk_landing_root .ck-kenapa__kisi{grid-template-columns:1fr;align-items:start}
  /* Di layar sempit tidak ada ruang kosong di samping orangnya, jadi judulnya
     kembali mengalir di atas foto. */
  #carlynk_landing_root .ck-kenapa__kiri{display:grid;gap:16px}
  #carlynk_landing_root .ck-kenapa__kiri h2{position:static;max-width:none}
  #carlynk_landing_root .ck-kenapa__foto{max-width:420px;margin:0 auto}
  #carlynk_landing_root .ck-kenapa__poin{padding-bottom:36px}
  #carlynk_landing_root .ck-footer__kisi{grid-template-columns:repeat(2,minmax(0,1fr));gap:28px}
}

/* Di bawah 355 px lengkungnya sudah tidak mungkin: menyeberang dari 56% ke
   67% lebar butuh 39 px, dan logo beserta dua tombol sudah menghabiskan
   seluruh baris. Daripada memaksakannya sampai saling tindih, pitanya dibuat
   putih polos. Tombol Masuk yang tadinya putih di atas teal diberi garis tepi
   supaya tetap terbaca. */
@media (max-width:355px){
  #carlynk_landing_root .ck-nav{background:#fff}
  #carlynk_landing_root .ck-nav__putih,
  #carlynk_landing_root .ck-nav__lengkung{display:none}
  #carlynk_landing_root .ck-nav__logo{height:22px}
  #carlynk_landing_root .ck-tombol--putih{border-color:var(--ck-teal-judul)}
}

@media (max-width:680px){
  #carlynk_landing_root{--ck-nav:72px}
  #carlynk_landing_root .ck-nav--kecil{--ck-nav:62px}
  /* Lengkungnya memakan 11% lebar untuk menyeberang dari 56% ke 67%. Di 390 px
     itu 43 px yang tidak boleh ditempati logo maupun tombol, dan ketiganya
     tidak muat. Jadi di sini bidang putihnya dipersempit, logonya dikecilkan,
     dan tombolnya dirapatkan -- ketiganya sekaligus. Menyempitkan yang putih
     saja membuat ekor logo jatuh di atas teal dan hilang, karena warnanya
     sama. */
  #carlynk_landing_root{--ck-nav-kanan:193px}
  #carlynk_landing_root .ck-nav__logo{height:clamp(25px,4.4vw,34px)}
  #carlynk_landing_root .ck-nav__aksi{gap:8px}
  #carlynk_landing_root .ck-lajur{padding:0 18px}
  #carlynk_landing_root .ck-nav .ck-tombol{padding:9px 14px;font-size:13px}
  #carlynk_landing_root .ck-korsel__slide{grid-template-columns:1fr;gap:16px}
  #carlynk_landing_root .ck-masalah__kartu{min-height:0}
  #carlynk_landing_root .ck-masalah__kartu p{max-width:58%;padding:22px 20px}
  #carlynk_landing_root .ck-fitur__kartu{gap:16px;padding:18px}
  #carlynk_landing_root .ck-hero__aksi .ck-tombol{flex:1 1 auto}
  #carlynk_landing_root .ck-footer__kisi{grid-template-columns:1fr;text-align:left}
  #carlynk_landing_root .ck-korsel__panah{display:none}
}

/* Baji lengkungnya memakan 60 px yang tidak boleh ditempati apa pun. Di lebar
   ini logo dan dua tombol sudah menghabiskan barisnya, jadi keduanya
   dirapatkan lagi -- kalau tidak, logo jatuh di atas teal dan tombol Daftar
   tertindih lengkungnya. */
@media (max-width:420px){
  /* Di lebar ini menghitung mundur dari kanan membuat belok jatuh di kiri
     logo. Diambil sebagai rasio lebar saja, lalu logo dan tombol dirapatkan
     supaya tetap muat. */
  #carlynk_landing_root{--ck-nav-belok:calc(100% * .40)}
  #carlynk_landing_root .ck-nav__logo{height:22px}
  #carlynk_landing_root .ck-nav__aksi{gap:6px}
  #carlynk_landing_root .ck-nav .ck-tombol{padding:8px 11px;font-size:12.5px}
}
`;

export function pasangGaya() {
  if (!document.getElementById(ID_GAYA)) {
    const gaya = document.createElement("style");
    gaya.id = ID_GAYA;
    gaya.textContent = CSS;
    document.head.append(gaya);
  }

  // Berkas woff2 duduk di host kedua yang baru diketahui setelah CSS-nya
  // selesai diunduh. Prakoneksi menjalankan DNS dan TLS-nya lebih awal.
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
