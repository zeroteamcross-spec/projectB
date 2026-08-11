import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function AdminMasterSidebarList({
  loading = false,
  items = [],
  reorderItems = [],
  page = 1,
  perPage = 10,
  totalItems = 0,
  onEdit = null,
  onToggleVisible = null,
  onDelete = null,
  onReorder = null,
  onPageChange = null,
  onPerPageChange = null,
} = {}) {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#17698f,#1e81b0)] text-white shadow-[0_14px_34px_rgba(15,118,110,0.20)]";
  icon.append(createIcon("sort", { className: "h-4 w-4" }));

  const pagination = DataTablePagination({
    page,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, perPage))),
    totalItems,
    perPage,
    pageSizeOptions: [10, 20, 50, 100],
    itemLabel: "menu",
    onChange: onPageChange,
    onPerPageChange,
    onJump: onPageChange,
    buttonIds: {
      previous: "admst_sidebar_pagination_previous_button",
      next: "admst_sidebar_pagination_next_button",
      jump: "admst_sidebar_pagination_jump_button",
      page: (targetPage, isCurrent) => isCurrent
        ? `admst_sidebar_pagination_page_current_${targetPage}`
        : `admst_sidebar_pagination_page_button_${targetPage}`,
    },
    inputIds: {
      perPage: "admst_sidebar_rows_per_page_input",
      jump: "admst_sidebar_jump_page_input",
    },
  });

  const wrap = document.createElement("section");
  wrap.id = "admst_sidebar_operational_section";
  wrap.className = "grid min-w-0 gap-4";

  wrap.append(reorderBoard({ items: reorderItems, onReorder }));

  wrap.append(DataTable({
    shellId: "admst_sidebar_table_section",
    title: "Master Sidebar",
    subtitle: `${totalItems} menu cocok dengan filter aktif`,
    icon,
    columns: [
      { label: "Menu", render: (item) => menuCell(item) },
      { label: "Role", render: (item) => pill(item.role) },
      { label: "Parent", render: (item) => textBlock("text-sm font-semibold text-gray-800", item.parent_key || "-") },
      { label: "Urutan", render: (item) => textBlock("text-sm font-black text-gray-950", String(item.order ?? 0)) },
      { label: "Status", render: (item) => statusGroup(item) },
      { label: "Aksi", render: (item) => actionGroup({ item, onEdit, onToggleVisible, onDelete, idScope: "desktop" }) },
    ],
    loading,
    rows: items,
    mobileMode: "disclosure",
    emptyTitle: "Menu sidebar belum tersedia",
    emptyDescription: "Tambahkan menu pertama atau jalankan seed Master Sidebar.",
    mobileCardTitle: (item) => item.label,
    mobileCardSubtitle: (item) => `${item.role} | ${item.route || "parent only"}`,
    mobileCardBadges: (item) => [visibilityBadge(item), activeBadge(item)],
    mobilePrimaryFields: (item) => [
      { label: "Role", value: item.role },
      { label: "Icon", value: item.icon },
      { label: "Urutan", value: String(item.order ?? 0) },
    ],
    mobileDisclosureFields: (item) => [
      { label: "Key", value: item.key },
      { label: "Parent", value: item.parent_key || "-" },
      { label: "Route", value: item.route || "-" },
      { label: "Parent menu", value: item.is_parent ? "Ya" : "Tidak" },
    ],
    mobileCardActions: (item) => actionGroup({ item, onEdit, onToggleVisible, onDelete, idScope: "mobile" }),
    mobileCardId: (item) => `admst_sidebar_mobile_row_section_${item.id}`,
    mobileDisclosureButtonLabel: "Lihat detail menu",
    mobileDisclosureCloseLabel: "Tutup detail menu",
    tableMinWidth: "min-w-[1060px]",
    rowClassName: () => "bg-white/55",
    getRowKey: (item) => item.id,
    pagination,
  }));

  return wrap;
}

function reorderBoard({ items = [], onReorder = null }) {
  const section = document.createElement("section");
  section.id = "admst_sidebar_reorder_section";
  section.className = "grid gap-3 rounded-[1.5rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(236,246,239,0.78),rgba(250,244,237,0.78))] p-4 shadow-[var(--pb-shadow-card)]";
  section.dataset.ds = "admin.master.sidebar.reorder";
  let visible = false;

  const head = document.createElement("div");
  head.className = "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between";
  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  copy.append(
    textBlock("text-[11px] font-black uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--pb-brand-primary)_84%,black)]", "Drag & drop ordering"),
    textBlock("text-sm font-semibold text-gray-700", "Geser kartu menu untuk mengubah urutan role yang sedang dipilih."),
  );
  const controls = document.createElement("div");
  controls.className = "flex flex-wrap items-center gap-2";
  const badge = pill(`${items.length} top-level menu`);
  const toggle = Button({ label: "Tampilkan", variant: "secondary" });
  toggle.id = "admst_sidebar_reorder_toggle_button";
  toggle.type = "button";
  toggle.prepend(createIcon("sort", { className: "h-4 w-4" }));
  controls.append(badge, toggle);
  head.append(copy, controls);

  const list = document.createElement("section");
  list.id = "admst_sidebar_reorder_list_section";
  list.className = "hidden gap-2";
  toggle.addEventListener("click", () => {
    visible = !visible;
    list.className = visible ? "grid gap-2" : "hidden gap-2";
    toggle.lastChild.textContent = visible ? "Sembunyikan" : "Tampilkan";
  });

  if (!items.length) {
    const empty = document.createElement("section");
    empty.id = "admst_sidebar_reorder_empty_section";
    empty.className = "rounded-[1.25rem] border border-dashed border-[var(--pb-border)] bg-white/70 px-4 py-5 text-sm font-semibold text-gray-500";
    empty.textContent = "Pilih role Admin, Seller, atau Marketing untuk mengatur urutan menu.";
    list.append(empty);
    section.append(head, list);
    return section;
  }

  let dragId = "";
  items.forEach((item, index) => {
    const card = document.createElement("button");
    card.id = `admst_sidebar_reorder_item_button_${item.id}`;
    card.type = "button";
    card.draggable = true;
    card.dataset.itemId = item.id;
    card.className = "grid cursor-grab grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.15rem] border border-white/80 bg-white/88 px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing";
    const handle = document.createElement("span");
    handle.className = "grid h-9 w-9 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--pb-brand-primary)_8%,white)] text-[color-mix(in_srgb,var(--pb-brand-primary)_84%,black)] ring-1 ring-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)]";
    handle.append(createIcon("sort", { className: "h-4 w-4" }));
    const copy = document.createElement("span");
    copy.className = "grid min-w-0 gap-0.5";
    const title = document.createElement("span");
    title.className = "truncate text-sm font-black text-gray-950";
    title.textContent = item.label;
    const route = document.createElement("span");
    route.className = "truncate text-xs font-semibold text-gray-500";
    route.textContent = item.route || item.key;
    copy.append(title, route);
    const order = document.createElement("span");
    order.className = "rounded-full border border-[var(--pb-border)] bg-white px-3 py-1 text-xs font-black text-gray-600";
    order.textContent = `#${index + 1}`;
    card.append(handle, copy, order);

    card.addEventListener("dragstart", (event) => {
      dragId = item.id;
      card.classList.add("opacity-50");
      event.dataTransfer?.setData("text/plain", item.id);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
      }
    });
    card.addEventListener("dragend", () => {
      dragId = "";
      card.classList.remove("opacity-50");
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("ring-2", "ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]");
    });
    card.addEventListener("dragleave", () => {
      card.classList.remove("ring-2", "ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]");
    });
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("ring-2", "ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]");
      const sourceId = event.dataTransfer?.getData("text/plain") || dragId;
      const targetId = item.id;
      if (!sourceId || sourceId === targetId) {
        return;
      }
      onReorder?.(moveId(items.map((entry) => entry.id), sourceId, targetId));
    });
    list.append(card);
  });

  section.append(head, list);
  return section;
}

function moveId(ids, sourceId, targetId) {
  const next = ids.filter((id) => id !== sourceId);
  const targetIndex = next.indexOf(targetId);
  next.splice(targetIndex < 0 ? next.length : targetIndex, 0, sourceId);
  return next;
}

function menuCell(item) {
  const wrap = document.createElement("div");
  wrap.className = "flex min-w-0 items-start gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#eaf4f9,#faf4ed)] text-[color-mix(in_srgb,var(--pb-brand-primary)_84%,black)] ring-1 ring-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)]";
  icon.append(createIcon(item.icon || "sort", { className: "h-4 w-4" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textBlock("font-black text-gray-950", item.label),
    textBlock("text-sm text-gray-500", item.route || "Parent menu"),
    textBlock("text-xs font-semibold text-gray-400", item.key),
  );
  wrap.append(icon, copy);
  return wrap;
}

function statusGroup(item) {
  const wrap = document.createElement("div");
  wrap.className = "flex flex-wrap gap-2";
  wrap.append(visibilityBadge(item), activeBadge(item), item.is_parent ? pill("parent") : pill("child"));
  return wrap;
}

function actionGroup({ item, onEdit, onToggleVisible, onDelete, idScope }) {
  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";

  const edit = Button({ label: "Edit", variant: "secondary", onClick: () => onEdit?.(item) });
  edit.id = `admst_edit_sidebar_button_${idScope}_${item.id}`;
  edit.prepend(createIcon("search", { className: "h-4 w-4" }));

  const toggle = Button({
    label: item.is_visible ? "Sembunyikan" : "Tampilkan",
    variant: item.is_visible ? "secondary" : "primary",
    onClick: () => onToggleVisible?.(item),
  });
  toggle.id = `admst_toggle_sidebar_button_${idScope}_${item.id}`;
  toggle.prepend(createIcon("sparkles", { className: "h-4 w-4" }));

  const remove = Button({ label: "Hapus", variant: "secondary", onClick: () => onDelete?.(item) });
  remove.id = `admst_delete_sidebar_button_${idScope}_${item.id}`;
  remove.prepend(createIcon("filter", { className: "h-4 w-4" }));

  actions.append(edit, toggle, remove);
  return actions;
}

function visibilityBadge(item) {
  return Badge({
    label: item.is_visible ? "Tampil" : "Hidden",
    variant: item.is_visible ? "success" : "default",
  });
}

function activeBadge(item) {
  return Badge({
    label: item.is_active ? "Aktif" : "Nonaktif",
    variant: item.is_active ? "info" : "default",
  });
}

function pill(label) {
  const node = document.createElement("span");
  node.className = "inline-flex w-fit items-center rounded-full border border-[var(--pb-border)] bg-white/80 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-gray-600";
  node.textContent = label ?? "-";
  return node;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text ?? "";
  return node;
}
