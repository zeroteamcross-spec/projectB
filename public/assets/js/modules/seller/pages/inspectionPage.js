import { createPageLifecycle } from "../../../core/lifecycle.js";
import { inspectionsResource } from "../../../resources/inspectionsResource.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { Skeleton } from "../../../ui/primitives/skeleton.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { sellerState } from "../state/sellerState.js";
import { SellerInspectionStatusBadge } from "../components/sellerInspectionStatusBadge.js";

const RUNTIME_KEY = "sellerInspection";
const INSPECTION_MODAL_KEY = "seller-inspection-workspace-modal";
const ITEM_STATUS_OPTIONS = [
  ["good", "Baik"],
  ["fair", "Kurang baik"],
  ["bad", "Tidak baik"],
  ["not_available", "Tidak tersedia"],
];
const ITEM_STATUS_ALIASES = {
  good: "good",
  baik: "good",
  fair: "fair",
  kurang_baik: "fair",
  bad: "bad",
  tidak_baik: "bad",
  not_available: "not_available",
  tidak_tersedia: "not_available",
};
const DEFAULT_RUNTIME = {
  selectedCarId: null,
  saving: false,
  creating: false,
  publishing: false,
  error: "",
  notice: "",
  filters: {
    keyword: "",
    status: "",
  },
};

export function SellerInspectionPage() {
  let root = null;
  let unsubscribe = null;

  return createPageLifecycle({
    mount() {
      ensureRuntime();
      root = document.createElement("div");
      render(root);
      return root;
    },
    hydrate() {
      render(root);
    },
    bindEvents() {
      unsubscribe = appStore.subscribe((state, action) => {
        if (!["seller:inspection-filter-draft"].includes(action)) {
          render(root);
        }
      });
      return () => unsubscribe?.();
    },
    dispose() {
      closeInspectionModal();
      unsubscribe = null;
      appStore.destroyRuntimeState(RUNTIME_KEY);
    },
  });
}

function render(root) {
  if (!root) {
    return;
  }

  const snapshotOverview = sellerState.snapshot("inspectionOverview", emptyOverview());
  const workingNode = appStore.get("working.sellerInspection.overview", null);
  const overview = normalizeOverview(workingNode?.data ?? snapshotOverview);
  const runtime = runtimeState();
  const cars = filterCars(overview.cars, runtime.filters);
  const selectedCar = overview.cars.find((car) => Number(car.id) === Number(runtime.selectedCarId)) ?? null;
  const isHydrated = Boolean(workingNode?.hydratedAt);
  const layout = node("section", "slrinsp_page_section", "grid min-w-0 gap-5");
  layout.dataset.ds = "seller.inspection.page";
  layout.append(
    heroSection(overview, cars, isHydrated),
    toolbarSection(runtime.filters),
    messageSection("notice", runtime.notice),
    messageSection("error", runtime.error),
    isHydrated || overview.cars.length ? workspaceSection({ overview, cars }) : loadingSection()
  );

  root.replaceChildren(layout);

  if (selectedCar) {
    openInspectionModal({ car: selectedCar, overview, runtime });
  } else {
    closeInspectionModal();
  }
}

function heroSection(overview, filteredCars, isHydrated) {
  const summary = overview.summary ?? {};
  const section = node(
    "section",
    "slrinsp_hero_section",
    "relative overflow-hidden rounded-[2rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,244,237,0.84),rgba(234,244,249,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 lg:p-7"
  );
  section.dataset.ds = "seller.inspection.hero";

  const layout = node("section", "slrinsp_hero_layout_section", "grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end");
  const copy = node("section", "slrinsp_hero_copy_section", "grid min-w-0 gap-3");
  const icon = document.createElement("span");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_16px_40px_rgba(30,129,176,0.22)]";
  icon.append(createIcon("clipboard", { className: "h-5 w-5" }));
  copy.append(
    icon,
    textNode("p", "text-xs font-black uppercase tracking-[0.18em] text-[var(--pb-brand-secondary)]", "Seller inspection"),
    textNode("h1", "max-w-3xl text-3xl font-black leading-tight tracking-normal text-gray-950 sm:text-4xl", "Inspeksi Kendaraan"),
    textNode("p", "max-w-2xl text-sm leading-6 text-gray-600", "Pantau readiness inspeksi semua listing, buka checklist dari data yang sudah dipreload, lalu simpan atau publish hasil inspeksi.")
  );

  const stats = node("section", "slrinsp_summary_section", "grid gap-2 sm:grid-cols-2 lg:min-w-[560px] lg:grid-cols-4");
  [
    ["Total", summary.total_cars ?? overview.cars.length],
    ["Filtered", filteredCars.length],
    ["Selesai", summary.completed ?? 0],
    ["Published", summary.published_reports ?? 0],
  ].forEach(([label, value]) => {
    stats.append(statSection(label, value));
  });

  const status = textNode(
    "p",
    isHydrated ? "text-xs font-bold text-[color-mix(in_srgb,var(--pb-success)_84%,black)]" : "text-xs font-bold text-[var(--pb-brand-secondary)]",
    isHydrated ? "Working set penuh siap" : "Render dari snapshot kecil"
  );
  status.id = "slrinsp_hydrate_status_section";
  copy.append(status);

  layout.append(copy, stats);
  section.append(layout);
  return section;
}

function toolbarSection(filters) {
  const section = node(
    "section",
    "slrinsp_toolbar_section",
    "grid gap-3 rounded-[1.5rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_210px_auto] md:items-end"
  );
  section.dataset.ds = "seller.inspection.toolbar";

  const searchWrap = node("section", "slrinsp_search_field_section", "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700");
  const searchLabel = document.createElement("label");
  searchLabel.setAttribute("for", "slrinsp_search_input");
  searchLabel.textContent = "Cari mobil";
  const search = document.createElement("input");
  search.id = "slrinsp_search_input";
  search.value = filters.keyword ?? "";
  search.placeholder = "Brand, model, plat, lokasi";
  search.className = inputClass();
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      setRuntime({ filters: { ...runtimeState().filters, keyword: search.value.trim() } });
    }
  });
  searchWrap.append(searchLabel, search);

  const statusWrap = node("section", "slrinsp_status_field_section", "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700");
  const statusLabel = document.createElement("label");
  statusLabel.setAttribute("for", "slrinsp_status_filter_input");
  statusLabel.textContent = "Status inspeksi";
  const status = document.createElement("select");
  status.id = "slrinsp_status_filter_input";
  status.className = inputClass();
  [
    ["", "Semua"],
    ["not_checked", "Belum inspeksi"],
    ["partial", "Sebagian"],
    ["completed", "Selesai"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === (filters.status ?? "");
    status.append(option);
  });
  status.addEventListener("change", () => setRuntime({ filters: { ...runtimeState().filters, status: status.value } }));
  statusWrap.append(statusLabel, status);

  const actions = node("section", "slrinsp_toolbar_actions_section", "grid gap-2 sm:flex sm:flex-wrap sm:justify-end");
  const apply = Button({ label: "Terapkan", variant: "secondary", onClick: () => setRuntime({ filters: { ...runtimeState().filters, keyword: search.value.trim(), status: status.value } }) });
  apply.id = "slrinsp_apply_filter_button";
  apply.prepend(createIcon("filter", { className: "h-4 w-4" }));
  const reset = Button({ label: "Reset", variant: "secondary", onClick: () => setRuntime({ filters: { keyword: "", status: "" } }) });
  reset.id = "slrinsp_reset_filter_button";
  reset.prepend(createIcon("history", { className: "h-4 w-4" }));
  actions.append(apply, reset);

  section.append(searchWrap, statusWrap, actions);
  return section;
}

function workspaceSection({ overview, cars }) {
  const section = node("section", "slrinsp_workspace_section", "grid min-w-0 gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.48fr)]");
  section.append(carQueueSection({ cars, overview }), masterSection(overview.templates));
  return section;
}

function carQueueSection({ cars, overview }) {
  const section = node("section", "slrinsp_queue_section", "grid min-w-0 gap-4 rounded-[2rem] border border-white/80 bg-white/72 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5");
  section.dataset.ds = "seller.inspection.queue";
  const header = node("section", "slrinsp_queue_header_section", "flex min-w-0 flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-end sm:justify-between");
  const copy = node("section", "slrinsp_queue_copy_section", "grid min-w-0 gap-1");
  copy.append(
    textNode("p", "text-xs font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", "Working set"),
    textNode("h2", "text-xl font-black tracking-normal text-gray-950", "Daftar inspeksi seller"),
    textNode("p", "text-sm leading-6 text-gray-500", `${cars.length} mobil tersedia dari state halaman`)
  );
  const refreshHint = textNode("p", "rounded-full border border-[color-mix(in_srgb,var(--pb-success)_14%,white)] bg-[color-mix(in_srgb,var(--pb-success)_8%,white)] px-3 py-1 text-xs font-bold text-[color-mix(in_srgb,var(--pb-success)_84%,black)]", "Hydrate background aktif");
  header.append(copy, refreshHint);
  section.append(header);

  if (!cars.length) {
    section.append(EmptyState({
      title: "Tidak ada mobil cocok",
      description: "Ubah filter untuk melihat daftar inspection readiness.",
    }));
    return section;
  }

  const list = node("section", "slrinsp_queue_list_section", "grid min-w-0 gap-3");
  cars.forEach((car) => list.append(carInspectionCard(car, overview)));
  section.append(list);
  return section;
}

function carInspectionCard(car, overview) {
  const cardId = slugify(car.id);
  const report = reportForCar(overview, car.id);
  const section = node("section", `slrinsp_car_card_section_${cardId}`, "grid min-w-0 gap-4 rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md");
  const header = node("section", `slrinsp_car_card_header_section_${cardId}`, "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between");
  const copy = node("section", `slrinsp_car_card_copy_section_${cardId}`, "grid min-w-0 gap-1");
  copy.append(
    textNode("h3", "break-words text-base font-black tracking-normal text-gray-950", carTitle(car)),
    textNode("p", "break-words text-sm text-gray-500", [car.license_plate_number, car.location_name, car.transmission].filter(Boolean).join(" | ") || "Metadata mobil belum lengkap")
  );
  const badges = node("section", `slrinsp_car_card_badges_section_${cardId}`, "flex flex-wrap gap-2");
  badges.append(SellerInspectionStatusBadge({ status: car.inspection_summary_status ?? "not_checked", type: "summary" }));
  if (report?.report_status) {
    badges.append(SellerInspectionStatusBadge({ status: report.report_status, type: "report" }));
  }
  header.append(copy, badges);

  const details = node("section", `slrinsp_car_card_detail_section_${cardId}`, "grid gap-2 text-sm text-gray-600 sm:grid-cols-3");
  details.append(
    miniMetric("Item", String(report?.items?.length ?? 0), cardId),
    miniMetric("Catatan", report?.summary_notes ? "Ada" : "Belum", cardId),
    miniMetric("Listing", normalizeStatus(car.listing_status), cardId)
  );

  const actions = node("section", `slrinsp_car_card_actions_section_${cardId}`, "grid gap-2 sm:flex sm:justify-end");
  const open = Button({ label: report ? "Kelola checklist" : "Mulai inspeksi", onClick: () => setRuntime({ selectedCarId: car.id, error: "", notice: "" }) });
  open.id = `slrinsp_car_open_button_${cardId}`;
  open.prepend(createIcon(report ? "edit" : "plus", { className: "h-4 w-4" }));
  actions.append(open);

  section.append(header, details, actions);
  return section;
}

function masterSection(templates) {
  const section = node("section", "slrinsp_master_section", "grid min-w-0 content-start gap-4 rounded-[2rem] border border-white/80 bg-white/72 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5");
  section.dataset.ds = "seller.inspection.master";
  section.append(
    textNode("p", "text-xs font-black uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--pb-brand-primary)_84%,black)]", "Master inspection"),
    textNode("h2", "text-xl font-black tracking-normal text-gray-950", "Master paten aktif"),
    textNode("p", "text-sm leading-6 text-gray-500", "Section dan item inspeksi berasal dari canon inspection, bukan dari input seller.")
  );

  const groups = groupTemplates(templates);
  const list = node("section", "slrinsp_master_group_list_section", "grid min-w-0 gap-3");
  groups.forEach(([category, group], index) => {
    const item = node("section", `slrinsp_master_group_section_${slugify(category || index)}`, "rounded-[1.25rem] border border-gray-100 bg-white p-3");
    item.append(
      textNode("h3", "text-sm font-black uppercase tracking-[0.12em] text-gray-600", categoryLabel(category)),
      textNode("p", "mt-1 text-sm text-gray-500", `${group.length} item aktif`)
    );
    list.append(item);
  });

  section.append(list);
  return section;
}

function openInspectionModal({ car, overview, runtime }) {
  const report = reportForCar(overview, car.id);
  const templates = overview.templates ?? [];
  const content = node("section", "slrinsp_modal_content_section", "grid min-w-0 gap-4");
  content.dataset.ds = "seller.inspection.modal";
  content.append(modalCarSummarySection(car, report));

  if (!report) {
    content.append(emptyReportSection({ car, templates, runtime }));
  } else {
    content.append(reportFormSection({ car, report, templates, runtime }));
  }

  openModal(content, {
    key: INSPECTION_MODAL_KEY,
    title: carTitle(car),
    description: "Checklist memakai master inspection paten yang sudah tersedia di state halaman.",
    size: "xl",
    footer: null,
    panelId: "slrinsp_modal_panel_section",
    headerId: "slrinsp_modal_header_section",
    bodyId: "slrinsp_modal_body_section",
    closeButtonId: "slrinsp_modal_close_button",
    panelClassName: "md:min-w-[920px]",
    onClose: () => setRuntime({ selectedCarId: null, error: "", notice: "" }),
  });
}

function modalCarSummarySection(car, report) {
  const section = node("section", "slrinsp_modal_car_summary_section", "grid gap-3 rounded-[1.5rem] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center");
  const copy = node("section", "slrinsp_modal_car_summary_copy_section", "grid min-w-0 gap-1");
  copy.append(
    textNode("p", "text-xs font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", "Unit inspeksi"),
    textNode("h3", "break-words text-lg font-black text-gray-950", carTitle(car)),
    textNode("p", "break-words text-sm text-gray-600", [car.license_plate_number, car.registration_date, car.mileage_km ? `${car.mileage_km.toLocaleString("id-ID")} km` : ""].filter(Boolean).join(" | "))
  );
  const badges = node("section", "slrinsp_modal_car_summary_badges_section", "flex flex-wrap gap-2 md:justify-end");
  badges.append(SellerInspectionStatusBadge({ status: car.inspection_summary_status ?? "not_checked", type: "summary" }));
  if (report?.report_status) {
    badges.append(SellerInspectionStatusBadge({ status: report.report_status, type: "report" }));
  }
  section.append(copy, badges);
  return section;
}

function emptyReportSection({ car, templates, runtime }) {
  const section = node("section", "slrinsp_empty_report_section", "grid gap-4 rounded-[1.5rem] border border-dashed border-[color-mix(in_srgb,var(--pb-brand-primary)_26%,white)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_8%,white)] p-4");
  const action = Button({ label: runtime.creating ? "Menyiapkan checklist..." : "Siapkan draft dari master", disabled: runtime.creating || !templates.length, onClick: () => createReportFromTemplates(car, templates) });
  action.id = "slrinsp_create_report_button";
  action.prepend(createIcon("plus", { className: "h-4 w-4" }));
  const close = Button({ label: "Tutup", variant: "secondary", onClick: () => closeModal() });
  close.id = "slrinsp_empty_close_button";
  close.prepend(createIcon("arrowLeft", { className: "h-4 w-4" }));
  const actions = node("section", "slrinsp_empty_report_actions_section", "grid gap-2 sm:flex sm:justify-end");
  actions.append(close, action);
  section.append(
    EmptyState({
      title: templates.length ? "Checklist belum dibuat" : "Master inspeksi belum tersedia",
      description: templates.length ? "Draft dibuat dari master inspection paten yang sudah dipreload." : "Jalankan seed master inspection canon sebelum seller mengisi checklist.",
    }),
    actions
  );
  return section;
}

function reportFormSection({ car, report, templates, runtime }) {
  const form = document.createElement("form");
  form.id = "slrinsp_report_form_section";
  form.className = "grid min-w-0 gap-4";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveReportForm(car, report, templates, false);
  });

  const summarySection = node("section", "slrinsp_report_summary_section", "grid gap-2 rounded-[1.5rem] border border-gray-100 bg-white p-4");
  const summaryLabel = document.createElement("label");
  summaryLabel.setAttribute("for", "slrinsp_summary_notes_input");
  summaryLabel.className = "text-sm font-black text-gray-800";
  summaryLabel.textContent = "Catatan ringkas";
  const summary = document.createElement("textarea");
  summary.id = "slrinsp_summary_notes_input";
  summary.name = "summary_notes";
  summary.rows = 3;
  summary.value = report.summary_notes ?? "";
  summary.placeholder = "Contoh: Unit siap jual, minor baret di bumper belakang.";
  summary.className = `${inputClass()} min-h-[92px] resize-y`;
  summarySection.append(summaryLabel, summary);

  const itemsSection = node("section", "slrinsp_report_items_section", "grid min-w-0 gap-3");
  groupTemplates(templates).forEach(([category, group]) => {
    itemsSection.append(templateGroupSection(category, group, report));
  });
  itemsSection.append(nonCanonItemsNoticeSection(report, templates));

  const actions = node("section", "slrinsp_report_actions_section", "grid gap-2 border-t border-gray-100 pt-4 sm:flex sm:flex-wrap sm:justify-end");
  const close = Button({ label: "Tutup", variant: "secondary", onClick: () => closeModal() });
  close.id = "slrinsp_report_close_button";
  const save = Button({ label: runtime.saving ? "Menyimpan..." : "Simpan checklist", disabled: runtime.saving || runtime.publishing });
  save.id = "slrinsp_save_report_button";
  save.type = "submit";
  save.prepend(createIcon("clipboard", { className: "h-4 w-4" }));
  const publish = Button({ label: runtime.publishing ? "Publish..." : "Publish", disabled: runtime.saving || runtime.publishing || report.report_status === "published", onClick: () => saveReportForm(car, report, templates, true) });
  publish.id = "slrinsp_publish_report_button";
  publish.prepend(createIcon("circleCheck", { className: "h-4 w-4" }));
  actions.append(close, save, publish);

  form.append(summarySection, itemsSection, actions);
  return form;
}

function templateGroupSection(category, templates, report) {
  const section = node("section", `slrinsp_item_group_section_${slugify(category)}`, "grid gap-3 rounded-[1.5rem] border border-gray-100 bg-white p-4");
  section.append(
    textNode("h3", "text-sm font-black uppercase tracking-[0.12em] text-gray-600", categoryLabel(category)),
    textNode("p", "text-sm text-gray-500", `${templates.length} item master`)
  );

  templates.forEach((template) => {
    section.append(templateItemSection(template, report));
  });

  return section;
}

function templateItemSection(template, report) {
  const item = (report.items ?? []).find((entry) => Number(entry.template_id) === Number(template.id));
  const key = slugify(template.id);
  const section = node("section", `slrinsp_item_section_${key}`, "grid min-w-0 gap-3 rounded-[1.25rem] border border-gray-100 bg-gray-50/80 p-3");
  section.dataset.itemId = item?.id ? String(item.id) : "";
  section.dataset.templateId = String(template.id);
  const header = node("section", `slrinsp_item_header_section_${key}`, "grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start");
  header.append(
    textNode("h4", "break-words text-sm font-black text-gray-950", template.item_name),
    SellerInspectionStatusBadge({ status: item?.result_status ?? "good", type: "item" })
  );
  const description = document.createElement("input");
  description.type = "hidden";
  description.id = `slrinsp_item_description_input_${key}`;
  description.name = `description_${template.id}`;
  description.value = item?.description ?? template.description ?? "";

  const statusWrap = node("section", `slrinsp_item_status_section_${key}`, "grid gap-2 sm:grid-cols-3");
  ITEM_STATUS_OPTIONS.forEach(([value, label]) => {
    const optionId = `slrinsp_item_status_input_${key}_${value}`;
    const labelNode = document.createElement("label");
    labelNode.className = "flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 has-[:checked]:border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] has-[:checked]:bg-[var(--pb-surface-muted)] has-[:checked]:text-[var(--pb-brand-secondary)]";
    labelNode.setAttribute("for", optionId);
    const input = document.createElement("input");
    input.id = optionId;
    input.name = `status_${template.id}`;
    input.type = "radio";
    input.value = value;
    input.checked = normalizeItemStatus(item?.result_status) === value;
    input.className = "h-4 w-4 accent-[var(--pb-brand-primary)]";
    labelNode.append(input, document.createTextNode(label));
    statusWrap.append(labelNode);
  });

  const notesLabel = document.createElement("label");
  notesLabel.setAttribute("for", `slrinsp_item_notes_input_${key}`);
  notesLabel.className = "text-sm font-bold text-gray-700";
  notesLabel.textContent = "Catatan item";
  const notes = document.createElement("textarea");
  notes.id = `slrinsp_item_notes_input_${key}`;
  notes.name = `notes_${template.id}`;
  notes.rows = 2;
  notes.value = item?.notes ?? "";
  notes.placeholder = "Catatan khusus bila ada";
  notes.className = `${inputClass()} min-h-[76px] resize-y`;
  section.append(header, textNode("p", "text-sm leading-6 text-gray-500", template.description ?? "Keterangan item master belum diisi."), description, statusWrap, notesLabel, notes);
  return section;
}

function nonCanonItemsNoticeSection(report, templates) {
  const knownTemplateIds = new Set(templates.map((template) => Number(template.id)));
  const items = (report.items ?? []).filter((item) => !knownTemplateIds.has(Number(item.template_id)));
  if (!items.length) {
    return document.createDocumentFragment();
  }

  const section = node("section", "slrinsp_non_canon_items_section", "grid gap-3 rounded-[1.5rem] border border-[color-mix(in_srgb,var(--pb-warning)_14%,white)] bg-[color-mix(in_srgb,var(--pb-warning)_8%,white)] p-4");
  section.append(
    textNode("h3", "text-sm font-black uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]", "Item non-master lama"),
    textNode("p", "text-sm text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]", `${items.length} item lama tidak termasuk master inspection paten dan tidak bisa diedit dari flow seller.`)
  );

  items.forEach((item) => {
    section.append(nonCanonItemSection(item));
  });

  return section;
}

function nonCanonItemSection(item) {
  const key = slugify(item.id);
  const section = node("section", `slrinsp_non_canon_item_section_${key}`, "grid min-w-0 gap-2 rounded-[1.25rem] border border-[color-mix(in_srgb,var(--pb-warning)_14%,white)] bg-white/80 p-3");
  section.dataset.itemId = String(item.id);
  section.append(
    textNode("h4", "break-words text-sm font-black text-gray-950", item.item_name_snapshot || item.template?.item_name || "Item non-master"),
    SellerInspectionStatusBadge({ status: item.result_status, type: "item" }),
    textNode("p", "text-sm leading-6 text-gray-600", item.notes || item.description || "Tidak ada catatan.")
  );
  return section;
}

async function createReportFromTemplates(car, templates) {
  if (!car?.id || !templates.length) {
    return;
  }

  setRuntime({ creating: true, error: "", notice: "" });

  try {
    const report = await inspectionsResource.createReport(car.id, {
      report_status: "draft",
      summary_notes: "",
      inspected_at: sqlDateTimeNow(),
      items: templates.map((template) => ({
        template_id: template.id,
        result_status: "good",
        description: template.description ?? null,
        notes: null,
      })),
    });
    applyReportToOverview(car.id, report);
    setRuntime({ creating: false, notice: "Draft checklist inspeksi berhasil disiapkan." });
    showToast("Draft checklist inspeksi berhasil disiapkan.", { type: "success" });
  } catch (error) {
    const message = error?.message ?? "Draft checklist gagal dibuat.";
    setRuntime({ creating: false, error: message });
    showToast(message, { type: "error" });
  }
}

async function saveReportForm(car, report, templates, publish) {
  if (!report?.id) {
    return;
  }

  const form = document.getElementById("slrinsp_report_form_section");
  const formData = new FormData(form);

  if (publish) {
    const guardMessage = publishGuardMessage({ formData, report, templates });

    if (guardMessage) {
      setRuntime({ error: guardMessage, notice: "" });
      showToast(guardMessage, { type: "error" });
      return;
    }
  }

  setRuntime({ saving: !publish, publishing: publish, error: "", notice: "" });

  try {
    let updated = await inspectionsResource.updateReport(report.id, {
      report_status: publish ? "published" : "completed",
      summary_notes: textValue(formData, "summary_notes"),
      inspected_at: report.inspected_at ?? sqlDateTimeNow(),
    });
    const currentItems = new Map((updated?.items ?? report.items ?? []).map((item) => [Number(item.template_id), item]));

    for (const template of templates) {
      const existing = currentItems.get(Number(template.id));
      const payload = {
        template_id: Number(template.id),
        result_status: normalizeItemStatus(textValue(formData, `status_${template.id}`)),
        description: nullableText(formData, `description_${template.id}`) ?? template.description ?? null,
        notes: nullableText(formData, `notes_${template.id}`),
      };

      updated = existing?.id
        ? await inspectionsResource.updateItem(updated.id, existing.id, payload)
        : await inspectionsResource.createItem(updated.id, payload);
    }

    applyReportToOverview(car.id, updated);
    setRuntime({
      saving: false,
      publishing: false,
      notice: publish ? "Inspection report berhasil dipublish." : "Checklist inspeksi berhasil disimpan.",
    });
    showToast(publish ? "Inspection report berhasil dipublish." : "Checklist inspeksi berhasil disimpan.", { type: "success" });
  } catch (error) {
    const message = error?.message ?? "Checklist inspeksi gagal disimpan.";
    setRuntime({ saving: false, publishing: false, error: message });
    showToast(message, { type: "error" });
  }
}

function applyReportToOverview(carId, report) {
  const current = normalizeOverview(sellerState.working("sellerInspection", "overview", sellerState.snapshot("inspectionOverview", emptyOverview())));
  const status = report?.report_status === "published" || report?.report_status === "completed" ? "completed" : "partial";
  const next = normalizeOverview({
    ...current,
    cars: current.cars.map((car) => Number(car.id) === Number(carId) ? { ...car, inspection_summary_status: status } : car),
    reports_by_car_id: {
      ...current.reports_by_car_id,
      [carId]: report,
    },
  });

  appStore.patchState("working.sellerInspection.overview", {
    data: next,
    hydratedAt: Date.now(),
  }, "seller:inspection-overview-sync");
  appStore.patchState("snapshot.seller.inspectionOverview", {
    data: compactOverview(next, 10),
    fetchedAt: Date.now(),
    ttl: 120,
    version: "seller-inspection-overview-v1",
    stale: false,
  }, "seller:inspection-overview-snapshot-sync");
  patchSellerCarsSnapshot(carId, status);
}

function patchSellerCarsSnapshot(carId, status) {
  ["snapshot.seller.cars", "working.sellerCars.cars"].forEach((path) => {
    const current = appStore.get(path, null);
    const cars = current?.data?.cars ?? [];

    if (!cars.length) {
      return;
    }

    appStore.patchState(path, {
      ...current,
      data: {
        ...current.data,
        cars: cars.map((car) => Number(car.id) === Number(carId) ? { ...car, inspection_summary_status: status } : car),
      },
      fetchedAt: current.fetchedAt ?? Date.now(),
      hydratedAt: current.hydratedAt ?? Date.now(),
      stale: false,
    }, "seller:inspection-car-status-sync");
  });
}

function closeInspectionModal() {
  const modal = appStore.get("ui.modal", null);
  if (modal?.key === INSPECTION_MODAL_KEY) {
    closeModal({ notify: false });
  }
}

function loadingSection() {
  const section = node("section", "slrinsp_loading_section", "rounded-[2rem] border border-white/80 bg-white/72 p-4 shadow-[0_22px_70px_rgba(15,23,42,0.08)] backdrop-blur-xl");
  section.append(Skeleton({ lines: 8 }));
  return section;
}

function messageSection(type, text) {
  const section = node(
    "section",
    `slrinsp_${type}_section`,
    type === "notice"
      ? "rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-success)_26%,white)] bg-[color-mix(in_srgb,var(--pb-success)_8%,white)] px-4 py-3 text-sm font-semibold text-[color-mix(in_srgb,var(--pb-success)_84%,black)]"
      : "rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-sm font-semibold text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]"
  );
  section.textContent = text;
  section.hidden = !text;
  return section;
}

function statSection(label, value) {
  const section = node("section", `slrinsp_summary_${slugify(label)}_section`, "rounded-[1.25rem] border border-white/80 bg-white/78 p-3 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md");
  section.append(
    textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
    textNode("p", "text-2xl font-black text-gray-950", String(value))
  );
  return section;
}

function miniMetric(label, value, scope = "") {
  const section = node("section", `slrinsp_metric_${slugify(scope)}_${slugify(label)}_${slugify(value)}_section`, "rounded-xl border border-gray-100 bg-gray-50 px-3 py-2");
  section.append(
    textNode("p", "text-[11px] font-black uppercase tracking-[0.12em] text-gray-500", label),
    textNode("p", "mt-1 truncate text-sm font-black text-gray-900", value)
  );
  return section;
}

function normalizeOverview(overview = {}) {
  const cars = Array.isArray(overview.cars) ? overview.cars : [];
  const reportsByCarId = overview.reports_by_car_id ?? {};
  const templates = Array.isArray(overview.templates) ? overview.templates : [];
  const masterSections = Array.isArray(overview.master_sections) ? overview.master_sections : [];
  return {
    cars,
    reports_by_car_id: reportsByCarId,
    templates,
    master_sections: masterSections,
    summary: {
      total_cars: cars.length,
      completed: cars.filter((car) => car.inspection_summary_status === "completed").length,
      partial: cars.filter((car) => car.inspection_summary_status === "partial").length,
      not_checked: cars.filter((car) => car.inspection_summary_status === "not_checked").length,
      published_reports: Object.values(reportsByCarId).filter((report) => report?.report_status === "published").length,
      ...(overview.summary ?? {}),
    },
  };
}

function compactOverview(overview, limit = 10) {
  const cars = overview.cars.slice(0, limit);
  const ids = new Set(cars.map((car) => String(car.id)));
  const reports = Object.fromEntries(Object.entries(overview.reports_by_car_id ?? {}).filter(([carId]) => ids.has(String(carId))));
  return normalizeOverview({
    ...overview,
    cars,
    reports_by_car_id: reports,
  });
}

function emptyOverview() {
  return normalizeOverview({
    cars: [],
    reports_by_car_id: {},
    templates: [],
    summary: {},
  });
}

function reportForCar(overview, carId) {
  return overview.reports_by_car_id?.[carId] ?? overview.reports_by_car_id?.[String(carId)] ?? null;
}

function filterCars(cars = [], filters = {}) {
  const keyword = String(filters.keyword ?? "").trim().toLowerCase();
  const status = String(filters.status ?? "").trim();
  return cars.filter((car) => {
    if (status && car.inspection_summary_status !== status) {
      return false;
    }
    if (!keyword) {
      return true;
    }
    return [
      car.brand_name,
      car.model_name,
      car.sub_model_name,
      car.license_plate_number,
      car.location_name,
      car.transmission,
      car.primary_color,
    ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
  });
}

function groupTemplates(templates = []) {
  const groups = new Map();
  templates.forEach((template) => {
    const category = template.category_name || "general";
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category).push(template);
  });
  return Array.from(groups.entries());
}

function categoryLabel(category) {
  const labels = {
    road_test: "Pemeriksaan tes jalan",
    exterior: "Eksterior",
    interior: "Interior",
    underbody_engine: "Bawah body dan bawah kap depan",
    documents: "Dokumen dan kelengkapan",
    general: "General",
  };
  return labels[category] ?? normalizeStatus(category);
}

function carTitle(car) {
  return [car?.brand_name, car?.model_name, car?.sub_model_name].filter(Boolean).join(" ") || "Mobil seller";
}

function normalizeStatus(value) {
  return String(value ?? "-").replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function inputClass() {
  return "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--pb-text)] outline-none transition duration-150 placeholder:text-[var(--pb-text-muted)] focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
}

function textValue(formData, key) {
  return String(formData.get(key) ?? "").trim();
}

function nullableText(formData, key) {
  const value = textValue(formData, key);
  return value === "" ? null : value;
}

function normalizeItemStatus(value, fallback = "good") {
  return ITEM_STATUS_ALIASES[String(value ?? "").trim()] ?? fallback;
}

function hasValidItemStatus(value) {
  return Object.prototype.hasOwnProperty.call(ITEM_STATUS_ALIASES, String(value ?? "").trim());
}

function publishGuardMessage({ formData, report, templates }) {
  if (!templates.length) {
    return "Master inspeksi belum tersedia. Report belum bisa dipublish.";
  }

  const summaryNotes = textValue(formData, "summary_notes");
  if (summaryNotes.length < 10) {
    return "Catatan ringkas wajib diisi minimal 10 karakter sebelum publish.";
  }

  for (const template of templates) {
    if (!hasValidItemStatus(formData.get(`status_${template.id}`))) {
      return `Status item "${template.item_name}" wajib dipilih sebelum publish.`;
    }

    const description = nullableText(formData, `description_${template.id}`) ?? template.description ?? "";
    if (!String(description).trim()) {
      return `Keterangan item "${template.item_name}" wajib tersedia sebelum publish.`;
    }
  }

  return "";
}

function node(tagName, id, className) {
  const element = document.createElement(tagName);
  element.id = id;
  element.className = className;
  return element;
}

function textNode(tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text ?? "";
  return element;
}

function ensureRuntime() {
  if (!appStore.get(`runtime.${RUNTIME_KEY}`, null)) {
    appStore.patchState(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME, "seller:inspection-runtime-init");
  }
}

function runtimeState() {
  return appStore.get(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME) ?? DEFAULT_RUNTIME;
}

function setRuntime(patch = {}) {
  appStore.patchState(`runtime.${RUNTIME_KEY}`, {
    ...runtimeState(),
    ...patch,
  }, "seller:inspection-runtime");
}

function slugify(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

function sqlDateTimeNow() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
