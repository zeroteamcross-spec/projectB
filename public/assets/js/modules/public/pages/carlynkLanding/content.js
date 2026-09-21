/**
 * Seluruh kalimat, tautan, dan aset landing Carlynk.
 *
 * Dipisah dari markup supaya mengubah kopi tidak berarti mengubah HTML.
 * Landing sebelumnya menaruh teks langsung di dalam string markup 30 KB, dan
 * mengganti satu headline berarti menyisir tag.
 *
 * Penanda *bintang* pada judul menjadi sorotan emas. Itu satu-satunya markup
 * yang boleh ada di dalam teks; sisanya di-escape.
 */

/**
 * Alamat dasar gambar landing.
 *
 * Tidak boleh ditulis absolut. Aset frontend disajikan lewat jalur berprefiks
 * versi (assets/v-<token>/...) supaya peramban boleh menyimpannya selamanya,
 * dan jalur absolut lolos dari prefiks itu -- gambarnya akan terus disajikan
 * dari cache lama walau berkasnya sudah diganti, tanpa gejala apa pun.
 *
 * Jalur relatif juga tidak menyelesaikan masalahnya: atribut src di dalam
 * innerHTML diselesaikan terhadap URL dokumen, bukan URL modul, jadi ikut
 * rusak begitu pengunjung mendarat di rute berlapis seperti /s/<slug>.
 *
 * Yang benar menurunkannya dari URL modul ini sendiri, yang sudah membawa
 * tokennya. Yang dicari prefiksnya, bukan kedalaman foldernya, jadi tetap
 * benar baik saat modul dimuat apa adanya maupun setelah dibundel esbuild --
 * keduanya menaruh berkas di bawah folder aset yang sama.
 */
const ASET = `${/^(.*\/assets\/(?:v-[^/]+\/)?)/.exec(import.meta.url)?.[1] ?? ""}images/landing/`;

/**
 * Bagian bergulir dibentuk sebagai daftar slide, bukan daftar kartu.
 *
 * Desainnya memperlihatkan tiga titik tapi hanya menyertakan slide pertama --
 * slide kedua dan ketiga menyusul. Satu slide berisi sepasang kartu, persis
 * seperti yang tergambar. Selama daftarnya cuma berisi satu slide, titik dan
 * panahnya tidak dirender sama sekali; begitu slide kedua ditambahkan di sini,
 * kontrolnya muncul sendiri tanpa perlu menyentuh markup atau interaksi.
 */
export const KONTEN = Object.freeze({
  nav: {
    logoTeal: `${ASET}logo-carlynk-teal.webp`,
    logoPutih: `${ASET}logo-carlynk-putih.webp`,
    daftar: "Daftar",
    masuk: "Masuk",
  },

  hero: {
    judul: "Bikin Showroom Digital Profesional *Dalam Hitungan Menit*",
    deskripsi: "Kelola katalog, jangkau pembeli nasional serta terima DP otomatis dalam satu platform terpadu.",
    gambar: `${ASET}hero-showroom-digital.webp`,
    alt: "Katalog mobil showroom tampil di layar ponsel",
    tombolUtama: "Buat Showroom Sekarang",
    tombolKedua: "Demo Gratis",
  },

  masalah: {
    judul: "*Masih Mengandalkan* Jualan Mobil Hanya Lewat Media Sosial & Brosur?",
    subjudul: "Hambatan utama dalam meningkatkan omzet penjualan di era digital",
    latar: `${ASET}bg-showroom-teal.jpg`,
    slides: [
      [
        {
          teks: "Calon pembeli sering *bingung mencari stok* mobil yang masih ready karena *postingan tertimbun*.",
          gambar: `${ASET}masalah-bingung-cari-stok.webp`,
          alt: "Pembeli kebingungan mencari stok mobil",
        },
        {
          teks: "Harus *membalas chat satu per satu* untuk menanyakan spesifikasi, harga, atau kondisi unit.",
          gambar: `${ASET}masalah-balas-chat.webp`,
          alt: "Penjual membalas chat satu per satu",
        },
      ],
    ],
  },

  fitur: {
    judul: "Semua Fitur yang Dibutuhkan Showroom Mobil Anda Ada di Carlynk",
    slides: [
      [
        {
          ikon: `${ASET}ikon-katalog.webp`,
          judul: "Katalog Digital Interaktif & Real-Time",
          deskripsi: "Upload foto HD, detail spesifikasi, jarak tempuh (KM), status unit (Ready/Sold/Booked) dengan mudah.",
        },
        {
          ikon: `${ASET}ikon-pembayaran.webp`,
          judul: "Sistem Pembayaran & DP Otomatis",
          deskripsi: "Terima pembayaran DP/Tanda Jadi secara aman menggunakan Payment Gateway.",
        },
      ],
    ],
  },

  kenapa: {
    judul: "Kenapa Harus Carlynk?",
    gambar: `${ASET}kenapa-carlynk-orang.webp`,
    alt: "Pemilik showroom menunjukkan halaman Carlynk di ponsel",
    poin: [
      {
        judul: "Tanpa Perlu Coding / Keahlian IT",
        deskripsi: "Siapa pun bisa mengoperasikannya, upload unit semudah bikin status di media sosial.",
      },
      {
        judul: "Website Mobile-Friendly",
        deskripsi: "Didesain khusus agar nyaman dibuka di HP pembeli dengan koneksi apa saja.",
      },
      {
        judul: "Transaksi Transparan",
        deskripsi: "Meningkatkan kepercayaan (trust rate) pembeli luar kota untuk bertransaksi.",
      },
    ],
  },

  testimoni: {
    judul: "Review Jujur Pengguna Carlynk",
    bintang: 5,
    slides: [
      [
        {
          kutipan: "Dulu sering kehilangan pembeli luar kota karena ragu mau DP. Sekarang pakai Carlynk, showroom kelihatan jauh lebih profesional dan closing DP jadi lebih cepat.",
          nama: "Randy Utama",
          jabatan: "Owner AutoMobil, Jakarta",
          foto: `${ASET}testimoni-randy-utama.jpg`,
        },
        {
          kutipan: "Manajemen stok jadi rapi banget. Pembeli tinggal saya kasih link website, langsung bisa pilih unit, cek harga, dan langsung WhatsApp unit yang ditaksir.",
          nama: "Ridwan Widada",
          jabatan: "Owner GibranAuto, Solo",
          foto: `${ASET}testimoni-ridwan-widada.jpg`,
        },
      ],
    ],
  },

  partner: {
    label: "Our Partner",
    latar: `${ASET}bg-partner.jpg`,
    // Kacunk Motor tidak punya berkas logo. Di file desain namanya memang
    // diketik sebagai teks, bukan gambar, jadi di sini pun ditulis sebagai
    // teks sampai logonya ada.
    logo: [
      { nama: "KT88 Cars", gambar: `${ASET}partner-kt88cars.webp` },
      { nama: "Garasi.id", gambar: `${ASET}partner-garasi-id.webp` },
      { nama: "Kacunk Motor", gambar: "" },
    ],
  },

  penutup: {
    judul: "Siap Bikin Showroom Mobil Anda *Naik Kelas* dan *Jual Lebih Banyak* Unit?",
    deskripsi: "Bergabunglah dengan puluhan showroom digital lainnya di seluruh Indonesia sekarang.",
    tombolUtama: "Buat Showroom Sekarang",
    tombolKedua: "Chat Konsultasi",
  },

  footer: {
    latar: `${ASET}bg-footer.jpg`,
    kolom: [
      [
        { label: "Tentang Carlynk", kunci: "tentang" },
        { label: "Fitur", kunci: "fitur" },
        { label: "Harga", kunci: "harga" },
      ],
      [
        { label: "Demo Showroom", kunci: "demo" },
        { label: "Syarat & Ketentuan", kunci: "syarat" },
        { label: "Kebijakan Privasi", kunci: "privasi" },
      ],
    ],
    sosial: [
      { label: "Facebook", ikon: "facebook", kunci: "facebook" },
      { label: "Instagram", ikon: "instagram", kunci: "instagram" },
      { label: "WhatsApp", ikon: "whatsapp", kunci: "konsultasi" },
    ],
    hakCipta: "Copyright © 2026 Carlynk",
  },
});

/**
 * Tujuan setiap tautan.
 *
 * Yang halamannya sudah ada di aplikasi menunjuk ke rutenya. Sisanya --
 * harga, syarat, dan seterusnya -- belum punya halaman, jadi sementara
 * diarahkan ke WhatsApp supaya pengunjung tetap mendarat pada manusia, bukan
 * pada rute yang menjawab 404. Ganti nilainya di sini saat halamannya jadi.
 */
export function bangunRute(tautanWhatsapp = "") {
  const wa = tautanWhatsapp || "#";

  return Object.freeze({
    daftar: "#/daftar-showroom",
    masuk: "#/login/seller",
    demo: "#/contoh-katalog",
    konsultasi: wa,
    tentang: wa,
    fitur: "#fitur",
    harga: wa,
    syarat: wa,
    privasi: wa,
    facebook: wa,
    instagram: wa,
  });
}
