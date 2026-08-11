import { Button } from "../../../ui/primitives/button.js";
import { Card } from "../../../ui/composites/card.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { applyThemeToTarget } from "../../../theme/themeRuntime.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { applyDesignHook, findDesignStudioHook } from "../../../theme/designStudioHooks.js";

export function DesignStudioPreview({ config, selectedHookId = "" } = {}) {
  const root = document.createElement("section");
  root.className = "grid gap-4";
  applyThemeToTarget(root, config);

  root.append(
    previewHeader(config),
    previewLanding(),
    previewControls(),
    previewInternal(),
    previewStates()
  );

  syncPreviewSelection(root, selectedHookId);

  return root;
}

function previewHeader(config) {
  const card = Card([], { variant: "raised" });
  card.className = `${card.className} overflow-hidden`;
  applyDesignHook(card, "shell.public.header");

  const shell = document.createElement("div");
  shell.className = "grid gap-0";

  const bar = document.createElement("div");
  bar.className = "flex items-center justify-between gap-3 border-b border-[var(--pb-border)] bg-[var(--pb-shell-public-header)] px-4 py-3";

  const brand = document.createElement("div");
  brand.className = "flex min-w-0 items-center gap-3";

  const mark = document.createElement("span");
  mark.className = tw.layout.publicMark;
  mark.append(createIcon(config?.brand?.logoIcon ?? "brandMark", { className: "h-5 w-5" }));

  const copy = document.createElement("div");
  copy.className = "grid min-w-0";
  const title = document.createElement("strong");
  title.className = "truncate text-xs font-bold text-[var(--pb-text)]";
  title.textContent = config?.brand?.appName ?? "BeliMobil";
  const subtitle = document.createElement("span");
  subtitle.className = "truncate text-[10px] text-[var(--pb-text-muted)]";
  subtitle.textContent = config?.brand?.tagline ?? "Jual beli mobil terpercaya";
  copy.append(title, subtitle);

  const actions = document.createElement("div");
  actions.className = "flex items-center gap-2";
  actions.append(iconButton("bell"), iconButton("user"));

  brand.append(mark, copy);
  bar.append(brand, actions);

  const caption = document.createElement("div");
  caption.className = "px-4 py-3 text-[10px] text-[var(--pb-text-muted)]";
  caption.textContent = "Shell preview";

  shell.append(bar, caption);
  card.append(shell);
  return card;
}

function previewLanding() {
  const wrap = Card([], { variant: "raised" });
  wrap.className = `${wrap.className} grid gap-4 overflow-hidden bg-[linear-gradient(180deg,var(--pb-public-canvas-start),var(--pb-public-canvas-mid),var(--pb-public-canvas-end))] p-4 text-white`;
  applyDesignHook(wrap, "catalog.page");

  const hero = document.createElement("div");
  hero.className = "rounded-[var(--pb-radius-2xl)] bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to),var(--pb-brand-secondary))] p-4 shadow-[var(--pb-shadow-card)]";
  applyDesignHook(hero, "catalog.hero.banner");
  hero.innerHTML = `
    <div class="grid gap-2">
      <span class="inline-flex w-fit rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase text-white/90">Mega sale</span>
      <h3 class="text-lg font-bold">Landing public snippet</h3>
      <p class="text-xs text-white/80">Hero, search, chip, dan CTA mengikuti konfigurasi baru.</p>
    </div>
  `;

  const search = document.createElement("div");
  search.className = tw.form.searchWrap;
  applyDesignHook(search, "catalog.search.bar");
  search.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--pb-radius-xl)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-[var(--pb-brand-primary)]">⌕</div>
      <div class="min-w-0 flex-1 text-xs text-[var(--pb-text-muted)]">Cari mobil impian Anda...</div>
      <div class="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--pb-radius-xl)] bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white">⌕</div>
    </div>
  `;

  const chips = document.createElement("div");
  chips.className = "flex flex-wrap gap-2";
  applyDesignHook(chips, "catalog.filter.toolbar");
  chips.append(
    pill("Terpopuler", false),
    pill("Promo", true),
    pill("Terbaru", false)
  );

  wrap.append(hero, search, chips);
  return wrap;
}

function previewControls() {
  const card = Card([], { variant: "raised" });
  card.className = `${card.className} grid gap-3`;
  applyDesignHook(card, "shared.card.panel");

  const heading = document.createElement("div");
  heading.className = "grid gap-1";
  heading.innerHTML = `
    <span class="${tw.text.eyebrow}">Controls</span>
    <h3 class="text-base font-bold text-[var(--pb-text)]">Buttons, badge, and input</h3>
  `;

  const row = document.createElement("div");
  row.className = "flex flex-wrap gap-2";
  row.append(
    Button({ label: "Primary", variant: "primary", designHook: "shared.button.primary" }),
    Button({ label: "Secondary", variant: "secondary", designHook: "shared.button.secondary" }),
    Button({ label: "Ghost", variant: "ghost", designHook: "shared.button.ghost" })
  );

  const input = document.createElement("label");
  input.className = tw.form.label;
  input.textContent = "Search / Input";
  const control = document.createElement("input");
  control.className = tw.form.control;
  control.value = "Contoh input";
  applyDesignHook(control, "shared.input.control");
  input.append(control);

  const badges = document.createElement("div");
  badges.className = "flex flex-wrap gap-2";
  badges.append(
    Badge({ label: "Default", variant: "default", designHook: "shared.badge.status" }),
    Badge({ label: "Success", variant: "success", designHook: "shared.badge.status" }),
    Badge({ label: "Warning", variant: "warning", designHook: "shared.badge.status" }),
    Badge({ label: "Danger", variant: "danger", designHook: "shared.badge.status" }),
    Badge({ label: "Info", variant: "info", designHook: "shared.badge.status" })
  );

  card.append(heading, row, input, badges);
  return card;
}

function previewInternal() {
  const shell = Card([], { variant: "raised" });
  shell.className = `${shell.className} grid gap-3`;
  applyDesignHook(shell, "shell.app.root");

  const heading = document.createElement("div");
  heading.className = "grid gap-1";
  heading.innerHTML = `
    <span class="${tw.text.eyebrow}">Internal Snippet</span>
    <h3 class="text-base font-bold text-[var(--pb-text)]">Dashboard / operational tone</h3>
  `;

  const stats = document.createElement("div");
  stats.className = "grid gap-3 sm:grid-cols-3";
  ["12 Users", "8 Pending", "24 Transaksi"].forEach((item) => {
    const stat = Card();
    stat.className = `${stat.className} grid gap-1`;
    applyDesignHook(stat, "seller.dashboard.summary");
    const value = document.createElement("strong");
    value.className = "text-lg font-bold text-[var(--pb-brand-secondary)]";
    value.textContent = item.split(" ")[0];
    const label = document.createElement("span");
    label.className = "text-xs text-[var(--pb-text-muted)]";
    label.textContent = item.split(" ").slice(1).join(" ");
    stat.append(value, label);
    stats.append(stat);
  });

  const listItem = document.createElement("button");
  listItem.type = "button";
  listItem.className = `${tw.interactive.rowButton} ${tw.interactive.selectedCard}`;
  applyDesignHook(listItem, "admin.dashboard.queues");
  listItem.innerHTML = `
    <div class="grid gap-1 min-w-0">
      <strong class="break-words text-[var(--pb-text)]">Queue approval seller</strong>
      <span class="break-words text-xs text-[var(--pb-text-muted)]">List/detail dan selected state ikut tone shell.</span>
    </div>
  `;

  shell.append(heading, stats, listItem);
  return shell;
}

function previewStates() {
  const wrap = document.createElement("div");
  wrap.className = "grid gap-3";
  wrap.append(
    EmptyState({
      title: "Empty state preview",
      description: "Tone kosong, border, dan text mengikuti konfigurasi state.",
      designHook: "shared.state.empty",
    }),
    errorPanel()
  );
  return wrap;
}

function errorPanel() {
  const panel = document.createElement("div");
  panel.className = tw.alert.error;
  applyDesignHook(panel, "shared.state.error");
  panel.innerHTML = `
    <strong class="block text-xs font-bold">Hydrate error preview</strong>
    <p class="${tw.alert.errorMeta} mt-1">Kegagalan route atau save akan mengikuti tone error panel ini.</p>
  `;
  return panel;
}

function pill(label, active) {
  const node = document.createElement("span");
  node.className = active ? tw.interactive.pillActive : tw.interactive.pillIdle;
  node.textContent = label;
  return node;
}

function iconButton(icon) {
  const button = document.createElement("span");
  button.className = "grid h-9 w-9 place-items-center rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-btn-secondary-bg)] text-[var(--pb-btn-secondary-text)]";
  applyDesignHook(button, "shared.button.secondary");
  button.append(createIcon(icon, { className: "h-4 w-4" }));
  return button;
}

function syncPreviewSelection(root, selectedHookId) {
  const activeId = String(selectedHookId || "").trim();
  const nodes = root.querySelectorAll("[data-ds]");
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return;
    }

    node.style.outline = "";
    node.style.outlineOffset = "";
    node.style.boxShadow = "";
    node.removeAttribute("data-ds-active");

    if (activeId && node.dataset.ds === activeId) {
      const meta = findDesignStudioHook(activeId);
      node.dataset.dsActive = "true";
      node.style.outline = "2px solid var(--pb-brand-primary)";
      node.style.outlineOffset = "3px";
      node.style.boxShadow = "0 0 0 4px color-mix(in srgb, var(--pb-brand-primary) 18%, transparent)";
      if (meta?.label) {
        node.title = meta.label;
      }
    }
  });
}
