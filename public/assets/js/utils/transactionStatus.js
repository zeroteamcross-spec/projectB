const PAYMENT_STATUS_LABELS = {
  unpaid: "Belum Dibayar",
  partial: "Dibayar Sebagian",
  paid: "Lunas",
  failed: "Gagal",
  refunded: "Refunded",
  pending_payment: "Belum Dibayar",
  dp_paid: "Lunas",
  returned: "Diretur",
  expired: "Kadaluarsa",
  cancelled: "Dibatalkan",
};

const TRANSACTION_STATUS_META = {
  pending_payment: {
    label: "Menunggu Pembayaran",
    shortLabel: "Menunggu",
    variant: "warning",
    bucket: "waiting",
    description: "Buyer belum menyelesaikan pembayaran awal.",
  },
  waiting_payment: {
    label: "Menunggu Pembayaran",
    shortLabel: "Menunggu",
    variant: "warning",
    bucket: "waiting",
    description: "Buyer belum menyelesaikan pembayaran.",
  },
  pending: {
    label: "Pending",
    shortLabel: "Pending",
    variant: "warning",
    bucket: "waiting",
    description: "Transaksi masih menunggu pembayaran.",
  },
  unpaid: {
    label: "Belum Dibayar",
    shortLabel: "Belum Dibayar",
    variant: "warning",
    bucket: "waiting",
    description: "Pembayaran belum diterima.",
  },
  dp_pending: {
    label: "Menunggu DP",
    shortLabel: "Menunggu DP",
    variant: "warning",
    bucket: "waiting",
    description: "Transaksi menunggu pembayaran DP.",
  },
  dp_paid: {
    label: "Lunas",
    shortLabel: "Lunas",
    variant: "success",
    bucket: "done",
    description: "Booking Fee sudah diterima dan transaksi dianggap selesai.",
  },
  returned: {
    label: "Diretur",
    shortLabel: "Diretur",
    variant: "danger",
    bucket: "closed",
    description: "Transaksi diretur showroom. Mobil kembali dijual dan komisi dibatalkan.",
  },
  paid: {
    label: "Lunas",
    shortLabel: "Lunas",
    variant: "success",
    bucket: "done",
    description: "Pembayaran sudah diterima dan transaksi dianggap selesai.",
  },
  paid_confirmed: {
    label: "Pembayaran Dikonfirmasi",
    shortLabel: "Dikonfirmasi",
    variant: "success",
    bucket: "process",
    description: "Pembayaran sudah dikonfirmasi dan transaksi perlu diproses showroom.",
  },
  processing: {
    label: "Diproses Showroom",
    shortLabel: "Diproses",
    variant: "info",
    bucket: "process",
    description: "Showroom sedang menyiapkan dokumen dan proses serah terima.",
  },
  handover: {
    label: "Serah Terima",
    shortLabel: "Serah Terima",
    variant: "info",
    bucket: "process",
    description: "Transaksi masuk fase serah terima kendaraan.",
  },
  completed: {
    label: "Selesai",
    shortLabel: "Selesai",
    variant: "success",
    bucket: "done",
    description: "Transaksi sudah selesai.",
  },
  done: {
    label: "Selesai",
    shortLabel: "Selesai",
    variant: "success",
    bucket: "done",
    description: "Transaksi sudah selesai.",
  },
  success: {
    label: "Selesai",
    shortLabel: "Selesai",
    variant: "success",
    bucket: "done",
    description: "Transaksi sudah selesai.",
  },
  expired: {
    label: "Kadaluarsa",
    shortLabel: "Kadaluarsa",
    variant: "danger",
    bucket: "done",
    description: "Sesi pembayaran berakhir sebelum pembayaran selesai.",
  },
  cancelled: {
    label: "Dibatalkan",
    shortLabel: "Dibatalkan",
    variant: "danger",
    bucket: "done",
    description: "Transaksi dibatalkan.",
  },
  failed: {
    label: "Gagal",
    shortLabel: "Gagal",
    variant: "danger",
    bucket: "done",
    description: "Pembayaran transaksi gagal.",
  },
  refunded: {
    label: "Refunded",
    shortLabel: "Refunded",
    variant: "warning",
    bucket: "done",
    description: "Pembayaran transaksi sudah direfund.",
  },
};

const LISTING_STATUS_META = {
  draft: { label: "Draft", variant: "default", locked: false },
  published: { label: "Tersedia", variant: "success", locked: false },
  reserved: { label: "Terkunci DP", variant: "warning", locked: true },
  sold: { label: "Terjual", variant: "info", locked: true },
  archived: { label: "Archived", variant: "danger", locked: true },
};

export const CANON_LISTING_STATUSES = Object.freeze(["draft", "published", "reserved", "sold", "archived"]);
export const CANON_TRANSACTION_STATUSES = Object.freeze(["pending_payment", "dp_paid", "paid", "completed", "expired", "cancelled", "returned"]);
export const CANON_SETTLEMENT_STATUSES = Object.freeze(["pending", "settled", "cancelled"]);
export const CANON_AFFILIATE_LEDGER_STATUSES = Object.freeze(["accrued", "pending", "paid_out", "voided"]);

export function normalizeStatus(status) {
  return String(status ?? "").trim().toLowerCase();
}

export function isPaymentPaid(transaction) {
  const paymentStatus = normalizeStatus(transaction?.payment_status);
  const transactionStatus = normalizeStatus(transaction?.transaction_status ?? transaction?.status);

  // dp_paid adalah status "lunas" yang sungguh dicapai sejak Booking Fee
  // menjadi satu-satunya pembayaran; "paid" masih diperiksa untuk transaksi
  // lunas lama yang dibuat sebelum perubahan ini.
  return paymentStatus === "paid" || ["dp_paid", "paid", "completed"].includes(transactionStatus);
}

export function isTransactionFulfillment(transaction) {
  const status = normalizeStatus(transaction?.transaction_status ?? transaction?.status ?? transaction);
  return ["processing", "handover"].includes(status);
}

export function isTransactionCompleted(transaction) {
  const status = normalizeStatus(transaction?.transaction_status ?? transaction?.status ?? transaction);
  return ["dp_paid", "paid", "completed"].includes(status);
}

export function isTransactionCancelled(transaction) {
  const status = normalizeStatus(transaction?.transaction_status ?? transaction?.status ?? transaction);
  return ["cancelled", "expired", "failed", "refunded"].includes(status);
}

export function derivedPaymentStatus(transaction) {
  const status = normalizeStatus(transaction?.transaction_status ?? transaction?.status ?? transaction);

  // Booking Fee menutup kewajiban pembayaran; tidak ada lagi pelunasan
  // bertahap, jadi dp_paid berarti lunas, bukan "partial".
  if (["dp_paid", "paid", "completed"].includes(status)) {
    return "paid";
  }

  if (["expired", "cancelled", "failed", "refunded"].includes(status)) {
    return "closed";
  }

  return "pending";
}

export function listingStatusForTransaction(transaction, previousTransaction = null) {
  const status = normalizeStatus(transaction?.transaction_status ?? transaction?.status);
  const previousStatus = normalizeStatus(previousTransaction?.transaction_status ?? previousTransaction?.status);
  const currentListing = normalizeStatus(transaction?.car?.listing_status ?? transaction?.listing_status);
  const previousListing = normalizeStatus(previousTransaction?.car?.listing_status ?? previousTransaction?.listing_status);
  const listing = currentListing || previousListing || "";

  // Booking Fee langsung menjualkan mobil; tidak ada lagi tahap "reserved"
  // terpisah antara dp_paid dan paid (lihat BUSINESS_FLOW.md bagian 11).
  if (["dp_paid", "paid", "completed"].includes(status)) {
    return "sold";
  }

  if (status === "cancelled") {
    if (["dp_paid", "paid", "completed"].includes(previousStatus) || listing === "sold") {
      return "sold";
    }

    return "published";
  }

  if (status === "expired") {
    if (["dp_paid", "paid", "completed"].includes(previousStatus) || listing === "sold" || listing === "reserved") {
      return "sold";
    }

    return "published";
  }

  if (status === "refunded") {
    return "sold";
  }

  return "";
}

export function ledgerStatusForSettlementStatus(status) {
  const normalized = normalizeStatus(status);

  if (normalized === "settled") {
    return "paid_out";
  }

  if (normalized === "cancelled") {
    return "accrued";
  }

  if (normalized === "pending") {
    return "pending";
  }

  return "";
}

export function getPaymentStatusLabel(status) {
  const normalized = normalizeStatus(status);
  return PAYMENT_STATUS_LABELS[normalized] ?? titleizeStatus(status);
}

export function getTransactionStatusMeta(status) {
  const normalized = normalizeStatus(status);
  return TRANSACTION_STATUS_META[normalized] ?? {
    label: titleizeStatus(status),
    shortLabel: titleizeStatus(status),
    variant: "default",
    bucket: "process",
    description: "Status transaksi belum dipetakan.",
  };
}

export function getTransactionStatusLabel(status) {
  return getTransactionStatusMeta(status).label;
}

export function getListingStatusMeta(status) {
  const normalized = normalizeStatus(status);
  return LISTING_STATUS_META[normalized] ?? {
    label: titleizeStatus(status),
    variant: "default",
    locked: false,
  };
}

export function getListingLockStatus(transaction) {
  const transactionStatus = normalizeStatus(transaction?.transaction_status ?? transaction?.status);
  const listingStatus = normalizeStatus(transaction?.car?.listing_status ?? transaction?.listing_status);

  // dp_paid langsung menjualkan mobil (lihat BUSINESS_FLOW.md bagian 11);
  // listingStatus "reserved" tetap diperiksa untuk data lama sebelum
  // perubahan ini, supaya tidak tiba-tiba terbuka lagi untuk dibeli.
  if (["dp_paid", "paid", "completed"].includes(transactionStatus) || ["sold", "reserved"].includes(listingStatus)) {
    return {
      status: "sold",
      label: "Terjual",
      variant: "info",
      locked: true,
      reason: "Booking Fee sudah dibayar.",
    };
  }

  const meta = getListingStatusMeta(listingStatus || "published");
  return {
    status: listingStatus || "published",
    label: meta.label,
    variant: meta.variant,
    locked: Boolean(meta.locked),
    reason: "",
  };
}

export function isCarLocked(carOrTransaction) {
  const transactionLike = carOrTransaction?.transaction_status || carOrTransaction?.car
    ? carOrTransaction
    : { car: carOrTransaction };
  return getListingLockStatus(transactionLike).locked;
}

export function titleizeStatus(status) {
  const value = String(status ?? "-").trim();
  if (!value) {
    return "-";
  }

  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
