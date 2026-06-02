import { createIcon } from "../../../theme/iconRegistry.js";

const ICON_MAP = {
  payment: "creditCard",
  transaction: "shoppingBag",
  message: "message",
  offer: "tag",
  security: "shield",
  commission: "commission",
  settlement: "wallet",
  inspection: "clipboard",
  listing: "car",
  system: "bell",
  transaction_paid: "creditCard",
  transaction_new: "shoppingBag",
  transaction_processing: "shoppingBag",
  transaction_completed: "circleCheck",
  message_new: "message",
  security_alert: "shield",
  commission_accrued: "commission",
  settlement_paid: "wallet",
  inspection_needed: "clipboard",
  listing_approved: "car",
  listing_rejected: "triangleWarning",
  system_message: "bell",
};

const TONE_MAP = {
  payment: "blue",
  transaction: "red",
  message: "blue",
  offer: "green",
  security: "purple",
  commission: "green",
  settlement: "green",
  inspection: "blue",
  listing: "blue",
  system: "blue",
  transaction_paid: "blue",
  transaction_new: "red",
  transaction_processing: "red",
  transaction_completed: "green",
  message_new: "blue",
  security_alert: "purple",
  commission_accrued: "green",
  settlement_paid: "green",
  inspection_needed: "blue",
  listing_approved: "green",
  listing_rejected: "red",
  system_message: "blue",
};

export function NotificationIcon({ item = {} } = {}) {
  const key = String(item.iconKey ?? item.icon_key ?? item.type ?? "system").trim() || "system";
  const iconName = ICON_MAP[key] ?? "bell";
  const tone = TONE_MAP[key] ?? "blue";

  const wrap = document.createElement("span");
  wrap.className = `pb-notification-icon pb-notification-icon--${tone}`;
  wrap.setAttribute("aria-hidden", "true");
  wrap.append(createIcon(iconName, { className: "pb-notification-icon__svg" }));
  return wrap;
}
