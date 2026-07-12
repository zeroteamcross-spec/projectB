import { createPageLifecycle } from "../../../core/lifecycle.js";
import { Button } from "../../../ui/primitives/button.js";
import { createBackgroundVideoLayer } from "../../../ui/composites/backgroundVideo.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { brandConfig } from "../../../theme/brandConfig.js";

const SAAS_LANDING_FALLBACK = "bg-[radial-gradient(circle_at_18%_12%,rgba(251,146,60,0.28),transparent_30%),radial-gradient(circle_at_82%_10%,rgba(255,255,255,0.72),transparent_28%),linear-gradient(180deg,#fff8f1_0%,#fff7ed_46%,#ffffff_100%)]";

export function SaasLandingPage() {
  let root = null;
  let backgroundVideoLayer = null;
  const getBackgroundVideoLayer = () => {
    backgroundVideoLayer ??= createBackgroundVideoLayer({
      id: "saas_landing_background_video_layer",
      fallbackClassName: SAAS_LANDING_FALLBACK,
      overlayClassName: "bg-white/72",
    });
    return backgroundVideoLayer;
  };

  return createPageLifecycle({
    mount(context) {
      root = document.createElement("div");
      render(root, context, getBackgroundVideoLayer);
      return root;
    },
    hydrate(context) {
      render(root, context, getBackgroundVideoLayer);
    },
    dispose() {
      backgroundVideoLayer?.dispose?.();
      backgroundVideoLayer = null;
    },
  });
}

function render(root, context, getBackgroundVideoLayer) {
  if (!root) {
    return;
  }

  const shell = document.createElement("section");
  shell.className = "relative isolate min-h-screen overflow-x-clip bg-transparent";

  const page = document.createElement("main");
  page.id = "saas_landing_page";
  page.className = "relative z-10 min-h-screen overflow-x-clip text-slate-950";

  page.append(
    heroSection(context),
    audienceSection(),
    builderSection(context),
    workflowSection(),
    showcaseSection(),
    ctaSection(context),
    footerSection(context),
  );

  shell.append(getBackgroundVideoLayer(), page);
  root.replaceChildren(shell);
}

function heroSection(context) {
  const section = document.createElement("section");
  section.className = "relative isolate overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:pb-24 lg:pt-16";

  const glow = document.createElement("div");
  glow.className = "pointer-events-none absolute left-1/2 top-10 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-orange-200/55 blur-3xl";

  const frame = document.createElement("div");
  frame.className = "mx-auto grid w-full max-w-[1180px] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(340px,460px)] lg:items-center";

  const copy = document.createElement("section");
  copy.className = "grid justify-items-center gap-6 text-center lg:justify-items-start lg:text-left";

  const badge = pill("Platform SaaS jual beli mobil", "bolt");
  const title = document.createElement("h1");
  title.className = "max-w-4xl text-[3.15rem] font-black leading-[0.95] tracking-normal text-white sm:text-[4.5rem] lg:text-[5.6rem]";
  title.textContent = "Satu link untuk showroom mobil Anda.";

  const body = document.createElement("p");
  body.className = "max-w-2xl text-base font-semibold leading-8 text-white sm:text-lg";
  body.textContent = "Daftar, punya halaman publik sendiri, kelola profil showroom, tampilkan list mobil, dan arahkan calon pembeli ke katalog yang rapi dari satu dashboard.";

  const actions = document.createElement("section");
  actions.className = "flex w-full max-w-md flex-col gap-3 sm:flex-row lg:max-w-none";
  actions.append(
    ctaButton({
      label: "Buat halaman showroom",
      onClick: () => context.router?.navigate("/auth?role=seller&mode=register"),
      primary: true,
      id: "saas_landing_register_seller_button",
    }),
    ctaButton({
      label: "Lihat contoh katalog",
      onClick: () => context.router?.navigate("/contoh-katalog"),
      id: "saas_landing_catalog_button",
    }),
  );

  const stats = document.createElement("section");
  stats.className = "grid w-full max-w-xl grid-cols-3 gap-2 pt-2";
  [
    ["1 link", "Halaman publik"],
    ["24/7", "Katalog online"],
    ["Multi role", "Seller & marketing"],
  ].forEach(([value, label]) => stats.append(statItem(value, label)));

  copy.append(badge, title, body, actions, stats);
  frame.append(copy, phoneStack());
  section.append(glow, frame);
  return section;
}

function phoneStack() {
  const wrap = document.createElement("section");
  wrap.className = "relative mx-auto min-h-[620px] w-full max-w-[420px] lg:min-h-[680px]";
  wrap.setAttribute("aria-label", "Preview halaman showroom");

  const back = phoneMockup({
    className: "absolute right-0 top-10 rotate-[7deg] scale-[0.86] opacity-90",
    title: "Garasi Andalan",
    subtitle: "15 mobil siap tayang",
    items: [
      ["Honda HR-V RS", "Rp 398 jt", "camera"],
      ["Toyota Innova Zenix", "Rp 512 jt", "car"],
      ["Mazda CX-5 Elite", "Rp 489 jt", "sparkles"],
    ],
  });

  const front = phoneMockup({
    className: "absolute left-0 top-0 shadow-[0_34px_90px_rgba(234,88,12,0.28)]",
    title: "Showroom Saya",
    subtitle: "mobil-saya.belimobil",
    items: [
      ["Upload mobil", "Foto, harga, spek", "upload"],
      ["Atur landing", "Logo, kontak, CTA", "settings"],
      ["Lead masuk", "WhatsApp & transaksi", "message"],
    ],
  });

  const floating = document.createElement("section");
  floating.className = "absolute bottom-10 right-2 grid w-[235px] gap-2 rounded-[1.65rem] border border-orange-100 bg-white p-4 shadow-[0_22px_60px_rgba(15,23,42,0.14)]";
  floating.append(
    textNode("p", "text-xs font-black uppercase text-orange-600", "Dashboard seller"),
    textNode("strong", "text-2xl font-black text-slate-950", "38 lead"),
    textNode("span", "text-sm font-semibold text-slate-500", "dari katalog minggu ini"),
  );

  wrap.append(back, front, floating);
  return wrap;
}

function phoneMockup({ className, title, subtitle, items }) {
  const phone = document.createElement("section");
  phone.className = `grid w-[300px] gap-4 rounded-[2.4rem] border-[10px] border-slate-950 bg-white p-4 ${className}`;

  const header = document.createElement("section");
  header.className = "grid gap-3 rounded-[1.7rem] bg-[linear-gradient(135deg,#fb923c,#ea580c)] p-4 text-white";
  header.append(
    textNode("span", "text-xs font-black uppercase text-white/80", subtitle),
    textNode("strong", "text-2xl font-black leading-tight", title),
    smallSearch(),
  );

  const list = document.createElement("section");
  list.className = "grid gap-2";
  items.forEach(([name, meta, icon]) => {
    const item = document.createElement("section");
    item.className = "grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[1.25rem] border border-slate-100 bg-slate-50 p-3";
    item.append(
      iconBubble(icon),
      textBlock(name, meta),
    );
    list.append(item);
  });

  phone.append(header, list);
  return phone;
}

function audienceSection() {
  const section = landingSection("Dibuat untuk ekosistem penjualan mobil", "Showroom punya halaman sendiri. Marketing bisa membagikan link. Buyer melihat katalog yang konsisten dan mudah dipahami.", "text-base font-semibold leading-8 text-white");
  const grid = document.createElement("section");
  grid.className = "grid gap-4 md:grid-cols-3";
  [
    ["Seller", "Kelola profil showroom, upload mobil, harga, foto, dan status listing.", "showroom"],
    ["Marketing", "Bagikan katalog dengan link personal dan pantau aktivitas calon pembeli.", "affiliate"],
    ["Buyer", "Cari mobil, lihat detail, lalu lanjut transaksi atau konsultasi dari halaman publik.", "car"],
  ].forEach(([title, body, icon]) => grid.append(featureCard(title, body, icon)));
  section.append(grid);
  return section;
}

function builderSection(context) {
  const section = document.createElement("section");
  section.className = "px-4 py-14 sm:px-6 lg:py-20";

  const frame = document.createElement("section");
  frame.className = "mx-auto grid w-full max-w-[1180px] gap-8 rounded-[2.2rem] bg-slate-950 p-5 text-white shadow-[0_26px_80px_rgba(15,23,42,0.22)] sm:p-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center";

  const copy = document.createElement("section");
  copy.className = "grid gap-5";
  copy.append(
    pill("No-code storefront", "sparkles", true),
    textNode("h2", "max-w-xl text-4xl font-black leading-tight tracking-normal sm:text-5xl", "Bangun halaman showroom tanpa developer."),
    textNode("p", "max-w-xl text-base font-semibold leading-8 text-white/70", "Pemilik showroom cukup mengisi data bisnis, kontak, logo, dan daftar mobil. Sistem menyiapkan halaman publik yang siap dibagikan."),
  );

  const action = ctaButton({
    label: "Mulai sebagai seller",
    onClick: () => context.router?.navigate("/auth?role=seller&mode=register"),
    primary: true,
    id: "saas_landing_builder_register_button",
  });
  action.classList.add("max-w-xs");
  copy.append(action);

  const panel = document.createElement("section");
  panel.className = "grid gap-3 rounded-[1.8rem] bg-white p-4 text-slate-950";
  [
    ["Profil showroom", "Nama, alamat, kontak, logo", "idCard"],
    ["List mobil", "Foto, harga, transmisi, lokasi", "list"],
    ["Halaman publik", "Link siap dibagikan ke calon buyer", "globe"],
    ["Lead & transaksi", "Arahkan chat dan proses pembelian", "transaction"],
  ].forEach(([title, body, icon]) => panel.append(builderRow(title, body, icon)));

  frame.append(copy, panel);
  section.append(frame);
  return section;
}

function workflowSection() {
  const section = landingSection("Dari daftar sampai mobil tayang", "Alur dibuat pendek supaya seller bisa fokus jualan, bukan mengurus teknis halaman.", "text-base font-semibold leading-8 text-white");
  const grid = document.createElement("section");
  grid.className = "grid gap-4 md:grid-cols-4";
  [
    ["01", "Daftar akun seller"],
    ["02", "Lengkapi showroom"],
    ["03", "Tambahkan mobil"],
    ["04", "Bagikan halaman"],
  ].forEach(([number, label]) => {
    const card = document.createElement("section");
    card.className = "grid gap-5 rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]";
    card.append(
      textNode("span", "text-4xl font-black text-orange-500", number),
      textNode("strong", "text-lg font-black text-slate-950", label),
    );
    grid.append(card);
  });
  section.append(grid);
  return section;
}

function showcaseSection() {
  const section = landingSection("Halaman publik yang terasa seperti showroom digital", "Setiap user memiliki wajah bisnis sendiri, tetapi tetap berada dalam standar platform.", "text-base font-semibold leading-8 text-white");
  const grid = document.createElement("section");
  grid.className = "grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]";

  const preview = document.createElement("section");
  preview.className = "grid gap-4 rounded-[2rem] bg-white p-5 shadow-[0_22px_65px_rgba(15,23,42,0.10)]";
  preview.append(
    textNode("p", "text-sm font-black uppercase text-orange-600", "Contoh halaman"),
    textNode("h3", "text-3xl font-black text-slate-950", "Garasi Premium Jakarta"),
    textNode("p", "text-base font-semibold leading-7 text-slate-600", "Katalog mobil pilihan, kontak cepat, informasi showroom, dan CTA transaksi dalam satu halaman."),
    carPreviewGrid(),
  );

  const points = document.createElement("section");
  points.className = "grid content-start gap-3";
  [
    ["Brand sendiri", "Nama dan identitas showroom tampil jelas."],
    ["Katalog aktif", "Mobil bisa diatur berdasarkan status listing."],
    ["Link ringkas", "Mudah dibagikan ke WhatsApp, Instagram, dan iklan."],
  ].forEach(([title, body]) => points.append(textFeature(title, body)));

  grid.append(preview, points);
  section.append(grid);
  return section;
}

function ctaSection(context) {
  const section = document.createElement("section");
  section.className = "px-4 py-14 sm:px-6 lg:py-20";
  const frame = document.createElement("section");
  frame.className = "mx-auto grid w-full max-w-[980px] justify-items-center gap-6 rounded-[2.25rem] bg-[linear-gradient(135deg,#fb923c,#ea580c)] px-5 py-12 text-center text-white shadow-[0_26px_80px_rgba(234,88,12,0.26)] sm:px-8";
  frame.append(
    textNode("h2", "max-w-3xl text-4xl font-black leading-tight tracking-normal sm:text-5xl", "Siapkan halaman showroom Anda hari ini."),
    textNode("p", "max-w-2xl text-base font-semibold leading-8 text-white/82", "Buat akun, isi data bisnis, dan mulai tampilkan mobil yang siap dijual."),
    ctaButton({
      label: "Daftar sekarang",
      onClick: () => context.router?.navigate("/auth?role=seller&mode=register"),
      id: "saas_landing_bottom_register_button",
    }),
  );
  section.append(frame);
  return section;
}

function footerSection(context) {
  const footer = document.createElement("footer");
  footer.className = "border-t border-orange-100 bg-white px-4 py-8 sm:px-6";
  const inner = document.createElement("section");
  inner.className = "mx-auto flex w-full max-w-[1180px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between";
  inner.append(
    textNode("strong", "text-lg font-black text-slate-950", brandConfig.appName),
    footerLinks(context),
  );
  footer.append(inner);
  return footer;
}

function landingSection(title, subtitle, subtitleClass) {
  const section = document.createElement("section");
  section.className = "px-4 py-14 sm:px-6 lg:py-20";
  const frame = document.createElement("section");
  frame.className = "mx-auto grid w-full max-w-[1180px] gap-8";
  const header = document.createElement("header");
  header.className = "grid max-w-3xl gap-3";
  header.append(
    textNode("h2", "text-4xl font-black leading-tight tracking-normal text-white sm:text-5xl", title),
    textNode("p", subtitleClass || "text-base font-semibold leading-8 text-slate-600", subtitle),
  );
  frame.append(header);
  section.append(frame);
  section.frame = frame;
  section.append = (...nodes) => frame.append(...nodes);
  return section;
}

function featureCard(title, body, icon) {
  const card = document.createElement("section");
  card.className = "grid content-start gap-4 rounded-[1.65rem] border border-orange-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]";
  card.append(iconBubble(icon), textNode("h3", "text-xl font-black text-slate-950", title), textNode("p", "text-sm font-semibold leading-7 text-slate-600", body));
  return card;
}

function builderRow(title, body, icon) {
  const row = document.createElement("section");
  row.className = "grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[1.25rem] border border-slate-100 bg-slate-50 p-3";
  row.append(iconBubble(icon), textBlock(title, body));
  return row;
}

function textFeature(title, body) {
  const item = document.createElement("section");
  item.className = "grid gap-2 rounded-[1.5rem] border border-orange-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]";
  item.append(textNode("h3", "text-xl font-black text-slate-950", title), textNode("p", "text-sm font-semibold leading-7 text-slate-600", body));
  return item;
}

function carPreviewGrid() {
  const grid = document.createElement("section");
  grid.className = "grid gap-3 sm:grid-cols-3";
  [
    ["SUV", "Rp 300 jt-an"],
    ["MPV", "Keluarga"],
    ["Sedan", "Premium"],
  ].forEach(([title, meta]) => {
    const item = document.createElement("section");
    item.className = "grid aspect-[4/3] content-end rounded-[1.3rem] bg-[linear-gradient(135deg,#fed7aa,#fb923c)] p-4 text-white";
    item.append(textNode("strong", "text-lg font-black", title), textNode("span", "text-sm font-bold text-white/80", meta));
    grid.append(item);
  });
  return grid;
}

function footerLinks(context) {
  const links = document.createElement("section");
  links.className = "flex flex-wrap gap-3 text-sm font-bold";
  [
    ["Katalog", "/public"],
    ["Login", "/auth"],
  ].forEach(([label, path]) => {
    const link = document.createElement("button");
    link.type = "button";
    link.className = "text-slate-500 transition hover:text-orange-600";
    link.textContent = label;
    link.addEventListener("click", () => context.router?.navigate(path));
    links.append(link);
  });
  return links;
}

function ctaButton({ label, onClick, primary = false, id = "" }) {
  const button = Button({ label, onClick, variant: primary ? "primary" : "secondary" });
  button.id = id;
  button.classList.add("min-h-12", "w-full", "rounded-full", "px-6", "font-black", "sm:w-auto");
  if (primary) {
    button.classList.add("bg-slate-950", "text-white", "shadow-[0_18px_42px_rgba(15,23,42,0.24)]");
  } else {
    button.classList.add("bg-white", "text-slate-950");
  }
  return button;
}

function pill(label, icon, dark = false) {
  const node = document.createElement("span");
  node.className = dark
    ? "inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-orange-100"
    : "inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-black text-orange-700 shadow-sm";
  node.append(createIcon(icon, { className: "block h-4 w-4 leading-none" }), document.createTextNode(label));
  return node;
}

function statItem(value, label) {
  const item = document.createElement("section");
  item.className = "grid justify-items-center gap-1 rounded-[1.25rem] bg-white/75 p-3 text-center shadow-sm lg:justify-items-start lg:text-left";
  item.append(textNode("strong", "text-xl font-black text-slate-950", value), textNode("span", "text-xs font-bold text-slate-500", label));
  return item;
}

function smallSearch() {
  const row = document.createElement("section");
  row.className = "flex items-center gap-2 rounded-full bg-white/18 px-3 py-2 text-sm font-bold text-white/90";
  row.append(createIcon("search", { className: "block h-3.5 w-3.5 leading-none" }), document.createTextNode("Cari mobil impian"));
  return row;
}

function iconBubble(icon) {
  const node = document.createElement("span");
  node.className = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-orange-100 text-orange-600";
  node.append(createIcon(icon, { className: "block h-5 w-5 leading-none" }));
  return node;
}

function textBlock(title, body) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(textNode("strong", "break-words text-sm font-black text-slate-950", title), textNode("span", "break-words text-xs font-semibold leading-5 text-slate-500", body));
  return wrap;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
