import { uiStore } from "../../state/uiStore.js";
import { appStore } from "../../state/store.js";
import { Button } from "./button.js";
import { tw } from "../theme/tailwindClasses.js";

const modalRuntime = new Map();

function applyModalContent(panel, modal) {
  syncModalHeader(panel, modal);
  syncModalBody(panel, modal);
  syncModalFooter(panel, modal);
}

function syncModalHeader(panel, modal) {
  const existing = panel.querySelector('[data-modal-part="header"]');
  const shouldRender = Boolean(modal.title || modal.description);

  if (!shouldRender) {
    existing?.remove();
    return;
  }

  const header = existing ?? document.createElement("div");
  header.dataset.modalPart = "header";
  header.className = "flex min-w-0 items-start justify-between gap-4 border-b border-[var(--pb-border)] px-5 py-4 sm:px-6";
  if (modal.headerId) {
    header.id = modal.headerId;
  } else {
    header.removeAttribute("id");
  }

  const copy = header.querySelector('[data-modal-part="header-copy"]') ?? document.createElement("div");
  copy.dataset.modalPart = "header-copy";
  copy.className = "grid min-w-0 gap-1";

  const title = copy.querySelector("h2") ?? document.createElement("h2");
  title.className = "break-words text-lg font-black tracking-normal text-gray-950 sm:text-xl";
  title.textContent = modal.title ?? "";
  copy.replaceChildren(title);

  if (modal.description) {
    const description = document.createElement("p");
    description.className = "break-words text-sm leading-6 text-[var(--pb-text-muted)]";
    description.textContent = modal.description;
    copy.append(description);
  }

  const close = header.querySelector('[data-modal-part="close"]') ?? Button({ label: "", variant: "secondary", onClick: () => closeModal() });
  close.dataset.modalPart = "close";
  close.className = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--pb-border)] bg-[var(--pb-btn-secondary-bg)] text-[var(--pb-btn-secondary-text)] leading-none shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  close.setAttribute("aria-label", modal.closeLabel ?? "Tutup");
  if (modal.closeButtonId) {
    close.id = modal.closeButtonId;
  } else {
    close.removeAttribute("id");
  }
  const icon = document.createElement("i");
  icon.className = "fa-solid fa-xmark block h-4 w-4 leading-none";
  icon.setAttribute("aria-hidden", "true");
  close.replaceChildren(icon);

  header.replaceChildren(copy, close);
  if (!existing) {
    panel.prepend(header);
  }
}

function syncModalBody(panel, modal) {
  const body = panel.querySelector('[data-modal-part="body"]') ?? document.createElement("div");
  body.dataset.modalPart = "body";
  body.className = modal.bodyClassName || "modal-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6";
  if (modal.bodyId) {
    body.id = modal.bodyId;
  } else {
    body.removeAttribute("id");
  }

  const runtime = modalRuntime.get(modal.key);
  const content = runtime?.content ?? "";
  if (content instanceof Node) {
    if (body.childNodes.length !== 1 || body.firstChild !== content) {
      body.replaceChildren(content);
    }
  } else {
    const text = String(content ?? "");
    if (body.textContent !== text || body.childNodes.length !== 1 || body.firstChild.nodeType !== Node.TEXT_NODE) {
      body.replaceChildren(document.createTextNode(text));
    }
  }

  if (!body.parentNode) {
    panel.append(body);
  }
}

function syncModalFooter(panel, modal) {
  const existing = panel.querySelector('[data-modal-part="footer"]');

  if (modal.footer === null) {
    existing?.remove();
    return;
  }

  const footer = existing ?? document.createElement("div");
  footer.dataset.modalPart = "footer";
  footer.className = "flex flex-wrap justify-end gap-2 border-t border-[var(--pb-border)] bg-white/70 px-5 py-4 sm:px-6";
  const runtime = modalRuntime.get(modal.key);
  const customFooter = runtime?.footer ?? null;
  if (customFooter instanceof Node) {
    footer.replaceChildren(customFooter);
  } else if (typeof customFooter === "function") {
    footer.replaceChildren(customFooter());
  } else {
    footer.replaceChildren(Button({
      label: modal.closeLabel ?? "Tutup",
      variant: "secondary",
      onClick: closeModal,
    }));
  }

  if (!existing) {
    panel.append(footer);
  }
}

function renderModalHost(element, modal) {
  if (!modal) {
    element.hidden = true;
    element.className = "";
    element.removeAttribute("style");
    delete element.dataset.modalKey;
    element.onclick = null;
    element.replaceChildren();
    return;
  }

  element.hidden = false;
  element.className = [tw.modal.root, modal.rootClassName ?? ""].filter(Boolean).join(" ");
  element.onclick = null;

  const existingPanel = element.firstElementChild;
  if (element.dataset.modalKey === modal.key && existingPanel) {
    existingPanel.className = panelClassName(modal);
    applyModalContent(existingPanel, modal);
    return;
  }

  element.dataset.modalKey = modal.key;

  const panel = document.createElement("div");
  panel.className = panelClassName(modal);
  if (modal.panelId) {
    panel.id = modal.panelId;
  }
  panel.addEventListener("click", (event) => event.stopPropagation());
  applyModalContent(panel, modal);
  element.replaceChildren(panel);
}

export function openModal(content, options = {}) {
  const current = appStore.get("ui.modal", null);
  if (options.key && current?.key === options.key) {
    const previousRuntime = modalRuntime.get(current.key);
    const nextSignature = options.contentSignature ?? "";
    if (options.preserveContentOnSameSignature && previousRuntime?.contentSignature === nextSignature) {
      modalRuntime.set(current.key, {
        ...previousRuntime,
        footer: options.footerNode ?? previousRuntime?.footer ?? null,
        onClose: options.onClose ?? previousRuntime?.onClose ?? null,
        contentSignature: nextSignature,
      });
      return;
    }

    modalRuntime.set(current.key, {
      content,
      footer: options.footerNode ?? null,
      onClose: options.onClose ?? null,
      contentSignature: nextSignature,
    });
    const host = document.querySelector("#modal-root");
    if (host) {
      renderModalHost(host, current);
    }
    return;
  }

  const key = options.key ?? `modal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  modalRuntime.set(key, {
    content,
    footer: options.footerNode ?? null,
    onClose: options.onClose ?? null,
    contentSignature: options.contentSignature ?? "",
  });

  uiStore.openModal({
    key,
    title: options.title ?? "",
    description: options.description ?? "",
    size: options.size ?? "md",
    footer: options.footer ?? "default",
    closeLabel: options.closeLabel ?? "Tutup",
    closeButtonId: options.closeButtonId ?? "",
    panelId: options.panelId ?? "",
    bodyId: options.bodyId ?? "",
    headerId: options.headerId ?? "",
    panelClassName: options.panelClassName ?? "",
    rootClassName: options.rootClassName ?? "",
    bodyClassName: options.bodyClassName ?? "",
  });
}

function panelClassName(modal) {
  return [
    tw.modal.panel,
    modal.size === "lg" ? "max-w-3xl" : "",
    modal.size === "xl" ? "max-w-5xl" : "",
    modal.panelClassName ?? "",
  ].filter(Boolean).join(" ");
}

export function closeModal({ notify = true } = {}) {
  const modal = appStore.get("ui.modal", null);
  if (!modal) {
    return;
  }
  const runtime = modalRuntime.get(modal.key);
  if (notify && typeof runtime?.onClose === "function") {
    runtime.onClose();
  }
  uiStore.closeModal();
  modalRuntime.delete(modal.key);
}

export function bindModal(container) {
  const element = typeof container === "string" ? document.querySelector(container) : container;
  if (!element) {
    return () => {};
  }

  return appStore.subscribe((state) => {
    const modal = state?.ui?.modal ?? null;
    renderModalHost(element, modal);
  });
}
