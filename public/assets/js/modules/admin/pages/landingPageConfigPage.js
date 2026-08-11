import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { authStore } from "../../../state/authStore.js";
import { Button } from "../../../ui/primitives/button.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { webConfigResource } from "../../../resources/webConfigResource.js";
import { currentLandingPageName, landingPageOptions } from "../../public/landingPageRegistry.js";

export function AdminLandingPageConfigPage() {
  let root = null;
  let context = null;
  let unsubscribe = null;
  const state = {
    selected: currentLandingPageName(),
    saving: false,
    error: "",
    notice: "",
  };

  const rerender = () => render(root, context, state, actions);

  const actions = {
    select(name) {
      state.selected = name;
      state.error = "";
      state.notice = "";
      rerender();
    },
    async save() {
      if (authStore.role() !== "super_admin") {
        state.error = "Menu ini hanya untuk superadmin.";
        rerender();
        return;
      }

      const currentConfig = resolveConfig();
      state.saving = true;
      state.error = "";
      state.notice = "";
      rerender();

      try {
        const result = await webConfigResource.update({
          icon_url: currentConfig.icon_url ?? "",
          app_name: currentConfig.app_name ?? "BeliMobil",
          tagline: currentConfig.tagline ?? "Jual beli mobil terpercaya",
          whatsapp_number: currentConfig.whatsapp_number ?? "",
          landing_page_route_name: state.selected,
        });
        const config = result.config ?? {};
        appStore.patchState("working.adminWebConfig.config", { data: config, hydratedAt: Date.now() }, "admin-landing-page:save");
        state.selected = config.landing_page_route_name ?? state.selected;
        state.notice = "Landing page #/ berhasil diperbarui.";
        showToast(state.notice, { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menyimpan landing page.";
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
      state.selected = currentLandingPageName();
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
      state.selected = currentLandingPageName();
      rerender();
    },
    bindEvents() {
      unsubscribe = appStore.subscribe((nextState, action) => {
        if (String(action ?? "").startsWith("ui:")) {
          return;
        }
        rerender();
      });
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
    },
  });
}

function render(root, context, state, actions) {
  if (!root) return;

  const page = document.createElement("section");
  page.className = "grid min-w-0 gap-6";
  page.append(hero(), optionsList(state, actions), actionPanel(state, actions));
  if (state.notice) page.append(messagePanel(state.notice, "success"));
  if (state.error) page.append(messagePanel(state.error, "error"));
  root.replaceChildren(page);
}

function hero() {
  const section = document.createElement("section");
  section.className = "grid gap-4 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,244,237,0.86))] p-5 shadow-[var(--pb-shadow-card)] lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center";
  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-2";
  copy.append(
    iconBox("home"),
    textNode("p", "text-[10px] font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", "Superadmin"),
    textNode("h1", "text-2xl font-black leading-tight text-gray-950", "Landing Page Utama"),
    textNode("p", "max-w-2xl text-xs leading-6 text-gray-600", "Pilih halaman yang akan dipakai saat user membuka #/. Halaman lama tetap bisa diakses dari route aslinya."),
  );
  const preview = document.createElement("section");
  preview.className = "grid min-w-[220px] gap-1 rounded-[1rem] border border-[var(--pb-border)] bg-white/82 p-4 shadow-sm";
  preview.append(
    textNode("p", "text-[10px] font-black uppercase tracking-[0.14em] text-gray-500", "Route target"),
    textNode("p", "text-lg font-black text-gray-950", "#/"),
  );
  section.append(copy, preview);
  return section;
}

function optionsList(state, actions) {
  const section = document.createElement("section");
  section.className = "grid gap-3";
  landingPageOptions().forEach((option) => section.append(optionRow(option, state.selected, actions)));
  return section;
}

function optionRow(option, selected, actions) {
  const active = option.name === selected;
  const row = document.createElement("button");
  row.type = "button";
  row.className = active
    ? "grid min-w-0 gap-3 rounded-[1.35rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-[var(--pb-surface-muted)] p-4 text-left shadow-[var(--pb-shadow-card)] ring-2 ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)] md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
    : "grid min-w-0 gap-3 rounded-[1.35rem] border border-[var(--pb-border)] bg-white p-4 text-left shadow-[var(--pb-shadow-soft)] transition hover:border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] hover:bg-[var(--pb-surface-muted)] md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center";
  row.addEventListener("click", () => actions.select(option.name));

  row.append(
    iconBox(active ? "circleCheck" : "file"),
    optionCopy(option),
    statusPill(active),
  );
  return row;
}

function optionCopy(option) {
  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textNode("h2", "break-words text-sm font-black text-gray-950", option.label),
    textNode("p", "break-words text-xs font-semibold leading-6 text-gray-600", option.description),
    textNode("p", "break-words text-[10px] font-black uppercase tracking-[0.12em] text-[var(--pb-brand-secondary)]", `${option.name} | #${option.path}`),
  );
  return copy;
}

function statusPill(active) {
  const pill = document.createElement("span");
  pill.className = active
    ? "inline-flex w-fit items-center justify-center rounded-full bg-[var(--pb-brand-primary)] px-3 py-1 text-[10px] font-black text-white"
    : "inline-flex w-fit items-center justify-center rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black text-gray-500";
  pill.textContent = active ? "Dipakai" : "Pilih";
  return pill;
}

function actionPanel(state, actions) {
  const panel = document.createElement("section");
  panel.className = "flex flex-col gap-3 rounded-[1.5rem] border border-[var(--pb-border)] bg-white p-4 shadow-[var(--pb-shadow-card)] sm:flex-row sm:items-center sm:justify-between";
  panel.append(textNode("p", "text-xs font-semibold leading-6 text-gray-600", "Perubahan berlaku untuk route #/ setelah konfigurasi tersimpan."));
  const save = Button({ label: state.saving ? "Menyimpan..." : "Simpan Landing Page", disabled: state.saving, onClick: actions.save });
  save.id = "admin_landing_page_save_button";
  save.classList.add("w-full", "sm:w-auto");
  save.prepend(createIcon("circleCheck", { className: "block h-4 w-4 leading-none" }));
  panel.append(save);
  return panel;
}

function resolveConfig() {
  return appStore.get("working.adminWebConfig.config.data", null)
    ?? appStore.get("snapshot.admin.webConfig.data", null)
    ?? {};
}

function iconBox(icon) {
  const box = document.createElement("span");
  box.className = "grid h-12 w-12 shrink-0 place-items-center rounded-[1rem] bg-[var(--pb-brand-primary)] text-white shadow-[var(--pb-shadow-soft)]";
  box.append(createIcon(icon, { className: "block h-5 w-5 leading-none" }));
  return box;
}

function messagePanel(message, type) {
  const section = document.createElement("section");
  section.className = type === "success"
    ? "rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-success)_26%,white)] bg-[color-mix(in_srgb,var(--pb-success)_8%,white)] px-4 py-3 text-xs font-semibold text-[color-mix(in_srgb,var(--pb-success)_84%,black)]"
    : "rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-xs font-semibold text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
  section.textContent = message;
  return section;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
