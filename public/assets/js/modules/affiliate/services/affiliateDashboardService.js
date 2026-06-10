import { affiliateDashboardResource } from "../../../resources/affiliateDashboardResource.js";
import { sellerAffiliateService } from "../../seller/services/sellerAffiliateService.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";

const STATUS_META = {
  active: { label: "Aktif", variant: "success" },
  inactive: { label: "Nonaktif", variant: "warning" },
};

export const affiliateDashboardService = {
  me(options = {}) {
    return affiliateDashboardResource.me(options);
  },

  statusMeta(status = "") {
    return STATUS_META[status] ?? { label: status || "-", variant: "default" };
  },

  summary(affiliate = null) {
    return {
      clicks: Number(affiliate?.summary?.total_clicks ?? affiliate?.total_clicks ?? 0),
      transactions: Number(affiliate?.summary?.total_transactions ?? affiliate?.total_transactions ?? 0),
      commission: Number(affiliate?.summary?.total_commission ?? affiliate?.total_commission ?? 0),
    };
  },

  landingUrl(affiliate = null) {
    return sellerAffiliateService.landingUrl(affiliate?.referral_code ?? "");
  },

  landingPath(affiliate = null) {
    return sellerAffiliateService.landingPath(affiliate?.referral_code ?? "");
  },

  summaryCards(affiliate = null) {
    const summary = this.summary(affiliate);

    return [
      {
        key: "clicks",
        label: "Total klik",
        value: String(summary.clicks),
        helper: summary.clicks > 0 ? "Klik tercatat dari landing marketing." : "Belum ada klik tercatat.",
      },
      {
        key: "transactions",
        label: "Transaksi teratribusi",
        value: String(summary.transactions),
        helper: summary.transactions > 0 ? "Transaksi sudah masuk agregat marketing." : "Belum ada transaksi teratribusi.",
      },
      {
        key: "commission",
        label: "Total komisi",
        value: formatCurrency(summary.commission),
        helper: summary.commission > 0 ? "Akumulasi komisi dari ledger marketing." : "Belum ada komisi tercatat.",
      },
    ];
  },

  hasRecentLedgers(affiliate = null) {
    return Array.isArray(affiliate?.recent_ledgers) && affiliate.recent_ledgers.length > 0;
  },

  recentActivityItems(affiliate = null) {
    return affiliate?.recent_ledgers ?? [];
  },

  sellerOwnerLabel(affiliate = null) {
    if (affiliate?.showroom?.name) {
      return affiliate.showroom.name;
    }

    if (affiliate?.seller?.name) {
      return affiliate.seller.name;
    }

    return "Seller owner";
  },
};
