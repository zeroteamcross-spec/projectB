import { appStore } from "../../../state/store.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { notificationService } from "../services/notificationService.js";
import { NotificationPopover } from "./notificationPopover.js";

const STYLE_ID = "pb-notification-components-style";
const OVERLAY_ROOT_ID = "notification_overlay_root";

export function NotificationBell({
  idPrefix = "ntf",
  onNavigate = null,
  compact = false,
  subscribe = true,
  withBackdrop = false,
} = {}) {
  ensureNotificationStyles();

  const host = document.createElement("section");
  host.className = "pb-notification-bell";
  host.id = `${idPrefix}_notification_host`;

  let open = false;
  let disposed = false;
  let unsubscribeState = null;
  let removeOutsideClick = null;
  let removeViewportSync = null;
  let backdropNode = null;
  let portalPopoverNode = null;

  const close = () => {
    if (!open) {
      return;
    }
    open = false;
    detachOutsideClick();
    removeOverlayNodes();
    render();
  };

  const handleRouteChange = () => close();

  const render = () => {
    if (disposed) {
      return;
    }
    detachOutsideClick();
    removeOverlayNodes();

    const auth = appStore.get("auth", {});
    if (!auth?.isAuthenticated) {
      host.hidden = true;
      host.classList.remove("is-open");
      host.replaceChildren();
      open = false;
      return;
    }

    host.hidden = false;
    host.classList.toggle("is-open", open);
    const snapshotState = notificationService.snapshot();
    const workingState = notificationService.working();
    const snapshot = {
      ...snapshotState,
      isMarkingAllRead: workingState.isMarkingAllRead,
    };
    const unreadCount = Number(snapshot.unreadCount ?? 0);
    const popoverId = `${idPrefix}_ntf_popover`;
    const backdropId = `${idPrefix}_ntf_backdrop`;

    const button = document.createElement("button");
    button.id = `${idPrefix}_ntf_bell_button`;
    button.type = "button";
    button.className = compact
      ? "pb-notification-bell__button pb-notification-bell__button--compact"
      : "pb-notification-bell__button";
    button.setAttribute("aria-label", open ? "Tutup notifikasi" : "Buka notifikasi");
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", open ? "true" : "false");
    button.setAttribute("aria-controls", popoverId);
    button.addEventListener("click", () => {
      open = !open;
      render();
    });
    button.append(createIcon("bell", { className: "pb-notification-bell__icon" }));

    if (unreadCount > 0) {
      const badge = document.createElement("span");
      badge.id = `${idPrefix}_ntf_bell_badge`;
      badge.className = unreadCount > 9
        ? "pb-notification-bell__badge pb-notification-bell__badge--count"
        : "pb-notification-bell__badge";
      badge.textContent = unreadCount > 99 ? "99+" : unreadCount > 9 ? String(unreadCount) : "";
      badge.setAttribute("aria-label", `${unreadCount} notifikasi belum dibaca`);
      button.append(badge);
    }

    const popover = open
      ? NotificationPopover({
        id: popoverId,
        open,
        snapshot,
        onClose: close,
        onNavigate: (link) => navigate(link, onNavigate),
      })
      : null;

    if (withBackdrop && popover) {
      popover.classList.add("pb-notification-popover--portal");
      host.replaceChildren(button);
      syncOverlay(backdropId, popover, button);
      attachOutsideClick({ button, popover });
    } else if (popover) {
      host.replaceChildren(button, popover);
      attachOutsideClick({ button, popover });
    } else {
      host.replaceChildren(button);
    }
  };

  if (subscribe) {
    unsubscribeState = notificationService.subscribe(render);
  }
  render();

  window.addEventListener("hashchange", handleRouteChange);
  host.dispose = () => {
    disposed = true;
    detachOutsideClick();
    removeOverlayNodes();
    unsubscribeState?.();
    window.removeEventListener("hashchange", handleRouteChange);
  };

  return host;

  function attachOutsideClick({ button, popover }) {
    if (!open) {
      return;
    }

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (popover.contains(target) || button.contains(target)) {
        return;
      }
      close();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    removeOutsideClick = () => document.removeEventListener("pointerdown", onPointerDown, true);
  }

  function detachOutsideClick() {
    removeOutsideClick?.();
    removeOutsideClick = null;
  }

  function syncOverlay(backdropId, popover, button) {
    if (!open || !withBackdrop || typeof document === "undefined") {
      removeOverlayNodes();
      return;
    }

    const root = ensureNotificationOverlayRoot();
    const backdrop = document.createElement("button");
    backdrop.id = backdropId;
    backdrop.type = "button";
    backdrop.className = "pb-notification-popover__backdrop is-open";
    backdrop.hidden = false;
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.tabIndex = -1;
    backdrop.addEventListener("click", close);
    root.append(backdrop, popover);
    backdropNode = backdrop;
    portalPopoverNode = popover;
    syncPortalPopoverPosition(button, popover);
    const syncPosition = () => syncPortalPopoverPosition(button, popover);
    window.addEventListener("resize", syncPosition, { passive: true });
    window.addEventListener("scroll", syncPosition, { passive: true, capture: true });
    removeViewportSync = () => {
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, { capture: true });
    };
  }

  function removeOverlayNodes() {
    removeViewportSync?.();
    removeViewportSync = null;
    backdropNode?.remove();
    backdropNode = null;
    portalPopoverNode?.remove();
    portalPopoverNode = null;
  }
}

function ensureNotificationOverlayRoot() {
  let root = document.getElementById(OVERLAY_ROOT_ID);
  if (root) {
    return root;
  }

  root = document.createElement("div");
  root.id = OVERLAY_ROOT_ID;
  root.className = "pb-notification-overlay-root";
  document.body.append(root);
  return root;
}

function syncPortalPopoverPosition(button, popover) {
  if (!button?.isConnected || !popover?.isConnected) {
    return;
  }

  const rect = button.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const compact = viewportWidth <= 520;
  const margin = viewportWidth <= 374 ? 8 : 16;
  const width = Math.max(280, Math.min(410, viewportWidth - (margin * 2)));
  const buttonCenter = rect.left + (rect.width / 2);
  const top = compact ? Math.max(72, rect.bottom + 12) : Math.max(margin, rect.bottom + 16);
  const left = compact
    ? margin
    : clamp(rect.right - width, margin, Math.max(margin, viewportWidth - margin - width));
  const pointerRight = clamp((left + width) - buttonCenter - 14, 24, Math.max(24, width - 52));
  const maxHeight = Math.max(220, viewportHeight - top - margin);

  popover.style.setProperty("--pb-notification-popover-top", `${Math.round(top)}px`);
  popover.style.setProperty("--pb-notification-popover-left", `${Math.round(left)}px`);
  popover.style.setProperty("--pb-notification-popover-width", `${Math.round(width)}px`);
  popover.style.setProperty("--pb-notification-popover-max-height", `${Math.round(maxHeight)}px`);
  popover.style.setProperty("--pb-notification-popover-pointer-right", `${Math.round(pointerRight)}px`);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

function ensureNotificationStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .pb-notification-overlay-root {
      position: fixed;
      inset: 0;
      z-index: 79;
      pointer-events: none;
    }

    .pb-notification-bell {
      position: relative;
      z-index: 65;
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
    }

    .pb-notification-bell.is-open {
      z-index: 78;
    }

    .pb-notification-bell__button {
      position: relative;
      z-index: 79;
      display: inline-flex;
      width: 46px;
      height: 46px;
      min-width: 46px;
      min-height: 46px;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--pb-border);
      border-radius: 999px;
      background: var(--pb-surface-card);
      color: var(--pb-brand-secondary);
      box-shadow: var(--pb-shadow-soft);
      cursor: pointer;
      transition: background 160ms ease, color 160ms ease, border-color 160ms ease;
    }

    .pb-notification-bell__button:hover {
      border-color: color-mix(in srgb, var(--pb-brand-primary) 34%, var(--pb-border));
      background: var(--pb-surface-muted);
      color: var(--pb-brand-secondary);
    }

    .pb-notification-bell__button:focus {
      outline: none;
      box-shadow: 0 0 0 3px var(--pb-form-focus), var(--pb-shadow-soft);
    }

    .pb-notification-bell__button--compact {
      width: 48px;
      height: 48px;
      min-width: 48px;
      min-height: 48px;
    }

    .pb-notification-bell__icon {
      display: inline-flex;
      width: 1.1rem;
      height: 1.1rem;
      align-items: center;
      justify-content: center;
      color: currentColor;
      font-size: 1.08rem;
      line-height: 1;
    }

    .pb-notification-bell__badge {
      position: absolute;
      top: 8px;
      right: 8px;
      display: inline-flex;
      width: 11px;
      height: 11px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: var(--pb-danger);
      color: white;
      box-shadow: 0 0 0 2px var(--pb-surface-card);
      font-size: 10px;
      font-weight: 900;
      line-height: 1;
    }

    .pb-notification-bell__badge--count {
      top: 5px;
      right: 3px;
      width: auto;
      min-width: 20px;
      height: 18px;
      padding: 0 5px;
    }

    .pb-notification-popover__backdrop {
      position: fixed;
      inset: 0;
      z-index: 0;
      display: block;
      width: 100vw;
      height: 100vh;
      border: 0;
      background: color-mix(in srgb, var(--pb-overlay) 34%, transparent);
      backdrop-filter: blur(1px);
      cursor: default;
      opacity: 0;
      pointer-events: none;
      transition: opacity 160ms ease;
    }

    .pb-notification-popover__backdrop[hidden] {
      display: none;
    }

    .pb-notification-popover__backdrop.is-open {
      opacity: 1;
      pointer-events: auto;
    }

    .pb-notification-popover {
      position: absolute;
      top: calc(100% + 1rem);
      right: 0;
      z-index: 1;
      width: min(calc(100vw - 2rem), 410px);
      max-height: min(680px, calc(100vh - 6.5rem));
      display: flex;
      flex-direction: column;
      overflow: visible;
      border: 1.5px solid #2563eb;
      border-right-width: 6px;
      border-radius: 28px;
      background: #ffffff;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
      color: #111827;
      opacity: 0;
      pointer-events: none;
      transform: translateY(-8px) scale(0.98);
      transform-origin: top right;
      transition: opacity 180ms ease, transform 180ms ease;
    }

    .pb-notification-popover--portal {
      position: fixed;
      top: var(--pb-notification-popover-top, 5rem);
      right: auto;
      left: var(--pb-notification-popover-left, 1rem);
      z-index: 1;
      width: var(--pb-notification-popover-width, min(calc(100vw - 2rem), 410px));
      max-height: var(--pb-notification-popover-max-height, min(680px, calc(100vh - 6.5rem)));
      pointer-events: auto;
    }

    .pb-notification-popover.is-open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    .pb-notification-popover[hidden] {
      display: none;
    }

    .pb-notification-popover__pointer {
      position: absolute;
      top: -14px;
      right: 36px;
      width: 28px;
      height: 28px;
      border-left: 1.5px solid #2563eb;
      border-top: 1.5px solid #2563eb;
      background: #ffffff;
      transform: rotate(45deg);
    }

    .pb-notification-popover--portal .pb-notification-popover__pointer {
      right: var(--pb-notification-popover-pointer-right, 36px);
    }

    .pb-notification-popover__header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 28px 24px 16px;
      border-radius: 28px 28px 0 0;
      background: #ffffff;
    }

    .pb-notification-popover__title {
      margin: 0;
      color: #111827;
      font-size: 1.45rem;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 1.1;
    }

    .pb-notification-popover__mark {
      min-height: 2.75rem;
      border: 0;
      border-radius: var(--pb-radius-lg);
      background: transparent;
      color: var(--pb-danger);
      cursor: pointer;
      font: inherit;
      font-size: 0.84rem;
      font-weight: 800;
      white-space: nowrap;
    }

    .pb-notification-popover__mark:hover {
      background: color-mix(in srgb, var(--pb-danger) 10%, transparent);
    }

    .pb-notification-popover__mark:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .pb-notification-popover__list {
      display: grid;
      min-width: 0;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .pb-notification-item {
      min-width: 0;
      border-bottom: 1px solid #e5e7eb;
      background: #ffffff;
    }

    .pb-notification-item__button {
      display: grid;
      min-height: 88px;
      width: 100%;
      grid-template-columns: 12px 56px minmax(0, 1fr) auto;
      align-items: center;
      gap: 16px;
      border: 0;
      background: transparent;
      cursor: pointer;
      padding: 18px 24px;
      text-align: left;
    }

    .pb-notification-item__button:hover {
      background: #f8fafc;
    }

    .pb-notification-item__button:focus {
      outline: none;
      box-shadow: inset 0 0 0 2px var(--pb-form-focus);
    }

    .pb-notification-item__dot {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--pb-danger);
    }

    .pb-notification-item__dot--hidden {
      opacity: 0;
    }

    .pb-notification-icon {
      display: inline-flex;
      width: 56px;
      height: 56px;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      overflow: hidden;
    }

    .pb-notification-icon--red {
      background: #fee2e2;
      color: #ef4444;
    }

    .pb-notification-icon--blue {
      background: #dbeafe;
      color: #2563eb;
    }

    .pb-notification-icon--green {
      background: #dcfce7;
      color: #22c55e;
    }

    .pb-notification-icon--purple {
      background: #f3e8ff;
      color: #9333ea;
    }

    .pb-notification-icon__svg {
      display: block;
      width: 1.2rem;
      height: 1.2rem;
      line-height: 1;
    }

    .pb-notification-item__content {
      display: grid;
      min-width: 0;
      gap: 4px;
    }

    .pb-notification-item__content h3 {
      margin: 0;
      overflow-wrap: anywhere;
      color: #111827;
      font-size: 1.02rem;
      font-weight: 800;
      letter-spacing: 0;
      line-height: 1.2;
    }

    .pb-notification-item__content p {
      margin: 0;
      overflow-wrap: anywhere;
      color: #6b7280;
      font-size: 0.86rem;
      font-weight: 500;
      line-height: 1.42;
    }

    .pb-notification-item__time {
      align-self: start;
      padding-top: 3px;
      color: #6b7280;
      font-size: 0.84rem;
      font-weight: 700;
      line-height: 1.25;
      white-space: nowrap;
    }

    .pb-notification-popover__state {
      display: grid;
      min-height: 160px;
      place-items: center;
      gap: 6px;
      padding: 28px 24px;
      text-align: center;
    }

    .pb-notification-popover__state-icon {
      display: inline-flex;
      width: 44px;
      height: 44px;
      align-items: center;
      justify-content: center;
      border-radius: 999px;
      background: #dbeafe;
      color: #2563eb;
    }

    .pb-notification-popover__state h3,
    .pb-notification-popover__state p {
      margin: 0;
    }

    .pb-notification-popover__state h3 {
      color: #111827;
      font-size: 1rem;
      font-weight: 800;
    }

    .pb-notification-popover__state p {
      color: #6b7280;
      font-size: 0.88rem;
      font-weight: 600;
    }

    .pb-notification-popover__footer {
      display: flex;
      min-height: 58px;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      border: 0;
      border-top: 1px solid #e5e7eb;
      border-radius: 0 0 24px 24px;
      background: #ffffff;
      color: #111827;
      cursor: pointer;
      padding: 18px 24px;
      text-align: left;
    }

    .pb-notification-popover__footer:hover {
      background: #f8fafc;
    }

    .pb-notification-popover__footer-label {
      display: inline-flex;
      min-width: 0;
      align-items: center;
      gap: 12px;
      font-size: 0.95rem;
      font-weight: 800;
      line-height: 1.2;
    }

    .pb-notification-popover__footer-icon,
    .pb-notification-popover__chevron {
      display: inline-flex;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      color: #2563eb;
      line-height: 1;
    }

    .pb-notification-popover__chevron {
      color: #6b7280;
    }

    @media (max-width: 520px) {
      .pb-notification-popover {
        position: fixed;
        top: max(4.6rem, calc(env(safe-area-inset-top) + 4.2rem));
        left: 16px;
        right: 16px;
        width: auto;
        max-height: calc(100vh - 7rem - env(safe-area-inset-bottom));
      }

      .pb-notification-popover__pointer {
        right: 34px;
      }

      .pb-notification-popover--portal {
        top: var(--pb-notification-popover-top, max(4.6rem, calc(env(safe-area-inset-top) + 4.2rem)));
        left: var(--pb-notification-popover-left, 16px);
        right: auto;
        width: var(--pb-notification-popover-width, calc(100vw - 2rem));
        max-height: var(--pb-notification-popover-max-height, calc(100vh - 7rem - env(safe-area-inset-bottom)));
      }
    }

    @media (max-width: 374px) {
      .pb-notification-popover {
        left: 8px;
        right: 8px;
      }

      .pb-notification-popover__header,
      .pb-notification-item__button,
      .pb-notification-popover__footer {
        padding-left: 18px;
        padding-right: 18px;
      }

      .pb-notification-item__button {
        grid-template-columns: 10px 50px minmax(0, 1fr) auto;
        gap: 12px;
      }

      .pb-notification-icon {
        width: 50px;
        height: 50px;
      }
    }
  `;
  document.head.append(style);
}
