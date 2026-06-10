import { formatCurrency } from "../../../utils/formatCurrency.js";

const LEDGER_STATUS_META = {
  accrued: { label: "Belum Dibayar", variant: "warning" },
  pending: { label: "Menunggu Pembayaran", variant: "info" },
  paid_out: { label: "Sudah Dibayar", variant: "success" },
  voided: { label: "Dibatalkan", variant: "danger" },
};

export const adminAffiliateFinanceService = {
  ledgerStatusMeta(status = "") {
    return LEDGER_STATUS_META[status] ?? { label: status || "-", variant: "default" };
  },

  normalizedLedgers(ledgers = []) {
    return ledgers.map((ledger) => {
      const carLabel = [
        ledger.car?.brand_name,
        ledger.car?.model_name,
        ledger.car?.sub_model_name,
      ].filter(Boolean).join(" ") || "-";

      return {
        ...ledger,
        carLabel,
        affiliateLabel: ledger.affiliate?.name || ledger.referral_code || `Marketing #${ledger.affiliate_id ?? "-"}`,
        transactionCodeLabel: ledger.transaction?.transaction_code || (ledger.transaction_id ? `TRX #${ledger.transaction_id}` : "-"),
        amountLabel: formatCurrency(ledger.commission_amount ?? ledger.amount ?? 0),
        baseAmountLabel: formatCurrency(ledger.base_amount ?? 0),
        statusMeta: this.ledgerStatusMeta(ledger.ledger_status),
      };
    });
  },

  filterLedgers(ledgers = [], filters = {}) {
    const keyword = String(filters.keyword ?? "").trim().toLowerCase();

    return ledgers.filter((ledger) => {
      if (filters.status && ledger.ledger_status !== filters.status) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return [
        ledger.id,
        ledger.affiliateLabel,
        ledger.transactionCodeLabel,
        ledger.carLabel,
        ledger.ledger_status,
      ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
    });
  },

  summarize(ledgers = []) {
    return {
      accruedAmount: sumByStatus(ledgers, "accrued"),
      pendingAmount: sumByStatus(ledgers, "pending"),
      paidAmount: sumByStatus(ledgers, "paid_out"),
      accruedCount: ledgers.filter((ledger) => ledger.ledger_status === "accrued").length,
      totalCount: ledgers.length,
    };
  },
};

function sumByStatus(ledgers, status) {
  return ledgers
    .filter((ledger) => ledger.ledger_status === status)
    .reduce((sum, ledger) => sum + Number(ledger.commission_amount ?? ledger.amount ?? 0), 0);
}
