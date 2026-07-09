import { createIcon } from "../../../theme/iconRegistry.js";

const FILTERS = [
  { value: "all", label: "Semua", icon: "list" },
  { value: "unread", label: "Belum Dibaca", icon: "envelope" },
  { value: "read", label: "Sudah Dibaca", icon: "eye" },
];

export function NotificationFilterTabs({ active = "all", onChange = null } = {}) {
  const wrap = document.createElement("section");
  wrap.className = "flex min-h-11 min-w-0 items-center justify-center gap-2 pb-1";
  wrap.setAttribute("aria-label", "Filter notifikasi");

  FILTERS.forEach((filter) => {
    const isActive = filter.value === active;
    const button = document.createElement("button");
    button.type = "button";

    if (isActive) {
      button.className =
        "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-transparent bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] px-4 py-2 text-sm font-black text-white shadow-[var(--pb-shadow-card)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
    } else {
      button.className =
        "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[var(--pb-border)] bg-[var(--pb-surface-card)] px-2 py-2 text-sm font-black text-[var(--pb-text-strong)] shadow-[var(--pb-shadow-soft)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
    }

    button.append(createIcon(filter.icon, { className: "block h-4 w-4 leading-none" }));

    if (isActive) {
      button.append(" ", filter.label);
    }

    button.setAttribute("aria-pressed", isActive ? "true" : "false");
    button.setAttribute("aria-label", filter.label);
    button.addEventListener("click", () => onChange?.(filter.value));
    wrap.append(button);
  });

  return wrap;
}
