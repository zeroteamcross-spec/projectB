import { createPageLifecycle } from "../../../core/lifecycle.js";
import { inspectionsResource } from "../../../resources/inspectionsResource.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { openModal, closeModal } from "../../../ui/primitives/modal.js";
import { aksiModalDari, titipkanAksiModal } from "../../../ui/composites/modalHeaderFormActions.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";

const SECTION_OPTIONS = [
  ["road_test", "Pemeriksaan tes jalan"],
  ["exterior", "Eksterior"],
  ["interior", "Interior"],
  ["underbody_engine", "Bawah body dan bawah kap depan"],
  ["documents", "Dokumen dan kelengkapan"],
];

const SECTION_LABELS = Object.fromEntries(SECTION_OPTIONS);

export function AdminMasterInspectionPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const state = {
    query: createQuery({}),
    saving: false,
    error: "",
  };

  const rerender = () => render(root, currentContext, state, actions);

  const actions = {
    applyFilters(nextFilters = {}) {
      state.query = {
        ...state.query,
        ...nextFilters,
        page: 1,
      };
      syncUrl(state.query);
      rerender();
    },
    changePage(nextPage) {
      state.query = {
        ...state.query,
        page: nextPage,
      };
      syncUrl(state.query);
      rerender();
    },
    changePerPage(nextPageSize) {
      state.query = {
        ...state.query,
        page: 1,
        pageSize: nextPageSize,
      };
      syncUrl(state.query);
      rerender();
    },
    openCreateTemplate() {
      openTemplateModal({ mode: "create", template: null, saving: state.saving, actions });
    },
    openEditTemplate(template) {
      openTemplateModal({ mode: "edit", template, saving: state.saving, actions });
    },
    openDetailTemplate(template) {
      openDetailModal(template, actions);
    },
    async saveTemplate(template, form) {
      state.saving = true;
      state.error = "";
      rerender();
      try {
        const payload = readTemplateForm(form);
        const updated = template?.id
          ? await inspectionsResource.updateTemplate(template.id, payload)
          : await inspectionsResource.createTemplate(payload);
        patchTemplates(upsertTemplate(getTemplates(), updated));
        closeModal({ notify: false });
        showToast(template?.id ? "Master item inspeksi berhasil disimpan." : "Master item inspeksi berhasil dibuat.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menyimpan master item inspeksi.";
        showToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      state.query = createQuery(context?.query);
      state.error = "";
      state.saving = false;
    },
    mount(context) {
      currentContext = context;
      root = document.createElement("div");
      rerender();
      return root;
    },
    hydrate(context) {
      currentContext = context;
      state.query = createQuery(context?.query);
      rerender();
    },
    bindEvents(context) {
      currentContext = context;
      unsubscribe = appStore.subscribe(() => rerender());
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
      closeModal({ notify: false });
    },
  });
}

function render(root, context, state, actions) {
  if (!root || !context) {
    return;
  }

  const templates = getTemplates();
  const hasSource = Boolean(
    appStore.get("snapshot.admin.masterInspection.data", null)
      || appStore.get("working.adminMasterInspection.templates.data", null),
  );
  const hydratedAt = appStore.get("working.adminMasterInspection.templates.hydratedAt", 0) ?? 0;
  const loading = !hydratedAt && !hasSource;
  const filteredTemplates = filterTemplates(templates, state.query);
  const pagination = paginate(filteredTemplates, state.query);

  const layout = document.createElement("section");
  layout.id = "admstinsp_page_section";
  layout.className = "grid min-w-0 gap-5";
  layout.dataset.ds = "admin.master.inspection.page";

  layout.append(
    heroSection(templates, {
      onCreate: actions.openCreateTemplate,
    }),
    filterSection({ filters: state.query, templates, onSubmit: actions.applyFilters }),
  );

  if (state.error) {
    const error = document.createElement("section");
    error.id = "admstinsp_error_section";
    error.className = "rounded-[1.25rem] border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-xs font-semibold text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    error.textContent = state.error;
    layout.append(error);
  }

  layout.append(listSection({
    templates: pagination.items,
    allCount: filteredTemplates.length,
    loading,
    page: pagination.page,
    pageSize: pagination.pageSize,
    onDetail: actions.openDetailTemplate,
    onEdit: actions.openEditTemplate,
    onPageChange: actions.changePage,
    onPerPageChange: actions.changePerPage,
  }));

  root.replaceChildren(layout);
}

function heroSection(templates, { onCreate } = {}) {
  const activeCount = templates.filter((template) => template.is_active).length;
  const sections = new Set(templates.map((template) => template.category_name));
  const section = document.createElement("section");
  section.id = "admstinsp_hero_section";
  section.className = "grid gap-4 rounded-[1.5rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,244,237,0.88),rgba(234,244,249,0.72))] p-5 shadow-[var(--pb-shadow-card)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end";

  const copy = document.createElement("section");
  copy.id = "admstinsp_hero_copy_section";
  copy.className = "grid min-w-0 gap-2";
  const icon = document.createElement("div");
  icon.className = "grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#17698f)] text-white shadow-sm";
  icon.append(createIcon("clipboard", { className: "h-5 w-5" }));
  copy.append(
    icon,
    textNode("p", "text-[10px] font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", "Admin Master"),
    textNode("h1", "text-xl font-black leading-tight tracking-normal text-gray-950 sm:text-2xl", "Master Inspection"),
    textNode("p", "max-w-2xl text-xs leading-6 text-gray-600", "Kelola definisi section dan item inspection canon. Seller tetap hanya memilih kondisi dan menambah catatan dari master ini."),
  );

  const stats = document.createElement("section");
  stats.id = "admstinsp_hero_stats_section";
  stats.className = "grid gap-2 sm:grid-cols-3 sm:min-w-[360px]";
  [
    ["Item", templates.length],
    ["Aktif", activeCount],
    ["Section", sections.size],
  ].forEach(([label, value]) => {
    const card = document.createElement("section");
    card.id = `admstinsp_hero_stat_${String(label).toLowerCase()}_section`;
    card.className = "rounded-[1rem] border border-[var(--pb-card-border)] bg-white/80 p-3 shadow-sm";
    card.append(
      textNode("p", "text-[10px] font-black uppercase tracking-[0.12em] text-gray-500", label),
      textNode("p", "text-xl font-black text-gray-950", String(value)),
    );
    stats.append(card);
  });

  const side = document.createElement("section");
  side.id = "admstinsp_hero_actions_section";
  side.className = "grid gap-3";
  const createButton = Button({
    label: "Buat Baru",
    variant: "primary",
    onClick: onCreate,
  });
  createButton.id = "admstinsp_create_button";
  createButton.className = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--pb-warning)_42%,white)] bg-[linear-gradient(135deg,#eab676,#eab676,#1e81b0)] px-5 text-xs font-black text-white shadow-[0_18px_45px_rgba(30,129,176,0.26)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_52px_rgba(30,129,176,0.32)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]";
  createButton.prepend(createIcon("plus", { className: "h-4 w-4" }));
  side.append(stats, createButton);

  section.append(copy, side);
  return section;
}

function filterSection({ filters, templates, onSubmit }) {
  const section = document.createElement("section");
  section.id = "admstinsp_filter_section";
  section.className = "grid gap-3 rounded-[1.25rem] border border-[var(--pb-card-border)] bg-white/88 p-4 shadow-[var(--pb-shadow-card)]";

  const form = document.createElement("form");
  form.id = "admstinsp_filter_form_section";
  form.className = "grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]";
  const keyword = inputField("admstinsp_keyword_input", filters.keyword ?? "", "Cari section atau item");
  const sectionSelect = selectField("admstinsp_section_input", filters.section ?? "", [["", "Semua section"], ...SECTION_OPTIONS]);
  const status = selectField("admstinsp_status_input", filters.status ?? "", [
    ["", "Semua status"],
    ["active", "Aktif"],
    ["inactive", "Nonaktif"],
  ]);
  const actions = document.createElement("section");
  actions.id = "admstinsp_filter_actions_section";
  actions.className = "grid gap-2 sm:grid-cols-2 lg:grid-cols-1";
  const submit = Button({ label: "Terapkan", variant: "primary" });
  submit.id = "admstinsp_apply_filter_button";
  submit.type = "submit";
  submit.prepend(createIcon("search", { className: "h-4 w-4" }));
  const reset = Button({
    label: "Reset",
    variant: "secondary",
    onClick: () => onSubmit?.({ keyword: "", section: "", status: "" }),
  });
  reset.id = "admstinsp_reset_filter_button";
  reset.type = "button";
  actions.append(submit, reset);

  form.append(labelWrap("Keyword", keyword), labelWrap("Section", sectionSelect), labelWrap("Status", status), actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit?.({
      keyword: keyword.value.trim(),
      section: sectionSelect.value,
      status: status.value,
    });
  });

  const chips = document.createElement("section");
  chips.id = "admstinsp_filter_chips_section";
  chips.className = "flex flex-wrap gap-2 border-t border-[var(--pb-card-border)] pt-3";
  [
    `${templates.length} item master`,
    `${templates.filter((template) => template.is_active).length} aktif`,
    `${new Set(templates.map((template) => template.category_name)).size} section`,
  ].forEach((label) => {
    const chip = document.createElement("span");
    chip.className = "rounded-full border border-[var(--pb-border)] bg-[var(--pb-chip-bg)] px-4 py-2 text-xs font-semibold text-[var(--pb-chip-text)]";
    chip.textContent = label;
    chips.append(chip);
  });

  section.append(form, chips);
  return section;
}

function listSection({ templates, allCount, loading, page, pageSize, onDetail, onEdit, onPageChange, onPerPageChange }) {
  const section = document.createElement("section");
  section.id = "admstinsp_list_section";
  section.className = "grid min-w-0 gap-3";
  section.append(
    DataTable({
      shellId: "admstinsp_item_table_section",
      title: "Daftar item master",
      subtitle: loading ? "Memuat data master inspection..." : `${allCount} item sesuai filter.`,
      icon: tableIcon(),
      columns: masterColumns({ onDetail, onEdit }),
      rows: templates,
      loading,
      emptyTitle: "Tidak ada item master",
      emptyDescription: "Ubah filter atau buat item master baru.",
      mobileMode: "stack",
      tableMinWidth: "min-w-[860px]",
      getRowKey: (template) => template.id,
      mobileCardId: (template) => `admstinsp_item_${template.id}_section`,
      mobileCardTitle: (template) => template.item_name,
      mobileCardSubtitle: (template) => SECTION_LABELS[template.category_name] ?? template.category_name,
      mobileCardBadges: (template) => [statusBadge(template.is_active)],
      mobileCardFields: (template) => [
        { label: "Urutan", value: String(template.sort_order ?? 0) },
        { label: "Keterangan", value: template.description || "Tanpa keterangan." },
      ],
      mobileCardActions: (template) => rowActions(template, { onDetail, onEdit }),
      pagination: DataTablePagination({
        page,
        totalPages: Math.max(1, Math.ceil(allCount / pageSize)),
        totalItems: allCount,
        perPage: pageSize,
        itemLabel: "item",
        onChange: onPageChange,
        onPerPageChange,
        onJump: onPageChange,
        buttonIds: {
          previous: "admstinsp_prev_page_button",
          next: "admstinsp_next_page_button",
          jump: "admstinsp_jump_page_button",
          page: (pageNumber) => `admstinsp_page_${pageNumber}_button`,
        },
        inputIds: {
          perPage: "admstinsp_per_page_input",
          jump: "admstinsp_jump_page_input",
        },
      }),
    }),
  );
  return section;
}

function editorSection({ template, saving, onSave }) {
  const section = document.createElement("section");
  section.id = template?.id ? "admstinsp_edit_modal_section" : "admstinsp_create_modal_section";
  section.className = "grid min-w-0 gap-4";

  const form = document.createElement("form");
  form.id = "admstinsp_editor_form_section";
  form.className = "grid gap-3";
  const sectionInput = selectField("admstinsp_editor_section_input", template?.category_name ?? "road_test", SECTION_OPTIONS);
  const itemName = inputField("admstinsp_editor_item_name_input", template?.item_name ?? "", "Nama item inspeksi");
  const description = document.createElement("textarea");
  description.id = "admstinsp_editor_description_input";
  description.value = template?.description ?? "";
  description.rows = 4;
  description.className = "min-h-[112px] min-w-0 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  const sortOrder = inputField("admstinsp_editor_sort_order_input", String(template?.sort_order ?? 0), "Urutan");
  sortOrder.type = "number";
  sortOrder.min = "0";

  const active = document.createElement("input");
  active.id = "admstinsp_editor_active_input";
  active.type = "checkbox";
  active.checked = template?.is_active !== false;
  active.className = "h-4 w-4 rounded border-gray-300 text-[var(--pb-brand-secondary)] focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_45%,white)]";
  const activeWrap = document.createElement("label");
  activeWrap.className = "flex items-center gap-2 rounded-xl border border-[var(--pb-card-border)] bg-gray-50 px-3 py-3 text-xs font-bold text-gray-700";
  activeWrap.append(active, document.createTextNode("Item aktif untuk flow showroom"));

  const save = Button({ label: saving ? "Menyimpan..." : "Simpan Master", variant: "primary" });
  save.id = "admstinsp_save_template_button";
  save.type = "submit";
  save.disabled = saving;
  // Tayang di header modal, jadi di luar <form>.
  save.setAttribute("form", form.id);
  save.prepend(createIcon("edit", { className: "h-4 w-4" }));

  const cancel = Button({ label: "Batal", variant: "secondary", disabled: saving, onClick: () => closeModal() });
  cancel.id = "admstinsp_cancel_template_button";
  cancel.type = "button";

  const aksi = document.createElement("section");
  aksi.id = "admstinsp_editor_actions_section";
  aksi.className = "flex shrink-0 flex-wrap items-center justify-end gap-2";
  aksi.append(cancel, save);

  form.append(
    labelWrap("Section", sectionInput),
    labelWrap("Nama item", itemName),
    labelWrap("Keterangan", description),
    labelWrap("Urutan", sortOrder),
    activeWrap,
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSave?.(template, form);
  });

  section.append(
    textNode("p", "text-xs leading-6 text-gray-600", "Perubahan definisi master hanya memengaruhi draft baru. Report yang sudah tersimpan tetap memakai salinan item saat itu."),
    form,
  );
  return titipkanAksiModal(section, aksi);
}

function getTemplates() {
  return normalizeTemplates(
    appStore.get("working.adminMasterInspection.templates.data", null)
      ?? appStore.get("snapshot.admin.masterInspection.data", null)
      ?? [],
  );
}

function patchTemplates(templates) {
  const payload = normalizeTemplates(templates);
  appStore.patchState("working.adminMasterInspection.templates", {
    data: payload,
    hydratedAt: Date.now(),
  }, "admin-master-inspection:templates-saved");
  appStore.patchState("snapshot.admin.masterInspection", {
    data: payload,
    hydratedAt: Date.now(),
  }, "admin-master-inspection:snapshot-synced");
}

function normalizeTemplates(templates = []) {
  return (Array.isArray(templates) ? templates : []).map((template) => ({
    id: Number(template.id),
    category_name: String(template.category_name ?? "road_test"),
    item_name: String(template.item_name ?? "").trim(),
    description: String(template.description ?? "").trim(),
    sort_order: Number(template.sort_order ?? 0),
    is_active: template.is_active !== false,
    created_at: template.created_at ?? null,
    updated_at: template.updated_at ?? null,
  })).filter((template) => template.id && template.item_name)
    .sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0) || Number(left.id) - Number(right.id));
}

function filterTemplates(templates, filters) {
  const keyword = String(filters.keyword ?? "").trim().toLowerCase();
  const section = String(filters.section ?? "").trim();
  const status = String(filters.status ?? "").trim();

  return templates.filter((template) => {
    if (section && template.category_name !== section) return false;
    if (status === "active" && !template.is_active) return false;
    if (status === "inactive" && template.is_active) return false;
    if (!keyword) return true;
    return [
      template.category_name,
      SECTION_LABELS[template.category_name],
      template.item_name,
      template.description,
    ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
  });
}

function readTemplateForm(form) {
  return {
    category_name: form.querySelector("#admstinsp_editor_section_input")?.value ?? "road_test",
    item_name: form.querySelector("#admstinsp_editor_item_name_input")?.value.trim() ?? "",
    description: form.querySelector("#admstinsp_editor_description_input")?.value.trim() ?? "",
    sort_order: Number(form.querySelector("#admstinsp_editor_sort_order_input")?.value ?? 0),
    is_active: Boolean(form.querySelector("#admstinsp_editor_active_input")?.checked),
  };
}

function upsertTemplate(templates, updated) {
  if (!updated?.id) {
    return templates;
  }
  const exists = templates.some((template) => String(template.id) === String(updated.id));
  return normalizeTemplates(exists
    ? templates.map((template) => String(template.id) === String(updated.id) ? updated : template)
    : [...templates, updated]);
}

function createQuery(query = {}) {
  return {
    keyword: query.keyword ?? "",
    section: query.section ?? "",
    status: query.status ?? "",
    page: Math.max(1, Number(query.page || 1)),
    pageSize: Math.max(1, Number(query.page_size || query.pageSize || 10)),
  };
}

function syncUrl(query) {
  const params = new URLSearchParams();
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.section) params.set("section", query.section);
  if (query.status) params.set("status", query.status);
  if (query.page && Number(query.page) > 1) params.set("page", String(query.page));
  if (query.pageSize && Number(query.pageSize) !== 10) params.set("page_size", String(query.pageSize));
  const url = new URL(window.location.href);
  url.hash = `#/admin/master-inspection${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.replaceState(window.history.state, "", url);
}

function paginate(items, filters) {
  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.max(1, Number(filters.pageSize || 10));
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageSize,
    items: items.slice(pageStart, pageStart + pageSize),
  };
}

function labelWrap(label, control) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1 text-xs font-semibold text-gray-700";
  wrap.textContent = label;
  wrap.append(control);
  return wrap;
}

function openTemplateModal({ mode, template, saving, actions }) {
  const isi = editorSection({
    template,
    saving,
    onSave: actions.saveTemplate,
  });

  openModal(isi, {
    key: `admstinsp-template-${mode}-${template?.id ?? "new"}`,
    title: mode === "edit" ? "Edit item master" : "Buat item master",
    description: "Kelola definisi canon master inspection dari modal.",
    size: "lg",
    panelId: mode === "edit" ? "admstinsp_edit_modal_panel_section" : "admstinsp_create_modal_panel_section",
    headerId: mode === "edit" ? "admstinsp_edit_modal_header_section" : "admstinsp_create_modal_header_section",
    bodyId: mode === "edit" ? "admstinsp_edit_modal_body_section" : "admstinsp_create_modal_body_section",
    footerNode: () => aksiModalDari(isi),
  });
}

function openDetailModal(template, actions) {
  const section = document.createElement("section");
  section.id = "admstinsp_detail_modal_section";
  section.className = "grid gap-4";
  section.append(
    detailGrid([
      ["Section", SECTION_LABELS[template.category_name] ?? template.category_name],
      ["Nama item", template.item_name],
      ["Status", template.is_active ? "Aktif" : "Nonaktif"],
      ["Urutan", String(template.sort_order ?? 0)],
      ["Keterangan", template.description || "Tanpa keterangan."],
      ["Dibuat", template.created_at || "-"],
      ["Diperbarui", template.updated_at || "-"],
    ]),
    modalActionBar([
      actionButton({
        id: `admstinsp_detail_edit_button_${template.id}`,
        label: "Edit",
        icon: "edit",
        variant: "primary",
        onClick: () => actions.openEditTemplate(template),
      }),
    ], "admstinsp_detail_actions_section"),
  );

  openModal(section, {
    key: `admstinsp-template-detail-${template.id}`,
    title: "Detail item master",
    description: "Informasi lengkap item master inspection.",
    size: "lg",
    footer: null,
    panelId: "admstinsp_detail_modal_panel_section",
    headerId: "admstinsp_detail_modal_header_section",
    bodyId: "admstinsp_detail_modal_body_section",
    closeButtonId: "admstinsp_detail_modal_close_button",
  });
}

function masterColumns({ onDetail, onEdit }) {
  return [
    {
      label: "Item",
      key: "item_name",
      render: (template) => {
        const wrap = document.createElement("section");
        wrap.id = `admstinsp_item_${template.id}_summary_section`;
        wrap.className = "grid min-w-0 gap-1";
        wrap.append(
          textNode("p", "break-words text-xs font-black text-gray-950", template.item_name),
          textNode("p", "line-clamp-2 text-[10px] font-semibold leading-5 text-gray-500", template.description || "Tanpa keterangan."),
        );
        return wrap;
      },
    },
    {
      label: "Section",
      key: "category_name",
      render: (template) => textNode("span", "text-xs font-semibold text-gray-700", SECTION_LABELS[template.category_name] ?? template.category_name),
    },
    {
      label: "Urutan",
      key: "sort_order",
      cellClassName: "px-4 py-4 align-top text-center",
      render: (template) => textNode("span", "inline-flex min-w-10 justify-center rounded-full border border-[var(--pb-border)] bg-white px-3 py-1 text-[10px] font-black text-gray-700", String(template.sort_order ?? 0)),
    },
    {
      label: "Status",
      key: "is_active",
      render: (template) => statusBadge(template.is_active),
    },
    {
      label: "Aksi",
      key: "actions",
      cellClassName: "px-4 py-4 align-top",
      render: (template) => rowActions(template, { onDetail, onEdit }),
    },
  ];
}

function rowActions(template, { onDetail, onEdit }) {
  return modalActionBar([
    actionButton({
      id: `admstinsp_detail_button_${template.id}`,
      label: "Detail",
      icon: "eye",
      variant: "secondary",
      onClick: () => onDetail?.(template),
    }),
    actionButton({
      id: `admstinsp_edit_button_${template.id}`,
      label: "Edit",
      icon: "edit",
      variant: "primary",
      onClick: () => onEdit?.(template),
    }),
  ], `admstinsp_actions_${template.id}_section`);
}

function actionButton({ id, label, icon, variant, onClick }) {
  const button = Button({ label, variant, onClick });
  button.id = id;
  button.type = "button";
  button.prepend(createIcon(icon, { className: "h-4 w-4" }));
  return button;
}

function modalActionBar(actions = [], id = "") {
  const wrap = document.createElement("section");
  if (id) {
    wrap.id = id;
  }
  wrap.className = "flex flex-wrap gap-2";
  actions.filter(Boolean).forEach((action) => wrap.append(action));
  return wrap;
}

function detailGrid(items = []) {
  const grid = document.createElement("section");
  grid.id = "admstinsp_detail_grid_section";
  grid.className = "grid gap-3 sm:grid-cols-2";
  items.forEach(([label, value], index) => {
    const item = document.createElement("section");
    item.id = `admstinsp_detail_${index}_section`;
    item.className = "grid gap-1 rounded-[1rem] border border-[var(--pb-border)] bg-[var(--pb-surface-inset)] p-3";
    item.append(
      textNode("p", "text-[10px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textNode("p", "break-words text-xs font-semibold text-gray-900", value),
    );
    grid.append(item);
  });
  return grid;
}

function statusBadge(isActive) {
  const badge = document.createElement("span");
  badge.className = isActive
    ? "inline-flex w-fit rounded-full border border-[color-mix(in_srgb,var(--pb-success)_26%,white)] bg-[color-mix(in_srgb,var(--pb-success)_8%,white)] px-3 py-1 text-[10px] font-black text-[color-mix(in_srgb,var(--pb-success)_84%,black)]"
    : "inline-flex w-fit rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-black text-gray-500";
  badge.textContent = isActive ? "Aktif" : "Nonaktif";
  return badge;
}

function tableIcon() {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)] text-[var(--pb-brand-secondary)]";
  icon.append(createIcon("table", { className: "h-4 w-4" }));
  return icon;
}

function inputField(id, value, placeholder) {
  const input = document.createElement("input");
  input.id = id;
  input.value = value;
  input.placeholder = placeholder;
  input.className = "min-h-10 min-w-0 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  return input;
}

function selectField(id, value, options) {
  const select = document.createElement("select");
  select.id = id;
  select.className = "min-h-10 min-w-0 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  options.forEach(([optionValue, label]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = label;
    option.selected = optionValue === value;
    select.append(option);
  });
  return select;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
