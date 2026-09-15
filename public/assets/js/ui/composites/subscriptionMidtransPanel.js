import { Button } from "../primitives/button.js";
import { showroomsResource } from "../../resources/showroomsResource.js";

const BANKS = [
  { value: "bca", label: "BCA" },
  { value: "bni", label: "BNI" },
  { value: "bri", label: "BRI" },
  { value: "mandiri", label: "Mandiri" },
];

const POLL_INTERVAL_MS = 5000;

/**
 * Panel "bayar via Virtual Account (Midtrans)" -- dipakai di dua tempat
 * (halaman registrasi showroom & halaman Langganan/perpanjangan), jadi
 * ditulis sekali di sini sebagai widget mandiri, bukan diduplikasi.
 *
 * Mengelola state-nya sendiri (bank dipilih, sesi VA yang sedang berjalan,
 * polling status) dan memanggil onPaid() begitu subscription_payment_status
 * berubah jadi "pending_verification" -- pemanggil cukup me-refresh
 * tampilannya sendiri dari situ, tidak perlu tahu detail Midtrans.
 *
 * Pembayaran instan ini TIDAK langsung meloloskan showroom -- begitu VA
 * dibayar, Admin tetap harus konfirmasi manual seperti alur transfer manual
 * (lihat ShowroomService::confirmSubscriptionPayment()). Polling di sini
 * cuma mendeteksi "sudah dibayar, menunggu Admin", bukan "sudah aktif".
 */
export function SubscriptionMidtransPanel({ getShowroom, onPaid = null } = {}) {
  const root = document.createElement("div");
  root.id = "sub_midtrans_panel";
  root.className = "grid gap-3";

  let pollTimer = null;
  let isCharging = false;
  let error = "";
  let selectedBank = BANKS[0].value;

  render();

  return {
    element: root,
    dispose() {
      stopPolling();
    },
  };

  function render() {
    const showroom = getShowroom();
    root.replaceChildren();

    const isMidtransPending = showroom?.subscription_payment_method === "midtrans"
      && showroom?.subscription_payment_status === "unpaid"
      && showroom?.subscription_midtrans_order_id;

    if (isMidtransPending) {
      root.append(vaSessionCard(showroom));
      startPolling();
      return;
    }

    stopPolling();
    root.append(bankChooserCard());
  }

  function bankChooserCard() {
    const card = document.createElement("div");
    card.id = "sub_midtrans_choose_bank";
    card.className = "grid gap-3 rounded-2xl border border-[var(--pb-card-border)] bg-white/70 p-4";

    const label = document.createElement("p");
    label.className = "text-xs font-semibold text-gray-700";
    label.textContent = "Pilih bank Virtual Account";
    card.append(label);

    const bankRow = document.createElement("div");
    bankRow.id = "sub_midtrans_bank_row";
    bankRow.className = "grid grid-cols-2 gap-2 sm:grid-cols-4";
    BANKS.forEach((bank) => {
      const option = document.createElement("button");
      option.type = "button";
      option.dataset.bank = bank.value;
      const isSelected = selectedBank === bank.value;
      option.className = [
        "rounded-xl border px-3 py-2 text-xs font-bold transition",
        isSelected
          ? "border-[var(--pb-brand-primary)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_8%,white)] text-[var(--pb-brand-secondary)]"
          : "border-[var(--pb-card-border)] bg-white text-gray-700 hover:border-[color-mix(in_srgb,var(--pb-brand-primary)_35%,var(--pb-card-border))]",
      ].join(" ");
      option.textContent = bank.label;
      option.addEventListener("click", () => {
        selectedBank = bank.value;
        render();
      });
      bankRow.append(option);
    });
    card.append(bankRow);

    if (error) {
      const message = document.createElement("p");
      message.id = "sub_midtrans_error";
      message.className = "rounded-xl border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
      message.textContent = error;
      card.append(message);
    }

    const submit = Button({
      label: isCharging ? "Membuat Virtual Account..." : `Buat Virtual Account ${selectedBank.toUpperCase()}`,
      variant: "primary",
      disabled: isCharging,
      onClick: createCharge,
    });
    submit.id = "sub_midtrans_create_button";
    submit.classList.add("w-full");
    card.append(submit);

    return card;
  }

  function vaSessionCard(showroom) {
    const card = document.createElement("div");
    card.id = "sub_midtrans_va_card";
    card.className = "grid gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--pb-success)_28%,white)] bg-[color-mix(in_srgb,var(--pb-success)_6%,white)] p-4";

    const paymentData = showroom.subscription_midtrans_payment_data || {};
    const bankLabel = String(paymentData.bank || "").toUpperCase();
    const vaNumber = paymentData.va_number || "-";

    card.append(
      row("Bank", bankLabel || "-"),
      copyableRow("Nomor Virtual Account", vaNumber),
    );

    if (showroom.subscription_midtrans_expires_at) {
      card.append(row("Berlaku sampai", formatDateTime(showroom.subscription_midtrans_expires_at)));
    }

    const note = document.createElement("p");
    note.className = "text-xs leading-6 text-gray-600";
    note.textContent = "Transfer sesuai nominal paket ke nomor Virtual Account di atas lewat ATM/m-banking. Halaman ini otomatis memeriksa status setelah pembayaran diterima.";
    card.append(note);

    const retry = document.createElement("button");
    retry.type = "button";
    retry.id = "sub_midtrans_retry_button";
    retry.className = "justify-self-start text-xs font-bold text-[var(--pb-brand-secondary)] underline underline-offset-2";
    retry.textContent = "Buat Virtual Account baru";
    retry.addEventListener("click", () => {
      // Bukan panggilan API -- cuma balik ke pemilihan bank. VA lama tetap
      // bisa dibayar sampai kedaluwarsa; membuat sesi baru lewat tombol di
      // situ akan menimpa order_id-nya di server.
      root.dataset.forceChooser = "1";
      renderChooserOverride();
    });
    card.append(retry);

    return card;
  }

  function renderChooserOverride() {
    root.replaceChildren(bankChooserCard());
  }

  async function createCharge() {
    isCharging = true;
    error = "";
    render();

    try {
      const showroom = await showroomsResource.createSubscriptionMidtransCharge(selectedBank);
      onPaid?.(showroom);
    } catch (submitError) {
      error = submitError?.message || "Gagal membuat Virtual Account.";
    } finally {
      isCharging = false;
      render();
    }
  }

  function startPolling() {
    if (pollTimer) {
      return;
    }
    pollTimer = window.setInterval(async () => {
      try {
        const showroom = await showroomsResource.mine();
        if (showroom && showroom.subscription_payment_status !== "unpaid") {
          stopPolling();
        }
        onPaid?.(showroom);
      } catch {
        // Diam -- coba lagi di tick berikutnya, jangan menutup panel karena
        // satu request gagal (mis. koneksi sempat putus).
      }
    }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function row(label, value) {
    const node = document.createElement("div");
    node.className = "flex items-center justify-between gap-3 text-xs";
    const caption = document.createElement("span");
    caption.className = "text-gray-500";
    caption.textContent = label;
    const content = document.createElement("span");
    content.className = "font-bold text-gray-900";
    content.textContent = value;
    node.append(caption, content);
    return node;
  }

  function copyableRow(label, value) {
    const node = document.createElement("div");
    node.id = "sub_midtrans_va_row";
    node.className = "flex items-center justify-between gap-3 text-xs";
    const caption = document.createElement("span");
    caption.className = "text-gray-500";
    caption.textContent = label;
    const valueGroup = document.createElement("span");
    valueGroup.className = "flex items-center gap-2";
    const content = document.createElement("span");
    content.className = "font-bold text-gray-900";
    content.textContent = value;
    const copyButton = document.createElement("button");
    copyButton.id = "sub_midtrans_va_copy_button";
    copyButton.type = "button";
    copyButton.className = "rounded-lg border border-[var(--pb-card-border)] bg-white px-2 py-1 text-[10px] font-bold text-[var(--pb-brand-secondary)] transition hover:brightness-95";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", () => copyToClipboard(value, copyButton));
    valueGroup.append(content, copyButton);
    node.append(caption, valueGroup);
    return node;
  }

  function copyToClipboard(value, button) {
    const restoreLabel = button.textContent;
    const onDone = (ok) => {
      button.textContent = ok ? "Tersalin" : "Gagal";
      window.setTimeout(() => {
        button.textContent = restoreLabel;
      }, 1500);
    };

    const fallbackCopy = () => {
      try {
        const helper = document.createElement("textarea");
        helper.value = String(value ?? "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.append(helper);
        helper.select();
        const ok = document.execCommand("copy");
        helper.remove();
        onDone(ok);
      } catch {
        onDone(false);
      }
    };

    if (navigator.clipboard?.writeText) {
      // Beberapa environment (mis. iframe dengan permission policy ketat) punya
      // navigator.clipboard.writeText tapi menolaknya -- jangan langsung
      // menyerah, coba execCommand sebagai jalan kedua.
      navigator.clipboard.writeText(String(value ?? "")).then(() => onDone(true)).catch(fallbackCopy);
      return;
    }

    fallbackCopy();
  }

  function formatDateTime(value) {
    const time = Date.parse(value);
    if (Number.isNaN(time)) {
      return value;
    }
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(time));
  }
}
