import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { DataTable } from "../../../ui/composites/dataTable.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDate } from "../../../utils/formatDate.js";

export function AdminCarsPage() {
  let root = null;
  let unsubscribe = null;

  const rerender = () => render(root);

  return createPageLifecycle({
    mount() {
      root = document.createElement("div");
      rerender();
      return root;
    },
    hydrate() {
      rerender();
    },
    bindEvents() {
      unsubscribe = appStore.subscribe((state, action) => {
        if (String(action ?? "").startsWith("ui:")) {
          return;
        }
        rerender();
      });
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
    },
  });
}

function render(root) {
  if (!root) {
    return;
  }

  const cars = normalizeCars(resolveCarsPayload());

  const page = document.createElement("section");
  page.id = "adcars_page_section";
  page.className = "grid min-w-0 gap-6";
  page.dataset.ds = "admin.cars.page";

  page.append(
    heroSection(cars.length),
    carsTable(cars),
  );

  root.replaceChildren(page);
}

function heroSection(count) {
  const section = document.createElement("section");
  section.id = "adcars_hero_section";
  section.className = "grid gap-4 rounded-[1.75rem] border border-white/78 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(255,247,237,0.78))] p-5 shadow-[0_22px_70px_rgba(15,23,42,0.08)] md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:p-6";
  applyDesignHook(section, "shared.section_header");

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-2";
  copy.append(
    textNode("p", "text-xs font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", "Admin Listing"),
    textNode("h1", "break-words text-2xl font-black tracking-normal text-[var(--pb-text)] md:text-3xl", "Admin Cars"),
    textNode("p", "max-w-3xl text-sm font-semibold leading-6 text-[var(--pb-text-muted)]", "Monitoring mobil memakai data admin yang sama dengan dashboard/preload, tanpa mutation atau fetch langsung dari komponen halaman."),
  );

  const metric = document.createElement("section");
  metric.className = "inline-grid w-fit gap-1 rounded-[1.35rem] border border-[var(--pb-border)] bg-white/82 px-4 py-3 shadow-sm";
  metric.append(
    textNode("span", "text-[11px] font-black uppercase tracking-[0.16em] text-gray-500", "Loaded"),
    textNode("strong", "text-2xl font-black text-[var(--pb-text)]", String(count)),
  );

  section.append(copy, metric);
  return section;
}

function carsTable(cars) {
  return DataTable({
    shellId: "adcars_table_section",
    title: "Daftar Mobil",
    subtitle: cars.length ? `${cars.length} listing dari preload admin` : "Listing admin akan tampil setelah data tersedia.",
    icon: iconBox("car"),
    columns: [
      { label: "Listing", render: (car) => listingCell(car) },
      { label: "Seller", render: (car) => sellerCell(car) },
      { label: "Status", render: (car) => statusBadge(car.listing_status) },
      { label: "Harga", render: (car) => textNode("span", "text-sm font-black text-[var(--pb-brand-secondary)]", formatCurrency(carPrice(car))) },
      { label: "Inspection", render: (car) => inspectionBadge(car) },
      { label: "Updated", render: (car) => textNode("span", "text-sm font-semibold text-[var(--pb-text-strong)]", formatDate(car.updated_at ?? car.created_at)) },
    ],
    rows: cars,
    emptyTitle: "Belum ada listing",
    emptyDescription: "Data cars admin belum tersedia di snapshot/preload saat ini.",
    mobileMode: "stack",
    tableMinWidth: "min-w-[940px]",
    getRowKey: (car) => car.id ?? car.car_id,
    mobileCardId: (car) => `adcars_${car.id ?? car.car_id ?? "unknown"}_card`,
    mobileCardTitle: (car) => carTitle(car),
    mobileCardSubtitle: (car) => carSubtitle(car),
    mobileCardBadges: (car) => [statusBadge(car.listing_status), inspectionBadge(car)],
    mobileCardFields: (car) => [
      { label: "Seller", value: sellerLabel(car) },
      { label: "Harga", value: formatCurrency(carPrice(car)) },
      { label: "Updated", value: formatDate(car.updated_at ?? car.created_at) },
    ],
  });
}

function resolveCarsPayload() {
  return appStore.get("working.adminCars.cars.data", null)
    ?? appStore.get("snapshot.admin.cars.data", null)
    ?? appStore.get("working.adminDashboard.cars.data", null)
    ?? { cars: [] };
}

function normalizeCars(payload) {
  if (Array.isArray(payload)) {
    return payload.filter(Boolean);
  }
  if (Array.isArray(payload?.cars)) {
    return payload.cars.filter(Boolean);
  }
  if (Array.isArray(payload?.data?.cars)) {
    return payload.data.cars.filter(Boolean);
  }
  return [];
}

function listingCell(car) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("p", "break-words text-sm font-black text-[var(--pb-text)]", carTitle(car)),
    textNode("p", "break-words text-xs font-semibold text-[var(--pb-text-muted)]", carSubtitle(car)),
  );
  return wrap;
}

function sellerCell(car) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("p", "break-words text-sm font-black text-[var(--pb-text)]", sellerLabel(car)),
    textNode("p", "break-words text-xs font-semibold text-[var(--pb-text-muted)]", car.seller?.email ?? car.seller_email ?? "Seller terdaftar"),
  );
  return wrap;
}

function statusBadge(status) {
  const normalized = String(status ?? "").toLowerCase();
  const map = {
    published: { label: "Published", variant: "success" },
    draft: { label: "Draft", variant: "warning" },
    pending: { label: "Pending", variant: "warning" },
    pending_approval: { label: "Pending Approval", variant: "warning" },
    reserved: { label: "Reserved", variant: "info" },
    sold: { label: "Sold", variant: "default" },
    archived: { label: "Archived", variant: "default" },
    rejected: { label: "Rejected", variant: "danger" },
  };
  const meta = map[normalized] ?? { label: statusLabel(status), variant: "default" };
  return Badge({ label: meta.label, variant: meta.variant, designHook: "shared.badge.status" });
}

function inspectionBadge(car) {
  const status = car.inspection_summary_status
    ?? car.inspection_status
    ?? car.inspection?.summary_status
    ?? car.inspection?.status
    ?? "";
  if (!status) {
    return Badge({ label: "Belum ada", variant: "default", designHook: "shared.badge.status" });
  }
  const normalized = String(status).toLowerCase();
  const variant = ["passed", "approved", "ready", "complete", "completed"].includes(normalized)
    ? "success"
    : ["failed", "rejected"].includes(normalized)
      ? "danger"
      : "warning";
  return Badge({ label: statusLabel(status), variant, designHook: "shared.badge.status" });
}

function carTitle(car = {}) {
  return [car.brand_name, car.model_name, car.sub_model_name].filter(Boolean).join(" ") || `Mobil #${car.id ?? car.car_id ?? "-"}`;
}

function carSubtitle(car = {}) {
  return [
    car.year ?? car.production_year,
    car.plate_number,
    car.location_name,
  ].filter(Boolean).join(" - ") || `Listing #${car.id ?? car.car_id ?? "-"}`;
}

function sellerLabel(car = {}) {
  return car.seller?.name
    ?? car.seller_name
    ?? car.showroom_name
    ?? (car.seller_user_id ? `Seller #${car.seller_user_id}` : "Seller terdaftar");
}

function carPrice(car = {}) {
  return car.price_discount ?? car.price_cash ?? car.price_credit ?? car.price ?? 0;
}

function statusLabel(status) {
  return String(status ?? "-").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function iconBox(icon) {
  const box = document.createElement("span");
  box.className = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pb-brand-primary)] text-white shadow-[var(--pb-shadow-soft)]";
  box.append(createIcon(icon, { className: "block h-4 w-4 leading-none" }));
  return box;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
