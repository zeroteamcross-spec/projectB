import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { formatDate } from "../../../utils/formatDate.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { adminUserManagementService } from "../services/adminUserManagementService.js";

export function AdminUsersList({
  loading = false,
  users = [],
  page = 1,
  perPage = 10,
  totalItems = 0,
  selectedUserId = "",
  activeUserId = null,
  approvingUserId = null,
  onSelect = null,
  onApprove = null,
  onImpersonate = null,
  onPageChange = null,
  onPerPageChange = null,
} = {}) {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_14px_34px_rgba(30,129,176,0.22)]";
  icon.append(createIcon("user", { className: "h-4 w-4" }));

  const pagination = DataTablePagination({
    page,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, perPage))),
    totalItems,
    perPage,
    pageSizeOptions: [10, 20, 50, 100],
    itemLabel: "user",
    onChange: onPageChange,
    onPerPageChange: onPerPageChange,
    onJump: onPageChange,
    buttonIds: {
      previous: "adusr_pagination_previous_button",
      next: "adusr_pagination_next_button",
      jump: "adusr_pagination_jump_button",
      page: (targetPage, isCurrent) => isCurrent
        ? `adusr_pagination_page_current_${targetPage}`
        : `adusr_pagination_page_button_${targetPage}`,
    },
    inputIds: {
      perPage: "adusr_rows_per_page_input",
      jump: "adusr_jump_page_input",
    },
  });

  const table = DataTable({
    shellId: "adusr_users_table_section",
    title: "User directory",
    subtitle: `${totalItems} user cocok dengan filter aktif`,
    icon,
    columns: [
      { label: "User", render: (user) => userIdentity(user) },
      { label: "Role", render: (user) => Badge({ label: user.role || "-", variant: "default" }) },
      { label: "Account", render: (user) => Badge(adminUserManagementService.statusMeta(user.account_status)) },
      { label: "Approval", render: (user) => Badge(adminUserManagementService.approvalMeta(user)) },
      { label: "Kontak", render: (user) => contactBlock(user) },
      { label: "Dibuat", render: (user) => textBlock("whitespace-nowrap text-xs text-gray-600", formatDate(user.created_at)) },
      { label: "Aksi", render: (user) => actionGroup({ user, selected: Number(selectedUserId) === Number(user.id), activeUserId, approvingUserId, onSelect, onApprove, onImpersonate, idScope: "desktop" }) },
    ],
    loading,
    rows: users,
    mobileMode: "disclosure",
    emptyTitle: "User tidak ditemukan",
    emptyDescription: "Coba ubah filter atau keyword pencarian.",
    mobileCardTitle: (user) => user.name || user.email || `User #${user.id}`,
    mobileCardSubtitle: (user) => `${user.role || "-"} | ${formatDate(user.created_at)}`,
    mobileCardBadges: (user) => [
      Badge(adminUserManagementService.statusMeta(user.account_status)),
      Badge(adminUserManagementService.approvalMeta(user)),
    ],
    mobilePrimaryFields: (user) => [
      { label: "Role", value: user.role || "-" },
      { label: "Telepon", value: user.phone_number || "-" },
      { label: "Account", value: adminUserManagementService.statusMeta(user.account_status).label },
    ],
    mobileDisclosureFields: (user) => [
      { label: "Email", value: user.email || "-" },
      { label: "Approval", value: adminUserManagementService.approvalMeta(user).label },
      { label: "Showroom", value: user.showroom?.name || "-" },
      { label: "Dibuat", value: formatDate(user.created_at) },
    ],
    mobileCardActions: (user) => actionGroup({ user, selected: Number(selectedUserId) === Number(user.id), activeUserId, approvingUserId, onSelect, onApprove, onImpersonate, idScope: "mobile" }),
    mobileCardId: (user) => `adusr_mobile_row_section_${user.id}`,
    mobileDisclosureButtonLabel: "Lihat kolom lainnya",
    mobileDisclosureCloseLabel: "Tutup detail kolom",
    tableMinWidth: "min-w-[1080px]",
    rowClassName: (user) => Number(selectedUserId) === Number(user.id)
      ? "bg-[var(--pb-surface-muted)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]"
      : "bg-white/55",
    getRowKey: (user) => user.id,
    pagination,
  });
  return table;
}

function userIdentity(user) {
  const wrap = document.createElement("div");
  wrap.className = "flex min-w-0 items-start gap-3";
  const avatar = document.createElement("span");
  avatar.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#faf4ed,#eaf4f9)] text-[var(--pb-brand-secondary)] ring-1 ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]";
  avatar.append(createIcon("user", { className: "h-4 w-4" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textBlock("break-words font-black text-gray-950", user.name || user.email || `User #${user.id}`),
    textBlock("break-words text-xs text-gray-500", user.email || "-"),
  );
  wrap.append(avatar, copy);
  return wrap;
}

function contactBlock(user) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textBlock("break-words text-xs font-semibold text-gray-800", user.phone_number || "-"),
    textBlock("break-words text-xs text-gray-500", user.showroom?.name || "-"),
  );
  return wrap;
}

function actionGroup({ user, selected, activeUserId, approvingUserId, onSelect, onApprove, onImpersonate, idScope = "row" }) {
  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";

  const detailButton = Button({
    label: selected ? "Detail aktif" : "Detail",
    variant: selected ? "primary" : "secondary",
    onClick: () => onSelect?.(user),
  });
  detailButton.id = `adusr_detail_button_${idScope}_${user.id}`;
  detailButton.prepend(createIcon("search", { className: "h-4 w-4" }));
  actions.append(detailButton);

  if (adminUserManagementService.isPendingApproval(user)) {
    const approveButton = Button({
      label: approvingUserId === user.id ? "Proses..." : "Approve",
      variant: "secondary",
      disabled: approvingUserId !== null,
      onClick: () => onApprove?.(user),
    });
    approveButton.id = `adusr_approve_button_${idScope}_${user.id}`;
    approveButton.prepend(createIcon("sparkles", { className: "h-4 w-4" }));
    actions.append(approveButton);
  }

  const impersonationLabel = adminUserManagementService.impersonationLabel(user);
  const impersonateButton = Button({
    label: activeUserId === user.id ? "Masuk..." : `Login sebagai ${impersonationLabel}`,
    variant: adminUserManagementService.isImpersonatable(user) ? "primary" : "secondary",
    disabled: !adminUserManagementService.isImpersonatable(user) || activeUserId !== null,
  });
  impersonateButton.id = `adusr_impersonate_button_${idScope}_${user.id}`;
  impersonateButton.onclick = () => onImpersonate?.(user);
  impersonateButton.prepend(createIcon("user", { className: "h-4 w-4" }));
  if (adminUserManagementService.isImpersonatable(user)) {
    actions.append(impersonateButton);
  }

  return actions;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text;
  return node;
}
