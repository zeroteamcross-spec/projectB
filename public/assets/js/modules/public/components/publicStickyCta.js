import { Button } from "../../../ui/primitives/button.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { getListingLockStatus } from "../../../utils/transactionStatus.js";

export function PublicStickyCta({ car, onStartTransaction = null, onConsult = null } = {}) {
  const bar = document.createElement("div");
  bar.className = "fixed inset-x-0 bottom-0 z-20 border-t border-white/70 bg-white/95 px-4 py-3 shadow-card backdrop-blur sm:hidden";
  applyDesignHook(bar, "public.car_detail.sticky_cta");
  const lock = getListingLockStatus({ car });

  const content = document.createElement("div");
  content.className = "mx-auto grid max-w-6xl gap-3";

  const summary = document.createElement("div");
  summary.className = "flex items-center justify-between gap-3";

  const copy = document.createElement("div");
  copy.className = "min-w-0";

  const title = document.createElement("p");
  title.className = "truncate text-sm font-semibold text-gray-900";
  title.textContent = [car?.brand_name, car?.model_name].filter(Boolean).join(" ") || "Mobil pilihan";

  const price = document.createElement("p");
  price.className = "text-xs font-medium text-orange-700";
  price.textContent = car?.price_discount || car?.price_cash || car?.price_credit
    ? formatStickyPrice(car)
    : "Konsultasikan harga";

  copy.append(title, price);

  const badge = document.createElement("span");
  badge.className = lock.locked
    ? "rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-normal text-gray-700"
    : "rounded-full bg-orange-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-normal text-orange-700";
  badge.textContent = lock.locked ? lock.label : "Ready";

  summary.append(copy, badge);

  const actions = document.createElement("div");
  actions.className = "grid grid-cols-[1fr_auto] gap-3";

  const primary = Button({
    label: lock.locked ? lock.label : "Booking Sekarang",
    variant: "primary",
    disabled: lock.locked,
    onClick: lock.locked ? null : () => onStartTransaction?.(car),
    designHook: "shared.button.primary",
  });
  primary.classList.add("w-full");

  const secondary = Button({
    label: "WhatsApp",
    variant: "secondary",
    onClick: () => onConsult?.(car),
    designHook: "shared.button.secondary",
  });
  secondary.classList.add("px-3");

  actions.append(primary, secondary);
  content.append(summary, actions);
  bar.append(content);
  return bar;
}

function formatStickyPrice(car) {
  const value = Number(car?.price_discount ?? 0) > 0 && Number(car.price_discount) < Number(car?.price_cash ?? 0)
    ? Number(car.price_discount)
    : Number(car?.price_cash ?? car?.price_credit ?? 0);

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
