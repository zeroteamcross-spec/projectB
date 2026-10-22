import { createPageLifecycle } from "../../../core/lifecycle.js";
import { brandConfig } from "../../../theme/brandConfig.js";

const DOCUMENTS = Object.freeze({
  terms: {
    title: "Syarat & Ketentuan",
    summary: "Rancangan aturan penggunaan Carlynk untuk showroom, buyer, dan partner marketing.",
    sections: [
      {
        title: "1. Ruang lingkup layanan",
        paragraphs: [
          "Carlynk menyediakan platform digital untuk membantu showroom mengelola profil dan katalog kendaraan, serta membantu pengunjung menemukan informasi kendaraan dan menghubungi showroom. Fitur yang tersedia dapat berbeda menurut akun, paket, dan konfigurasi layanan.",
          "Rancangan ini belum menetapkan semua ketentuan komersial. Rincian harga, masa paket, biaya transaksi, booking fee, metode pembayaran, pembatalan, dan pengembalian dana perlu mengikuti informasi yang ditampilkan pada alur transaksi dan kesepakatan para pihak, serta ditinjau sebelum dokumen ini diberlakukan.",
        ],
      },
      {
        title: "2. Akun dan keamanan",
        paragraphs: [
          "Pengguna wajib memberikan informasi akun yang benar dan memperbaruinya jika berubah. Pengguna bertanggung jawab menjaga kerahasiaan kata sandi dan aktivitas yang dilakukan melalui akunnya, serta perlu segera melaporkan dugaan akses tanpa izin melalui kanal bantuan resmi Carlynk.",
          "Jangan membagikan kata sandi, kode verifikasi, atau kode sekali pakai kepada pihak lain, termasuk pihak yang mengaku sebagai petugas Carlynk.",
        ],
      },
      {
        title: "3. Tanggung jawab showroom dan informasi kendaraan",
        paragraphs: [
          "Showroom bertanggung jawab atas kewenangan untuk menawarkan kendaraan serta ketepatan, kelengkapan, dan pembaruan informasi pada profil, harga, spesifikasi, lokasi, status ketersediaan, foto, dan hasil inspeksi yang dipublikasikan.",
          "Showroom perlu memperbarui atau menurunkan listing yang sudah tidak tersedia. Informasi dan foto yang diunggah tidak boleh melanggar hak pihak lain atau memuat konten yang dilarang oleh hukum.",
        ],
      },
      {
        title: "4. Pembelian dan pembayaran",
        paragraphs: [
          "Buyer perlu memeriksa identitas showroom, kondisi kendaraan, rincian transaksi, dan instruksi pembayaran sebelum melanjutkan. Ketersediaan pembayaran otomatis, transfer manual, atau pencatatan pembayaran offline mengikuti pilihan yang tampil pada transaksi dan pengaturan layanan.",
          "Carlynk membantu menyediakan sarana digital untuk proses tersebut, tetapi tidak menggantikan pemeriksaan kendaraan, komunikasi, dan kesepakatan jual-beli antara buyer dan showroom. Jangan melakukan pembayaran berdasarkan instruksi yang tidak cocok dengan rincian transaksi yang sedang dibuka.",
        ],
      },
      {
        title: "5. Partner marketing dan referral",
        paragraphs: [
          "Partner marketing wajib menggunakan tautan referral secara wajar dan tidak boleh membuat klaim yang menyesatkan, memanipulasi kunjungan atau transaksi, atau menggunakan data orang lain tanpa dasar yang sesuai.",
          "Klik referral, prospek, transaksi, dan komisi merupakan metrik yang berbeda. Perhitungan dan kelayakan komisi mengikuti aturan yang ditampilkan pada layanan; kunjungan pada tautan saja tidak otomatis menjadi prospek atau komisi.",
        ],
      },
      {
        title: "6. Penggunaan yang tidak diperbolehkan",
        paragraphs: [
          "Pengguna tidak boleh mengganggu keamanan atau ketersediaan layanan, mengakses akun atau data tanpa izin, mengirim konten ilegal atau menyesatkan, melakukan spam atau manipulasi transaksi, maupun menggunakan Carlynk dengan cara yang melanggar hak pihak lain atau hukum yang berlaku.",
        ],
      },
      {
        title: "7. Ketersediaan dan perubahan layanan",
        paragraphs: [
          "Carlynk dapat memperbaiki, mengubah, atau membatasi fitur untuk pemeliharaan, keamanan, kepatuhan, atau peningkatan layanan. Perubahan material terhadap ketentuan ini perlu diumumkan melalui kanal Carlynk yang sesuai sebelum diberlakukan, dengan tetap memperhatikan hak pengguna dan aturan yang berlaku.",
        ],
      },
      {
        title: "8. Pertanyaan dan penyelesaian kendala",
        paragraphs: [
          "Jika ada pertanyaan mengenai layanan atau transaksi, pengguna dapat menghubungi pihak terkait melalui kanal bantuan yang tersedia di situs atau aplikasi. Perselisihan atas kondisi kendaraan dan kesepakatan jual-beli perlu terlebih dahulu dibahas oleh buyer dan showroom yang terlibat.",
        ],
      },
    ],
  },
  privacy: {
    title: "Kebijakan Privasi",
    summary: "Rancangan penjelasan mengenai data yang digunakan untuk menjalankan akun, katalog, transaksi, dan layanan Carlynk.",
    sections: [
      {
        title: "1. Status dan cakupan draf",
        paragraphs: [
          "Dokumen ini adalah draf untuk ditinjau, bukan pemberitahuan privasi final. Peran Carlynk dan showroom terhadap data pada setiap fitur, dasar pemrosesan, periode penyimpanan, alamat kontak privasi, dan pengaturan transfer data perlu dikonfirmasi terhadap praktik operasional sebelum kebijakan diberlakukan.",
          "Carlynk merancang layanan dengan memperhatikan peraturan pelindungan data pribadi yang berlaku, termasuk Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi. Penyebutan ini bukan pernyataan bahwa draf ini telah menjadi tinjauan atau nasihat hukum.",
        ],
      },
      {
        title: "2. Jenis data yang dapat diproses",
        paragraphs: [
          "Bergantung pada fitur yang digunakan, data dapat mencakup identitas dan kontak akun seperti nama, username, email, nomor telepon, serta peran akun; informasi showroom dan cabang; informasi kendaraan, foto, dan inspeksi; serta informasi yang diperlukan untuk pertanyaan, booking, transaksi, pembayaran, dan bukti transfer.",
          "Untuk fitur marketing, data juga dapat mencakup kode referral, catatan klik, transaksi yang terkait, dan ringkasan komisi. Sistem dapat memproses informasi teknis dasar seperti waktu akses, log keamanan, dan data sesi yang diperlukan agar layanan bekerja dan terlindungi.",
        ],
      },
      {
        title: "3. Tujuan penggunaan",
        paragraphs: [
          "Data digunakan sesuai kebutuhan untuk membuat dan mengamankan akun; mengelola profil showroom, cabang, kendaraan, dan inspeksi; menampilkan katalog; memfasilitasi komunikasi, booking, pembayaran, dan status transaksi; mengirim notifikasi; menghitung aktivitas referral dan komisi; menyediakan bantuan; mencegah penyalahgunaan; serta memenuhi kewajiban hukum yang berlaku.",
        ],
      },
      {
        title: "4. Akses dan pengungkapan kepada pihak lain",
        paragraphs: [
          "Informasi yang diperlukan untuk suatu transaksi dapat terlihat oleh showroom terkait dan buyer yang terlibat. Data juga dapat diproses oleh penyedia layanan pendukung—misalnya hosting, komunikasi, atau pemroses pembayaran—sebatas yang diperlukan untuk fungsi layanan, serta diungkapkan apabila diwajibkan oleh hukum atau proses yang sah.",
          "Rincian penyedia, lokasi pemrosesan, dan pembagian tanggung jawab antara Carlynk dan showroom masih perlu dikonfirmasi sebelum draf ini ditetapkan.",
        ],
      },
      {
        title: "5. Penyimpanan dan keamanan",
        paragraphs: [
          "Draf kebijakan ini belum menetapkan jangka waktu penyimpanan per kategori data. Penetapan akhir perlu mempertimbangkan tujuan pemrosesan, kebutuhan transaksi dan dukungan, keamanan, serta kewajiban hukum yang berlaku.",
          "Carlynk menerapkan kontrol operasional dan teknis untuk membantu menjaga data. Tidak ada penyimpanan atau pengiriman data melalui internet yang dapat dijanjikan bebas risiko sepenuhnya.",
        ],
      },
      {
        title: "6. Pilihan dan hak pengguna",
        paragraphs: [
          "Pengguna dapat memperbarui informasi profil melalui fitur akun yang tersedia. Pengguna juga dapat mengajukan pertanyaan atau permintaan terkait data pribadinya melalui kanal bantuan resmi Carlynk. Permintaan akan ditinjau sesuai identitas pemohon, konteks transaksi, dan ketentuan peraturan yang berlaku.",
          "Prosedur, verifikasi, waktu penanganan, dan alamat kontak khusus untuk permintaan privasi perlu ditetapkan sebelum kebijakan final diumumkan.",
        ],
      },
      {
        title: "7. Perubahan kebijakan",
        paragraphs: [
          "Jika draf ini disetujui dan diberlakukan, versi serta tanggal berlakunya perlu dicantumkan di halaman ini. Perubahan material akan diinformasikan melalui kanal Carlynk yang sesuai.",
        ],
      },
    ],
  },
});

export function LegalDocumentPage(type) {
  const document = DOCUMENTS[type] ?? DOCUMENTS.terms;
  let root = null;

  return createPageLifecycle({
    mount() {
      root = render(document, type);
      return root;
    },
    dispose() {
      root = null;
    },
  });
}

function render(document, type) {
  const page = documentNode("main", "min-h-[calc(100vh-4.5rem)] bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--pb-brand-primary)_12%,transparent),transparent_36%),linear-gradient(180deg,#f8fafc,#fff)] px-4 py-6 sm:px-6 sm:py-10");
  page.setAttribute("aria-labelledby", "legal_document_title");

  const frame = documentNode("div", "mx-auto grid w-full max-w-[960px] min-w-0 gap-5 sm:gap-6");
  const nav = documentNode("nav", "flex flex-wrap items-center justify-between gap-3");
  nav.setAttribute("aria-label", "Navigasi dokumen legal");
  nav.append(
    linkNode("/", brandConfig.appName || "Carlynk.id", "text-sm font-black text-slate-900 hover:text-[var(--pb-brand-secondary)]"),
    linkNode("/", "Kembali ke beranda", "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm hover:border-slate-400"),
  );

  const panel = documentNode("article", "grid min-w-0 gap-5 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:gap-6 sm:p-7 lg:p-9");
  const intro = documentNode("header", "grid min-w-0 gap-3");
  const draft = textNode("span", "Draf untuk ditinjau — belum berlaku", "w-fit max-w-full rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-800");
  const title = textNode("h1", document.title, "break-words text-2xl font-black leading-tight text-slate-950 sm:text-3xl");
  title.id = "legal_document_title";
  const summary = textNode("p", document.summary, "max-w-3xl text-sm leading-7 text-slate-600 sm:text-base");
  const status = textNode("p", "Tanggal berlaku belum ditetapkan. Naskah masih memerlukan tinjauan dan persetujuan sebelum digunakan sebagai ketentuan resmi.", "rounded-2xl border border-sky-100 bg-sky-50/70 p-3 text-xs leading-6 text-sky-900 sm:p-4 sm:text-sm");
  intro.append(draft, title, summary, status);

  const body = documentNode("div", "grid min-w-0 gap-3 sm:gap-4");
  document.sections.forEach((section, index) => {
    const article = documentNode("section", "grid min-w-0 gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5");
    article.setAttribute("aria-labelledby", `legal_section_${type}_${index + 1}`);
    const heading = textNode("h2", section.title, "break-words text-base font-black text-slate-900 sm:text-lg");
    heading.id = `legal_section_${type}_${index + 1}`;
    article.append(heading);
    section.paragraphs.forEach((paragraph) => article.append(textNode("p", paragraph, "break-words text-sm leading-7 text-slate-600")));
    body.append(article);
  });

  const switcher = documentNode("nav", "flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between");
  switcher.setAttribute("aria-label", "Dokumen legal lainnya");
  switcher.append(textNode("span", "Dokumen terkait", "text-xs font-bold text-slate-500"));
  const other = type === "terms"
    ? linkNode("/kebijakan-privasi", "Baca Kebijakan Privasi", "w-fit rounded-full bg-[var(--pb-brand-primary)] px-4 py-2.5 text-xs font-bold text-white hover:brightness-95")
    : linkNode("/syarat-ketentuan", "Baca Syarat & Ketentuan", "w-fit rounded-full bg-[var(--pb-brand-primary)] px-4 py-2.5 text-xs font-bold text-white hover:brightness-95");
  switcher.append(other);

  panel.append(intro, body, switcher);
  frame.append(nav, panel, textNode("p", "Draf ini disiapkan sebagai bahan peninjauan Carlynk dan belum menggantikan naskah final yang telah disetujui.", "mx-auto max-w-3xl text-center text-[11px] leading-6 text-slate-500"));
  page.append(frame);
  return page;
}

function documentNode(tag, className) {
  const node = window.document.createElement(tag);
  node.className = className;
  return node;
}

function textNode(tag, text, className) {
  const node = documentNode(tag, className);
  node.textContent = text;
  return node;
}

function linkNode(href, label, className) {
  const link = documentNode("a", className);
  link.href = href;
  link.textContent = label;
  return link;
}
