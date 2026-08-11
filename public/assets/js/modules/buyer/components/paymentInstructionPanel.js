import { Button } from "../../../ui/primitives/button.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { instructionSteps, isMobileDevice, paymentMethodLabel, resolvePaymentArtifacts } from "../../transactions/paymentMethodSupport.js";

export function PaymentInstructionPanel({
  transaction,
  isDownloadingQr = false,
  onDownloadQr = null,
  onOpenGopay = null,
} = {}) {
  const details = resolvePaymentArtifacts(transaction);
  const method = details.method;
  const paymentData = details.paymentData;
  const instructionExpired = isInstructionExpired(details, transaction);
  const qrCodeUrl = instructionExpired ? null : details.qrCodeUrl;
  const deeplinkUrl = details.deeplinkUrl;

  const section = document.createElement("section");
  section.className = `grid gap-5 ${tw.surface.raisedCard} p-5 sm:p-6`;

  const header = document.createElement("div");
  header.className = "grid gap-2";
  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Instruction";
  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = "Instruksi pembayaran";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = instructionIntro(transaction);
  header.append(eyebrow, title, body);

  const facts = document.createElement("div");
  facts.className = `grid gap-2 ${tw.surface.insetGrid}`;
  facts.append(
    row("Metode", paymentMethodLabel(method)),
    row("Provider order", details.providerOrderId),
    row("Status provider", details.providerStatus)
  );

  if (paymentData.va_number) {
    facts.append(vaRow(paymentData));
  }

  if (details.grossAmount) {
    facts.append(row("Nominal", formatCurrency(details.grossAmount)));
  }

  if (details.expiresAt) {
    facts.append(row("Batas waktu", formatDateTime(details.expiresAt)));
  }

  const steps = document.createElement("ol");
  steps.className = "grid list-decimal gap-2 rounded-3xl bg-[var(--pb-surface-muted)] p-4 pl-6 text-xs leading-6 text-gray-700 sm:pl-9";
  instructionSteps(method, {
    hasQr: Boolean(qrCodeUrl),
    hasDeeplink: Boolean(deeplinkUrl),
  }).forEach((step) => {
    const item = document.createElement("li");
    item.textContent = step;
    steps.append(item);
  });

  section.append(header);

  if (instructionExpired) {
    section.append(expiredInstructionPanel());
  }

  if (!instructionExpired && (method === "gopay" || method === "qris")) {
    section.append(walletPanel({
      method,
      qrCodeUrl,
      deeplinkUrl,
      isDownloadingQr,
      onDownloadQr,
      onOpenGopay,
    }));
  }

  section.append(facts);

  const note = document.createElement("p");
  note.className = "rounded-2xl border border-[color-mix(in_srgb,var(--pb-warning)_26%,white)] bg-[color-mix(in_srgb,var(--pb-warning)_8%,white)] px-4 py-3 text-xs leading-6 text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]";
  note.textContent = instructionExpired
    ? "Sesi pembayaran sudah melewati batas waktu yang tercatat. Jangan gunakan QR atau instruksi lama sebagai jalur aktif."
    : noteCopy(method, { hasQr: Boolean(qrCodeUrl), hasDeeplink: Boolean(deeplinkUrl), hasVa: Boolean(paymentData.va_number) });

  section.append(steps, note);
  return section;
}

function row(label, value) {
  const node = document.createElement("div");
  node.className = "flex flex-col gap-1 rounded-2xl bg-white/90 px-3 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3";
  const caption = document.createElement("span");
  caption.className = "break-words text-gray-500";
  caption.textContent = label;
  const content = document.createElement("span");
  content.className = "break-words text-left font-semibold text-gray-900 sm:text-right";
  content.textContent = value;
  node.append(caption, content);
  return node;
}

function vaRow(paymentData) {
  const node = row("Virtual Account", `${String(paymentData.bank ?? "").toUpperCase()} ${paymentData.va_number}`);
  node.className = `flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${tw.surface.successInset}`;
  return node;
}

function methodLabel(method) {
  return paymentMethodLabel(method);
}

function instructionIntro(transaction) {
  const status = transaction?.transaction_status;

  if (status === "paid") {
    return "Pembayaran sudah selesai. Instruksi ini hanya sebagai referensi.";
  }

  if (status === "dp_paid") {
    return "DP sudah masuk. Gunakan panel pelunasan jika ingin membuat sesi pembayaran sisa.";
  }

  if (status === "expired" || status === "cancelled") {
    return "Transaksi sudah tidak aktif untuk pembayaran.";
  }

  return "Selesaikan pembayaran sesuai metode yang aktif.";
}

function walletPanel({ method, qrCodeUrl, deeplinkUrl, isDownloadingQr = false, onDownloadQr = null, onOpenGopay = null } = {}) {
  const section = document.createElement("section");
  section.className = `grid gap-4 ${method === "gopay" ? tw.surface.successInset : tw.surface.accentPanel}`;

  const header = document.createElement("div");
  header.className = "grid gap-1";
  const title = document.createElement("h3");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = method === "gopay" ? "Bayar dengan GoPay" : "Bayar dengan QRIS";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-700";
  body.textContent = method === "gopay"
    ? isMobileDevice()
      ? "Perangkat mobile akan diarahkan ke aplikasi GoPay satu kali jika deeplink tersedia."
      : "Gunakan tombol buka aplikasi atau scan QR GoPay bila tersedia."
    : "Scan QRIS di bawah ini dengan aplikasi bank atau e-wallet Anda.";
  header.append(title, body);

  section.append(header);

  if (qrCodeUrl) {
    const qrWrap = document.createElement("div");
    qrWrap.className = "grid gap-3 rounded-[1.25rem] border border-white/70 bg-white/95 p-4 shadow-sm";
    const image = document.createElement("img");
    image.src = qrCodeUrl;
    image.alt = method === "gopay" ? "QR pembayaran GoPay" : "QR pembayaran QRIS";
    image.className = "mx-auto h-auto w-full max-w-[280px] rounded-2xl border border-gray-100 bg-white object-contain";
    qrWrap.append(image);
    section.append(qrWrap);
  } else {
    const unavailable = document.createElement("p");
    unavailable.className = "rounded-2xl border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-xs leading-6 text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    unavailable.textContent = method === "gopay"
      ? "QR GoPay belum tersedia dari provider. Gunakan tombol buka aplikasi jika tersedia."
      : "QRIS belum tersedia dari provider. Coba refresh status, tetapi jangan buat transaksi baru jika sesi ini masih valid.";
    section.append(unavailable);
  }

  const actions = document.createElement("div");
  actions.className = "grid grid-cols-1 gap-2 sm:grid-cols-2";
  if (method === "gopay") {
    const open = Button({
      label: "Buka Aplikasi GoPay",
      variant: "primary",
      disabled: !deeplinkUrl,
      onClick: () => onOpenGopay?.(),
    });
    open.classList.add("w-full");
    actions.append(open);
  }

  if (method === "qris") {
    const download = Button({
      label: isDownloadingQr ? "Mengunduh QR..." : "Download QR",
      variant: "primary",
      disabled: !qrCodeUrl || isDownloadingQr,
      onClick: () => onDownloadQr?.(),
    });
    download.classList.add("w-full");
    actions.append(download);
  }

  if (actions.childElementCount) {
    section.append(actions);
  }

  return section;
}

function noteCopy(method, { hasQr = false, hasDeeplink = false, hasVa = false } = {}) {
  if (method === "gopay") {
    if (hasDeeplink) {
      return "Gunakan deeplink GoPay sebagai jalur utama. Jika aplikasi tidak terbuka, scan QR GoPay; halaman ini akan mengecek status otomatis.";
    }

    if (hasQr) {
      return "Provider tidak mengirim deeplink GoPay. Scan QR GoPay yang tersedia; halaman ini akan mengecek status otomatis.";
    }

    return "Instruksi GoPay sudah tampil, tetapi provider belum memberi deeplink atau QR. Coba refresh status tanpa membuat transaksi baru.";
  }

  if (method === "qris") {
    return hasQr
      ? "Gunakan tombol Download QR jika Anda perlu menyimpan QRIS. Halaman ini akan mengecek status otomatis setelah pembayaran."
      : "QRIS belum tersedia untuk diunduh. Coba refresh status tanpa membuat transaksi baru.";
  }

  return hasVa
    ? "Gunakan nomor VA di atas sesuai instruksi bank. Halaman ini akan mengecek status otomatis setelah pembayaran."
    : "Nomor VA ditampilkan jika tersedia dari sesi pembayaran. Jika tidak terlihat, gunakan link pembayaran atau refresh status.";
}

function expiredInstructionPanel() {
  const section = document.createElement("section");
  section.className = "grid gap-2 rounded-[1.25rem] border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-4 text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
  const title = document.createElement("h3");
  title.className = "text-sm font-black";
  title.textContent = "Sesi pembayaran kadaluarsa";
  const body = document.createElement("p");
  body.className = "text-xs leading-6";
  body.textContent = "Instruksi lama disimpan sebagai referensi, tetapi tidak ditampilkan sebagai instruksi aktif karena batas waktu pembayaran sudah lewat.";
  section.append(title, body);
  return section;
}

function isInstructionExpired(details, transaction) {
  const status = String(transaction?.transaction_status ?? "").toLowerCase();
  if (["paid", "completed", "dp_paid"].includes(status)) {
    return false;
  }

  return Boolean(details?.isExpired);
}

function formatDateTime(value) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(time));
}
