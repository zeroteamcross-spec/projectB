import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function AdminMasterLocationList({
  loading = false,
  cities = [],
  page = 1,
  perPage = 10,
  totalItems = 0,
  onEdit = null,
  onToggleStatus = null,
  onDelete = null,
  onPageChange = null,
  onPerPageChange = null,
} = {}) {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_14px_34px_rgba(30,129,176,0.20)]";
  icon.append(createIcon("location", { className: "h-4 w-4" }));

  const pagination = DataTablePagination({
    page,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, perPage))),
    totalItems,
    perPage,
    pageSizeOptions: [10, 20, 50, 100],
    itemLabel: "kota",
    onChange: onPageChange,
    onPerPageChange,
    onJump: onPageChange,
    buttonIds: {
      previous: "admstloc_pagination_previous_button",
      next: "admstloc_pagination_next_button",
      jump: "admstloc_pagination_jump_button",
      page: (targetPage, isCurrent) => isCurrent
        ? `admstloc_pagination_page_current_${targetPage}`
        : `admstloc_pagination_page_button_${targetPage}`,
    },
    inputIds: {
      perPage: "admstloc_rows_per_page_input",
      jump: "admstloc_jump_page_input",
    },
  });

  return DataTable({
    shellId: "admstloc_location_table_section",
    title: "Master Lokasi",
    subtitle: `${totalItems} kota cocok dengan filter aktif`,
    icon,
    columns: [
      { label: "Kota", render: (city) => cityCell(city) },
      { label: "Provinsi", render: (city) => textBlock("text-sm font-semibold text-gray-700", city.province_name || "-") },
      { label: "Status", render: (city) => statusBadge(city.status) },
      { label: "Aksi", render: (city) => actionGroup({ city, onEdit, onToggleStatus, onDelete, idScope: "desktop" }) },
    ],
    loading,
    rows: cities,
    mobileMode: "disclosure",
    emptyTitle: "Kota belum tersedia",
    emptyDescription: "Tambahkan kota pertama untuk referensi lokasi listing mobil.",
    mobileCardTitle: (city) => city.name,
    mobileCardSubtitle: (city) => `${city.province_name || "Provinsi belum diisi"} | ${city.slug}`,
    mobileCardBadges: (city) => [statusBadge(city.status)],
    mobilePrimaryFields: (city) => [
      { label: "Slug", value: city.slug },
      { label: "Provinsi", value: city.province_name || "-" },
      { label: "Status", value: city.status === "active" ? "Aktif" : "Nonaktif" },
    ],
    mobileDisclosureFields: (city) => [
      { label: "Slug provinsi", value: city.province_slug || "-" },
      { label: "JSON schema", value: "admin.master.location.v1" },
    ],
    mobileCardActions: (city) => actionGroup({ city, onEdit, onToggleStatus, onDelete, idScope: "mobile" }),
    mobileCardId: (city) => `admstloc_mobile_city_row_section_${city.id}`,
    mobileDisclosureButtonLabel: "Lihat detail kota",
    mobileDisclosureCloseLabel: "Tutup detail kota",
    tableMinWidth: "min-w-[900px]",
    getRowKey: (city) => city.id,
    pagination,
  });
}

function cityCell(city) {
  const wrap = document.createElement("div");
  wrap.className = "flex min-w-0 items-start gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-[var(--pb-border)] bg-[linear-gradient(135deg,#faf4ed,#eaf4f9)] text-[var(--pb-brand-secondary)] shadow-sm ring-1 ring-white";
  icon.append(createIcon("location", { className: "h-4 w-4" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textBlock("font-black text-gray-950", city.name),
    textBlock("text-sm text-gray-500", city.slug || "-"),
  );
  wrap.append(icon, copy);
  return wrap;
}

function actionGroup({ city, onEdit, onToggleStatus, onDelete, idScope }) {
  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";

  const edit = Button({ label: "Edit", variant: "secondary", onClick: () => onEdit?.(city) });
  edit.id = `admstloc_edit_city_button_${idScope}_${city.id}`;
  edit.prepend(createIcon("edit", { className: "h-4 w-4" }));

  const toggle = Button({
    label: city.status === "active" ? "Nonaktifkan" : "Aktifkan",
    variant: city.status === "active" ? "secondary" : "primary",
    onClick: () => onToggleStatus?.(city),
  });
  toggle.id = `admstloc_toggle_city_button_${idScope}_${city.id}`;
  toggle.prepend(createIcon(city.status === "active" ? "eyeSlash" : "eye", { className: "h-4 w-4" }));

  const remove = Button({ label: "Hapus", variant: "secondary", onClick: () => onDelete?.(city) });
  remove.id = `admstloc_delete_city_button_${idScope}_${city.id}`;
  remove.prepend(createIcon("trash", { className: "h-4 w-4" }));

  actions.append(edit, toggle, remove);
  return actions;
}

function statusBadge(status) {
  return Badge({
    label: status === "active" ? "Aktif" : "Nonaktif",
    variant: status === "active" ? "success" : "default",
  });
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text ?? "";
  return node;
}
