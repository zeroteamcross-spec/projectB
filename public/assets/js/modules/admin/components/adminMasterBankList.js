import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function AdminMasterBankList({
  loading = false,
  banks = [],
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
  icon.append(createIcon("bank", { className: "h-4 w-4" }));

  const pagination = DataTablePagination({
    page,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, perPage))),
    totalItems,
    perPage,
    pageSizeOptions: [10, 20, 50, 100],
    itemLabel: "bank",
    onChange: onPageChange,
    onPerPageChange,
    onJump: onPageChange,
    buttonIds: {
      previous: "admstbk_pagination_previous_button",
      next: "admstbk_pagination_next_button",
      jump: "admstbk_pagination_jump_button",
      page: (targetPage, isCurrent) => isCurrent
        ? `admstbk_pagination_page_current_${targetPage}`
        : `admstbk_pagination_page_button_${targetPage}`,
    },
    inputIds: {
      perPage: "admstbk_rows_per_page_input",
      jump: "admstbk_jump_page_input",
    },
  });

  return DataTable({
    shellId: "admstbk_bank_table_section",
    title: "Master Bank",
    subtitle: `${totalItems} bank cocok dengan filter aktif`,
    icon,
    columns: [
      { label: "Bank", render: (bank) => bankCell(bank) },
      { label: "Kode", render: (bank) => textBlock("text-sm font-black text-gray-900", bank.bank_code || "-") },
      { label: "Status", render: (bank) => statusBadge(bank.status) },
      { label: "Aksi", render: (bank) => actionGroup({ bank, onEdit, onToggleStatus, onDelete, idScope: "desktop" }) },
    ],
    loading,
    rows: banks,
    mobileMode: "disclosure",
    emptyTitle: "Bank belum tersedia",
    emptyDescription: "Tambahkan bank pertama untuk referensi pembayaran dan rekening.",
    mobileCardTitle: (bank) => bank.bank_name,
    mobileCardSubtitle: (bank) => `${bank.bank_code} | ${bank.slug}`,
    mobileCardBadges: (bank) => [statusBadge(bank.status)],
    mobilePrimaryFields: (bank) => [
      { label: "Kode bank", value: bank.bank_code },
      { label: "Slug", value: bank.slug },
      { label: "Status", value: bank.status === "active" ? "Aktif" : "Nonaktif" },
    ],
    mobileDisclosureFields: (bank) => [
      { label: "Path icon", value: bank.icon_path || "-" },
      { label: "JSON schema", value: "admin.master.bank.v1" },
    ],
    mobileCardActions: (bank) => actionGroup({ bank, onEdit, onToggleStatus, onDelete, idScope: "mobile" }),
    mobileCardId: (bank) => `admstbk_mobile_bank_row_section_${bank.id}`,
    mobileDisclosureButtonLabel: "Lihat detail bank",
    mobileDisclosureCloseLabel: "Tutup detail bank",
    tableMinWidth: "min-w-[920px]",
    getRowKey: (bank) => bank.id,
    pagination,
  });
}

function bankCell(bank) {
  const wrap = document.createElement("div");
  wrap.className = "flex min-w-0 items-start gap-3";
  wrap.append(iconPreview(bank, "identity"));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textBlock("font-black text-gray-950", bank.bank_name),
    textBlock("text-sm text-gray-500", bank.slug || "-"),
  );
  wrap.append(copy);
  return wrap;
}

function iconPreview(bank, scope) {
  const wrap = document.createElement("span");
  wrap.id = `admstbk_bank_icon_${scope}_${bank.id}_section`;
  wrap.className = "grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-orange-100 bg-white text-orange-700 shadow-sm ring-1 ring-white";
  if (bank.icon_path) {
    wrap.append(uploadedBankIcon(bank, scope));
  } else {
    wrap.classList.add("bg-[linear-gradient(135deg,#fff7ed,#ecfeff)]");
    wrap.append(createIcon("bank", { className: "h-4 w-4" }));
  }
  return wrap;
}

function uploadedBankIcon(bank, scope) {
  const image = document.createElement("img");
  image.id = `admstbk_bank_icon_${scope}_${bank.id}_image`;
  image.src = bank.icon_path;
  image.alt = `${bank.bank_name || "Bank"} icon`;
  image.loading = "lazy";
  image.decoding = "async";
  image.className = "h-full w-full object-contain p-1";
  return image;
}

function actionGroup({ bank, onEdit, onToggleStatus, onDelete, idScope }) {
  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";

  const edit = Button({ label: "Edit", variant: "secondary", onClick: () => onEdit?.(bank) });
  edit.id = `admstbk_edit_bank_button_${idScope}_${bank.id}`;
  edit.prepend(createIcon("edit", { className: "h-4 w-4" }));

  const toggle = Button({
    label: bank.status === "active" ? "Nonaktifkan" : "Aktifkan",
    variant: bank.status === "active" ? "secondary" : "primary",
    onClick: () => onToggleStatus?.(bank),
  });
  toggle.id = `admstbk_toggle_bank_button_${idScope}_${bank.id}`;
  toggle.prepend(createIcon(bank.status === "active" ? "eyeSlash" : "eye", { className: "h-4 w-4" }));

  const remove = Button({ label: "Hapus", variant: "secondary", onClick: () => onDelete?.(bank) });
  remove.id = `admstbk_delete_bank_button_${idScope}_${bank.id}`;
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
