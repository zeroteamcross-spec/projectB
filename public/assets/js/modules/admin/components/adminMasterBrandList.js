import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function AdminMasterBrandList({
  loading = false,
  brands = [],
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
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f97316,#14b8a6)] text-white shadow-[0_14px_34px_rgba(249,115,22,0.20)]";
  icon.append(createIcon("car", { className: "h-4 w-4" }));

  const pagination = DataTablePagination({
    page,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, perPage))),
    totalItems,
    perPage,
    pageSizeOptions: [10, 20, 50, 100],
    itemLabel: "brand",
    onChange: onPageChange,
    onPerPageChange,
    onJump: onPageChange,
    buttonIds: {
      previous: "admst_pagination_previous_button",
      next: "admst_pagination_next_button",
      jump: "admst_pagination_jump_button",
      page: (targetPage, isCurrent) => isCurrent
        ? `admst_pagination_page_current_${targetPage}`
        : `admst_pagination_page_button_${targetPage}`,
    },
    inputIds: {
      perPage: "admst_rows_per_page_input",
      jump: "admst_jump_page_input",
    },
  });

  return DataTable({
    shellId: "admst_brand_table_section",
    title: "Master Brand",
    subtitle: `${totalItems} brand cocok dengan filter aktif`,
    icon,
    columns: [
      { label: "Brand", render: (brand) => brandCell(brand) },
      { label: "Model", render: (brand) => textBlock("text-sm font-semibold text-gray-800", `${brand.models?.length ?? 0} model`) },
      { label: "Status", render: (brand) => statusBadge(brand.status) },
      { label: "Payload", render: (brand) => payloadCell(brand) },
      { label: "Aksi", render: (brand) => actionGroup({ brand, onEdit, onToggleStatus, onDelete, idScope: "desktop" }) },
    ],
    loading,
    rows: brands,
    mobileMode: "disclosure",
    emptyTitle: "Brand belum tersedia",
    emptyDescription: "Tambahkan brand pertama agar katalog mobil punya referensi merek dan model.",
    mobileCardTitle: (brand) => brand.name,
    mobileCardSubtitle: (brand) => `${brand.models?.length ?? 0} model | ${brand.slug}`,
    mobileCardBadges: (brand) => [statusBadge(brand.status)],
    mobilePrimaryFields: (brand) => [
      { label: "Slug", value: brand.slug },
      { label: "Model", value: `${brand.models?.length ?? 0} model` },
      { label: "Status", value: brand.status === "active" ? "Aktif" : "Nonaktif" },
    ],
    mobileDisclosureFields: (brand) => [
      { label: "Deskripsi", value: brand.description || "-" },
      { label: "Model aktif", value: String((brand.models ?? []).filter((model) => model.status === "active").length) },
      { label: "JSON schema", value: "admin.master.brand.v1" },
    ],
    mobileCardActions: (brand) => actionGroup({ brand, onEdit, onToggleStatus, onDelete, idScope: "mobile" }),
    mobileCardId: (brand) => `admst_mobile_brand_row_section_${brand.id}`,
    mobileDisclosureButtonLabel: "Lihat detail brand",
    mobileDisclosureCloseLabel: "Tutup detail brand",
    tableMinWidth: "min-w-[980px]",
    rowClassName: () => "bg-white/55",
    getRowKey: (brand) => brand.id,
    pagination,
  });
}

function brandCell(brand) {
  const wrap = document.createElement("div");
  wrap.className = "flex min-w-0 items-start gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#fff7ed,#ecfeff)] text-orange-700 ring-1 ring-orange-100";
  icon.append(createIcon("car", { className: "h-4 w-4" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textBlock("font-black text-gray-950", brand.name),
    textBlock("text-sm text-gray-500", brand.slug || "-"),
  );
  wrap.append(icon, copy);
  return wrap;
}

function payloadCell(brand) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textBlock("text-sm font-semibold text-gray-800", brand.description || "Tidak ada deskripsi"),
    textBlock("text-xs text-gray-500", "models[] disimpan di JSON brand"),
  );
  return wrap;
}

function actionGroup({ brand, onEdit, onToggleStatus, onDelete, idScope }) {
  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";

  const edit = Button({ label: "Edit", variant: "secondary", onClick: () => onEdit?.(brand) });
  edit.id = `admst_edit_brand_button_${idScope}_${brand.id}`;
  edit.prepend(createIcon("search", { className: "h-4 w-4" }));

  const toggle = Button({
    label: brand.status === "active" ? "Nonaktifkan" : "Aktifkan",
    variant: brand.status === "active" ? "secondary" : "primary",
    onClick: () => onToggleStatus?.(brand),
  });
  toggle.id = `admst_toggle_brand_button_${idScope}_${brand.id}`;
  toggle.prepend(createIcon("sparkles", { className: "h-4 w-4" }));

  const remove = Button({ label: "Hapus", variant: "secondary", onClick: () => onDelete?.(brand) });
  remove.id = `admst_delete_brand_button_${idScope}_${brand.id}`;
  remove.prepend(createIcon("filter", { className: "h-4 w-4" }));

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
