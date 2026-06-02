import { Badge } from "../../../ui/primitives/badge.js";
import { Card } from "../../../ui/composites/card.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { getListingLockStatus } from "../../../utils/transactionStatus.js";

export function PublicCarCard({ car, onOpenDetail = null } = {}) {
  const lock = getListingLockStatus({ car });
  const root = Card([], { designHook: "catalog.card.root" });
  root.className = "group overflow-hidden rounded-[26px] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-0 shadow-[var(--pb-shadow-card)] backdrop-blur";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "block w-full min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  button.addEventListener("click", () => onOpenDetail?.(car));

  const media = document.createElement("div");
  media.className = "relative aspect-[1.32/1] overflow-hidden bg-[var(--pb-surface-muted)]";

  const image = document.createElement("img");
  image.src = primaryImageUrl(car) || fallbackCarImageUrl();
  image.alt = carTitle(car);
  image.loading = "lazy";
  image.className = "block h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]";
  image.addEventListener("error", () => {
    image.src = fallbackCarImageUrl();
  }, { once: true });
  media.append(image, mediaOverlay(), badgeStack(car), sliderDots(car));

  const body = document.createElement("div");
  body.className = "grid gap-3 bg-[var(--pb-surface-card)] px-4 pb-4 pt-3";

  const heading = document.createElement("div");
  heading.className = "grid gap-1";

  const title = document.createElement("h2");
  title.className = "line-clamp-2 break-words text-lg font-semibold tracking-normal text-[var(--pb-text)]";
  title.textContent = carTitle(car);

  const subtitle = document.createElement("p");
  subtitle.className = "break-words text-sm leading-5 text-[var(--pb-text-muted)]";
  subtitle.textContent = [car.sub_model_name, car.location_name].filter(Boolean).join(" | ") || "Unit showroom";
  heading.append(title, subtitle);

  const specs = document.createElement("div");
  specs.className = "hidden grid grid-cols-1 gap-2 rounded-[18px] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-3 sm:grid-cols-3";
  specs.append(
    specItem("calendar", "Tahun", car?.year ?? yearFromDate(car?.registration_date) ?? "-"),
    specItem("sort", "Transmisi", normalizeLabel(car.transmission ?? "-")),
    specItem("location", "Lokasi", car.location_name ?? "-"),
  );

  const priceBlock = document.createElement("div");
  priceBlock.className = "grid min-h-[104px] gap-2 rounded-[18px] border border-[color-mix(in_srgb,var(--pb-brand-primary)_24%,white)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] px-4 py-3";
  applyDesignHook(priceBlock, "catalog.card.price");

  if (hasPromo(car)) {
    const original = document.createElement("span");
    original.className = "text-xs font-semibold text-[var(--pb-text-muted)] line-through";
    original.textContent = formatCurrency(car.price_cash);
    priceBlock.append(original);
  }

  const price = document.createElement("strong");
  price.className = "break-words text-[22px] font-black leading-none tracking-normal text-[var(--pb-brand-secondary)]";
  price.textContent = formatCurrency(effectivePrice(car));

  const hint = document.createElement("span");
  hint.className = "break-words text-xs font-semibold leading-5 text-[var(--pb-text-muted)]";
  hint.textContent = lock.locked ? "Detail, gallery, dan konsultasi" : "Detail, gallery, inspeksi, dan transaksi";
  priceBlock.append(price, hint);

  const footer = document.createElement("div");
  footer.className = "flex flex-wrap gap-2";
  footer.append(
    footerChip("car", car.mileage_km ? `${Number(car.mileage_km).toLocaleString("id-ID")} km` : "KM belum ada"),
    footerChip("seat", car.seat_count ? `${car.seat_count} kursi` : "Kursi belum ada"),
    footerChip("sparkles", lock.locked ? lock.label : "Tersedia"),
  );

  const action = document.createElement("span");
  action.className = "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[var(--pb-radius-xl)] border border-transparent bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] px-4 py-2 text-sm font-semibold text-white shadow-[var(--pb-shadow-card)]";
  action.append(createIcon("eye", { className: "block h-4 w-4 shrink-0 leading-none" }), document.createTextNode(lock.locked ? "Lihat Status" : "Lihat Detail"));

  body.append(heading, specs, priceBlock, footer, action);
  button.append(media, body);
  root.append(button);
  return root;
}

function mediaOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/58 via-slate-950/16 to-transparent";
  return overlay;
}

function badgeStack(car) {
  const lock = getListingLockStatus({ car });
  const badges = document.createElement("div");
  badges.className = "absolute left-3 top-3 z-10 grid max-w-[calc(100%-24px)] gap-2";
  if (lock.locked) {
    badges.append(Badge({ label: lock.label, variant: lock.variant }));
  }
  if (hasPromo(car)) {
    badges.append(Badge({ label: `Promo ${discountPercent(car)}%`, variant: "danger" }));
  }
  if (isCertified(car)) {
    badges.append(Badge({ label: "Inspeksi tersedia", variant: "success" }));
  }
  return badges;
}

function sliderDots(car) {
  const row = document.createElement("div");
  row.className = "absolute inset-x-0 bottom-4 z-10 flex justify-center gap-1.5 px-4";
  const count = Math.max(3, Math.min(Array.isArray(car?.images) ? car.images.length : 0, 4));

  Array.from({ length: count }).forEach((_, index) => {
    const dot = document.createElement("span");
    dot.className = index === 0
      ? "h-2.5 w-5 rounded-full bg-[var(--pb-brand-primary)] shadow"
      : "h-2.5 w-2.5 rounded-full bg-white/70";
    row.append(dot);
  });

  return row;
}

function specItem(iconName, label, value) {
  const node = document.createElement("div");
  node.className = "grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-[16px] bg-[var(--pb-surface-card)] px-3 py-2 text-left sm:grid-cols-1 sm:justify-items-center sm:bg-transparent sm:px-0 sm:py-0 sm:text-center";

  const icon = document.createElement("span");
  icon.className = "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--pb-surface-card)] text-[var(--pb-brand-secondary)] shadow-sm leading-none";
  icon.append(createIcon(iconName, { className: "block h-4 w-4 leading-none" }));

  const textWrap = document.createElement("div");
  textWrap.className = "grid min-w-0 gap-0.5";

  const caption = document.createElement("p");
  caption.className = "text-[11px] font-medium text-[var(--pb-text-muted)]";
  caption.textContent = label;

  const content = document.createElement("p");
  content.className = "break-words text-xs font-bold text-[var(--pb-text)]";
  content.textContent = value;

  textWrap.append(caption, content);
  node.append(icon, textWrap);
  return node;
}

function footerChip(iconName, label) {
  const chip = document.createElement("span");
  chip.className = "inline-flex max-w-full min-w-0 items-center gap-2 rounded-full bg-[var(--pb-surface-muted)] px-3 py-2 text-xs font-semibold text-[var(--pb-text-muted)]";
  chip.append(createIcon(iconName, { className: "block h-3.5 w-3.5 shrink-0 leading-none" }), document.createTextNode(label));
  return chip;
}

function carTitle(car = {}) {
  return [car.brand_name, car.model_name].filter(Boolean).join(" ") || `Mobil #${car.id ?? "-"}`;
}

function effectivePrice(car) {
  return hasPromo(car) ? car.price_discount : car?.price_cash ?? car?.price_credit ?? 0;
}

function hasPromo(car) {
  return Number(car?.price_discount ?? 0) > 0 && Number(car.price_discount) < Number(car?.price_cash ?? 0);
}

function discountPercent(car) {
  const cash = Number(car?.price_cash ?? 0);
  const discount = Number(car?.price_discount ?? 0);
  if (!cash || !discount || discount >= cash) {
    return 0;
  }
  return Math.round(((cash - discount) / cash) * 100);
}

function isCertified(car) {
  return ["completed", "published", "passed"].includes(String(car?.inspection_summary_status ?? "").toLowerCase());
}

function primaryImageUrl(car) {
  const images = Array.isArray(car?.images) ? car.images : [];
  const image = images.find((item) => item?.is_cover || item?.is_primary) ?? images[0] ?? null;
  const url = car?.cover_image
    ?? car?.cover_image_url
    ?? car?.image_url
    ?? car?.primary_image_url
    ?? car?.thumbnail_url
    ?? car?.photo_url
    ?? (typeof car?.image === "string" ? car.image : "")
    ?? (typeof image === "string" ? image : "")
    ?? image?.url
    ?? image?.public_url
    ?? image?.file_url
    ?? image?.file_path
    ?? "";

  return normalizeImageUrl(url);
}

function normalizeImageUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) {
    return "";
  }

  if (/^(https?:|data:image\/)/.test(value) || value.startsWith("/")) {
    return value;
  }

  return `/${value}`;
}

function fallbackCarImageUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 620">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#fff7ed"/>
          <stop offset="1" stop-color="#e5e7eb"/>
        </linearGradient>
      </defs>
      <rect width="960" height="620" rx="48" fill="url(#bg)"/>
      <path d="M230 370h500c34 0 62 28 62 62v18H168v-18c0-34 28-62 62-62Z" fill="#fb923c"/>
      <path d="M302 282h258c40 0 78 19 102 51l28 37H250l52-88Z" fill="#fdba74"/>
      <path d="M335 302h205c29 0 57 14 75 38l11 15H292l43-53Z" fill="#fff7ed"/>
      <circle cx="302" cy="454" r="48" fill="#111827"/>
      <circle cx="302" cy="454" r="22" fill="#f9fafb"/>
      <circle cx="658" cy="454" r="48" fill="#111827"/>
      <circle cx="658" cy="454" r="22" fill="#f9fafb"/>
      <path d="M216 410h540" stroke="#9a3412" stroke-width="12" stroke-linecap="round"/>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function yearFromDate(value) {
  if (!value) {
    return "";
  }
  const year = new Date(value).getFullYear();
  return Number.isFinite(year) ? String(year) : "";
}

function normalizeLabel(value) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
