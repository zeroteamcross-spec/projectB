const FILTERS = [
  { value: "all", label: "Semua" },
  { value: "unread", label: "Belum Dibaca" },
  { value: "read", label: "Sudah Dibaca" },
];

export function NotificationFilterTabs({ active = "all", onChange = null } = {}) {
  const wrap = document.createElement("section");
  wrap.className = "flex min-h-11 min-w-0 gap-2 overflow-x-auto pb-1";
  wrap.setAttribute("aria-label", "Filter notifikasi");

  FILTERS.forEach((filter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = filter.value === active
      ? "inline-flex min-h-10 min-w-[8.75rem] shrink-0 items-center justify-center rounded-full border border-transparent bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] px-4 py-2 text-sm font-black text-white shadow-[var(--pb-shadow-card)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
      : "inline-flex min-h-10 min-w-[8.75rem] shrink-0 items-center justify-center rounded-full border border-[var(--pb-border)] bg-[var(--pb-surface-card)] px-4 py-2 text-sm font-black text-[var(--pb-text-strong)] shadow-[var(--pb-shadow-soft)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
    button.textContent = filter.label;
    button.setAttribute("aria-pressed", filter.value === active ? "true" : "false");
    button.addEventListener("click", () => onChange?.(filter.value));
    wrap.append(button);
  });

  return wrap;
}
