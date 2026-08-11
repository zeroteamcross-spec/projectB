import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { formatDate } from "../../../utils/formatDate.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminUserManagementService } from "../services/adminUserManagementService.js";

export function AdminUserDetailPanel({
  user = null,
  isHydrating = false,
  activeUserId = null,
  approvingUserId = null,
  onApprove = null,
  onImpersonate = null,
  presentation = "panel",
} = {}) {
  const panel = document.createElement("section");
  panel.id = "adusr_detail_section";
  panel.className = "grid gap-5";

  if (!user) {
    panel.append(EmptyState({
      title: isHydrating ? "Memuat detail user" : "Pilih user",
      description: "Pilih salah satu user dari daftar untuk melihat ringkasan detail dan tindakan admin.",
    }));
    return panel;
  }

  const heading = document.createElement("div");
  heading.className = "grid gap-4 rounded-[1.5rem] border border-white/80 bg-white/72 p-4 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start";
  const icon = document.createElement("span");
  icon.className = "grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_14px_34px_rgba(30,129,176,0.22)]";
  icon.append(createIcon("user", { className: "h-5 w-5" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-2";
  copy.append(
    textBlock("text-[10px] font-black uppercase tracking-[0.16em] text-[var(--pb-brand-secondary)]", "User dossier"),
    textBlock("text-lg font-black text-gray-950", user.name || user.email || `User #${user.id}`),
    textBlock(`text-xs ${tw.text.muted}`, `${user.email || "-"} | ${user.role}`),
  );

  const badges = document.createElement("div");
  badges.className = "flex flex-wrap gap-2";
  badges.append(
    Badge(adminUserManagementService.statusMeta(user.account_status)),
    Badge(adminUserManagementService.approvalMeta(user)),
  );
  copy.append(badges);
  heading.append(icon, copy);

  const facts = document.createElement("div");
  facts.className = `grid gap-2 ${tw.surface.insetGrid} border border-white/80 bg-white/60 sm:grid-cols-2`;
  [
    ["User ID", String(user.id)],
    ["Telepon", user.phone_number || "-"],
    ["Dibuat", formatDate(user.created_at)],
    ["Diupdate", formatDate(user.updated_at)],
    ["Alamat", user.address || "-"],
  ].forEach(([label, value]) => facts.append(infoRow(label, value)));

  if (user.showroom) {
    facts.append(infoRow("Showroom", user.showroom.name || "-"));
  }

  const actions = document.createElement("div");
  actions.className = "grid gap-2 rounded-[1.5rem] border border-white/80 bg-white/74 p-4 shadow-sm sm:grid-cols-2";

  if (adminUserManagementService.isPendingApproval(user)) {
    const approve = Button({
      label: approvingUserId === user.id ? "Memproses approval..." : "Approve showroom",
      variant: "secondary",
      disabled: approvingUserId !== null,
      onClick: () => onApprove?.(user),
    });
    approve.id = `adusr_modal_approve_button_${user.id}`;
    approve.prepend(createIcon("sparkles", { className: "h-4 w-4" }));
    actions.append(approve);
  }

  const impersonationLabel = adminUserManagementService.impersonationLabel(user);
  const impersonate = Button({
    label: activeUserId === user.id ? "Memproses..." : `Login sebagai ${impersonationLabel}`,
    variant: adminUserManagementService.isImpersonatable(user) ? "primary" : "secondary",
    disabled: !adminUserManagementService.isImpersonatable(user) || activeUserId !== null,
  });
  impersonate.id = `adusr_modal_impersonate_button_${user.id}`;
  impersonate.onclick = () => onImpersonate?.(user);
  impersonate.prepend(createIcon("user", { className: "h-4 w-4" }));
  if (adminUserManagementService.isImpersonatable(user)) {
    actions.append(impersonate);
  }

  if (adminUserManagementService.isPendingApproval(user)) {
    actions.append(textBlock("text-xs leading-6 text-[color-mix(in_srgb,var(--pb-warning)_84%,black)] sm:col-span-2",
      "Approval showroom akan mengubah akun menjadi active dan approved sebelum user dipakai normal di flow showroom."));
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
