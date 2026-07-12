import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { brandConfig } from "../../../theme/brandConfig.js";
import { getAsset } from "../../../theme/assetRegistry.js";
import { webConfigResource } from "../../../resources/webConfigResource.js";

export function AdminWebConfigPage() {
  let root = null;
  let context = null;
  let unsubscribe = null;
  const state = { saving: false, uploading: false, error: "", notice: "", draft: null };
  const rerender = () => render(root, context, state, actions);

  const actions = {
    async uploadIcon(file, iconUrlInput, preview, currentDraft = null) {
      if (!file) return;
      state.draft = currentDraft ?? state.draft;
      state.uploading = true;
      state.error = "";
      state.notice = "";
      rerender();
      try {
        const asset = await webConfigResource.uploadIcon(file);
        const path = asset?.path ?? asset?.url ?? "";
        if (!path) throw new Error("Upload icon tidak mengembalikan path.");
        state.draft = { ...(state.draft ?? {}), icon_url: path };
        iconUrlInput.value = path;
        renderIconPreview(preview, path);
        showToast("Icon aplikasi berhasil diupload.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal upload icon aplikasi.";
        showToast(state.error, { type: "error" });
      } finally {
        state.uploading = false;
        rerender();
      }
    },
    async save(payload) {
      state.draft = payload;
      const message = validatePayload(payload);
      if (message) {
        state.error = message;
        showToast(message, { type: "warning" });
        rerender();
        return;
      }
      state.saving = true;
      state.error = "";
      state.notice = "";
      rerender();
      try {
        const result = await webConfigResource.update(payload);
        state.draft = null;
        state.error = "";
        state.notice = result.message || "Konfigurasi WEB berhasil disimpan.";
        safeToast(state.notice, { type: "success" });
        patchConfig(result.config, result.theme);
      } catch (error) {
        state.error = error.message || "Gagal menyimpan Konfigurasi WEB.";
        state.notice = "";
        safeToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
  };

  return createPageLifecycle({
    bootstrap(nextContext) {
      context = nextContext;
      state.error = "";
      state.notice = "";
    },
    mount(nextContext) {
      context = nextContext;
      root = document.createElement("div");
      rerender();
      return root;
    },
    hydrate(nextContext) {
      context = nextContext;
      rerender();
    },
    bindEvents() {
      unsubscribe = appStore.subscribe(() => rerender());
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
    },
  });
}

function render(root, context, state, actions) {
  if (!root) return;
  const config = appStore.get("working.adminWebConfig.config.data", null)
    ?? appStore.get("snapshot.admin.webConfig.data", null)
    ?? {};
  const draft = { ...config, ...(state.draft ?? {}) };

  const page = document.createElement("section");
  page.className = "grid min-w-0 gap-6";
  page.append(hero(), formSection(draft, state, actions));
  if (state.notice) page.append(successPanel(state.notice));
  if (state.error) page.append(errorPanel(state.error));
  root.replaceChildren(page);
}

function hero() {
  const section = document.createElement("section");
  section.className = "grid gap-4 rounded-[1.5rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(240,253,250,0.78),rgba(255,247,237,0.78))] p-5 shadow-[var(--pb-shadow-card)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center";
  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-2";
  copy.append(
    iconBox("settings"),
    textNode("p", "text-xs font-black uppercase tracking-[0.16em] text-orange-700", ""),
    textNode("h1", "text-3xl font-black leading-tight text-gray-950", "Konfigurasi WEB"),
    textNode("p", "max-w-2xl text-sm leading-6 text-gray-600", ""),
  );
  const preview = document.createElement("section");
  preview.className = "grid min-w-[220px] gap-2 rounded-[1rem] border border-[var(--pb-border)] bg-white/82 p-4 shadow-sm";
  preview.append(textNode("p", "text-xs font-black uppercase tracking-[0.14em] text-gray-500", "Preview saat ini"), textNode("p", "text-xl font-black text-gray-950", brandConfig.appName), textNode("p", "text-sm font-semibold text-gray-600", brandConfig.appTagline));
  section.append(copy, preview);
  return section;
}

function formSection(config, state, actions) {
  const form = document.createElement("form");
  form.className = "grid gap-5 rounded-[1.5rem] border border-white/80 bg-white/88 p-5 shadow-[var(--pb-shadow-card)]";
  const iconUrl = input("awc_icon_url", "icon_url", config.icon_url ?? "", "Path icon aplikasi");
  const appName = input("awc_app_name", "app_name", config.app_name ?? brandConfig.appName, "Nama Web / Aplikasi");
  const tagline = input("awc_tagline", "tagline", config.tagline ?? brandConfig.appTagline, "Tagline");
  const whatsapp = input("awc_whatsapp", "whatsapp_number", config.whatsapp_number ?? brandConfig.contact.whatsapp, "6281234567890");
  const preview = document.createElement("section");
  preview.className = "grid h-28 w-28 place-items-center overflow-hidden rounded-[1.25rem] border border-white/80 bg-white shadow-[var(--pb-shadow-soft)]";
  renderIconPreview(preview, iconUrl.value);
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg";
  file.className = "sr-only";
  file.addEventListener("change", () => actions.uploadIcon(file.files?.[0] ?? null, iconUrl, preview));
  const iconRow = uploadDropzone({
    input: file,
    preview,
    uploading: state.uploading,
    onFile: (nextFile) => actions.uploadIcon(nextFile, iconUrl, preview, collectPayload()),
  });
  form.append(
    iconRow,
    labelWrap("Icon URL", iconUrl),
    labelWrap("Nama Web / Aplikasi", appName),
    labelWrap("Tagline", tagline),
    labelWrap("Nomor Whatsapp Aplikasi", whatsapp),
    actionRow(state),
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    actions.save(collectPayload());
  });

  function collectPayload() {
    return {
      icon_url: iconUrl.value.trim(),
      app_name: appName.value.trim(),
      tagline: tagline.value.trim(),
      whatsapp_number: whatsapp.value.trim(),
      landing_page_route_name: config.landing_page_route_name ?? "",
    };
  }

  return form;
}

function actionRow(state) {
  const row = document.createElement("section");
  row.className = "flex flex-wrap justify-end gap-3 border-t border-[var(--pb-border)] pt-4";
  const submit = Button({ label: state.saving ? "Menyimpan..." : "Simpan Konfigurasi", variant: "primary", disabled: state.saving || state.uploading });
  submit.type = "submit";
  submit.prepend(createIcon("circleCheck", { className: "block h-4 w-4 leading-none" }));
  row.append(submit);
  return row;
}

function patchConfig(config, theme) {
  try {
    if (config) {
      appStore.patchState("working.adminWebConfig.config", { data: config, hydratedAt: Date.now() }, "admin-web-config:save");
      syncDocumentIdentity(config);
    }
  } catch (error) {
    console.error("Web config local sync failed.", error);
  }
}

function syncDocumentIdentity(config) {
  const appName = String(config?.app_name ?? "").trim();
  const tagline = String(config?.tagline ?? "").trim();
  const iconUrl = normalizeAssetUrl(config?.icon_url ?? "");

  if (appName) {
    document.title = appName;
    upsertMeta("name", "application-name", appName);
    upsertMeta("name", "apple-mobile-web-app-title", appName);
    upsertMeta("property", "og:title", appName);
    upsertMeta("name", "twitter:title", appName);
  }

  if (tagline) {
    upsertMeta("name", "description", tagline);
    upsertMeta("property", "og:description", tagline);
    upsertMeta("name", "twitter:description", tagline);
  }

  if (iconUrl) {
    upsertLink("icon", iconUrl);
    upsertLink("shortcut icon", iconUrl);
    upsertLink("apple-touch-icon", iconUrl);
  }
}

function upsertMeta(attribute, key, content) {
  const selector = `meta[${attribute}="${cssAttrEscape(key)}"]`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attribute, key);
    document.head.append(node);
  }
  node.setAttribute("content", content);
}

function upsertLink(rel, href) {
  const selector = `link[rel="${cssAttrEscape(rel)}"]`;
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement("link");
    node.rel = rel;
    document.head.append(node);
  }
  node.href = href;
}

function cssAttrEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function validatePayload(payload) {
  if (!payload.app_name) return "Nama Web / Aplikasi wajib diisi.";
  if (!payload.tagline) return "Tagline wajib diisi.";
  if (!payload.whatsapp_number) return "Nomor Whatsapp Aplikasi wajib diisi.";
  if (!/^[0-9+()\-\s]{8,25}$/.test(payload.whatsapp_number)) return "Nomor Whatsapp Aplikasi tidak valid.";
  return "";
}

function renderIconPreview(preview, url) {
  preview.replaceChildren();
  if (url) {
    const image = document.createElement("img");
    image.src = normalizeAssetUrl(url);
    image.alt = "Icon aplikasi";
    image.className = "h-full w-full object-contain p-2";
    image.addEventListener("error", () => {
      preview.replaceChildren(createIcon("brandMark", { className: "h-9 w-9 text-gray-400" }));
    }, { once: true });
    preview.append(image);
    return;
  }
  preview.append(createIcon("brandMark", { className: "h-8 w-8 text-gray-400" }));
}

function uploadDropzone({ input, preview, uploading, onFile }) {
  const section = document.createElement("section");
  section.className = "grid gap-4 rounded-[1.5rem] border border-dashed border-orange-200 bg-[linear-gradient(135deg,rgba(255,247,237,0.85),rgba(255,255,255,0.96),rgba(240,253,250,0.82))] p-4 shadow-sm md:grid-cols-[112px_minmax(0,1fr)] md:items-center";

  const body = document.createElement("section");
  body.className = "grid min-w-0 gap-3";
  const title = textNode("p", "text-base font-black text-gray-950", uploading ? "Mengupload icon..." : "Upload Icon Web / Aplikasi");
  const desc = textNode("p", "text-sm leading-6 text-gray-600", "Tarik file ke area ini atau pilih file SVG, PNG, JPG, atau WebP. Maksimal 2 MB, minimal 64x64 px untuk raster.");
  const actions = document.createElement("section");
  actions.className = "flex flex-wrap items-center gap-2";
  const choose = document.createElement("button");
  choose.type = "button";
  choose.className = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[1rem] bg-[var(--pb-brand-primary)] px-4 py-2 text-sm font-bold text-white shadow-[var(--pb-shadow-soft)] transition hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-60";
  choose.disabled = Boolean(uploading);
  choose.append(createIcon("upload", { className: "block h-4 w-4 leading-none" }), document.createTextNode(uploading ? "Memproses..." : "Pilih File"));
  choose.addEventListener("click", () => input.click());
  const hint = textNode("span", "text-xs font-bold uppercase tracking-[0.12em] text-orange-700", "SVG supported");
  actions.append(choose, hint, input);
  body.append(title, desc, actions);
  section.append(preview, body);

  const setDrag = (active) => {
    section.classList.toggle("border-orange-400", active);
    section.classList.toggle("bg-orange-50", active);
  };
  section.addEventListener("dragover", (event) => {
    event.preventDefault();
    setDrag(true);
  });
  section.addEventListener("dragleave", () => setDrag(false));
  section.addEventListener("drop", (event) => {
    event.preventDefault();
    setDrag(false);
    const file = event.dataTransfer?.files?.[0] ?? null;
    if (file) onFile?.(file);
  });

  return section;
}

function input(id, name, value, placeholder) {
  const node = document.createElement("input");
  node.id = id;
  node.name = name;
  node.value = value ?? "";
  node.placeholder = placeholder;
  node.className = controlClassName();
  return node;
}

function labelWrap(label, control) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1 text-sm font-semibold text-gray-700";
  wrap.textContent = label;
  wrap.append(control);
  return wrap;
}

function controlClassName() {
  return "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-sm text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
}

function iconBox(icon) {
  const box = document.createElement("span");
  box.className = "grid h-12 w-12 place-items-center rounded-[1rem] bg-[var(--pb-brand-primary)] text-white shadow-[var(--pb-shadow-soft)]";
  box.append(createIcon(icon, { className: "block h-5 w-5 leading-none" }));
  return box;
}

function errorPanel(message) {
  const section = document.createElement("section");
  section.className = "rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700";
  section.textContent = message;
  return section;
}

function successPanel(message) {
  const section = document.createElement("section");
  section.className = "rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700";
  section.textContent = message;
  return section;
}

function safeToast(message, options = {}) {
  try {
    showToast(message, options);
  } catch (error) {
    console.error("Toast failed.", error);
  }
}

function normalizeAssetUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/.test(value) || value.startsWith("/")) return value;
  return getAsset(value, "");
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
