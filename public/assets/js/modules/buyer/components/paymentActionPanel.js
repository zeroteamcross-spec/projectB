import { Button } from "../../../ui/primitives/button.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { isPaymentPaid } from "../../../utils/transactionStatus.js";

export function PaymentActionPanel({
  transaction,
  isRefreshing = false,
  isCompleting = false,
  completionOpen = false,
  onRefresh = null,
  onOpenCompletion = null,
} = {}) {
  const section = document.createElement("section");
  section.className = `grid gap-4 ${tw.surface.raisedCard} p-5 sm:p-6`;

  const header = document.createElement("div");
  header.className = "grid gap-2";
  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Action";
  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = "Langkah berikutnya";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = actionCopy(transaction);
  header.append(eyebrow, title, body);

  const refresh = Button({
    label: isRefreshing ? "Memuat status..." : "Refresh status",
    variant: "secondary",
    disabled: isRefreshing,
    onClick: onRefresh,
  });
  refresh.classList.add("w-full");

  section.append(header, actionHint(transaction));

  if (canOpenPayment(transaction)) {
    const link = document.createElement("a");
    link.href = redirectUrl(transaction);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = `${tw.interactive.primaryLink} w-full break-words text-center`;
    link.textContent = "Bayar sekarang";
    section.append(link);
  }

  if (canComplete(transaction) && !completionOpen) {
    const complete = Button({
      label: isCompleting ? "Membuka pelunasan..." : "Lanjut pelunasan",
      variant: "primary",
      disabled: isCompleting,
      onClick: onOpenCompletion,
    });
    complete.classList.add("w-full");
    section.append(complete);
  }

  section.append(refresh);

  return section;
}

function actionHint(transaction) {
  const box = document.createElement("div");
  box.className = `${tw.surface.inset} text-xs leading-6 text-gray-600`;
  box.textContent = isPaymentPaid(transaction)
    ? "Tim seller akan menyiapkan dokumen dan mengatur serah terima kendaraan."
    : canComplete(transaction)
    ? "DP sudah masuk. Buyer bisa membuat sesi pelunasan dari panel ini tanpa meninggalkan halaman status."
    : "Gunakan panel ini untuk membuka link payment aktif atau sinkronkan status terbaru dari provider.";
  return box;
}

function canOpenPayment(transaction) {
  return Boolean(
    redirectUrl(transaction)
    && !isPaymentPaid(transaction)
    && !["expired", "cancelled"].includes(transaction.transaction_status)
    && !isExpired(transaction.expires_at)
  );
}

function canComplete(transaction) {
  // Booking Fee adalah pembayaran terakhir di sistem, jadi tidak ada CTA
  // pelunasan. Sisa harga diselesaikan langsung dengan showroom.
  return false;
}

function isExpired(value) {
  return value ? Date.parse(value) < Date.now() : false;
}

function redirectUrl(transaction) {
  return transaction?.payment_session?.redirect_url ?? transaction?.midtrans_redirect_url ?? "";
}

function actionCopy(transaction) {
  const status = transaction?.transaction_status;

  if (status === "pending_payment") {
    return "Bayar sekarang jika link tersedia, lalu refresh status setelah pembayaran.";
  }

  if (status === "dp_paid") {
    return "DP sudah masuk dan mobil sudah dikunci. Lanjutkan pelunasan atau refresh jika baru saja membayar.";
  }

  if (status === "paid") {
    return "Pembayaran berhasil. Seller akan menyiapkan dokumen dan proses serah terima.";
  }

  if (status === "expired" || status === "cancelled") {
    return "Tidak ada aksi pembayaran aktif untuk transaksi ini.";
  }

  return "Gunakan refresh untuk mengambil status terbaru.";
}
