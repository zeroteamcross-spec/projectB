const CONTROL_SELECTOR = "button, input, select, textarea";
const issuedIdOwners = new Map();

/**
 * Menjamin setiap kontrol interaktif yang masuk ke DOM memiliki id yang unik.
 * Id yang sudah ada dipertahankan selama belum dipakai elemen lain.
 */
export function ensureControlId(control, preferredId = "") {
  if (!control || !CONTROL_SELECTOR.split(", ").includes(control.tagName?.toLowerCase())) {
    return control;
  }

  const currentId = String(control.id ?? "").trim();
  const currentOwner = currentId ? document.getElementById(currentId) : null;
  const issuedOwner = currentId ? issuedIdOwners.get(currentId) : null;
  if (currentId && (!issuedOwner || issuedOwner === control) && (!currentOwner || currentOwner === control)) {
    issuedIdOwners.set(currentId, control);
    return control;
  }

  const base = normalizePreferredId(preferredId) || deriveBaseId(control);
  let candidate = base;
  let suffix = 2;
  while ((issuedIdOwners.has(candidate) && issuedIdOwners.get(candidate) !== control)
    || (document.getElementById(candidate) && document.getElementById(candidate) !== control)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  control.id = candidate;
  issuedIdOwners.set(candidate, control);
  return control;
}

/**
 * Memproses kontrol yang sudah ada, termasuk duplikat id dari markup lama.
 */
export function ensureUniqueControlIds(root = document) {
  if (!root) {
    return;
  }

  const controls = [];
  if (root.matches?.(CONTROL_SELECTOR)) {
    controls.push(root);
  }
  controls.push(...root.querySelectorAll?.(CONTROL_SELECTOR) ?? []);
  controls.forEach((control) => ensureControlId(control));
}

/**
 * Mengikuti kontrol lazy-loaded dan kontrol yang dirender ulang saat navigasi.
 */
export function bindUniqueControlIds(root = document.body) {
  if (!root) {
    return () => {};
  }

  ensureUniqueControlIds(root);

  const MutationObserverClass = globalThis.MutationObserver;
  if (!MutationObserverClass) {
    return () => {};
  }

  const observer = new MutationObserverClass((records) => {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          ensureUniqueControlIds(node);
        }
      });
    });
  });
  observer.observe(root, { childList: true, subtree: true });

  return () => observer.disconnect();
}

function deriveBaseId(control) {
  const tag = control.tagName.toLowerCase();
  const hint = control.getAttribute("name")
    || control.getAttribute("aria-label")
    || control.getAttribute("title")
    || (tag === "button" ? control.textContent : "")
    || tag;
  return `pb-${tag}-${sanitizeId(hint) || "control"}`;
}

function sanitizeId(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function normalizePreferredId(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^A-Za-z0-9_:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized.slice(0, 64);
}
