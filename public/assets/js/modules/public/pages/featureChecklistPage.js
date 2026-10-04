import { createPageLifecycle } from "../../../core/lifecycle.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { brandConfig } from "../../../theme/brandConfig.js";

const STATUS = Object.freeze({
  verified: { label: "Terverifikasi", className: "border-emerald-200 bg-emerald-50 text-emerald-700", icon: "circleCheck" },
  partial: { label: "Sebagian", className: "border-amber-200 bg-amber-50 text-amber-700", icon: "triangleWarning" },
  pending: { label: "Belum diuji", className: "border-slate-200 bg-slate-50 text-slate-600", icon: "clock" },
});

const FEATURE_GROUPS = Object.freeze([
  {
    id: "public",
    title: "Pengalaman publik",
    description: "Entry point tanpa auth untuk melihat kendaraan dan memulai transaksi.",
    icon: "globe",
    features: [
      { id: "public-catalog", title: "Katalog kendaraan", description: "Daftar mobil published, pencarian, filter, sorting, dan pagination.", route: "/", status: "verified" },
      { id: "public-detail", title: "Detail mobil", description: "Galeri, spesifikasi, harga, lokasi, dan ringkasan inspeksi.", route: "/cars/:id", status: "verified" },
      { id: "public-affiliate", title: "Katalog referral marketing", description: "Landing page dan detail mobil melalui link referral marketing.", route: "/af/:slug", status: "verified" },
      { id: "public-feature-list", title: "Daftar fitur aplikasi", description: "Halaman publik ini; dapat dibaca tanpa login dari domain utama.", route: "/fitur", status: "verified" },
    ],
  },
  {
    id: "admin",
    title: "Admin dan data master",
    description: "Kontrol operasional, approval, data master, konfigurasi, dan settlement.",
    icon: "shield",
    features: [
      { id: "admin-dashboard", title: "Dashboard admin", description: "Ringkasan user, mobil, transaksi, dan antrean approval.", route: "/admin", status: "verified" },
      { id: "admin-users", title: "User dan approval", description: "Daftar user, pending user, detail, dan persetujuan showroom.", route: "/admin/users", status: "verified" },
      { id: "admin-master-brand", title: "Master brand", description: "Kelola daftar merek untuk form listing kendaraan.", route: "/admin/master-brand", status: "verified" },
      { id: "admin-master-location", title: "Master lokasi", description: "Kelola lokasi yang dipakai katalog dan showroom.", route: "/admin/master-location", status: "verified" },
      { id: "admin-master-bank", title: "Master bank", description: "Kelola bank untuk rekening pembayaran showroom.", route: "/admin/master-bank", status: "verified" },
      { id: "admin-master-inspection", title: "Master inspeksi", description: "Kelola template kategori dan item pemeriksaan.", route: "/admin/master-inspection", status: "verified" },
      { id: "admin-master-pricing", title: "Master harga", description: "Kelola paket, harga, batas listing, multi-cabang, dan kuota staff.", route: "/admin/master-pricing", status: "verified" },
      { id: "admin-sidebar", title: "Master sidebar", description: "Atur navigasi dan akses menu per role.", route: "/admin/master-sidebar", status: "partial" },
      { id: "admin-cars", title: "Moderasi mobil", description: "Review listing, status tayang, gambar, dan inspeksi.", route: "/admin/cars", status: "verified" },
      { id: "admin-transactions", title: "Monitoring transaksi", description: "Pantau transaksi mobil dan status pembayaran.", route: "/admin/transactions", status: "partial" },
      { id: "admin-affiliate-finance", title: "Komisi dan settlement", description: "Review komisi marketing, ledger, serta proses settlement.", route: "/admin/affiliate-commissions", status: "partial" },
      { id: "admin-subscriptions", title: "Tagihan showroom", description: "Review tagihan berulang, pembayaran, dan status aktivasi showroom.", route: "/admin/subscriptions-due", status: "partial" },
      { id: "admin-config", title: "Konfigurasi publik", description: "Slider, web config, landing page, design studio, migrasi, dan release version.", route: "/admin/web-config", status: "partial" },
    ],
  },
  {
    id: "showroom",
    title: "Showroom dan seller",
    description: "Pendaftaran showroom sampai listing, inspeksi, transaksi, dan marketing.",
    icon: "showroom",
    features: [
      { id: "seller-register", title: "Pendaftaran showroom", description: "Registrasi seller dengan username dan password serta alur approval.", route: "/login/seller", status: "verified" },
      { id: "seller-profile", title: "Profil showroom", description: "Kelola identitas showroom, rekening bank, dan informasi kontak.", route: "/seller/showroom", status: "verified" },
      { id: "seller-listing", title: "Listing mobil", description: "Buat, ubah, simpan, dan kelola status listing kendaraan.", route: "/seller/cars", status: "verified" },
      { id: "seller-images", title: "Foto kendaraan", description: "Kelola galeri foto listing dan urutan gambar.", route: "/seller/cars/:id/images", status: "partial" },
      { id: "seller-inspection", title: "Inspeksi kendaraan", description: "Isi checklist inspeksi, simpan laporan, dan publish hasil.", route: "/seller/inspection", status: "partial" },
      { id: "seller-transaction", title: "Transaksi showroom", description: "Lihat progres pembelian dan detail transaksi showroom.", route: "/seller/transactions", status: "partial" },
      { id: "seller-marketing", title: "Partner marketing", description: "Kelola partner, referral link, dan performa komisi per listing.", route: "/seller/affiliates", status: "verified" },
      { id: "seller-staff", title: "Akses tim staff", description: "Buat, ubah, nonaktifkan, dan batasi staff sesuai kuota paket.", route: "/seller/staff", status: "verified" },
      { id: "seller-billing", title: "Langganan showroom", description: "Pilih paket, transfer manual atau Virtual Account, dan lihat riwayat tagihan.", route: "/seller/billing", status: "partial" },
      { id: "seller-custom-domain", title: "Domain custom", description: "Konfigurasi domain custom showroom sesuai kesiapan DNS dan SSL.", route: "/seller/showroom", status: "partial" },
    ],
  },
  {
    id: "buyer",
    title: "Buyer dan pembelian",
    description: "Buyer dapat login, memilih mobil, membuat transaksi, dan memantau pembayaran.",
    icon: "shoppingBag",
    features: [
      { id: "buyer-login", title: "Login buyer", description: "Login username/password dan opsi login Google tetap tersedia.", route: "/login/buyer", status: "verified" },
      { id: "buyer-catalog", title: "Katalog buyer", description: "Katalog kendaraan dari area buyer dengan filter dan detail.", route: "/buyer/cars", status: "verified" },
      { id: "buyer-buy", title: "Mulai pembelian", description: "Form transaksi dari detail mobil dengan akun akses yang aman.", route: "/transactions/new?car_id=:id", status: "verified" },
      { id: "buyer-payment", title: "Status pembayaran", description: "Upload bukti, status review, dan riwayat transaksi buyer.", route: "/buyer/transactions", status: "partial" },
      { id: "buyer-account", title: "Akun dan profil", description: "Profil buyer, portfolio, notifikasi, dan histori aktivitas.", route: "/buyer/account", status: "verified" },
    ],
  },
  {
    id: "marketing",
    title: "Marketing dan komisi",
    description: "Referral link, klik, ledger komisi, dan settlement marketing.",
    icon: "affiliate",
    features: [
      { id: "marketing-dashboard", title: "Dashboard marketing", description: "Ringkasan profil, referral, dan performa marketing.", route: "/affiliate", status: "verified" },
      { id: "marketing-cars", title: "Katalog marketing", description: "Lihat listing yang bisa dipromosikan dan bagikan link referral.", route: "/affiliate/cars", status: "partial" },
      { id: "marketing-clicks", title: "Aktivitas referral", description: "Pantau klik dan kunjungan dari link referral.", route: "/affiliate/activity", status: "verified" },
      { id: "marketing-ledger", title: "Ledger komisi", description: "Pantau komisi earned, pending, approved, dan paid.", route: "/affiliate/ledger", status: "verified" },
      { id: "marketing-settlement", title: "Settlement marketing", description: "Lihat kelayakan dan riwayat settlement komisi.", route: "/affiliate/settlements", status: "partial" },
    ],
  },
  {
    id: "staff",
    title: "Staff dan pembatasan akses",
    description: "Fungsi staff mengikuti scope showroom dan tidak memperoleh akses lintas role.",
    icon: "users",
    features: [
      { id: "staff-login", title: "Login staff", description: "Akun staff memakai jalur login seller lalu diarahkan ke area kerja sesuai role dan showroom.", route: "/login/seller", status: "verified" },
      { id: "staff-scope", title: "Scope showroom", description: "Data listing, inspeksi, dan transaksi dibatasi pada showroom terkait.", route: "/seller", status: "partial" },
      { id: "staff-notifications", title: "Notifikasi operasional", description: "Staff menerima notifikasi yang relevan dengan tugasnya.", route: "/notifications", status: "partial" },
    ],
  },
]);

const BUSINESS_FLOW = Object.freeze([
  ["01", "Admin", "Siapkan master brand, lokasi, bank, sidebar, dan template inspeksi.", "admin"],
  ["02", "Showroom", "Daftar, lengkapi profil, tunggu approval, lalu siapkan listing.", "showroom"],
  ["03", "Listing", "Tambah mobil, foto, inspeksi, dan publish listing.", "showroom"],
  ["04", "Buyer", "Login, pilih mobil, isi transaksi, lalu pantau pembayaran.", "buyer"],
  ["05", "Marketing", "Bagikan referral, hasilkan klik, dan terima komisi sesuai status.", "marketing"],
  ["06", "Staff", "Bekerja sesuai scope showroom dengan akses menu yang dibatasi.", "staff"],
]);

export function FeatureChecklistPage() {
  let root = null;
  const state = { filter: "all" };

  return createPageLifecycle({
    mount(context) {
      root = document.createElement("div");
      render(root, context, state);
      return root;
    },
    hydrate(context) {
      render(root, context, state);
    },
    dispose() {
      root = null;
    },
  });
}

function render(root, context, state) {
  if (!root) return;

  const allFeatures = FEATURE_GROUPS.flatMap((group) => group.features);
  const counts = allFeatures.reduce((summary, feature) => {
    summary[feature.status] = (summary[feature.status] ?? 0) + 1;
    return summary;
  }, {});
  const visibleGroups = FEATURE_GROUPS
    .map((group) => ({ ...group, features: group.features.filter((feature) => state.filter === "all" || feature.status === state.filter) }))
    .filter((group) => group.features.length > 0);

  const page = document.createElement("main");
  page.className = "min-h-screen bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--pb-brand-primary)_12%,transparent),transparent_34%),linear-gradient(180deg,#f8fafc,#fff)]";

  const frame = document.createElement("div");
  frame.className = "mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-6 sm:px-6 sm:py-10 2xl:max-w-[1240px]";
  frame.append(publicBackLink(context), hero({ counts, total: allFeatures.length }));

  const flow = document.createElement("section");
  flow.className = "grid gap-3 rounded-[1.75rem] border border-white/80 bg-white/80 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-6";
  flow.append(sectionHeading("Alur bisnis utama", "Urutan uji dari data master sampai operasi role harian."));
  const flowGrid = document.createElement("div");
  flowGrid.className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";
  BUSINESS_FLOW.forEach(([number, role, description, groupId]) => {
    const item = document.createElement("article");
    item.className = "grid gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4";
    const top = document.createElement("div");
    top.className = "flex items-center justify-between gap-3";
    const badge = document.createElement("span");
    badge.className = "grid h-8 w-8 place-items-center rounded-xl bg-slate-900 text-xs font-black text-white";
    badge.textContent = number;
    const roleLabel = document.createElement("span");
    roleLabel.className = "text-xs font-black uppercase tracking-[0.14em] text-[var(--pb-brand-secondary)]";
    roleLabel.textContent = role;
    top.append(badge, roleLabel);
    const text = document.createElement("p");
    text.className = "text-sm leading-6 text-slate-600";
    text.textContent = description;
    const link = document.createElement("a");
    link.className = "text-xs font-bold text-[var(--pb-brand-secondary)] hover:underline";
    link.href = `#/fitur?bagian=${encodeURIComponent(groupId)}`;
    link.textContent = "Lihat checklist →";
    item.append(top, text, link);
    flowGrid.append(item);
  });
  flow.append(flowGrid);
  frame.append(flow);

  const toolbar = document.createElement("section");
  toolbar.className = "flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between";
  const toolbarCopy = document.createElement("div");
  toolbarCopy.className = "grid gap-1";
  const toolbarTitle = document.createElement("h2");
  toolbarTitle.className = "text-base font-black text-slate-950";
  toolbarTitle.textContent = "Checklist fitur";
  const toolbarText = document.createElement("p");
  toolbarText.className = "text-sm text-slate-500";
  toolbarText.textContent = "Status di bawah mengikuti hasil pengujian terakhir pada environment aplikasi.";
  toolbarCopy.append(toolbarTitle, toolbarText);
  const filters = document.createElement("div");
  filters.className = "flex flex-wrap gap-2";
  [
    ["all", `Semua ${allFeatures.length}`],
    ["verified", `Terverifikasi ${counts.verified ?? 0}`],
    ["partial", `Sebagian ${counts.partial ?? 0}`],
    ["pending", `Belum diuji ${counts.pending ?? 0}`],
  ].forEach(([value, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = state.filter === value
      ? "rounded-full bg-slate-900 px-3 py-2 text-xs font-bold text-white"
      : "rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:border-slate-400";
    button.setAttribute("aria-pressed", String(state.filter === value));
    button.textContent = label;
    button.addEventListener("click", () => {
      state.filter = value;
      render(root, context, state);
    });
    filters.append(button);
  });
  toolbar.append(toolbarCopy, filters);
  frame.append(toolbar);

  const groups = document.createElement("div");
  groups.className = "grid gap-5";
  visibleGroups.forEach((group) => groups.append(featureGroup(group, context)));
  if (!visibleGroups.length) {
    const empty = document.createElement("div");
    empty.className = "rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500";
    empty.textContent = "Tidak ada fitur pada filter ini.";
    groups.append(empty);
  }
  frame.append(groups, footerNote());
  page.append(frame);
  root.replaceChildren(page);
}

function hero({ counts, total }) {
  const section = document.createElement("section");
  section.className = "relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 text-white shadow-[0_26px_80px_rgba(15,23,42,0.22)] sm:p-8";
  const glow = document.createElement("div");
  glow.className = "pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_35%,transparent)] blur-3xl";
  const content = document.createElement("div");
  content.className = "relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";
  const copy = document.createElement("div");
  copy.className = "grid gap-3";
  const eyebrow = document.createElement("p");
  eyebrow.className = "text-xs font-black uppercase tracking-[0.18em] text-emerald-300";
  eyebrow.textContent = "Public feature map";
  const title = document.createElement("h1");
  title.className = "max-w-3xl text-3xl font-black leading-tight tracking-[-0.035em] sm:text-5xl";
  title.textContent = "Daftar fitur dan alur bisnis aplikasi";
  const description = document.createElement("p");
  description.className = "max-w-2xl text-sm leading-7 text-slate-300 sm:text-base";
  description.textContent = "Halaman ini bebas diakses dari domain utama untuk melihat cakupan fitur Carlynk.id dan status verifikasi browser terakhir.";
  copy.append(eyebrow, title, description);
  const stats = document.createElement("div");
  stats.className = "grid grid-cols-3 gap-2 sm:flex sm:gap-3";
  statCard(stats, total, "Fitur");
  statCard(stats, counts.verified ?? 0, "Terverifikasi");
  statCard(stats, counts.partial ?? 0, "Sebagian");
  content.append(copy, stats);
  section.append(glow, content);
  return section;
}

function featureGroup(group, context) {
  const section = document.createElement("section");
  section.id = `feature-group-${group.id}`;
  section.className = "grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-6";
  const header = document.createElement("div");
  header.className = "flex items-start gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100 text-[var(--pb-brand-secondary)]";
  icon.append(createIcon(group.icon, { className: "h-5 w-5" }));
  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  const title = document.createElement("h2");
  title.className = "text-xl font-black text-slate-950";
  title.textContent = group.title;
  const description = document.createElement("p");
  description.className = "text-sm leading-6 text-slate-500";
  description.textContent = group.description;
  copy.append(title, description);
  header.append(icon, copy);
  const list = document.createElement("div");
  list.className = "grid gap-3";
  group.features.forEach((feature) => list.append(featureRow(feature, context)));
  section.append(header, list);
  return section;
}

function featureRow(feature, context) {
  const status = STATUS[feature.status] ?? STATUS.pending;
  const row = document.createElement("article");
  row.className = "grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center";
  row.dataset.featureId = feature.id;
  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  const title = document.createElement("h3");
  title.className = "text-sm font-black text-slate-950";
  title.textContent = feature.title;
  const description = document.createElement("p");
  description.className = "text-sm leading-6 text-slate-600";
  description.textContent = feature.description;
  const route = document.createElement("code");
  route.className = "w-fit rounded bg-white px-2 py-1 text-[11px] font-semibold text-slate-500";
  route.textContent = feature.route;
  copy.append(title, description, route);
  const actions = document.createElement("div");
  actions.className = "flex flex-wrap items-center gap-2 sm:justify-end";
  const badge = document.createElement("span");
  badge.className = `inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-bold ${status.className}`;
  badge.append(createIcon(status.icon, { className: "h-3.5 w-3.5" }), document.createTextNode(status.label));
  const link = document.createElement("a");
  link.className = "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:border-slate-400";
  link.href = `#${feature.route.replace(":id", "")}`;
  link.textContent = "Buka modul";
  link.addEventListener("click", (event) => {
    if (feature.route.includes(":id")) {
      event.preventDefault();
      context.router?.navigate("/fitur");
    }
  });
  actions.append(badge, link);
  row.append(copy, actions);
  return row;
}

function publicBackLink(context) {
  const nav = document.createElement("nav");
  nav.className = "flex flex-wrap items-center justify-between gap-3";
  const brand = document.createElement("a");
  brand.href = "#/";
  brand.className = "inline-flex items-center gap-2 text-sm font-black text-slate-950 hover:text-[var(--pb-brand-secondary)]";
  brand.append(createIcon("car", { className: "h-5 w-5 text-[var(--pb-brand-secondary)]" }), document.createTextNode(brandConfig.appName || "Carlynk.id"));
  const home = document.createElement("a");
  home.href = "#/";
  home.className = "rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm hover:border-slate-400";
  home.textContent = "Kembali ke katalog";
  nav.append(brand, home);
  return nav;
}

function sectionHeading(title, description) {
  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  const heading = document.createElement("h2");
  heading.className = "text-xl font-black text-slate-950";
  heading.textContent = title;
  const text = document.createElement("p");
  text.className = "text-sm leading-6 text-slate-500";
  text.textContent = description;
  copy.append(heading, text);
  return copy;
}

function statCard(parent, value, label) {
  const card = document.createElement("div");
  card.className = "grid min-w-[82px] gap-1 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-center backdrop-blur";
  const number = document.createElement("strong");
  number.className = "text-2xl font-black";
  number.textContent = String(value);
  const text = document.createElement("span");
  text.className = "text-[10px] font-bold uppercase tracking-wide text-slate-300";
  text.textContent = label;
  card.append(number, text);
  parent.append(card);
}

function footerNote() {
  const note = document.createElement("p");
  note.className = "text-center text-xs leading-6 text-slate-500";
  note.textContent = "Status checklist adalah catatan pengujian, bukan pengganti permission pada modul. Area admin, seller, buyer, marketing, dan staff tetap mengikuti role guard aplikasi.";
  return note;
}
