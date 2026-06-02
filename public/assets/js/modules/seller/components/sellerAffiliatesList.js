import { Button } from "../../../ui/primitives/button.js";
import { DataTable } from "../../../ui/composites/dataTable.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { SellerAffiliateStatusBadge } from "./sellerAffiliateStatusBadge.js";
import { sellerAffiliateService } from "../services/sellerAffiliateService.js";

export function SellerAffiliatesList({
  affiliates = [],
  totalItems = 0,
  sourceTotal = 0,
  loading = false,
  copyingAffiliateId = null,
  togglingAffiliateId = null,
  onDetail = null,
  onEdit = null,
  onToggleStatus = null,
  onOpenLanding = null,
  onCopyLanding = null,
  pagination = null,
  onCreate = null,
} = {}) {
  const shell = document.createElement("section");
  shell.id = "slraf_list_section";
  shell.className = "grid min-w-0 gap-4";
  shell.dataset.ds = "seller.affiliates.list";

  shell.append(DataTable({
    shellId: "slraf_affiliates_table",
    title: "Daftar affiliate",
    subtitle: `${totalItems} affiliate cocok dengan filter aktif`,
    icon: tableIcon(),
    columns: affiliateColumns({
      copyingAffiliateId,
      togglingAffiliateId,
      onDetail,
      onEdit,
      onToggleStatus,
      onOpenLanding,
      onCopyLanding,
    }),
    rows: affiliates,
    loading,
    emptyTitle: sourceTotal ? "Affiliate tidak ditemukan" : "Belum ada affiliate",
    emptyDescription: sourceTotal
      ? "Ubah kata kunci atau status filter untuk melihat affiliate lain."
      : "Tambahkan partner affiliate untuk mulai membagikan link referral showroom Anda.",
    tableMinWidth: "min-w-[1080px]",
    mobileMode: "stack",
    getRowKey: (affiliate) => affiliate.id,
    mobileCardId: (affiliate) => `slraf_affiliate_row_${affiliate.id}_section`,
    mobileCardTitle: (affiliate) => affiliateName(affiliate),
    mobileCardSubtitle: (affiliate) => affiliateContact(affiliate),
    mobileCardBadges: (affiliate) => [SellerAffiliateStatusBadge(affiliate.status)],
    mobileCardFields: (affiliate) => [
      { label: "Slug / Link", value: landingBlock(affiliate, true) },
      { label: "Performa", value: performanceText(affiliate) },
      { label: "Komisi", value: commissionText(affiliate) },
    ],
    mobileCardActions: (affiliate) => actionButtons(affiliate, {
      copyingAffiliateId,
      togglingAffiliateId,
      onDetail,
      onEdit,
      onToggleStatus,
      onOpenLanding,
      onCopyLanding,
    }),
    pagination,
  }));

  if (!loading && !sourceTotal) {
    const action = document.createElement("section");
    action.id = "slraf_empty_actions_section";
    action.className = "flex justify-center";
    const create = Button({ label: "Tambah Affiliate", onClick: onCreate, designHook: "shared.button.primary" });
    create.id = "slraf_empty_create_button";
    create.prepend(createIcon("plus", { className: "h-4 w-4" }));
    action.append(create);
    shell.append(action);
  }

  return shell;
}

function affiliateColumns({ copyingAffiliateId, togglingAffiliateId, onDetail, onEdit, onToggleStatus, onOpenLanding, onCopyLanding }) {
  return [
    {
      label: "Affiliate",
      key: "affiliate",
      render: (affiliate) => {
        const wrap = document.createElement("section");
        wrap.id = `slraf_affiliate_identity_${affiliate.id}_section`;
        wrap.className = "grid min-w-0 gap-1";
        wrap.append(
          textNode("p", "break-words text-sm font-black text-gray-950", affiliateName(affiliate)),
          textNode("p", "break-words text-xs font-semibold leading-5 text-gray-500", affiliateContact(affiliate)),
        );
        return wrap;
      },
    },
    {
      label: "Slug / Link",
      key: "referral_code",
      render: (affiliate) => landingBlock(affiliate),
    },
    {
      label: "Status",
      key: "status",
      render: (affiliate) => SellerAffiliateStatusBadge(affiliate.status),
    },
    {
      label: "Performa",
      key: "performance",
      render: (affiliate) => textNode("span", "text-sm font-semibold text-gray-700", performanceText(affiliate)),
    },
    {
      label: "Komisi",
      key: "commission",
      render: (affiliate) => textNode("span", "text-sm font-black text-gray-950", commissionText(affiliate)),
    },
    {
      label: "Aksi",
      key: "actions",
      cellClassName: "px-4 py-4 align-top",
      render: (affiliate) => actionButtons(affiliate, {
        copyingAffiliateId,
        togglingAffiliateId,
        onDetail,
        onEdit,
        onToggleStatus,
        onOpenLanding,
        onCopyLanding,
      }),
    },
  ];
}

function actionButtons(affiliate, { copyingAffiliateId, togglingAffiliateId, onDetail, onEdit, onToggleStatus, onOpenLanding, onCopyLanding }) {
  const affiliateId = affiliate?.id ?? "unknown";
  const actions = document.createElement("section");
  actions.id = `slraf_affiliate_actions_${affiliateId}_section`;
  actions.className = "flex flex-wrap gap-2";

  const detail = Button({ label: "Detail", variant: "secondary", onClick: () => onDetail?.(affiliate) });
  detail.id = `slraf_detail_button_${affiliateId}`;
  detail.prepend(createIcon("eye", { className: "h-4 w-4" }));

  const edit = Button({ label: "Edit", variant: "secondary", onClick: () => onEdit?.(affiliate) });
  edit.id = `slraf_edit_button_${affiliateId}`;
  edit.prepend(createIcon("edit", { className: "h-4 w-4" }));

  const copy = Button({
    label: copyingAffiliateId === affiliate.id ? "Menyalin..." : "Copy Link",
    variant: "secondary",
    disabled: copyingAffiliateId === affiliate.id,
    onClick: () => onCopyLanding?.(affiliate),
  });
  copy.id = `slraf_copy_link_button_${affiliateId}`;
  copy.prepend(createIcon("link", { className: "h-4 w-4" }));

  const open = Button({ label: "Buka", variant: "secondary", onClick: () => onOpenLanding?.(affiliate) });
  open.id = `slraf_open_landing_button_${affiliateId}`;
  open.prepend(createIcon("globe", { className: "h-4 w-4" }));

  const toggle = Button({
    label: togglingAffiliateId === affiliate.id
      ? "Memproses..."
      : affiliate.status === "active" ? "Nonaktifkan" : "Aktifkan",
    variant: affiliate.status === "active" ? "danger" : "secondary",
    disabled: togglingAffiliateId === affiliate.id,
    onClick: () => onToggleStatus?.(affiliate),
  });
  toggle.id = `slraf_toggle_status_button_${affiliateId}`;
  toggle.prepend(createIcon(affiliate.status === "active" ? "lock" : "unlock", { className: "h-4 w-4" }));

  actions.append(detail, edit, copy, open);
  if (onToggleStatus) {
    actions.append(toggle);
  }
  return actions;
}

function landingBlock(affiliate, compact = false) {
  const wrap = document.createElement("section");
  wrap.id = `slraf_affiliate_landing_${affiliate.id}_section`;
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("p", "break-words text-sm font-black text-gray-950", affiliate.referral_code || "-"),
    textNode("p", `${compact ? "break-words" : "max-w-[260px] truncate"} text-xs font-semibold text-gray-500`, sellerAffiliateService.landingUrl(affiliate.referral_code) || "-"),
  );
  return wrap;
}

function tableIcon() {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-700";
  icon.append(createIcon("affiliate", { className: "h-4 w-4" }));
  return icon;
}

function affiliateName(affiliate) {
  return affiliate?.user?.name || affiliate?.name || `Affiliate #${affiliate?.id ?? "-"}`;
}

function affiliateContact(affiliate) {
  return [
    affiliate?.user?.email || affiliate?.email,
    affiliate?.phone_number || affiliate?.user?.phone_number,
  ].filter(Boolean).join(" | ") || "Kontak belum lengkap";
}

function performanceText(affiliate) {
  const clicks = numberValue(affiliate?.click_count ?? affiliate?.total_clicks ?? affiliate?.clicks_count);
  const leads = numberValue(affiliate?.lead_count ?? affiliate?.total_leads ?? affiliate?.prospect_count ?? affiliate?.prospects_count);
  const transactions = numberValue(affiliate?.transaction_count ?? affiliate?.total_transactions ?? affiliate?.conversions_count);
  return `${clicks.toLocaleString("id-ID")} klik | ${leads.toLocaleString("id-ID")} prospek | ${transactions.toLocaleString("id-ID")} transaksi`;
}

function commissionText(affiliate) {
  const value = affiliate?.total_commission
    ?? affiliate?.commission_total
    ?? affiliate?.settlement_total
    ?? affiliate?.total_settlement
    ?? 0;
  return formatCurrency(value);
}

function numberValue(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
