import { notificationService } from "../services/notificationService.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { NotificationIcon } from "./notificationIcon.js";
import { navigateToLink } from "../utils/navigateToLink.js";

export function NotificationItem({
  item = {},
  onNavigate = null,
  onClose = null,
} = {}) {
  const article = document.createElement("article");
  article.className = "pb-notification-item";
  article.id = `ntf_item_${safeId(item.id)}`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "pb-notification-item__button";
  button.addEventListener("click", async () => {
    const unread = !readFlag(item);

    try {
      if (unread && item.id) {
        await notificationService.markRead(item.id);
      }

      const link = item.linkUrl ?? item.link_url ?? "";
      if (link) {
        onClose?.();
        navigateToLink(link, onNavigate);
      }
    } catch (error) {
      showToast(error.message || "Gagal menandai notifikasi.", { type: "error" });
    }
  });

  const dot = document.createElement("span");
  dot.className = readFlag(item)
    ? "pb-notification-item__dot pb-notification-item__dot--hidden"
    : "pb-notification-item__dot";
  dot.setAttribute("aria-hidden", "true");

  const content = document.createElement("section");
  content.className = "pb-notification-item__content";
  content.append(
    textNode("h3", item.title || "Notifikasi"),
    textNode("p", item.body || "Aktivitas baru tersedia."),
  );

  const time = textNode("span", relativeTime(item.createdAt ?? item.created_at));
  time.className = "pb-notification-item__time";

  button.append(dot, NotificationIcon({ item }), content, time);
  article.append(button);
  return article;
}

function readFlag(item = {}) {
  return Boolean(item.isRead ?? item.is_read);
}

function relativeTime(value) {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "";
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
