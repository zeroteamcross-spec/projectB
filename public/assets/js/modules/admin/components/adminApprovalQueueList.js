import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { formatDate } from "../../../utils/formatDate.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { adminApprovalQueueService } from "../services/adminApprovalQueueService.js";

export function AdminApprovalQueueList({
  users = [],
  page = 1,
  perPage = 10,
  totalItems = 0,
  selectedUserId = "",
  approvingUserId = null,
  reviewingUserId = null,
  onReview = null,
  onApprove = null,
  onPageChange = null,
  onPerPageChange = null,
} = {}) {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f97316,#14b8a6)] text-white shadow-[0_14px_34px_rgba(249,115,22,0.22)]";
  icon.append(createIcon("filter", { className: "h-4 w-4" }));

  const pagination = DataTablePagination({
    page,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, perPage))),
    totalItems,
    perPage,
    pageSizeOptions: [10, 20, 50, 100],
    itemLabel: "approval",
    onChange: onPageChange,
    onPerPageChange: onPerPageChange,
    onJump: onPageChange,
    buttonIds: {
      previous: "adpv_pagination_previous_button",
      next: "adpv_pagination_next_button",
      jump: "adpv_pagination_jump_button",
      page: (targetPage, isCurrent) => isCurrent
        ? `adpv_pagination_page_current_${targetPage}`
        : `adpv_pagination_page_button_${targetPage}`,
    },
    inputIds: {
      perPage: "adpv_rows_per_page_input",
      jump: "adpv_jump_page_input",
    },
  });

  return DataTable({
    shellId: "adpv_queue_table_section",
    title: "Approval queue",
    subtitle: `${totalItems} item cocok dengan filter aktif`,
    icon,
    columns: [
      { label: "User", render: (user) => userIdentity(user) },
      { label: "Role", render: (user) => Badge({ label: user.role || "-", variant: "default" }) },
      { label: "Status", render: (user) => Badge(adminApprovalQueueService.approvalMeta(user)) },
      { label: "Showroom", render: (user) => textBlock("max-w-[220px] text-sm font-semibold text-gray-800", user.showroom?.name || "-") },
      { label: "Dibuat", render: (user) => textBlock("whitespace-nowrap text-sm text-gray-600", formatDate(user.created_at)) },
      { label: "Aksi", render: (user) => actionGroup({ user, selected: Number(selectedUserId) === Number(user.id), approvingUserId, reviewingUserId, onReview, onApprove }) },
    ],
    rows: users,
    mobileMode: "disclosure",
    emptyTitle: "Approval queue kosong",
    emptyDescription: "Tidak ada user pending yang cocok dengan filter saat ini.",
    mobileCardTitle: (user) => user.name || user.email || `User #${user.id}`,
    mobileCardSubtitle: (user) => `${user.role || "-"} | ${formatDate(user.created_at)}`,
    mobileCardBadges: (user) => [
      Badge(adminApprovalQueueService.approvalMeta(user)),
      Badge({ label: user.account_status || "-", variant: "default" }),
    ],
    mobilePrimaryFields: (user) => [
      { label: "Role", value: user.role || "-" },
      { label: "Approval", value: adminApprovalQueueService.approvalMeta(user).label },
      { label: "Showroom", value: user.showroom?.name || "-" },
    ],
    mobileDisclosureFields: (user) => [
      { label: "Email", value: user.email || "-" },
      { label: "Telepon", value: user.phone_number || "-" },
      { label: "Account", value: user.account_status || "-" },
      { label: "Dibuat", value: formatDate(user.created_at) },
    ],
    mobileCardActions: (user) => actionGroup({ user, selected: Number(selectedUserId) === Number(user.id), approvingUserId, reviewingUserId, onReview, onApprove, idScope: "mobile" }),
    mobileCardId: (user) => `adpv_mobile_row_section_${user.id}`,
    mobileDisclosureButtonLabel: "Lihat kolom lainnya",
    mobileDisclosureCloseLabel: "Tutup detail kolom",
    tableMinWidth: "min-w-[980px]",
    rowClassName: (user) => Number(selectedUserId) === Number(user.id)
      ? "bg-orange-50/70 ring-1 ring-inset ring-orange-200/80"
      : "bg-white/55",
    getRowKey: (user) => user.id,
    pagination,
  });
}

function userIdentity(user) {
  const wrap = document.createElement("div");
  wrap.className = "flex min-w-0 items-start gap-3";
  const avatar = document.createElement("span");
  avatar.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#fff7ed,#ecfeff)] text-orange-700 ring-1 ring-orange-100";
  avatar.append(createIcon("user", { className: "h-4 w-4" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textBlock("break-words font-black text-gray-950", user.name || user.email || `User #${user.id}`),
    textBlock("break-words text-sm text-gray-500", user.email || "-"),
  );
  wrap.append(avatar, copy);
  return wrap;
}

function actionGroup({ user, selected, approvingUserId, reviewingUserId, onReview, onApprove, idScope = "desktop" }) {
  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";

  const review = Button({
    label: reviewingUserId === user.id ? "Membuka..." : selected ? "Review aktif" : "Review",
    variant: selected ? "primary" : "secondary",
    disabled: reviewingUserId !== null,
    onClick: () => onReview?.(user),
  });
  review.id = `adpv_review_button_${idScope}_${user.id}`;
  review.prepend(createIcon("search", { className: "h-4 w-4" }));
  actions.append(review);

  if (adminApprovalQueueService.isApprovable(user)) {
    const approve = Button({
      label: approvingUserId === user.id ? "Proses..." : "Approve",
      variant: "primary",
      disabled: approvingUserId !== null,
      onClick: () => onApprove?.(user),
    });
    approve.id = `adpv_approve_button_${idScope}_${user.id}`;
    approve.prepend(createIcon("sparkles", { className: "h-4 w-4" }));
    actions.append(approve);
  }

  return actions;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text;
  return node;
}
