import { createPageLifecycle } from "../../../core/lifecycle.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { brandConfig } from "../../../theme/brandConfig.js";

const REPORT_DATE = "5 Oktober 2026";

const FINDINGS = Object.freeze([
  {
    id: "SEC-001",
    severity: "Tinggi",
    severityClass: "border-red-200 bg-red-50 text-red-700",
    title: "Endpoint cron internal dapat dipanggil tanpa autentikasi",
    summary: "Dua endpoint operasional untuk expiry transaksi dan suspend showroom dapat dijangkau dari internet tanpa secret, IP allowlist, atau middleware autentikasi.",
    evidence: "Probe produksi terkontrol menerima respons 422 dari /api/internal/cron/transactions/expire dan 200 dari /api/internal/cron/showrooms/suspend-overdue.",
    impact: "Pihak luar dapat memicu proses administratif yang seharusnya hanya dijalankan scheduler server.",
    recommendation: "Lindungi endpoint dengan secret yang hanya tersedia di scheduler atau allowlist IP, ubah menjadi POST, dan pastikan proses idempotent.",
  },
  {
    id: "SEC-002",
    severity: "Sedang",
    severityClass: "border-amber-200 bg-amber-50 text-amber-700",
    title: "Cookie remember_me belum memiliki atribut Secure",
    summary: "Cookie sesi jangka panjang sudah HttpOnly dan SameSite=Lax, tetapi produksi masih mengirimkannya tanpa atribut Secure.",
    evidence: "Set-Cookie pada login showroom menggunakan Domain=.carlynk.id; HttpOnly; SameSite=Lax tanpa Secure.",
    impact: "Cookie lebih rentan terkirim melalui koneksi HTTP apabila ada downgrade atau akses host yang tidak memaksa HTTPS.",
    recommendation: "Set AUTH_REMEMBER_SECURE=true pada environment produksi, lalu verifikasi ulang seluruh host dan alur login.",
  },
  {
    id: "SEC-003",
    severity: "Rendah",
    severityClass: "border-slate-200 bg-slate-100 text-slate-700",
    title: "Header hardening umum belum lengkap",
    summary: "HSTS tersedia, tetapi beberapa header hardening standar belum dikirim pada respons halaman utama.",
    evidence: "X-Content-Type-Options, Content-Security-Policy, X-Frame-Options, Referrer-Policy, dan Permissions-Policy belum terlihat pada respons GET /.",
    impact: "Perlindungan browser terhadap MIME sniffing, framing, referrer leakage, dan kemampuan browser belum maksimal.",
    recommendation: "Tambahkan header secara global di reverse proxy atau aplikasi. Mulai CSP dalam mode Report-Only sebelum enforcement.",
  },
]);

const PASSED_CHECKS = Object.freeze([
  "Tidak ditemukan isi .env, konfigurasi .git, atau stack trace pada endpoint publik yang diuji.",
  "CORS tidak mengizinkan Origin asing dan tidak mengaktifkan credential lintas origin pada probe.",
  "Role isolation terverifikasi untuk admin, seller, affiliate, dan buyer pada endpoint lintas role.",
  "Akses ke listing unpublished ditolak untuk role yang tidak berwenang; listing published tetap dapat dibaca publik.",
  "Cookie autentikasi yang diamati sudah HttpOnly dan SameSite=Lax.",
  "Validasi malformed input dan query XSS non-eksekusi tidak menghasilkan 5xx atau eksekusi script.",
]);

export function SecurityReportPage() {
  let root = null;

  return createPageLifecycle({
    mount(context) {
      root = document.createElement("div");
      render(root, context);
      return root;
    },
    hydrate(context) {
      render(root, context);
    },
    dispose() {
      root = null;
    },
  });
}

function render(root, context) {
  if (!root) return;

  const page = document.createElement("main");
  page.className = "min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--pb-brand-primary)_12%,transparent),transparent_34%),linear-gradient(180deg,#f8fafc,#fff)]";

  const frame = document.createElement("div");
  frame.className = "mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-6 sm:px-6 sm:py-10 2xl:max-w-[1240px]";
  frame.append(publicNav(context), hero(), summary(), findings(), passedChecks(), methodology(), disclaimer());

  page.append(frame);
  root.replaceChildren(page);
}

function publicNav(context) {
  const nav = document.createElement("nav");
  nav.className = "flex flex-wrap items-center justify-between gap-3";

  const brand = document.createElement("a");
  brand.href = "#/";
  brand.className = "inline-flex items-center gap-2 text-sm font-black text-slate-950 hover:text-[var(--pb-brand-secondary)]";
  brand.append(createIcon("car", { className: "h-5 w-5 text-[var(--pb-brand-secondary)]" }), document.createTextNode(brandConfig.appName || "Carlynk.id"));

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";
  actions.append(
    navLink("#/fitur", "Daftar fitur"),
    navLink("#/", "Kembali ke katalog"),
  );
  nav.append(brand, actions);
  return nav;
}

function navLink(href, label) {
  const link = document.createElement("a");
  link.href = href;
  link.className = "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm hover:border-slate-400";
  link.textContent = label;
  return link;
}

function hero() {
  const section = document.createElement("section");
  section.className = "relative overflow-hidden rounded-[2rem] p-6 text-white shadow-[0_26px_80px_rgba(15,23,42,0.22)] sm:p-8";
  section.style.background = "linear-gradient(135deg, #0f172a 0%, #172554 55%, #0f766e 100%)";

  const glow = document.createElement("div");
  glow.className = "pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl";
  const content = document.createElement("div");
  content.className = "relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";

  const copy = document.createElement("div");
  copy.className = "grid gap-3";
  copy.append(textNode("p", "Security assessment · production", "text-xs font-black uppercase tracking-[0.18em] text-emerald-300"));
  copy.append(textNode("h1", "Laporan pentest Carlynk.id", "max-w-3xl text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl"));
  copy.append(textNode("p", `Pemeriksaan keamanan non-destruktif pada environment produksi per ${REPORT_DATE}. Halaman ini merangkum bukti, dampak, dan langkah remediasi yang perlu ditindaklanjuti.`, "max-w-2xl text-sm leading-7 text-slate-300 sm:text-base"));

  const status = document.createElement("div");
  status.className = "grid min-w-[210px] gap-2 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur";
  status.append(textNode("span", "Status assessment", "text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300"));
  status.append(textNode("strong", "Remediasi diperlukan", "text-lg font-black text-amber-200"));
  status.append(textNode("span", "1 tinggi · 1 sedang · 1 rendah", "text-xs text-slate-300"));
  content.append(copy, status);
  section.append(glow, content);
  return section;
}

function summary() {
  const section = cardSection();
  section.append(heading("Ringkasan eksekutif", "Cakupan pengujian berfokus pada surface publik, autentikasi, isolasi role, endpoint internal, input, dan konfigurasi browser."));

  const grid = document.createElement("div");
  grid.className = "grid gap-3 sm:grid-cols-3";
  stat(grid, "3", "Temuan perlu ditindaklanjuti", "border-red-100 bg-red-50 text-red-700");
  stat(grid, "6", "Kontrol lulus", "border-emerald-100 bg-emerald-50 text-emerald-700");
  stat(grid, "4", "Host role diperiksa", "border-sky-100 bg-sky-50 text-sky-700");
  section.append(grid);
  return section;
}

function findings() {
  const section = cardSection();
  section.append(heading("Temuan keamanan", "Temuan di bawah berasal dari source review dan verifikasi browser/HTTP terkontrol. Tidak ada brute force, DoS, atau upload berbahaya ke produksi."));

  const list = document.createElement("div");
  list.className = "grid gap-4";
  FINDINGS.forEach((finding) => {
    const article = document.createElement("article");
    article.className = "grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5";

    const top = document.createElement("div");
    top.className = "flex flex-wrap items-center justify-between gap-3";
    const title = document.createElement("div");
    title.className = "flex min-w-0 items-center gap-3";
    title.append(textNode("span", finding.id, "rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-black text-white"));
    title.append(textNode("h3", finding.title, "text-base font-black text-slate-950"));
    top.append(title, textNode("span", finding.severity, `rounded-full border px-2.5 py-1.5 text-xs font-bold ${finding.severityClass}`));

    const details = document.createElement("div");
    details.className = "grid gap-3 text-sm leading-6 text-slate-600 lg:grid-cols-2";
    detail(details, "Ringkasan", finding.summary);
    detail(details, "Bukti", finding.evidence);
    detail(details, "Dampak", finding.impact);
    detail(details, "Rekomendasi", finding.recommendation);
    article.append(top, details);
    list.append(article);
  });
  section.append(list);
  return section;
}

function passedChecks() {
  const section = cardSection();
  section.append(heading("Pemeriksaan yang lulus", "Kontrol berikut tidak menunjukkan masalah pada scope dan waktu pengujian ini."));
  const list = document.createElement("ul");
  list.className = "grid gap-3 sm:grid-cols-2";
  PASSED_CHECKS.forEach((item) => {
    const row = document.createElement("li");
    row.className = "flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-sm leading-6 text-emerald-900";
    row.append(createIcon("circleCheck", { className: "mt-1 h-4 w-4 shrink-0 text-emerald-600" }), document.createTextNode(item));
    list.append(row);
  });
  section.append(list);
  return section;
}

function methodology() {
  const section = cardSection();
  section.append(heading("Metode dan batasan", "Pengujian dilakukan dengan browser Playwright headless/headful dan request HTTP terukur terhadap domain produksi."));
  const list = document.createElement("ul");
  list.className = "grid gap-2 text-sm leading-6 text-slate-600 sm:grid-cols-2";
  [
    "Surface yang diperiksa: carlynk.id, admin.carlynk.id, showroom.carlynk.id, marketing.carlynk.id, dan app.carlynk.id.",
    "Role yang diperiksa: admin, seller, affiliate/marketing, buyer, serta akses publik.",
    "Alur yang diperiksa: login, autologin, profile, role guard, listing published/unpublished, dan halaman publik.",
    "Pengujian dibatasi agar tidak mengubah data bisnis, tidak mengirim pembayaran nyata, dan tidak menjalankan brute force atau DoS.",
  ].forEach((item) => {
    const row = document.createElement("li");
    row.className = "flex items-start gap-2";
    row.append(createIcon("arrowRight", { className: "mt-1 h-4 w-4 shrink-0 text-[var(--pb-brand-secondary)]" }), document.createTextNode(item));
    list.append(row);
  });
  section.append(list);
  return section;
}

function disclaimer() {
  const note = document.createElement("p");
  note.className = "text-center text-xs leading-6 text-slate-500";
  note.textContent = "Laporan ini adalah snapshot pengujian pada tanggal yang tercantum, bukan sertifikasi keamanan. Temuan perlu diverifikasi ulang setelah remediasi dan setiap perubahan infrastruktur.";
  return note;
}

function cardSection() {
  const section = document.createElement("section");
  section.className = "grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6";
  return section;
}

function heading(title, description) {
  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  copy.append(textNode("h2", title, "text-xl font-black text-slate-950"));
  copy.append(textNode("p", description, "text-sm leading-6 text-slate-500"));
  return copy;
}

function detail(parent, label, value) {
  const block = document.createElement("div");
  block.className = "grid gap-1";
  block.append(textNode("strong", label, "text-xs font-black uppercase tracking-[0.12em] text-slate-500"));
  block.append(textNode("p", value, "text-sm leading-6 text-slate-600"));
  parent.append(block);
}

function stat(parent, value, label, className) {
  const card = document.createElement("div");
  card.className = `grid gap-1 rounded-2xl border p-4 ${className}`;
  card.append(textNode("strong", value, "text-2xl font-black"));
  card.append(textNode("span", label, "text-xs font-bold"));
  parent.append(card);
}

function textNode(tag, text, className) {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}
