import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { inspectionsResource } from "../../../resources/inspectionsResource.js";
import { activeShowroom } from "../state/activeShowroom.js";
import { Button } from "../../../ui/primitives/button.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { ModalHeaderFormActions } from "../../../ui/composites/modalHeaderFormActions.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";

const RUNTIME_KEY = "sellerMasterInspection";
const EDITOR_MODAL_KEY = "seller-master-inspection-editor";
const DETAIL_MODAL_KEY = "seller-master-inspection-detail";
const SECTION_OPTIONS = [
  ["road_test", "Pemeriksaan tes jalan"],
  ["exterior", "Eksterior"],
  ["interior", "Interior"],
  ["underbody_engine", "Bawah body dan bawah kap depan"],
  ["documents", "Dokumen dan kelengkapan"],
];
const SECTION_LABELS = Object.fromEntries(SECTION_OPTIONS);
const DEFAULT_RUNTIME = {
  query: { keyword: "", section: "", status: "", page: 1, pageSize: 10 },
  saving: false,
  copying: false,
  error: "",
};

export function SellerMasterInspectionPage() {
  let root = null;
  let unsubscribe = null;
  let context = null;

  const actions = {
    applyFilters(next = {}) {
      setRuntime({ query: { ...runtimeState().query, ...next, page: 1 } });
      render(root, context, actions);
    },
    changePage(page) {
      setRuntime({ query: { ...runtimeState().query, page } });
      render(root, context, actions);
    },
    changePageSize(pageSize) {
      setRuntime({ query: { ...runtimeState().query, page: 1, pageSize } });
      render(root, context, actions);
    },
    selectBranch(showroomId) {
      if (!showroomId || Number(showroomId) === Number(activeShowroom.id())) {
        return;
      }
      activeShowroom.set(Number(showroomId));
      window.location.reload();
    },
    openCreate() {
      openEditor(null, actions);
    },
    openEdit(template) {
      openEditor(template, actions);
    },
    openDetail(template) {
      openDetail(template);
    },
    async save(template, form) {
      const showroom = currentShowroom();
      if (!showroom?.id) {
        return;
      }

      setRuntime({ saving: true, error: "" });
      render(root, context, actions);
      try {
        const payload = readEditorForm(form);
        const result = template?.id
          ? await inspectionsResource.updateShowroomTemplate(showroom.id, template.id, payload)
          : await inspectionsResource.createShowroomTemplate(showroom.id, payload);
        const templates = await inspectionsResource.showroomTemplates(showroom.id);
        patchTemplates(templates);
        closeModal({ notify: false });
        showToast(template?.id ? "Master inspeksi cabang berhasil diperbarui." : "Master inspeksi cabang berhasil dibuat.", { type: "success" });
        setRuntime({ saving: false, error: "" });
      } catch (error) {
        const message = firstApiError(error) || "Master inspeksi cabang gagal disimpan.";
        setRuntime({ saving: false, error: message });
        showToast(message, { type: "error" });
      }
      render(root, context, actions);
    },
    async copy(sourceShowroomId) {
      const target = currentShowroom();
      if (!target?.id || !sourceShowroomId || Number(sourceShowroomId) === Number(target.id)) {
        showToast("Pilih cabang sumber yang berbeda dari cabang aktif.", { type: "error" });
        return;
      }

      setRuntime({ copying: true, error: "" });
      render(root, context);
      try {
        const result = await inspectionsResource.copyShowroomTemplates(target.id, sourceShowroomId);
        patchTemplates(result?.templates ?? []);
        showToast(`Master digabung: ${result?.created_count ?? 0} item baru, ${result?.skipped_count ?? 0} item dipertahankan.`, { type: "success" });
      } catch (error) {
        const message = firstApiError(error) || "Master inspeksi gagal disalin.";
        setRuntime({ error: message });
        showToast(message, { type: "error" });
      } finally {
        setRuntime({ copying: false });
        render(root, context, actions);
      }
    },
  };

  return createPageLifecycle({
    bootstrap(nextContext) {
      context = nextContext;
      ensureRuntime();
    },
    mount(nextContext) {
      context = nextContext;
      ensureRuntime();
      root = document.createElement("div");
      render(root, context, actions);
      return root;
    },
    hydrate(nextContext) {
      context = nextContext;
      render(root, context, actions);
    },
    bindEvents(nextContext) {
      context = nextContext;
      unsubscribe = appStore.subscribe((state, action) => {
        if (action !== "seller-master-inspection:runtime") {
          render(root, context, actions);
        }
      });
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
      closeModal({ notify: false });
      appStore.destroyRuntimeState(RUNTIME_KEY);
    },
  });
}

function render(root, context, actions) {
  if (!root || !context) {
    return;
  }

  const showroom = currentShowroom();
  const branches = currentBranches();
  const templates = currentTemplates();
  const runtime = runtimeState();
  const filtered = filterTemplates(templates, runtime.query);
  const page = paginate(filtered, runtime.query);
  const layout = document.createElement("section");
  layout.id = "slrminsp_page_section";
  layout.className = "grid min-w-0 gap-5";
  layout.dataset.ds = "seller.master.inspection.page";

  layout.append(heroSection(showroom, branches, templates, actions));

  if (runtime.error) {
    const error = document.createElement("section");
    error.id = "slrminsp_error_section";
    error.className = "rounded-[1.25rem] border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-xs font-semibold text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    error.textContent = runtime.error;
    layout.append(error);
  }

  if (!showroom?.id) {
    layout.append(EmptyState({
      title: "Showroom belum tersedia",
      description: "Master inspeksi hanya dapat dikelola setelah akun owner memiliki showroom aktif.",
    }));
    root.replaceChildren(layout);
    return;
  }

  layout.append(
    copySection(showroom, branches, runtime, actions),
    filterSection(templates, runtime.query, actions),
    listSection(page, filtered.length, runtime, actions),
  );
  root.replaceChildren(layout);
}

function heroSection(showroom, branches, templates, actions) {
  const section = document.createElement("section");
  section.id = "slrminsp_hero_section";
  section.className = "grid min-w-0 gap-5 rounded-[2rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,244,237,0.88),rgba(234,244,249,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:p-7";
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-2";
  const icon = document.createElement("span");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#17698f)] text-white shadow-[0_16px_40px_rgba(30,129,176,0.22)]";
  icon.append(createIcon("clipboard", { className: "h-5 w-5" }));
  copy.append(
    icon,
    textNode("p", "text-[10px] font-black uppercase tracking-[0.18em] text-[var(--pb-brand-secondary)]", "Owner showroom"),
    textNode("h1", "text-2xl font-black leading-tight tracking-normal text-gray-950 sm:text-3xl", "Master Inspeksi"),
    textNode("p", "max-w-2xl text-xs leading-6 text-gray-600", `Atur checklist khusus cabang ${showroom?.name ?? "aktif"}. Perubahan master berlaku untuk inspeksi baru.`),
  );

  const side = document.createElement("div");
  side.className = "grid min-w-0 gap-3 sm:min-w-[330px]";
  const branchLabel = document.createElement("label");
  branchLabel.className = "grid gap-1 text-xs font-bold text-gray-700";
  branchLabel.append(textNode("span", "text-[10px] font-black uppercase tracking-[0.12em] text-gray-500", "Cabang yang dikelola"));
  const branchSelect = selectControl("slrminsp_active_branch_input", branches.map((branch) => [branch.id, branch.name || `Showroom #${branch.id}`]), showroom?.id);
  branchSelect.addEventListener("change", () => actions.selectBranch(branchSelect.value));
  branchLabel.append(branchSelect);
  const createButton = Button({ id: "slrminsp_create_button", label: "Buat Item Master", variant: "primary", onClick: actions.openCreate });
  createButton.prepend(createIcon("plus", { className: "h-4 w-4" }));
  side.append(branchLabel, statGrid(templates), createButton);
  section.append(copy, side);
  return section;
}

function statGrid(templates) {
  const grid = document.createElement("div");
  grid.className = "grid grid-cols-3 gap-2";
  const active = templates.filter((template) => template.is_active).length;
  const sections = new Set(templates.map((template) => template.category_name)).size;
  [["Item", templates.length], ["Aktif", active], ["Section", sections]].forEach(([label, value]) => {
    const card = document.createElement("section");
    card.className = "rounded-[1rem] border border-[var(--pb-card-border)] bg-white/80 p-3 shadow-sm";
    card.append(textNode("p", "text-[10px] font-black uppercase tracking-[0.12em] text-gray-500", label), textNode("p", "text-xl font-black text-gray-950", String(value)));
    grid.append(card);
  });
  return grid;
}

function copySection(target, branches, runtime, actions) {
  const section = document.createElement("section");
  section.id = "slrminsp_copy_section";
  section.className = "grid min-w-0 gap-3 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-white/88 p-4 shadow-[var(--pb-shadow-card)]";
  section.append(
    textNode("h2", "text-base font-black text-gray-950", "Salin Master Inspeksi"),
    textNode("p", "text-xs leading-6 text-gray-600", "Salin dari cabang lain ke cabang aktif dengan mode gabung. Item yang sudah ada di cabang aktif tidak ditimpa atau dihapus."),
  );
  const form = document.createElement("form");
  form.id = "slrminsp_copy_form_section";
  form.className = "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end";
  const field = document.createElement("label");
  field.className = "grid min-w-0 gap-1.5 text-xs font-bold text-gray-700";
  field.append(textNode("span", "text-[10px] font-black uppercase tracking-[0.12em] text-gray-500", "Cabang sumber"));
  const source = selectControl("slrminsp_copy_source_input", branches.filter((branch) => Number(branch.id) !== Number(target?.id)).map((branch) => [branch.id, branch.name || `Showroom #${branch.id}`]), "");
  source.required = true;
  field.append(source);
  const button = Button({ id: "slrminsp_copy_button", label: runtime.copying ? "Menggabungkan..." : "Salin & Gabung", disabled: runtime.copying || branches.length < 2, variant: "secondary" });
  button.type = "submit";
  button.prepend(createIcon("sitemap", { className: "h-4 w-4" }));
  form.append(field, button);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const sourceId = new FormData(form).get("source_showroom_id") || source.value;
    actions.copy(sourceId);
  });
  section.append(form);
  return section;
}

function filterSection(templates, filters, actions) {
  const section = document.createElement("section");
  section.id = "slrminsp_filter_section";
  section.className = "grid min-w-0 gap-3 rounded-[1.25rem] border border-[var(--pb-card-border)] bg-white/88 p-4 shadow-[var(--pb-shadow-card)]";
  const form = document.createElement("form");
  form.id = "slrminsp_filter_form_section";
  form.className = "grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]";
  const keyword = inputControl("slrminsp_keyword_input", filters.keyword ?? "", "Cari section atau item");
  const sectionSelect = selectControl("slrminsp_section_input", [["", "Semua section"], ...SECTION_OPTIONS], filters.section ?? "");
  const status = selectControl("slrminsp_status_input", [["", "Semua status"], ["active", "Aktif"], ["inactive", "Nonaktif"]], filters.status ?? "");
  const buttons = document.createElement("div");
  buttons.className = "grid gap-2 sm:grid-cols-2 lg:grid-cols-1";
  const submit = Button({ id: "slrminsp_apply_filter_button", label: "Terapkan", variant: "primary" });
  submit.type = "submit";
  const reset = Button({ id: "slrminsp_reset_filter_button", label: "Reset", variant: "secondary", onClick: () => actions.applyFilters({ keyword: "", section: "", status: "" }) });
  reset.type = "button";
  buttons.append(submit, reset);
  form.append(labelWrap("Keyword", keyword), labelWrap("Section", sectionSelect), labelWrap("Status", status), buttons);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    actions.applyFilters({ keyword: keyword.value.trim(), section: sectionSelect.value, status: status.value });
  });
  const chips = document.createElement("div");
  chips.className = "flex flex-wrap gap-2 border-t border-[var(--pb-card-border)] pt-3";
  [
    `${templates.length} item master`,
    `${templates.filter((template) => template.is_active).length} aktif`,
    `${new Set(templates.map((template) => template.category_name)).size} section`,
  ].forEach((label) => chips.append(textNode("span", "rounded-full border border-[var(--pb-border)] bg-[var(--pb-chip-bg)] px-3 py-1.5 text-[10px] font-semibold text-[var(--pb-chip-text)]", label)));
  section.append(form, chips);
  return section;
}

function listSection(page, total, runtime, actions) {
  const section = document.createElement("section");
  section.id = "slrminsp_list_section";
  section.className = "grid min-w-0 gap-3";
  section.append(DataTable({
    shellId: "slrminsp_item_table_section",
    title: "Daftar master inspeksi cabang",
    subtitle: `${total} item sesuai filter.`,
    icon: createIcon("clipboard", { className: "h-4 w-4" }),
    columns: columns(actions),
    rows: page.items,
    loading: false,
    emptyTitle: "Master inspeksi showroom belum dibuat",
    emptyDescription: "Buat item pertama atau salin master dari cabang lain.",
    mobileMode: "stack",
    tableMinWidth: "min-w-[880px]",
    getRowKey: (template) => template.id,
    mobileCardId: (template) => `slrminsp_item_${template.id}_section`,
    mobileCardTitle: (template) => template.item_name,
    mobileCardSubtitle: (template) => sectionLabel(template.category_name),
    mobileCardBadges: (template) => [statusBadge(template.is_active)],
    mobileCardFields: (template) => [
      { label: "Urutan", value: String(template.sort_order ?? 0) },
      { label: "Keterangan", value: template.description || "Tanpa keterangan." },
    ],
    mobileCardActions: (template) => rowActions(template, actions),
    pagination: DataTablePagination({
      page: page.page,
      totalPages: Math.max(1, Math.ceil(total / page.pageSize)),
      totalItems: total,
      perPage: page.pageSize,
      itemLabel: "item",
      onChange: actions.changePage,
      onPerPageChange: actions.changePageSize,
      onJump: actions.changePage,
      buttonIds: {
        previous: "slrminsp_prev_page_button",
        next: "slrminsp_next_page_button",
        jump: "slrminsp_jump_page_button",
        page: (pageNumber) => `slrminsp_page_${pageNumber}_button`,
      },
      inputIds: {
        perPage: "slrminsp_per_page_input",
        jump: "slrminsp_jump_page_input",
      },
    }),
  }));
  return section;
}

function columns(actions) {
  return [
    { key: "category_name", label: "Section", render: (template) => sectionLabel(template.category_name) },
    { key: "item_name", label: "Item", render: (template) => template.item_name },
    { key: "description", label: "Keterangan", render: (template) => template.description || "-" },
    { key: "sort_order", label: "Urutan", render: (template) => String(template.sort_order ?? 0) },
    { key: "is_active", label: "Status", render: (template) => statusBadge(template.is_active) },
    { key: "actions", label: "Aksi", render: (template) => rowActions(template, actions) },
  ];
}

function rowActions(template, actions) {
  const wrap = document.createElement("div");
  wrap.className = "flex flex-wrap gap-2";
  const detail = Button({ id: `slrminsp_detail_${template.id}_button`, label: "Detail", variant: "secondary", onClick: () => actions.openDetail(template) });
  const edit = Button({ id: `slrminsp_edit_${template.id}_button`, label: "Edit", variant: "primary", onClick: () => actions.openEdit(template) });
  wrap.append(detail, edit);
  return wrap;
}

function openEditor(template, actions) {
  const formId = "slrminsp_editor_form";
  const form = document.createElement("form");
  form.id = formId;
  form.className = "grid min-w-0 gap-3";
  const section = selectControl("slrminsp_editor_section_input", SECTION_OPTIONS, template?.category_name ?? "road_test");
  const item = inputControl("slrminsp_editor_item_name_input", template?.item_name ?? "", "Nama item inspeksi");
  const description = document.createElement("textarea");
  description.id = "slrminsp_editor_description_input";
  description.name = "description";
  description.rows = 4;
  description.value = template?.description ?? "";
  description.className = inputClass();
  const order = inputControl("slrminsp_editor_sort_order_input", String(template?.sort_order ?? 0), "Urutan");
  order.type = "number";
  order.min = "0";
  const active = document.createElement("input");
  active.id = "slrminsp_editor_active_input";
  active.name = "is_active";
  active.type = "checkbox";
  active.checked = template?.is_active !== false;
  active.className = "h-4 w-4 rounded border-gray-300 text-[var(--pb-brand-secondary)]";
  const activeWrap = document.createElement("label");
  activeWrap.className = "flex items-center gap-2 rounded-xl border border-[var(--pb-card-border)] bg-gray-50 px-3 py-3 text-xs font-bold text-gray-700";
  activeWrap.append(active, document.createTextNode("Item aktif untuk flow inspeksi cabang"));
  form.append(labelWrap("Section", section), labelWrap("Nama item", item), labelWrap("Keterangan", description), labelWrap("Urutan", order), activeWrap);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    actions.save(template, form);
  });
  openModal(form, {
    key: EDITOR_MODAL_KEY,
    title: template?.id ? "Edit master inspeksi" : "Buat master inspeksi",
    description: "Data ini hanya berlaku untuk cabang showroom yang sedang dikelola.",
    size: "lg",
    panelId: "slrminsp_editor_modal_section",
    bodyId: "slrminsp_editor_modal_body_section",
    headerId: "slrminsp_editor_modal_header_section",
    footerNode: () => ModalHeaderFormActions({
      formId,
      idPrefix: "slrminsp_editor_modal",
      submitLabel: "Simpan Master",
      saving: runtimeState().saving,
      onCancel: () => closeModal(),
    }),
    onClose: () => setRuntime({ error: "" }),
  });
}

function openDetail(template) {
  const body = document.createElement("section");
  body.id = "slrminsp_detail_modal_section";
  body.className = "grid min-w-0 gap-4";
  body.append(
    detailRow("Section", sectionLabel(template.category_name)),
    detailRow("Nama item", template.item_name),
    detailRow("Keterangan", template.description || "Tanpa keterangan."),
    detailRow("Urutan", String(template.sort_order ?? 0)),
    detailRow("Status", template.is_active ? "Aktif" : "Nonaktif"),
    textNode("p", "rounded-xl border border-[var(--pb-card-border)] bg-gray-50 px-3 py-3 text-xs leading-6 text-gray-600", "Laporan inspeksi yang sudah tersimpan tetap menggunakan snapshot itemnya; perubahan ini berlaku untuk draft inspeksi baru."),
  );
  openModal(body, {
    key: DETAIL_MODAL_KEY,
    title: "Detail master inspeksi",
    size: "md",
    panelId: "slrminsp_detail_modal_panel",
    bodyId: "slrminsp_detail_modal_body",
    headerId: "slrminsp_detail_modal_header",
    footer: null,
  });
}

function currentShowroom() {
  return appStore.get("working.sellerMasterInspection.showroom.data", null)
    ?? currentBranches().find((branch) => Number(branch.id) === Number(activeShowroom.id()))
    ?? currentBranches()[0]
    ?? null;
}

function currentBranches() {
  const value = appStore.get("working.sellerMasterInspection.branches.data", []);
  return Array.isArray(value) ? value : [];
}

function currentTemplates() {
  const value = appStore.get("working.sellerMasterInspection.templates.data", []);
  return normalizeTemplates(Array.isArray(value) ? value : []);
}

function patchTemplates(templates) {
  appStore.patchState("working.sellerMasterInspection.templates", { data: normalizeTemplates(templates), hydratedAt: Date.now() }, "seller-master-inspection:templates");
}

function normalizeTemplates(templates) {
  return templates.map((template) => ({
    id: Number(template.id),
    showroom_id: template.showroom_id == null ? null : Number(template.showroom_id),
    category_name: String(template.category_name ?? "general"),
    item_name: String(template.item_name ?? "").trim(),
    description: String(template.description ?? "").trim(),
    sort_order: Number(template.sort_order ?? 0),
    is_active: template.is_active !== false,
  })).filter((template) => template.id > 0 && template.item_name)
    .sort((left, right) => left.sort_order - right.sort_order || left.id - right.id);
}

function filterTemplates(templates, query) {
  const keyword = String(query.keyword ?? "").trim().toLowerCase();
  return templates.filter((template) => {
    if (query.section && template.category_name !== query.section) return false;
    if (query.status === "active" && !template.is_active) return false;
    if (query.status === "inactive" && template.is_active) return false;
    if (!keyword) return true;
    return [template.category_name, sectionLabel(template.category_name), template.item_name, template.description]
      .filter(Boolean).join(" ").toLowerCase().includes(keyword);
  });
}

function paginate(items, query) {
  const pageSize = Math.max(1, Number(query.pageSize ?? 10));
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, Number(query.page ?? 1)), totalPages);
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize };
}

function readEditorForm(form) {
  const data = new FormData(form);
  return {
    category_name: String(data.get("category_name") ?? "road_test"),
    item_name: String(data.get("item_name") ?? "").trim(),
    description: String(data.get("description") ?? "").trim(),
    sort_order: Number(data.get("sort_order") ?? 0),
    is_active: data.get("is_active") === "on",
  };
}

function ensureRuntime() {
  if (!appStore.get(`runtime.${RUNTIME_KEY}`, null)) {
    appStore.patchState(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME, "seller-master-inspection:runtime-init");
  }
}

function runtimeState() {
  return appStore.get(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME) ?? DEFAULT_RUNTIME;
}

function setRuntime(patch = {}) {
  appStore.patchState(`runtime.${RUNTIME_KEY}`, { ...runtimeState(), ...patch }, "seller-master-inspection:runtime");
}

function inputControl(id, value, placeholder = "") {
  const input = document.createElement("input");
  input.id = id;
  input.name = id.includes("keyword") ? "keyword" : id.includes("item_name") ? "item_name" : id.includes("sort_order") ? "sort_order" : "value";
  input.value = value ?? "";
  input.placeholder = placeholder;
  input.className = inputClass();
  return input;
}

function selectControl(id, options, selected = "") {
  const select = document.createElement("select");
  select.id = id;
  if (id.includes("section")) select.name = "category_name";
  if (id.includes("source")) select.name = "source_showroom_id";
  if (id.includes("status")) select.name = "status";
  if (id.includes("branch")) select.name = "showroom_id";
  select.className = inputClass();
  options.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = String(value ?? "");
    option.textContent = label;
    option.selected = String(value ?? "") === String(selected ?? "");
    select.append(option);
  });
  return select;
}

function labelWrap(label, control) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1.5 text-xs font-bold text-gray-700";
  wrap.append(textNode("span", "text-[10px] font-black uppercase tracking-[0.12em] text-gray-500", label), control);
  return wrap;
}

function detailRow(label, value) {
  const row = document.createElement("div");
  row.className = "grid gap-1 rounded-xl border border-[var(--pb-card-border)] bg-white p-3";
  row.append(textNode("p", "text-[10px] font-black uppercase tracking-[0.12em] text-gray-500", label), textNode("p", "break-words text-sm font-semibold text-gray-900", value));
  return row;
}

function statusBadge(active) {
  const badge = document.createElement("span");
  badge.className = active
    ? "inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--pb-success)_24%,white)] bg-[color-mix(in_srgb,var(--pb-success)_9%,white)] px-3 py-1 text-[10px] font-black text-[color-mix(in_srgb,var(--pb-success)_84%,black)]"
    : "inline-flex items-center rounded-full border border-[var(--pb-border)] bg-gray-100 px-3 py-1 text-[10px] font-black text-gray-600";
  badge.textContent = active ? "Aktif" : "Nonaktif";
  return badge;
}

function sectionLabel(value) {
  return SECTION_LABELS[value] ?? String(value ?? "General").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function firstApiError(error) {
  const errors = error?.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors)[0];
    if (typeof first === "string" && first) return first;
  }
  return error?.message ?? "";
}

function inputClass() {
  return "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-xs font-semibold text-[var(--pb-text)] outline-none transition duration-150 placeholder:text-[var(--pb-text-muted)] focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
