import { createIcon } from "../../../theme/iconRegistry.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { notificationService } from "../services/notificationService.js";
import { NotificationIcon } from "./notificationIcon.js";

export function NotificationsPageList({
  items = [],
  markingIds = {},
  onNavigate = null,
  onChange = null,
  variant = "default",
} = {}) {
  const list = document.createElement("section");
  list.className = variant === "buyer"
    ? "grid min-w-0 content-start gap-3"
    : "grid min-w-0 content-start overflow-hidden rounded-[var(--pb-radius-2xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] shadow-[var(--pb-shadow-card)]";

  items.forEach((item) => {
    list.append(NotificationPageItem({ item, marking: Boolean(markingIds[item.id]), onNavigate, onChange, variant }));
  });

  return list;
}

function NotificationPageItem({ item, marking = false, onNavigate = null, onChange = null, variant = "default" } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = itemClassName({ read: item.isRead, variant });
  button.disabled = marking;
  button.id = `ntf_page_item_${safeId(item.id)}`;

  const dot = document.createElement("span");
  dot.className = item.isRead
    ? "h-2.5 w-2.5 rounded-full bg-[var(--pb-danger)] opacity-0"
    : "h-2.5 w-2.5 rounded-full bg-[var(--pb-danger)]";
  dot.setAttribute("aria-hidden", "true");

  const content = document.createElement("section");
  content.className = "grid min-w-0 gap-2";

  const titleRow = document.createElement("section");
  titleRow.className = "flex min-w-0 flex-wrap items-center gap-2";
  const title = document.createElement("h2");
  title.className = "min-w-0 break-words text-base font-black leading-tight tracking-normal text-[var(--pb-text)]";
  title.textContent = item.title || "Notifikasi";
  titleRow.append(title, statusBadge(item.isRead));

  const body = document.createElement("p");
  body.className = "break-words text-sm font-semibold leading-6 text-[var(--pb-text-muted)]";
  body.textContent = item.body || "Aktivitas baru tersedia.";

  const meta = document.createElement("section");
  meta.className = "flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold text-[var(--pb-text-muted)]";
  meta.append(textNode("span", relativeTime(item.createdAt)), typeBadge(item));

  content.append(titleRow, body, meta);

  const action = document.createElement("span");
  action.className = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--pb-text-muted)]";
  action.append(createIcon(item.linkUrl ? "chevronRight" : "bell", { className: "block h-4 w-4 leading-none" }));

  button.append(dot, NotificationIcon({ item }), content, action);
  button.addEventListener("click", async () => {
    try {
      if (!item.isRead) {
        await notificationService.markRead(item.id);
        onChange?.();
      }

      if (item.linkUrl) {
        navigate(item.linkUrl, onNavigate);
      }
    } catch (error) {
      showToast(error.message || "Gagal menandai notifikasi.", { type: "error" });
    }
  });

  return button;
}

function itemClassName({ read, variant }) {
  if (variant === "buyer") {
    return read
      ? "grid min-h-[122px] min-w-0 grid-cols-[10px_50px_minmax(0,1fr)_auto] items-start gap-3 rounded-[1.35rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-4 text-left shadow-[var(--pb-shadow-soft)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] sm:grid-cols-[10px_58px_minmax(0,1fr)_auto] sm:p-5"
      : "grid min-h-[122px] min-w-0 grid-cols-[10px_50px_minmax(0,1fr)_auto] items-start gap-3 rounded-[1.35rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_22%,var(--pb-border))] bg-[color-mix(in_srgb,var(--pb-brand-primary)_7%,white)] p-4 text-left shadow-[var(--pb-shadow-card)] transition hover:bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] sm:grid-cols-[10px_58px_minmax(0,1fr)_auto] sm:p-5";
  }

  return "grid min-h-[104px] min-w-0 grid-cols-[12px_54px_minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--pb-border)] bg-transparent px-4 py-4 text-left transition last:border-b-0 hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--pb-form-focus)] sm:grid-cols-[12px_58px_minmax(0,1fr)_auto] sm:px-5";
}

function statusBadge(read) {
  const badge = document.createElement("span");
  badge.className = read
    ? "inline-flex rounded-full bg-[var(--pb-badge-neutral-bg)] px-2.5 py-1 text-[11px] font-black text-[var(--pb-text-strong)]"
    : "inline-flex rounded-full bg-[color-mix(in_srgb,var(--pb-danger)_12%,white)] px-2.5 py-1 text-[11px] font-black text-[var(--pb-danger)]";
  badge.textContent = read ? "Dibaca" : "Belum dibaca";
  return badge;
}

function typeBadge(item) {
  const badge = document.createElement("span");
  badge.className = "inline-flex rounded-full border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] px-2 py-0.5 text-[11px] font-bold text-[var(--pb-text-strong)]";
  badge.textContent = String(item.type ?? "system_message").replace(/_/g, " ");
  return badge;
}

function navigate(link, onNavigate) {
  const value = String(link ?? "").trim();
  if (!value) {
    return;
  }

  if (typeof onNavigate === "function") {
    onNavigate(value);
    return;
  }

  window.location.hash = value.startsWith("#") ? value : `#${value.startsWith("/") ? value : `/${value}`}`;
}

function relativeTime(value) {
  if (!value) {
    return "Waktu tidak tersedia";
  }

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "Waktu tidak tersedia";
  }

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return "Baru saja";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m lalu`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}j lalu`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}h lalu`;
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function textNode(tagName, text) {
  const node = document.createElement(tagName);
  node.textContent = text ?? "";
  return node;
}

function safeId(value) {
  return String(value ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";
}
