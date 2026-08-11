import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { formatDate } from "../../../utils/formatDate.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminApprovalQueueService } from "../services/adminApprovalQueueService.js";

export function AdminApprovalDetailPanel({
  user = null,
  isHydrating = false,
  hasRequestedUser = false,
  approvingUserId = null,
  onApprove = null,
  onOpenUserManagement = null,
} = {}) {
  const panel = document.createElement("section");
  panel.id = "adpv_review_detail_section";
  panel.className = "grid gap-5";

  if (!user) {
    panel.append(EmptyState({
      title: isHydrating
        ? "Memuat detail approval"
        : hasRequestedUser
          ? "Detail approval tidak tersedia"
          : "Pilih item approval",
      description: isHydrating
        ? "Detail user dan showroom sedang diambil untuk review approval."
        : hasRequestedUser
          ? "Item approval tidak bisa dimuat lagi. User mungkin sudah keluar dari queue atau detailnya tidak tersedia."
          : "Buka salah satu item dari queue untuk melihat data user, showroom, dan status approval sebelum mengambil keputusan.",
    }));
    return panel;
  }

  const meta = adminApprovalQueueService.approvalMeta(user);

  const heading = document.createElement("div");
  heading.className = "grid gap-4 rounded-[1.5rem] border border-white/80 bg-white/72 p-4 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start";
  const icon = document.createElement("span");
  icon.className = "grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_14px_34px_rgba(30,129,176,0.22)]";
  icon.append(createIcon("user", { className: "h-5 w-5" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-2";
  copy.append(
    textBlock("text-[11px] font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", "Approval dossier"),
    textBlock("text-xl font-black text-gray-950", user.name || user.email || `User #${user.id}`),
    textBlock(`text-sm ${tw.text.muted}`, `${user.email || "-"} | ${user.role || "-"}`),
  );

  const badges = document.createElement("div");
  badges.className = "flex flex-wrap gap-2";
  badges.append(
    Badge({ label: user.role || "-", variant: "default" }),
    Badge({ label: meta.label, variant: meta.variant }),
    Badge({ label: user.account_status || "-", variant: user.account_status === "active" ? "success" : "warning" }),
  );
  copy.append(badges);
  heading.append(
    icon,
    copy,
  );

  const facts = document.createElement("div");
  facts.className = `grid gap-2 ${tw.surface.insetGrid} border border-white/80 bg-white/60 sm:grid-cols-2`;
  [
    ["User ID", String(user.id)],
    ["Telepon", user.phone_number || "-"],
    ["Alamat", user.address || "-"],
    ["Dibuat", formatDate(user.created_at)],
    ["Diupdate", formatDate(user.updated_at)],
  ].forEach(([label, value]) => facts.append(infoRow(label, value)));

  if (user.showroom) {
    facts.append(infoRow("Showroom", user.showroom.name || "-"));
    facts.append(infoRow("Alamat showroom", user.showroom.address || "-"));
    facts.append(infoRow("Telepon showroom", user.showroom.phone_number || "-"));
  }

  const actions = document.createElement("div");
  actions.className = "grid gap-2 rounded-[1.5rem] border border-white/80 bg-white/74 p-4 shadow-sm sm:grid-cols-2";

  if (adminApprovalQueueService.isApprovable(user)) {
    const approve = Button({
      label: approvingUserId === user.id ? "Memproses approval..." : "Approve user",
      variant: "primary",
      disabled: approvingUserId !== null,
      onClick: () => onApprove?.(user),
    });
    approve.id = `adpv_modal_approve_button_${user.id}`;
    approve.prepend(createIcon("sparkles", { className: "h-4 w-4" }));
    actions.append(approve);
  } else {
    actions.append(textBlock("text-sm text-[color-mix(in_srgb,var(--pb-success)_84%,black)]", "Approval sudah diproses. User ini tidak lagi membutuhkan tindakan approval dasar."));
  }

  const management = Button({
    label: "Buka di user management",
    variant: "secondary",
    onClick: () => onOpenUserManagement?.(user),
  });
  management.id = `adpv_modal_user_management_button_${user.id}`;
  management.prepend(createIcon("user", { className: "h-4 w-4" }));
  actions.append(management);

  if (adminApprovalQueueService.isApprovable(user)) {
    const note = textBlock("text-sm leading-6 text-[color-mix(in_srgb,var(--pb-warning)_84%,black)] sm:col-span-2", meta.description);
    actions.append(note);
  }

  panel.append(heading, facts, actions);
  return panel;
}

function infoRow(label, value) {
  const row = document.createElement("div");
  row.className = "flex flex-col gap-1 rounded-2xl border border-white/80 bg-white/90 px-3 py-3 shadow-sm";
  row.append(
    textBlock("text-gray-500", label),
    textBlock("font-semibold text-gray-900 sm:text-right", value),
  );
  return row;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = `${className} break-words`;
  node.textContent = text;
  return node;
}
