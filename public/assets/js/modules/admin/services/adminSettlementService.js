import { formatCurrency } from "../../../utils/formatCurrency.js";

const STATUS_META = {
  pending: { label: "Pending", variant: "warning" },
  settled: { label: "Sudah Dibayar", variant: "success" },
  cancelled: { label: "Dibatalkan", variant: "danger" },
};

export const adminSettlementService = {
  statusMeta(status = "") {
    return STATUS_META[status] ?? { label: status || "-", variant: "default" };
  },

  summarize(settlements = []) {
    return {
      totalBatches: settlements.length,
      pendingBatches: settlements.filter((item) => item.status === "pending").length,
      settledBatches: settlements.filter((item) => item.status === "settled").length,
      cancelledBatches: settlements.filter((item) => item.status === "cancelled").length,
      settledAmount: settlements
        .filter((item) => item.status === "settled")
        .reduce((sum, item) => sum + Number(item.requested_amount ?? 0), 0),
      pendingAmount: settlements
        .filter((item) => item.status === "pending")
        .reduce((sum, item) => sum + Number(item.requested_amount ?? 0), 0),
    };
  },

  summaryCards(settlements = []) {
    return this.summaryCardsFromSummary(this.summarize(settlements));
  },

  summaryCardsFromSummary(summary = {}) {
    return [
      {
        key: "batches",
        label: "Total Batch",
        value: String(summary.totalBatches),
        helper: "Semua batch settlement marketing yang sudah tercatat.",
      },
      {
        key: "pending-batches",
        label: "Batch Pending",
        value: String(summary.pendingBatches),
        helper: summary.pendingBatches > 0 ? "Batch ini menunggu finalisasi admin." : "Tidak ada batch pending saat ini.",
      },
      {
        key: "pending-amount",
        label: "Nominal Pending",
        value: formatCurrency(summary.pendingAmount),
        helper: "Akumulasi batch yang belum selesai atau dibatalkan.",
      },
      {
        key: "settled-amount",
        label: "Nominal Settled",
        value: formatCurrency(summary.settledAmount),
        helper: "Akumulasi batch yang sudah ditandai settled.",
      },
    ];
  },

  filterSettlements(settlements = [], filters = {}) {
    const keyword = String(filters.keyword ?? "").trim().toLowerCase();

    return settlements.filter((settlement) => {
      if (filters.status && settlement.status !== filters.status) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      const haystack = [
        settlement.id,
        settlement.affiliateLabel,
        settlement.affiliate?.name,
        settlement.affiliate?.referral_code,
        settlement.notes,
        settlement.status,
      ].filter(Boolean).join(" ").toLowerCase();

      return haystack.includes(keyword);
    });
  },

  normalizedSettlements(settlements = []) {
    return settlements.map((settlement) => ({
      ...settlement,
      requestedAmountLabel: formatCurrency(settlement.requested_amount ?? 0),
      affiliateLabel: settlement.affiliate?.name || settlement.affiliate?.referral_code || `Marketing #${settlement.affiliate_id ?? "-"}`,
      statusMeta: this.statusMeta(settlement.status),
    }));
  },
};
