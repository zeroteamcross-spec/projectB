import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { brandConfig } from "../../../theme/brandConfig.js";
import { webConfigResource } from "../../../resources/webConfigResource.js";

export function AdminWebConfigPage() {
  let root = null;
  let context = null;
  let unsubscribe = null;
  const state = { saving: false, uploading: false, error: "" };
  const rerender = () => render(root, context, state, actions);

  const actions = {
    async uploadIcon(file, iconUrlInput, preview) {
      if (!file) return;
      state.uploading = true;
      state.error = "";
      rerender();
      try {
        const asset = await webConfigResource.uploadIcon(file);
        const path = asset?.path ?? asset?.url ?? "";
        if (!path) throw new Error("Upload icon tidak mengembalikan path.");
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
      const message = validatePayload(payload);
      if (message) {
        state.error = message;
        showToast(message, { type: "warning" });
        rerender();
        return;
      }
      state.saving = true;
      state.error = "";
      rerender();
      try {
        const result = await webConfigResource.update(payload);
        patchConfig(result.config, result.theme);
        showToast(result.message, { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menyimpan Konfigurasi WEB.";
        showToast(state.error, { type: "error" });
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

  const page = document.createElement("section");
  page.className = "grid min-w-0 gap-6";
  page.append(hero(), formSection(config, state, actions));
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
    textNode("p", "text-xs font-black uppercase tracking-[0.16em] text-orange-700", "Admin"),
    textNode("h1", "text-3xl font-black leading-tight text-gray-950", "Konfigurasi WEB"),
    textNode("p", "max-w-2xl text-sm leading-6 text-gray-600", "Atur identitas aplikasi yang tampil pada shell, sidebar, dan kontak utama."),
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
  preview.className = "grid h-24 w-24 place-items-center overflow-hidden rounded-[1rem] border border-[var(--pb-border)] bg-gray-50";
  renderIconPreview(preview, iconUrl.value);
  const file = document.createElement("input");
  file.type = "file";
  file.accept = "image/jpeg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg";
  file.className = controlClassName();
  file.addEventListener("change", () => actions.uploadIcon(file.files?.[0] ?? null, iconUrl, preview));
  const iconRow = document.createElement("section");
  iconRow.className = "grid gap-4 md:grid-cols-[96px_minmax(0,1fr)] md:items-end";
  iconRow.append(preview, labelWrap(state.uploading ? "Mengupload icon..." : "Upload Icon Web / Aplikasi", file));
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
    actions.save({
      icon_url: iconUrl.value.trim(),
      app_name: appName.value.trim(),
      tagline: tagline.value.trim(),
      whatsapp_number: whatsapp.value.trim(),
    });
  });
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
  if (config) appStore.patchState("working.adminWebConfig.config", { data: config, hydratedAt: Date.now() }, "admin-web-config:save");
  if (theme && typeof globalThis.__PROJECTB_APPLY_THEME__ === "function") {
    globalThis.__PROJECTB_APPLY_THEME__(theme);
  }
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
    preview.append(image);
    return;
  }
  preview.append(createIcon("brandMark", { className: "h-8 w-8 text-gray-400" }));
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

function normalizeAssetUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/.test(value) || value.startsWith("/")) return value;
  return `/${value}`;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
