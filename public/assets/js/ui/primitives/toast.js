import { uiStore } from "../../state/uiStore.js";
import { appStore } from "../../state/store.js";
import { cx, tw } from "../theme/tailwindClasses.js";
import { createIcon } from "../../theme/iconRegistry.js";

const recentToastKeys = new Map();

export function showToast(message, { type = "info", timeout = 3000, key = "", dedupeMs = 1500 } = {}) {
  const dedupeKey = normalizeDedupeKey(key);
  const now = Date.now();

  if (dedupeKey) {
    const recent = recentToastKeys.get(dedupeKey);
    if (recent && now - recent.createdAt < dedupeMs) {
      return recent.id;
    }
  }

  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  uiStore.pushToast({ id, message, type });

  if (dedupeKey) {
    recentToastKeys.set(dedupeKey, { id, createdAt: now });
    window.setTimeout(() => {
      const recent = recentToastKeys.get(dedupeKey);
      if (recent?.id === id) {
        recentToastKeys.delete(dedupeKey);
      }
    }, Math.max(dedupeMs, 0));
  }

  if (timeout > 0) {
    window.setTimeout(() => uiStore.removeToast(id), timeout);
  }

  return id;
}

export function bindToastContainer(container) {
  const element = typeof container === "string" ? document.querySelector(container) : container;
  if (!element) {
    return () => {};
  }
  const rendered = new Map();

  element.className = "pointer-events-none fixed inset-x-3 top-[max(1rem,env(safe-area-inset-top))] z-[9999] grid justify-items-end gap-3 sm:inset-x-auto sm:right-5 sm:w-[min(420px,calc(100vw-40px))]";
  element.setAttribute("aria-live", "polite");
  element.setAttribute("aria-relevant", "additions text");

  return appStore.subscribe((state) => {
    const toasts = state?.ui?.toasts ?? [];
    const activeIds = new Set(toasts.map((toast) => String(toast.id)));

    rendered.forEach((node, id) => {
      if (!activeIds.has(id)) {
        node.remove();
        rendered.delete(id);
      }
    });

    toasts.forEach((toast) => {
      const id = String(toast.id);
      let node = rendered.get(id);

      if (!node) {
        node = toastNode(toast);
        rendered.set(id, node);
      } else {
        updateToastNode(node, toast);
      }

      if (node.parentNode !== element || element.lastElementChild !== node) {
        element.append(node);
      }
    });
  });
}

function toastNode(toast) {
  const config = toastConfig(toast.type);
  const item = document.createElement("section");
  item.id = `pb_toast_${safeId(toast.id)}_section`;
  item.className = cx(tw.toast.base, config.shell);
  item.setAttribute("role", toast.type === "error" ? "alert" : "status");

  const accent = document.createElement("span");
  accent.className = cx("absolute inset-y-3 left-0 w-1 rounded-r-full", config.accent);

  const iconWrap = document.createElement("span");
  iconWrap.className = cx("grid h-10 w-10 shrink-0 place-items-center rounded-2xl border bg-white shadow-sm", config.iconWrap);
  iconWrap.append(createIcon(config.icon, { className: "h-4 w-4" }));

  const copy = document.createElement("span");
  copy.className = "grid min-w-0 gap-0.5";
  const title = document.createElement("span");
  title.className = "text-xs font-black text-gray-950";
  title.textContent = config.title;
  const message = document.createElement("span");
  message.className = "break-words text-xs font-semibold leading-5 text-gray-600";
  message.dataset.toastMessage = "true";
  message.textContent = toast.message ?? "";
  copy.append(title, message);

  const close = document.createElement("button");
  close.id = `pb_toast_${safeId(toast.id)}_close_button`;
  close.type = "button";
  close.className = "pointer-events-auto grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 bg-white/80 text-gray-500 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  close.setAttribute("aria-label", "Tutup notifikasi");
  close.append(createIcon("circleXmark", { className: "h-4 w-4" }));
  close.addEventListener("click", () => uiStore.removeToast(toast.id));

  item.append(accent, iconWrap, copy, close);
  return item;
}

function updateToastNode(node, toast) {
  const message = node.querySelector("[data-toast-message='true']");
  if (message && message.textContent !== (toast.message ?? "")) {
    message.textContent = toast.message ?? "";
  }
}

function toastConfig(type = "info") {
  const map = {
    success: {
      title: "Berhasil",
      icon: "circleCheck",
      shell: "border-[color-mix(in_srgb,var(--pb-success)_14%,white)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(236,246,239,0.94),rgba(234,244,249,0.90))]",
      accent: "bg-[var(--pb-success)]",
      iconWrap: "border-[color-mix(in_srgb,var(--pb-success)_14%,white)] text-[var(--pb-success)]",
    },
    error: {
      title: "Gagal",
      icon: "triangleWarning",
      shell: "border-[color-mix(in_srgb,var(--pb-danger)_14%,white)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(251,238,238,0.96),rgba(250,244,237,0.88))]",
      accent: "bg-[var(--pb-danger)]",
      iconWrap: "border-[color-mix(in_srgb,var(--pb-danger)_14%,white)] text-[var(--pb-danger)]",
    },
    warning: {
      title: "Perhatian",
      icon: "triangleWarning",
      shell: "border-[color-mix(in_srgb,var(--pb-warning)_14%,white)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(250,244,237,0.96),rgba(234,244,249,0.84))]",
      accent: "bg-[var(--pb-warning)]",
      iconWrap: "border-[color-mix(in_srgb,var(--pb-warning)_14%,white)] text-[var(--pb-warning)]",
    },
    info: {
      title: "Informasi",
      icon: "info",
      shell: "border-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(234,244,249,0.96),rgba(234,244,249,0.84))]",
      accent: "bg-[var(--pb-brand-primary)]",
      iconWrap: "border-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)] text-[var(--pb-brand-primary)]",
    },
  };

  return map[type] ?? map.info;
}

function safeId(value) {
  return String(value ?? "toast")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "toast";
}

function normalizeDedupeKey(value) {
  return String(value ?? "").trim();
}
