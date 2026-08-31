import { createIcon } from "../../../theme/iconRegistry.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { notificationService } from "../services/notificationService.js";
import { NotificationItem } from "./notificationItem.js";
import { navigateToLink } from "../utils/navigateToLink.js";

export function NotificationPopover({
  id = "ntf_popover",
  open = false,
  snapshot = {},
  onClose = null,
  onNavigate = null,
} = {}) {
  const popover = document.createElement("section");
  popover.id = id;
  popover.className = open ? "pb-notification-popover is-open" : "pb-notification-popover";
  popover.hidden = !open;
  popover.setAttribute("aria-hidden", open ? "false" : "true");

  const pointer = document.createElement("span");
  pointer.className = "pb-notification-popover__pointer";
  pointer.setAttribute("aria-hidden", "true");

  const header = document.createElement("section");
  header.className = "pb-notification-popover__header";

  const title = document.createElement("h2");
  title.className = "pb-notification-popover__title";
  title.textContent = "Notifikasi";

  const markAll = document.createElement("button");
  markAll.type = "button";
  markAll.className = "pb-notification-popover__mark";
  markAll.textContent = snapshot.isMarkingAllRead ? "Memproses..." : "Tandai semua dibaca";
  markAll.disabled = Boolean(snapshot.isMarkingAllRead || !Number(snapshot.unreadCount ?? 0));
  markAll.addEventListener("click", async () => {
    try {
      await notificationService.markAllRead();
      showToast("Semua notifikasi ditandai dibaca.", { type: "success" });
    } catch (error) {
      showToast(error.message || "Gagal menandai semua notifikasi.", { type: "error" });
    }
  });

  header.append(title, markAll);

  const list = document.createElement("section");
  list.className = "pb-notification-popover__list";
  const items = Array.isArray(snapshot.items) ? snapshot.items.slice(0, 5) : [];

  if (snapshot.error) {
    list.append(stateBlock({
      title: "Notifikasi belum bisa dimuat",
      body: "Coba lagi nanti.",
      icon: "triangleWarning",
    }));
  } else if (!items.length) {
    list.append(stateBlock({
      title: "Belum ada notifikasi",
      body: "Aktivitas penting akan muncul di sini.",
      icon: "bell",
    }));
  } else {
    items.forEach((item) => {
      list.append(NotificationItem({ item, onNavigate, onClose }));
    });
  }

  const footer = document.createElement("button");
  footer.type = "button";
  footer.className = "pb-notification-popover__footer";
  footer.addEventListener("click", () => {
    onClose?.();
    navigateToLink("/notifications", onNavigate);
  });

  const footerLabel = document.createElement("span");
  footerLabel.className = "pb-notification-popover__footer-label";
  footerLabel.append(
    iconWrap("bell", "pb-notification-popover__footer-icon"),
    textNode("span", "Lihat semua notifikasi"),
  );

  footer.append(footerLabel, iconWrap("chevronRight", "pb-notification-popover__chevron"));
  popover.append(pointer, header, list, footer);
  return popover;
}

function stateBlock({ title, body, icon }) {
  const wrap = document.createElement("section");
  wrap.className = "pb-notification-popover__state";
  wrap.append(
    iconWrap(icon, "pb-notification-popover__state-icon"),
    textNode("h3", title),
    textNode("p", body),
  );
  return wrap;
}

function iconWrap(icon, className) {
  const wrap = document.createElement("span");
  wrap.className = className;
  wrap.append(createIcon(icon, { className: "block h-4 w-4 leading-none" }));
  return wrap;
}

function textNode(tagName, text) {
  const node = document.createElement(tagName);
  node.textContent = text ?? "";
  return node;
}
