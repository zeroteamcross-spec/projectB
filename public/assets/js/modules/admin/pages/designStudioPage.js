import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { Card } from "../../../ui/composites/card.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { currentThemeConfig, applyThemeToDocument } from "../../../theme/themeRuntime.js";
import { themeStudioResource } from "../../../resources/themeStudioResource.js";
import { designStudioService } from "../services/designStudioService.js";
import { DesignStudioPreview } from "../components/designStudioPreview.js";
import { deepClone } from "../../../utils/deepClone.js";
import { DESIGN_STUDIO_PREVIEW_ROUTES, DESIGN_STUDIO_VIEWPORTS, registryEntries, registryItem } from "../designStudioRegistry.js";

const RUNTIME_KEY = "adminDesignStudio";
const STUDIO_SECTIONS = designStudioService.sections();
const DEFAULT_SECTION = STUDIO_SECTIONS[0]?.id ?? "brand";
const EMPTY_RUNTIME = {
  draft: null,
  dirty: false,
  saving: false,
  notice: "",
  error: "",
  activeSection: DEFAULT_SECTION,
  selectedHookId: "",
  dsSearch: "",
  selectedDataDs: "catalog.search.bar",
  previewRouteId: "landing",
  previewViewportId: "mobile",
  temporaryStyles: {},
  foundDataDs: [],
};

export function AdminDesignStudioPage({ notFound = false } = {}) {
  let root = null;
  let unsubscribe = null;
  let baselineTheme = currentThemeConfig();
  let filePicker = null;
  let skipNextRender = false;

  return createPageLifecycle({
    mount(context) {
      root = document.createElement("div");
      filePicker = buildFilePicker(async (raw) => {
        try {
          const next = designStudioService.importJson(raw);
          setDraft(next, true);
          showToast("Config berhasil diimport ke preview.", { type: "success" });
        } catch (error) {
          showToast(error.message || "Import config gagal.", { type: "error" });
        }
      });

      initializeDraft();
      render(root, context, notFound);
      return root;
    },
    hydrate(context) {
      initializeDraft();
      render(root, context, notFound);
    },
    bindEvents(context) {
      const handleInput = (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) {
          return;
        }

        const path = target.dataset?.fieldPath;
        const runtimeField = target.dataset?.runtimeField;
        const styleProp = target.dataset?.styleProp;

        if (runtimeField) {
          if (runtimeField === "dsSearch") {
            patchRuntime({ [runtimeField]: target.value }, "admin:design-studio-runtime-input", { render: false });
            updateDataDsRegistryList(root, target.value);
          } else {
            patchRuntime({ [runtimeField]: target.value }, "admin:design-studio-runtime-input");
          }
          return;
        }

        if (styleProp) {
          const state = runtime();
          const key = state.selectedDataDs;
          patchRuntime({
            temporaryStyles: {
              ...(state.temporaryStyles ?? {}),
              [key]: {
                ...(state.temporaryStyles?.[key] ?? {}),
                [styleProp]: target.value,
              },
            },
          }, "admin:design-studio-style-input", { render: false });
          return;
        }

        if (!path) {
          return;
        }

        const value = target.getAttribute("type") === "range"
          ? Number(target.value)
          : target.value;
        setDraft(designStudioService.updateDraft(runtime().draft, path, value), true, { render: false });
      };

      const handleClick = async (event) => {
        const action = event.target instanceof HTMLElement
          ? event.target.closest("[data-action]")?.dataset?.action
          : null;

        if (!action) {
          return;
        }

        if (action === "reset") {
          setDraft(designStudioService.defaults(), true);
          return;
        }

        if (action === "import") {
          filePicker?.click();
          return;
        }

        if (action === "export") {
          downloadConfig(runtime().draft ?? designStudioService.defaults());
          return;
        }

        if (action === "switch-section") {
          const sectionId = event.target instanceof HTMLElement
            ? event.target.closest("[data-section-id]")?.dataset?.sectionId
            : null;
          if (sectionId) {
            patchRuntime({ activeSection: sectionId, selectedHookId: "" }, "admin:design-studio-section");
          }
          return;
        }

        if (action === "select-hook") {
          const hookId = event.target instanceof HTMLElement
            ? event.target.closest("[data-hook-id]")?.dataset?.hookId
            : null;
          if (hookId) {
            patchRuntime({ selectedHookId: hookId }, "admin:design-studio-select-hook");
          }
          return;
        }

        if (action === "save") {
          await saveDraft();
          return;
        }

        if (action === "select-data-ds") {
          const key = event.target instanceof HTMLElement
            ? event.target.closest("[data-data-ds-key]")?.dataset?.dataDsKey
            : null;
          if (key) {
            patchRuntime({ selectedDataDs: key }, "admin:design-studio-select-data-ds");
            postPreviewMessage("DESIGN_STUDIO_HIGHLIGHT", { target: key });
          }
          return;
        }

        if (action === "refresh-preview") {
          refreshPreviewFrame();
          return;
        }

        if (action === "apply-temporary") {
          const state = runtime();
          postPreviewMessage("DESIGN_STUDIO_APPLY_OVERRIDE", {
            target: state.selectedDataDs,
            styles: state.temporaryStyles?.[state.selectedDataDs] ?? {},
          });
          return;
        }

        if (action === "reset-temporary") {
          patchRuntime({ temporaryStyles: {} }, "admin:design-studio-reset-temporary");
          postPreviewMessage("DESIGN_STUDIO_RESET_OVERRIDE", {});
          return;
        }

        if (action === "export-data-ds-draft") {
          downloadDataDsDraft(runtime().temporaryStyles ?? {});
        }
      };

      const handleMessage = (event) => {
        if (event.origin !== window.location.origin || event.data?.type !== "DESIGN_STUDIO_DATA_DS_LIST") {
          return;
        }
        const nextItems = normalizeFoundDataDs(event.data.payload?.items ?? []);
        if (!sameFoundDataDs(runtime().foundDataDs ?? [], nextItems)) {
          patchRuntime({ foundDataDs: nextItems }, "admin:design-studio-scan-result");
        }
      };

      root.addEventListener("input", handleInput);
      root.addEventListener("change", handleInput);
      root.addEventListener("click", handleClick);
      window.addEventListener("message", handleMessage);
      unsubscribe = appStore.subscribe(() => {
        if (skipNextRender) {
          skipNextRender = false;
          return;
        }
        initializeDraft();
        render(root, context, notFound);
      });

      return () => {
        root.removeEventListener("input", handleInput);
        root.removeEventListener("change", handleInput);
        root.removeEventListener("click", handleClick);
        window.removeEventListener("message", handleMessage);
        unsubscribe?.();
      };
    },
    unmount() {},
    dispose() {
      if (runtime().dirty) {
        applyThemeToDocument(baselineTheme);
      }
      filePicker?.remove();
      filePicker = null;
      unsubscribe = null;
    },
  });

  function initializeDraft() {
    const state = runtime();
    if (state.draft) {
      return;
    }

    const master = appStore.get("working.adminDesignStudio.theme.data", null);
    const draft = designStudioService.initialDraft(master);
    baselineTheme = deepClone(draft);
    patchRuntime({ draft, dirty: false, error: "", notice: "" }, "admin:design-studio-init");
    applyThemeToDocument(draft);
  }

  function runtime() {
    return appStore.get(`runtime.${RUNTIME_KEY}`, EMPTY_RUNTIME) ?? EMPTY_RUNTIME;
  }

  function patchRuntime(patch, action, options = {}) {
    if (options.render === false) {
      skipNextRender = true;
    }
    appStore.patchState(`runtime.${RUNTIME_KEY}`, { ...runtime(), ...patch }, action);
  }

  function setDraft(draft, dirty, options = {}) {
    patchRuntime({
      draft,
      dirty,
      notice: dirty ? "Preview aktif. Simpan untuk menjadikannya source of truth." : runtime().notice,
      error: "",
    }, "admin:design-studio-draft", options);
    applyThemeToDocument(draft);
  }

  async function saveDraft() {
    const state = runtime();
    patchRuntime({ saving: true, error: "", notice: "" }, "admin:design-studio-saving");

    try {
      const master = await themeStudioResource.save(designStudioService.normalize(state.draft));
      appStore.patchState("working.adminDesignStudio.theme", {
        data: master,
        hydratedAt: Date.now(),
      }, "admin:design-studio-working-theme");
      baselineTheme = designStudioService.initialDraft(master);
      patchRuntime({
        draft: baselineTheme,
        dirty: false,
        saving: false,
        notice: "Theme global berhasil disimpan.",
      }, "admin:design-studio-saved");
      applyThemeToDocument(baselineTheme);
      showToast("Theme global berhasil disimpan.", { type: "success" });
    } catch (error) {
      patchRuntime({
        saving: false,
        error: error.message || "Menyimpan theme gagal.",
      }, "admin:design-studio-save-error");
      showToast(error.message || "Menyimpan theme gagal.", { type: "error" });
    }
  }
}

function render(root, context, notFound) {
  if (!root) {
    return;
  }

  const state = appStore.get(`runtime.${RUNTIME_KEY}`, EMPTY_RUNTIME) ?? EMPTY_RUNTIME;
  const draft = state.draft ?? designStudioService.defaults();
  const activeSectionId = state.activeSection || DEFAULT_SECTION;
  const activeSection = STUDIO_SECTIONS.find((section) => section.id === activeSectionId) ?? STUDIO_SECTIONS[0];
  const sectionHooks = designStudioService.hooksForSection(activeSectionId);
  const selectedHook = designStudioService.hookById(state.selectedHookId);

  if (notFound) {
    root.replaceChildren(
      SectionHeader({
        title: "Design Studio tidak ditemukan",
        description: "Kembali ke dashboard admin untuk membuka modul konfigurasi desain yang valid.",
      }),
      EmptyState({
        title: "Route tidak ditemukan",
        description: "Gunakan menu admin untuk membuka Design Studio.",
      })
    );
    return;
  }

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";
  actions.append(
    actionButton("reset", "Reset Default", "secondary"),
    actionButton("import", "Import JSON", "secondary"),
    actionButton("export", "Export JSON", "secondary"),
    actionButton("save", state.saving ? "Menyimpan..." : "Save & Apply", "primary", state.saving)
  );

  const shell = document.createElement("div");
  shell.className = "grid gap-6";

  const topBar = Card([], { variant: "raised" });
  topBar.className = `${topBar.className} grid gap-4 p-5`;
  topBar.append(
    SectionHeader({
      title: "Design Studio",
      description: "Kelola source of truth visual global tanpa edit file manual. Preview aktif langsung di session ini, simpan untuk menjadikannya runtime resmi.",
      action: actions,
    }),
    helperPanel(state),
  );

  const content = document.createElement("div");
  content.className = "grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_minmax(380px,1fr)]";

  const navColumn = document.createElement("aside");
  navColumn.className = "grid gap-4 xl:sticky xl:top-6 xl:self-start";
  navColumn.append(sectionNavigator(activeSectionId));

  const formColumn = document.createElement("div");
  formColumn.className = "grid gap-4";
  formColumn.append(sectionHero(activeSection), renderSection(activeSection, draft));

  const previewColumn = document.createElement("aside");
  previewColumn.className = "grid gap-4 xl:sticky xl:top-6 xl:self-start";
  previewColumn.append(
    Card([
      textBlock("text-xs font-semibold text-[var(--pb-text)]", "Live Preview"),
      textBlock("text-xs text-[var(--pb-text-muted)]", "Snippet public, controls, dan internal memakai token yang sama dengan aplikasi."),
    ], { variant: "raised" }),
    dataDsStudioPanel(state),
    hookInspectorCard(activeSection, sectionHooks, selectedHook),
    DesignStudioPreview({ config: draft, selectedHookId: selectedHook?.id ?? "" })
  );

  content.append(navColumn, formColumn, previewColumn);
  shell.append(topBar, content);
  root.replaceChildren(shell);
}

function hookInspectorCard(section, hooks, selectedHook) {
  const card = Card([], { variant: "raised" });
  card.className = `${card.className} grid gap-4 p-5`;

  const heading = document.createElement("div");
  heading.className = "grid gap-1";
  heading.append(
    textBlock("text-[10px] font-bold uppercase tracking-normal text-[var(--pb-brand-secondary)]", "Bagian yang terhubung"),
    textBlock("text-sm font-semibold text-[var(--pb-text)]", `${hooks.length} elemen untuk section ${section.title}`),
    textBlock("text-xs text-[var(--pb-text-muted)]", "Pilih item untuk melihat bagian UI yang dimaksud. Identitas memakai data-ds, jadi tidak bergantung pada class Tailwind."),
  );
  card.append(heading);

  if (!hooks.length) {
    card.append(EmptyState({
      title: "Belum ada hook untuk section ini",
      description: "Section ini belum punya area preview yang dipetakan. Registry tetap siap untuk diperluas per modul.",
    }));
    return card;
  }

  const list = document.createElement("div");
  list.className = "grid gap-2";
  hooks.forEach((hook) => list.append(hookListItem(hook, selectedHook?.id === hook.id)));
  card.append(list);

  if (selectedHook) {
    const detail = document.createElement("div");
    detail.className = "grid gap-2 rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-4";
    detail.append(
      textBlock("text-xs font-semibold text-[var(--pb-text)]", selectedHook.label),
      textBlock("text-xs text-[var(--pb-text-muted)]", selectedHook.description),
      metaLine("Hook", selectedHook.id),
      metaLine("Kategori", selectedHook.category),
      metaLine("Token terkait", selectedHook.tokens.join(", ") || "-"),
    );
    card.append(detail);
  }

  return card;
}

function hookListItem(hook, active) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.action = "select-hook";
  button.dataset.hookId = hook.id;
  button.className = active
    ? "grid gap-1 rounded-[var(--pb-radius-xl)] border border-[color-mix(in_srgb,var(--pb-brand-primary)_35%,white)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-4 py-3 text-left"
    : "grid gap-1 rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] px-4 py-3 text-left";
  button.append(
    textBlock("text-xs font-semibold text-[var(--pb-text)]", hook.label),
    textBlock("text-[10px] text-[var(--pb-text-muted)]", hook.description),
    textBlock("text-[10px] font-medium text-[var(--pb-brand-secondary)]", hook.id),
  );
  return button;
}

function metaLine(label, value) {
  const node = document.createElement("div");
  node.className = "text-[10px] text-[var(--pb-text-muted)]";
  node.textContent = `${label}: ${value}`;
  return node;
}

function renderSection(section, draft) {
  const card = Card([], { variant: "raised" });
  card.className = `${card.className} grid gap-5 p-5`;

  const grid = document.createElement("div");
  grid.className = "grid gap-4 md:grid-cols-2";
  section.fields.forEach((field) => grid.append(renderField(field, draft)));

  card.append(grid);
  return card;
}

function renderField(field, draft) {
  const value = String(designStudioService.fieldValue(draft, field.path, ""));
  const wrap = document.createElement("label");
  wrap.className = "grid gap-2 min-w-0";

  const labelRow = document.createElement("div");
  labelRow.className = "grid gap-1";
  labelRow.append(
    textBlock("text-xs font-medium text-[var(--pb-text-strong)]", field.label),
    textBlock("text-[10px] text-[var(--pb-text-muted)]", field.type === "range" ? `Nilai saat ini: ${value}` : field.path)
  );

  wrap.append(labelRow);

  if (field.type === "color") {
    const row = document.createElement("div");
    row.className = "flex items-center gap-3";

    const picker = document.createElement("input");
    picker.type = "color";
    picker.value = normalizeColorValue(value);
    picker.dataset.fieldPath = field.path;
    picker.className = "h-11 w-14 shrink-0 cursor-pointer rounded-[var(--pb-radius-lg)] border border-[var(--pb-form-border)] bg-transparent p-1";

    const text = document.createElement("input");
    text.type = "text";
    text.value = value;
    text.dataset.fieldPath = field.path;
    text.className = "min-h-11 min-w-0 flex-1 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs text-[var(--pb-text)] outline-none";

    row.append(picker, text);
    wrap.append(row);
    return wrap;
  }

  if (field.type === "select") {
    const select = document.createElement("select");
    select.dataset.fieldPath = field.path;
    select.className = "min-h-11 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs text-[var(--pb-text)] outline-none";
    field.options.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === value;
      select.append(item);
    });
    wrap.append(select);
    return wrap;
  }

  const input = document.createElement("input");
  input.type = field.type === "range" ? "range" : "text";
  input.value = value;
  input.dataset.fieldPath = field.path;
  input.className = field.type === "range"
    ? "w-full accent-[var(--pb-brand-primary)]"
    : "min-h-11 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs text-[var(--pb-text)] outline-none";

  if (field.type === "range") {
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
  }

  wrap.append(input);
  return wrap;
}

function helperPanel(state) {
  const card = Card([], { variant: "raised" });
  card.className = `${card.className} grid gap-3 p-4`;

  const top = document.createElement("div");
  top.className = "flex flex-wrap items-center gap-2";
  top.append(
    badge(state.dirty ? "Preview belum disimpan" : "Sinkron dengan source of truth", state.dirty ? "warning" : "success"),
    badge("Master Data", "default"),
    badge("Runtime Theme", "info"),
  );

  card.append(top);

  if (state.notice) {
    card.append(textBlock("text-xs text-[var(--pb-text-muted)]", state.notice));
  }

  if (state.error) {
    const error = document.createElement("div");
    error.className = "rounded-[var(--pb-radius-xl)] border border-[var(--pb-error-border)] bg-[var(--pb-error-bg)] px-4 py-3 text-xs text-[var(--pb-danger)]";
    error.textContent = state.error;
    card.append(error);
  }

  return card;
}

function sectionNavigator(activeSectionId) {
  const card = Card([], { variant: "raised" });
  card.className = `${card.className} grid gap-3 p-4`;

  card.append(
    textBlock("text-[10px] font-bold uppercase tracking-normal text-[var(--pb-brand-secondary)]", "Studio Sections"),
    textBlock("text-xs text-[var(--pb-text-muted)]", "Pilih area visual yang ingin diatur. Editor utama hanya menampilkan satu section agar tetap rapi."),
  );

  const list = document.createElement("div");
  list.className = "grid gap-2";
  STUDIO_SECTIONS.forEach((section) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = "switch-section";
    button.dataset.sectionId = section.id;
    button.className = section.id === activeSectionId
      ? "grid gap-1 rounded-[var(--pb-radius-xl)] border border-[color-mix(in_srgb,var(--pb-brand-primary)_35%,white)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-4 py-3 text-left shadow-[var(--pb-shadow-soft)]"
      : "grid gap-1 rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] px-4 py-3 text-left";
    button.append(
      textBlock("text-xs font-semibold text-[var(--pb-text)]", section.title),
      textBlock("text-[10px] text-[var(--pb-text-muted)]", section.description),
    );
    list.append(button);
  });

  card.append(list);
  return card;
}

function sectionHero(section) {
  const card = Card([], { variant: "raised" });
  card.className = `${card.className} grid gap-2 p-5`;
  card.append(
    textBlock("text-[10px] font-bold uppercase tracking-normal text-[var(--pb-brand-secondary)]", section.title),
    textBlock("text-base font-bold text-[var(--pb-text)]", `Konfigurasi ${section.title}`),
    textBlock("text-xs text-[var(--pb-text-muted)]", section.description),
  );
  return card;
}

function actionButton(action, label, variant, disabled = false) {
  const button = Button({ label, variant, disabled });
  button.dataset.action = action;
  return button;
}

function dataDsStudioPanel(state) {
  const card = Card([], { variant: "raised" });
  card.className = `${card.className} grid gap-4 p-5`;

  const selected = registryItem(state.selectedDataDs) ? { key: state.selectedDataDs, ...registryItem(state.selectedDataDs) } : registryEntries()[0];
  const route = DESIGN_STUDIO_PREVIEW_ROUTES.find((item) => item.id === state.previewRouteId) ?? DESIGN_STUDIO_PREVIEW_ROUTES[0];
  const viewport = DESIGN_STUDIO_VIEWPORTS[state.previewViewportId] ?? DESIGN_STUDIO_VIEWPORTS.mobile;

  card.append(
    textBlock("text-[10px] font-bold uppercase tracking-normal text-[var(--pb-brand-secondary)]", "data-ds Registry"),
    dataDsToolbar(state),
    dataDsRegistryList(state, selected?.key),
    dataDsPreviewControls(state, route, viewport),
    dataDsFrame(route, viewport),
    dataDsEditor(selected, state),
    unregisteredDataDs(state)
  );
  return card;
}

function dataDsToolbar(state) {
  const wrap = document.createElement("div");
  wrap.className = "grid gap-2";
  const input = document.createElement("input");
  input.type = "search";
  input.placeholder = "Cari elemen design...";
  input.value = state.dsSearch ?? "";
  input.dataset.runtimeField = "dsSearch";
  input.className = "min-h-11 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs text-[var(--pb-text)] outline-none";
  wrap.append(input);
  return wrap;
}

function dataDsRegistryList(state, selectedKey) {
  const query = String(state.dsSearch || "").toLowerCase().trim();
  const entries = registryEntries().filter((item) => {
    const haystack = [item.key, item.label, item.group, item.description, ...(item.previewRoutes ?? [])].join(" ").toLowerCase();
    return !query || haystack.includes(query);
  });
  const list = document.createElement("div");
  list.dataset.dsRegistryList = "true";
  list.className = "grid max-h-72 gap-2 overflow-auto rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] p-2";
  entries.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.action = "select-data-ds";
    button.dataset.dataDsKey = item.key;
    button.className = item.key === selectedKey
      ? "grid gap-1 rounded-[var(--pb-radius-lg)] border border-[color-mix(in_srgb,var(--pb-brand-primary)_35%,white)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-3 py-2 text-left"
      : "grid gap-1 rounded-[var(--pb-radius-lg)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] px-3 py-2 text-left";
    button.append(
      textBlock("text-xs font-semibold text-[var(--pb-text)]", item.label),
      textBlock("text-[10px] text-[var(--pb-brand-secondary)]", item.key),
      textBlock("text-[10px] text-[var(--pb-text-muted)]", `${item.group} - ${item.editable ? "editable" : "read only"} - ${item.riskLevel}`),
    );
    list.append(button);
  });
  if (!entries.length) {
    list.append(EmptyState({ title: "Registry tidak ditemukan", description: "Tidak ada data-ds registered yang cocok dengan pencarian." }));
  }
  return list;
}

function updateDataDsRegistryList(root, query) {
  const list = root?.querySelector?.("[data-ds-registry-list='true']");
  if (!list) {
    return;
  }
  const state = {
    ...appStore.get(`runtime.${RUNTIME_KEY}`, EMPTY_RUNTIME),
    dsSearch: query,
  };
  list.replaceWith(dataDsRegistryList(state, state.selectedDataDs));
}

function dataDsPreviewControls(state, route, viewport) {
  const wrap = document.createElement("div");
  wrap.className = "grid gap-3";

  const row = document.createElement("div");
  row.className = "grid gap-2 md:grid-cols-2";
  row.append(
    selectControl("previewRouteId", DESIGN_STUDIO_PREVIEW_ROUTES.map((item) => ({ value: item.id, label: `${item.label} (${item.roleContext})` })), route.id),
    selectControl("previewViewportId", Object.values(DESIGN_STUDIO_VIEWPORTS).map((item) => ({ value: item.id, label: `${item.label} ${item.width}x${item.height}` })), viewport.id),
  );

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";
  actions.append(
    actionButton("refresh-preview", "Refresh Preview", "secondary"),
    actionButton("apply-temporary", "Apply Temporary", "primary"),
    actionButton("reset-temporary", "Reset Preview", "secondary"),
    actionButton("export-data-ds-draft", "Export JSON Draft", "secondary"),
  );
  wrap.append(row, textBlock("text-[10px] text-[var(--pb-text-muted)]", `Preview memakai session saat ini. Protected route akan mengikuti role guard existing: ${route.roleContext}.`), actions);
  return wrap;
}

function dataDsFrame(route, viewport) {
  const shell = document.createElement("div");
  shell.className = "overflow-auto rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-3";
  const frame = document.createElement("iframe");
  frame.id = "design_studio_route_preview";
  frame.src = route.route;
  frame.width = String(viewport.width);
  frame.height = String(viewport.height);
  frame.className = "block border-0 bg-white shadow-[var(--pb-shadow-card)]";
  frame.style.width = `${viewport.width}px`;
  frame.style.height = `${viewport.height}px`;
  frame.addEventListener("load", () => {
    postPreviewMessage("DESIGN_STUDIO_SCAN_DATA_DS", {});
    postPreviewMessage("DESIGN_STUDIO_HIGHLIGHT", { target: appStore.get(`runtime.${RUNTIME_KEY}`, EMPTY_RUNTIME)?.selectedDataDs });
  });
  shell.append(frame);
  return shell;
}

function dataDsEditor(selected, state) {
  const box = document.createElement("div");
  box.className = "grid gap-3 rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-4";
  if (!selected) {
    box.append(textBlock("text-xs text-[var(--pb-text-muted)]", "Pilih registry item untuk mulai edit temporary."));
    return box;
  }
  box.append(
    textBlock("text-xs font-semibold text-[var(--pb-text)]", selected.label),
    metaLine("data-ds", selected.key),
    metaLine("Allowed styles", selected.allowedStyles.join(", ")),
  );
  selected.allowedStyles.forEach((prop) => {
    const input = document.createElement("input");
    input.type = prop.toLowerCase().includes("color") || prop === "background" || prop === "textColor" ? "text" : "text";
    input.placeholder = propValuePlaceholder(prop);
    input.value = state.temporaryStyles?.[selected.key]?.[prop] ?? "";
    input.dataset.styleProp = prop;
    input.className = "min-h-10 rounded-[var(--pb-radius-lg)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs text-[var(--pb-text)] outline-none";
    const label = document.createElement("label");
    label.className = "grid gap-1 text-[10px] font-semibold text-[var(--pb-text-muted)]";
    label.textContent = prop;
    label.append(input);
    box.append(label);
  });
  return box;
}

function unregisteredDataDs(state) {
  const registered = new Set(registryEntries().map((item) => item.key));
  const found = (state.foundDataDs ?? []).filter((item) => !registered.has(item.key));
  const box = document.createElement("div");
  box.className = "grid gap-2";
  box.append(textBlock("text-xs font-semibold text-[var(--pb-text)]", "Unregistered data-ds"));
  if (!found.length) {
    box.append(textBlock("text-[10px] text-[var(--pb-text-muted)]", "Belum ada unregistered data-ds dari preview saat ini."));
    return box;
  }
  found.forEach((item) => box.append(textBlock("text-[10px] text-[var(--pb-text-muted)]", `${item.key} (${item.tagName}) - Add to registry required before editing.`)));
  return box;
}

function selectControl(field, options, value) {
  const select = document.createElement("select");
  select.dataset.runtimeField = field;
  select.className = "min-h-11 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs text-[var(--pb-text)] outline-none";
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    item.selected = option.value === value;
    select.append(item);
  });
  return select;
}

function propValuePlaceholder(prop) {
  const placeholders = {
    fontSize: "13px",
    paddingX: "14px",
    paddingY: "10px",
    borderRadius: "16px",
    borderTopRadius: "24px 24px 0 0",
    background: "#ffffff",
    textColor: "#334155",
    placeholderColor: "#64748b",
    gap: "8px",
    padding: "12px",
    boxShadow: "0 8px 20px rgba(15,23,42,.12)",
    height: "88px",
    iconSize: "22px",
  };
  return placeholders[prop] ?? "value";
}

function postPreviewMessage(type, payload) {
  const frame = document.getElementById("design_studio_route_preview");
  frame?.contentWindow?.postMessage({ type, payload }, window.location.origin);
}

function refreshPreviewFrame() {
  const frame = document.getElementById("design_studio_route_preview");
  if (frame) {
    frame.src = frame.src;
  }
}

function normalizeFoundDataDs(items) {
  return [...items]
    .map((item) => ({
      key: String(item?.key ?? ""),
      tagName: String(item?.tagName ?? ""),
      visible: Boolean(item?.visible),
      registered: Boolean(item?.registered),
      editable: Boolean(item?.editable),
    }))
    .filter((item) => item.key)
    .sort((a, b) => `${a.key}:${a.tagName}`.localeCompare(`${b.key}:${b.tagName}`));
}

function sameFoundDataDs(current, next) {
  const a = normalizeFoundDataDs(current);
  const b = normalizeFoundDataDs(next);
  if (a.length !== b.length) {
    return false;
  }
  return a.every((item, index) => {
    const other = b[index];
    return item.key === other.key
      && item.tagName === other.tagName
      && item.visible === other.visible
      && item.registered === other.registered
      && item.editable === other.editable;
  });
}

function downloadDataDsDraft(styles) {
  const blob = new Blob([JSON.stringify({ status: "temporary_only", overrides: styles }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "projectb-data-ds-design-draft.json";
  link.click();
  URL.revokeObjectURL(url);
}

function buildFilePicker(onLoad) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.hidden = true;
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const raw = await file.text();
    await onLoad(raw);
    input.value = "";
  });
  document.body.append(input);
  return input;
}

function downloadConfig(config) {
  const blob = new Blob([designStudioService.exportJson(config)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "projectb-theme-config.json";
  link.click();
  URL.revokeObjectURL(url);
}

function badge(label, variant) {
  const node = document.createElement("span");
  const classes = {
    default: "bg-[var(--pb-badge-neutral-bg)] text-[var(--pb-text-strong)]",
    success: "bg-[color-mix(in_srgb,var(--pb-success)_14%,white)] text-[var(--pb-success)]",
    warning: "bg-[color-mix(in_srgb,var(--pb-warning)_14%,white)] text-[var(--pb-warning)]",
    info: "bg-[color-mix(in_srgb,var(--pb-info)_14%,white)] text-[var(--pb-info)]",
  };
  node.className = `inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold ${classes[variant] ?? classes.default}`;
  node.textContent = label;
  return node;
}

function textBlock(className, text) {
  const node = document.createElement("div");
  node.className = className;
  node.textContent = text;
  return node;
}

function normalizeColorValue(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value)) ? String(value) : "#ffffff";
}
