export const PAYMENT_METHOD_OPTIONS = [
  { value: "bca_va", label: "BCA Virtual Account", description: "Transfer VA BCA" },
  { value: "gopay", label: "GoPay", description: "Bayar lewat aplikasi GoPay" },
  { value: "qris", label: "QRIS", description: "Scan QR dengan e-wallet atau m-banking" },
  { value: "manual_transfer", label: "Transfer Manual", description: "Transfer ke rekening showroom, upload bukti" },
];

const GOPAY_AUTO_OPEN_PREFIX = "projectb:gopay:auto-open:";

export function paymentMethodLabel(method) {
  return {
    bca_va: "BCA Virtual Account",
    bni_va: "BNI Virtual Account",
    bri_va: "BRI Virtual Account",
    mandiri_va: "Mandiri Virtual Account",
    gopay: "GoPay",
    qris: "QRIS",
    shopeepay: "ShopeePay",
    manual_transfer: "Transfer Manual",
  }[String(method ?? "").toLowerCase()] ?? String(method ?? "-").replace(/_/g, " ").toUpperCase();
}

export function normalizePaymentPayload(value) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) ?? {};
    } catch {
      return {};
    }
  }

  return value && typeof value === "object" ? value : {};
}

export function resolvePaymentArtifacts(transaction = {}) {
  const session = transaction?.payment_session ?? null;
  const logs = Array.isArray(transaction?.payment_logs) ? transaction.payment_logs : [];
  const latestLog = logs.length ? logs[0] : null;
  const instructionLog = logs.find(hasInstructionArtifact) ?? latestLog;
  const instruction = transaction?.payment_instruction ?? null;
  const method = session?.payment_method ?? instruction?.payment_method ?? instructionLog?.payment_method ?? latestLog?.payment_method ?? "bca_va";
  const paymentData = normalizePaymentPayload(session?.payment_data ?? instruction?.payment_data ?? instructionLog?.payment_data ?? {});
  const payloadResponse = normalizePaymentPayload(session?.payload_response ?? instruction?.payload_response ?? instructionLog?.payload_response ?? {});
  const actions = Array.isArray(paymentData.actions) && paymentData.actions.length
    ? paymentData.actions
    : Array.isArray(payloadResponse.actions) ? payloadResponse.actions : [];

  const qrCodeUrl = firstNonEmpty(
    paymentData.qr_code_url,
    urlLikeQr(paymentData.qr_string),
    actionUrl(actions, "generate-qr-code"),
    instruction?.qr_code_url,
    instructionLog?.qr_code_url,
    latestLog?.qr_code_url
  );
  const deeplinkUrl = firstNonEmpty(
    paymentData.deeplink_url,
    actionUrl(actions, "deeplink-redirect"),
    instruction?.deeplink_url,
    instructionLog?.deeplink_url,
    latestLog?.deeplink_url
  );
  const expiresAt = firstNonEmpty(
    session?.expires_at,
    instruction?.expires_at,
    transaction?.expires_at,
    paymentData.expiry_time,
    payloadResponse.expiry_time
  );

  return {
    method,
    session,
    latestLog,
    instruction,
    instructionLog,
    paymentData: {
      ...paymentData,
      actions,
    },
    payloadResponse,
    actions,
    qrCodeUrl,
    deeplinkUrl,
    providerOrderId: session?.provider_order_id ?? instruction?.provider_order_id ?? instructionLog?.provider_order_id ?? latestLog?.provider_order_id ?? transaction?.midtrans_order_id ?? "-",
    providerStatus: session?.transaction_status ?? latestLog?.transaction_status ?? instruction?.transaction_status ?? instructionLog?.transaction_status ?? transaction?.transaction_status ?? "-",
    transactionStatus: transaction?.transaction_status ?? null,
    expiresAt,
    isExpired: isPastDate(expiresAt),
    grossAmount: session?.gross_amount ?? instruction?.gross_amount ?? instructionLog?.gross_amount ?? latestLog?.gross_amount ?? null,
    autoOpenKey: session?.provider_order_id ?? instruction?.provider_order_id ?? instructionLog?.provider_order_id ?? latestLog?.provider_order_id ?? transaction?.transaction_code ?? transaction?.id ?? "payment",
  };
}

export function instructionSteps(method, { hasQr = false, hasDeeplink = false } = {}) {
  if (method === "manual_transfer") {
    return [
      "Buka halaman status pembayaran untuk melihat rekening tujuan transfer.",
      "Transfer sesuai nominal Booking Fee persis ke rekening showroom.",
      "Unggah bukti transfernya di halaman status pembayaran.",
      "Showroom akan mengecek mutasi rekening lalu mengonfirmasi pembayaran.",
    ];
  }

  if (method === "gopay") {
    return [
      "Pastikan aplikasi GoPay atau Gojek tersedia di perangkat Anda.",
      hasDeeplink ? "Klik tombol Buka Aplikasi GoPay untuk melanjutkan pembayaran." : "Buka aplikasi GoPay atau Gojek secara manual.",
      hasQr ? "Jika aplikasi tidak terbuka, scan QR GoPay yang tampil di halaman ini." : "Jika deeplink tidak tersedia, gunakan QR yang diberikan oleh provider.",
      "Konfirmasi nominal dan merchant di aplikasi.",
      "Selesaikan pembayaran lalu kembali ke halaman ini. Status akan dicek otomatis.",
    ];
  }

  if (method === "qris") {
    return [
      "Buka aplikasi bank atau e-wallet yang mendukung QRIS.",
      "Pilih menu Scan QR atau Bayar.",
      "Scan QR code yang tampil di halaman ini.",
      "Pastikan nominal dan merchant benar sebelum konfirmasi.",
      "Selesaikan pembayaran lalu kembali ke halaman ini. Status akan dicek otomatis.",
    ];
  }

  if (method === "bca_va") {
    return [
      "Buka m-BCA, KlikBCA, atau ATM BCA.",
      "Pilih menu transfer ke Virtual Account.",
      "Masukkan nomor VA yang tampil di halaman ini.",
      "Verifikasi nominal dan merchant sebelum konfirmasi.",
      "Kembali ke halaman ini. Status akan dicek otomatis.",
    ];
  }

  return [
    "Buka link pembayaran jika tersedia.",
    "Ikuti instruksi dari provider pembayaran.",
    "Kembali ke halaman ini. Status akan dicek otomatis.",
  ];
}

export function isMobileDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

export function shouldAutoOpenGopay({ method, deeplinkUrl, autoOpenKey, transactionStatus } = {}) {
  if (method !== "gopay" || !deeplinkUrl || !isMobileDevice()) {
    return false;
  }

  if (["paid", "completed", "expired", "cancelled", "dp_paid"].includes(String(transactionStatus ?? "").toLowerCase())) {
    return false;
  }

  const key = sessionStorageKey(autoOpenKey);

  try {
    return typeof window !== "undefined" && window.sessionStorage?.getItem(key) !== "1";
  } catch {
    return true;
  }
}

export function markGopayAutoOpened(autoOpenKey) {
  const key = sessionStorageKey(autoOpenKey);

  try {
    window.sessionStorage?.setItem(key, "1");
  } catch {
    // no-op
  }
}

function actionUrl(actions = [], name = "") {
  const found = Array.isArray(actions)
    ? actions.find((action) => action?.name === name && typeof action?.url === "string" && action.url.trim() !== "")
    : null;

  return found?.url?.trim?.() ?? null;
}

function urlLikeQr(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^(https?:\/\/|data:image\/)/i.test(trimmed) ? trimmed : null;
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim() !== "") ?? null;
}

function sessionStorageKey(value) {
  return GOPAY_AUTO_OPEN_PREFIX + String(value ?? "payment");
}

function hasInstructionArtifact(log) {
  if (!log || typeof log !== "object") {
    return false;
  }

  const paymentData = normalizePaymentPayload(log.payment_data ?? {});
  const payloadResponse = normalizePaymentPayload(log.payload_response ?? {});
  return Boolean(
    log.qr_code_url
    || log.deeplink_url
    || paymentData.qr_string
    || paymentData.deeplink_url
    || paymentData.va_number
    || paymentData.bill_key
    || paymentData.payment_code
    || (Array.isArray(paymentData.actions) && paymentData.actions.length)
    || (Array.isArray(payloadResponse.actions) && payloadResponse.actions.length)
    || payloadResponse.redirect_url
  );
}

function isPastDate(value) {
  if (!value) {
    return false;
  }

  const time = Date.parse(value);
  return !Number.isNaN(time) && time < Date.now();
}
