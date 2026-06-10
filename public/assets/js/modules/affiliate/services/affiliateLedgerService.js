import { affiliateDashboardResource } from "../../../resources/affiliateDashboardResource.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";

const LEDGER_STATUS_META = {
  accrued: "Belum Dibayar",
  pending: "Menunggu Pembayaran",
  paid_out: "Sudah Dibayar",
  voided: "Dibatalkan",
};

export const affiliateLedgerService = {
  list(params = {}, options = {}) {
    return affiliateDashboardResource.ledgers(params, options);
  },

  summary(payload = null) {
    const summary = payload?.summary ?? {};
    return {
      totalCommission: Number(summary.total_commission ?? 0),
      totalTransactions: Number(summary.total_transactions ?? 0),
      pendingTotal: summary.pending_total === null || summary.pending_total === undefined ? null : Number(summary.pending_total),
      confirmedTotal: summary.confirmed_total === null || summary.confirmed_total === undefined ? null : Number(summary.confirmed_total),
      statusAvailable: Boolean(summary.status_available),
    };
  },

  summaryCards(payload = null) {
    const summary = this.summary(payload);
    return [
      {
        key: "commission",
        label: "Total komisi",
        value: formatCurrency(summary.totalCommission),
        helper: summary.totalCommission > 0 ? "Akumulasi komisi dari ledger penjualan marketing." : "Belum ada komisi tercatat.",
      },
      {
        key: "transactions",
        label: "Transaksi berkomisi",
        value: String(summary.totalTransactions),
        helper: summary.totalTransactions > 0 ? "Transaksi unik sudah masuk ke ledger marketing." : "Belum ada transaksi berkomisi.",
      },
      {
        key: "pending",
        label: "Pending / belum final",
        value: summary.statusAvailable && summary.pendingTotal !== null ? formatCurrency(summary.pendingTotal) : "-",
        helper: summary.statusAvailable ? "Nilai ledger yang belum mencapai finality canon." : "Status ledger belum tersedia di backend saat ini.",
      },
      {
        key: "confirmed",
        label: "Confirmed / final",
        value: summary.statusAvailable && summary.confirmedTotal !== null ? formatCurrency(summary.confirmedTotal) : "-",
        helper: summary.statusAvailable ? "Nilai ledger yang sudah final di event bisnis canon." : "Breakdown final belum tersedia di backend saat ini.",
      },
    ];
  },

  normalizedLedgers(payload = null) {
    const ledgers = payload?.ledgers ?? [];
    return ledgers.map((ledger) => ({
      ...ledger,
      ruleSourceLabel: ledger.rule_source ? this.ruleSourceLabel(ledger.rule_source) : "-",
      commissionTypeLabel: ledger.commission_type ? this.commissionTypeLabel(ledger.commission_type) : "-",
      baseAmountLabel: ledger.base_amount !== null && ledger.base_amount !== undefined ? formatCurrency(ledger.base_amount) : "-",
      amountLabel: formatCurrency(ledger.commission_amount ?? ledger.amount ?? 0),
      transactionCodeLabel: ledger.transaction?.transaction_code || (ledger.transaction_id ? `Transaksi #${ledger.transaction_id}` : "-"),
      sellerOwnerLabel: ledger.showroom?.name || ledger.seller?.name || "Seller",
      carLabel: [ledger.car?.brand_name, ledger.car?.model_name, ledger.car?.sub_model_name].filter(Boolean).join(" ") || "Mobil belum tersedia",
      ledgerStatusLabel: LEDGER_STATUS_META[ledger.ledger_status] || ledger.ledger_status || "-",
      finalityEventLabel: ledger.finality_event || "-",
      commissionValueLabel: ledger.commission_value_snapshot !== null && ledger.commission_value_snapshot !== undefined
        ? (ledger.commission_type === "percent" ? `${Number(ledger.commission_value_snapshot)}%` : formatCurrency(ledger.commission_value_snapshot))
        : "-",
    }));
  },

  ruleSourceLabel(source = "") {
    return source === "car_override" ? "Per-car override" : source === "global" ? "Global rule" : "Belum tercatat";
  },

  commissionTypeLabel(type = "") {
    return type === "percent" ? "Percentage" : type === "flat" ? "Fixed" : "Belum tercatat";
  },
};
