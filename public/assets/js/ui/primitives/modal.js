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
  title.className = "break-words text-base font-black tracking-normal text-gray-950 sm:text-lg";
  title.textContent = modal.title ?? "";
  copy.replaceChildren(title);

  if (modal.description) {
    const description = document.createElement("p");
    description.className = "break-words text-xs leading-6 text-[var(--pb-text-muted)]";
    description.textContent = modal.description;
    copy.append(description);
  }

  // A caller can replace the corner close (X) button with its own actions —
  // e.g. Batal/Simpan for a form that fills the whole modal, so saving isn't
  // buried below a scrollable body. Omit headerActions entirely and nothing
  // changes: same X button as always.
  const customActions = modalRuntime.get(modal.key)?.headerActions;
  const resolvedCustomActions = typeof customActions === "function" ? customActions() : customActions;
  // hideClose untuk modal yang tombol aksinya sudah ada di badan dan tidak
  // punya apa pun untuk ditaruh di header -- dialog konfirmasi misalnya, yang
  // Batal-nya sudah jelas terlihat tanpa perlu tanda silang di pojok.
  const rightSlot = resolvedCustomActions instanceof Node
    ? resolvedCustomActions
    : modal.hideClose
      ? null
      : defaultCloseButton(header, modal);

  header.replaceChildren(...[copy, rightSlot].filter(Boolean));
  if (!existing) {
    panel.prepend(header);
  }
}

function defaultCloseButton(header, modal) {
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
  return close;
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
    // bindModal() re-syncs on every appStore change, with no filter for
    // "did this modal's own state actually change" — a caller whose footer
    // node reference is stable across renders (e.g. built once when the
    // modal opens, per seller/pages/carsPage.js) would otherwise get it
    // detached and reattached on every unrelated store patch, including
    // ones fired by typing in the modal's own form fields. If that detach
    // happens to land inside a click's mousedown→click gesture — exactly
    // what typing-then-clicking-a-footer-button does, since the field's
    // blur fires a change event first — the browser drops the pending
    // click, so the button silently needs a second click to respond.
    // bindModal() re-syncs on every appStore change, with no filter for "did
    // this modal's own state actually change" — a caller whose footer node
    // reference is stable across renders (e.g. built once when the modal
    // opens, per seller/pages/carsPage.js) would otherwise get it detached
    // and reattached on every unrelated store patch, including ones fired by
    // typing in the modal's own form fields (see onChange in
    // sellerCarForm.js). If that detach lands inside a click's mousedown→
    // click gesture — exactly what happens when a field's blur fires a
    // change event right as the user clicks a footer button — some browsers
    // drop the pending click, so the button silently needs a second click,
    // or a click elsewhere first to blur the field before the real click.
    if (footer.childNodes.length !== 1 || footer.firstChild !== customFooter) {
      footer.replaceChildren(customFooter);
    }
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
        headerActions: options.headerActions ?? previousRuntime?.headerActions ?? null,
        onClose: options.onClose ?? previousRuntime?.onClose ?? null,
        contentSignature: nextSignature,
      });
      return;
    }

    modalRuntime.set(current.key, {
      content,
      footer: options.footerNode ?? null,
      headerActions: options.headerActions ?? null,
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
    headerActions: options.headerActions ?? null,
    onClose: options.onClose ?? null,
    contentSignature: options.contentSignature ?? "",
  });

  uiStore.openModal({
    key,
    title: options.title ?? "",
    description: options.description ?? "",
    size: options.size ?? "md",
    // `??` di sini dulu membatalkan maksud pemanggilnya: syncModalFooter
    // membuang footer hanya kalau nilainya persis null, sementara `null ??
    // "default"` menghasilkan "default". Jadi 31 pemanggil yang menulis
    // `footer: null` tetap mendapat footer bawaan lengkap dengan tombol Tutup,
    // dan tidak ada yang error -- footernya cuma muncul di tempat yang sudah
    // punya tombolnya sendiri.
    footer: options.footer === null ? null : (options.footer ?? "default"),
    closeLabel: options.closeLabel ?? "Tutup",
    closeButtonId: options.closeButtonId ?? "",
    hideClose: Boolean(options.hideClose),
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
