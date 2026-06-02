import { affiliateDashboardResource } from "../../../resources/affiliateDashboardResource.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";

const STATUS_META = {
  pending: { label: "Pending", variant: "warning" },
  settled: { label: "Sudah Dibayar", variant: "success" },
  cancelled: { label: "Dibatalkan", variant: "danger" },
};

export const affiliateSettlementService = {
  list(params = {}, options = {}) {
    return affiliateDashboardResource.settlements(params, options);
  },

  summary(payload = null) {
    const summary = payload?.summary ?? {};
    return {
      totalAccruedCommission: Number(summary.total_accrued_commission ?? 0),
      totalUnsettledCommission: Number(summary.total_unsettled_commission ?? 0),
      totalSettledCommission: Number(summary.total_settled_commission ?? 0),
      eligibleLedgerCount: Number(summary.eligible_ledger_count ?? 0),
      pendingSettlementTotal: Number(summary.pending_settlement_total ?? 0),
    };
  },

  summaryCards(payload = null) {
    const summary = this.summary(payload);
    return [
      {
        key: "accrued",
        label: "Total accrued",
        value: formatCurrency(summary.totalAccruedCommission),
        helper: "Total komisi yang sudah tercatat dari ledger accrual canon.",
      },
      {
        key: "unsettled",
        label: "Total unsettled",
        value: formatCurrency(summary.totalUnsettledCommission),
        helper: summary.totalUnsettledCommission > 0
          ? "Komisi yang belum final dibayarkan."
          : "Belum ada komisi yang menunggu settlement.",
      },
      {
        key: "settled",
        label: "Total settled",
        value: formatCurrency(summary.totalSettledCommission),
        helper: summary.totalSettledCommission > 0
          ? "Komisi yang sudah masuk batch settlement selesai."
          : "Belum ada settlement yang selesai.",
      },
      {
        key: "eligible",
        label: "Eligible ledgers",
        value: String(summary.eligibleLedgerCount),
        helper: summary.eligibleLedgerCount > 0
          ? "Ledger accrual siap masuk ke batch settlement."
          : "Belum ada ledger eligible saat ini.",
      },
    ];
  },

  normalizedEligibleLedgers(payload = null) {
    return (payload?.eligible_ledgers ?? []).map((ledger) => ({
      ...ledger,
      transactionCodeLabel: ledger.transaction?.transaction_code || (ledger.transaction_id ? `Transaksi #${ledger.transaction_id}` : "-"),
      carLabel: [ledger.car?.brand_name, ledger.car?.model_name, ledger.car?.sub_model_name].filter(Boolean).join(" ") || "Mobil belum tersedia",
      ownerLabel: ledger.showroom?.name || ledger.seller?.name || "Seller",
      amountLabel: formatCurrency(ledger.commission_amount ?? ledger.amount ?? 0),
    }));
  },

  normalizedSettlements(payload = null) {
    return (payload?.settlements ?? []).map((settlement) => ({
      ...settlement,
      requestedAmountLabel: formatCurrency(settlement.requested_amount ?? 0),
      statusMeta: this.statusMeta(settlement.status),
    }));
  },

  statusMeta(status = "") {
    return STATUS_META[status] ?? { label: status || "-", variant: "default" };
  },
};
