import { Badge } from "../../../ui/primitives/badge.js";
import { Card } from "../../../ui/composites/card.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { getListingLockStatus } from "../../../utils/transactionStatus.js";

export function PublicCarCard({
  car,
  onOpenDetail = null,
  showFavorite = false,
  isFavorite = false,
  onToggleFavorite = null,
} = {}) {
  const lock = getListingLockStatus({ car });
  const root = Card([], { designHook: "catalog.card.root" });
  root.className = "group relative overflow-hidden rounded-[22px] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-0 shadow-[var(--pb-shadow-card)] backdrop-blur";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "block w-full min-w-0 text-left focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  button.addEventListener("click", () => onOpenDetail?.(car));

  const media = document.createElement("div");
  media.className = "relative aspect-[1.82/1] overflow-hidden bg-[var(--pb-surface-muted)]";

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
  body.className = "grid gap-2 bg-[var(--pb-surface-card)] px-3 pb-3 pt-2.5";

  const heading = document.createElement("div");
  heading.className = "grid gap-0.5";

  const title = document.createElement("h2");
  title.className = "line-clamp-2 break-words text-sm font-semibold leading-5 tracking-normal text-[var(--pb-text)]";
  title.textContent = carTitle(car);

  const subtitle = document.createElement("p");
  subtitle.className = "line-clamp-1 break-words text-xs leading-4 text-[var(--pb-text-muted)]";
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
  priceBlock.className = "grid gap-1.5 rounded-[16px] border border-[color-mix(in_srgb,var(--pb-brand-primary)_24%,white)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] px-3 py-2";
  applyDesignHook(priceBlock, "catalog.card.price");

  const priceRow = document.createElement("div");
  priceRow.className = "flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5";

  const price = document.createElement("strong");
  price.className = "break-words text-base font-black leading-none tracking-normal text-[var(--pb-brand-secondary)]";
  price.textContent = formatCurrency(effectivePrice(car));
  priceRow.append(price);

  if (hasPromo(car)) {
    const original = document.createElement("span");
    original.className = "text-[11px] font-semibold leading-none text-[var(--pb-text-muted)] line-through";
    original.textContent = formatCurrency(car.price_cash);
    priceRow.append(original);
  }

  const hint = document.createElement("span");
  hint.className = "line-clamp-1 break-words text-[11px] font-semibold leading-4 text-[var(--pb-text-muted)]";
  hint.textContent = lock.locked ? "Detail, gallery, dan konsultasi" : "Detail, gallery, inspeksi, dan transaksi";
  priceBlock.append(priceRow, hint);

  const footer = document.createElement("div");
  footer.className = "flex flex-wrap gap-1.5";
  footer.append(
    footerChip("car", car.mileage_km ? `${Number(car.mileage_km).toLocaleString("id-ID")} km` : "KM belum ada"),
    footerChip("seat", car.seat_count ? `${car.seat_count} kursi` : "Kursi belum ada"),
    footerChip("sparkles", lock.locked ? lock.label : "Tersedia"),
  );

  const action = document.createElement("span");
  action.className = "inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-[var(--pb-radius-lg)] border border-transparent bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--pb-shadow-card)]";
  action.append(createIcon("eye", { className: "block h-3.5 w-3.5 shrink-0 leading-none" }), document.createTextNode(lock.locked ? "Lihat Status" : "Lihat Detail"));

  body.append(heading, specs, priceBlock, footer, action);
  button.append(media, body);
  root.append(button);

  if (showFavorite) {
    root.append(favoriteToggle({ car, isFavorite, onToggleFavorite }));
  }

  return root;
}

/**
 * Sits above the card button rather than inside it, so tapping the heart never
 * opens the car detail.
 */
function favoriteToggle({ car, isFavorite, onToggleFavorite }) {
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.dataset.favoriteToggle = String(car?.id ?? "");
  toggle.setAttribute("aria-pressed", isFavorite ? "true" : "false");
  toggle.setAttribute(
    "aria-label",
    isFavorite ? `Hapus ${carTitle(car)} dari favorit` : `Simpan ${carTitle(car)} ke favorit`
  );
  toggle.title = isFavorite ? "Hapus dari favorit" : "Simpan ke favorit";
  toggle.className = favoriteToggleClassName(isFavorite);
  toggle.append(createIcon("heart", { className: "block h-4 w-4 shrink-0 leading-none" }));

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (toggle.disabled) {
      return;
    }

    toggle.disabled = true;
    Promise.resolve(onToggleFavorite?.(car))
      .catch(() => null)
      .finally(() => {
        toggle.disabled = false;
      });
  });

  return toggle;
}

function favoriteToggleClassName(active) {
  const base = "absolute right-2.5 top-2.5 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-[var(--pb-shadow-card)] transition disabled:opacity-60";

  return active
    ? `${base} border-transparent bg-[var(--pb-brand-primary)] text-white`
    : `${base} border-[var(--pb-border)] bg-white/90 text-[var(--pb-text-muted)] hover:text-[var(--pb-brand-primary)]`;
}

function mediaOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/58 via-slate-950/16 to-transparent";
  return overlay;
}

function badgeStack(car) {
  const lock = getListingLockStatus({ car });
  const badges = document.createElement("div");
  badges.className = "absolute left-2.5 top-2.5 z-10 grid max-w-[calc(100%-20px)] gap-1.5 text-[10px]";
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
  row.className = "absolute inset-x-0 bottom-2.5 z-10 flex justify-center gap-1 px-3";
  const count = Math.max(3, Math.min(Array.isArray(car?.images) ? car.images.length : 0, 4));

  Array.from({ length: count }).forEach((_, index) => {
    const dot = document.createElement("span");
    dot.className = index === 0
      ? "h-1.5 w-4 rounded-full bg-[var(--pb-brand-primary)] shadow"
      : "h-1.5 w-1.5 rounded-full bg-white/70";
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
  chip.className = "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full bg-[var(--pb-surface-muted)] px-2.5 py-1.5 text-[11px] font-semibold leading-none text-[var(--pb-text-muted)]";
  chip.append(createIcon(iconName, { className: "block h-3 w-3 shrink-0 leading-none" }), document.createTextNode(label));
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
