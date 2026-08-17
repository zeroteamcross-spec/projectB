import { Button } from "../../../ui/primitives/button.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";

export function ManualTransferPanel({
  transaction,
  isSubmitting = false,
  error = "",
  onSubmit = null,
} = {}) {
  const manualTransfer = transaction?.manual_transfer ?? {};
  const bank = manualTransfer.bank ?? {};
  const section = document.createElement("section");
  section.id = "byrpay_manual_transfer_panel";
  section.className = `grid gap-4 ${tw.surface.raisedCard} p-5 sm:p-6`;

  const header = document.createElement("div");
  header.className = "grid gap-2";
  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Transfer Manual";
  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = "Transfer Booking Fee ke Rekening Showroom";
  header.append(eyebrow, title);
  section.append(header, bankDetailBlock(bank, transaction));

  if (manualTransfer.rejected_reason) {
    section.append(rejectionNotice(manualTransfer.rejected_reason));
  }

  if (manualTransfer.proof_path && !manualTransfer.rejected_reason) {
    section.append(waitingConfirmationNotice(manualTransfer));
  } else {
    section.append(uploadForm({ isSubmitting, error, onSubmit }));
  }

  return section;
}

function bankDetailBlock(bank, transaction) {
  const box = document.createElement("div");
  box.id = "byrpay_manual_transfer_bank_block";
  box.className = "grid gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--pb-brand-primary)_24%,white)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_8%,white)] px-4 py-3 text-xs";

  const nominal = document.createElement("p");
  nominal.className = "text-[10px] font-bold uppercase tracking-wide text-[var(--pb-brand-secondary)]";
  nominal.textContent = "Nominal transfer";
  const nominalValue = document.createElement("strong");
  nominalValue.className = "block text-xl font-black leading-tight text-[var(--pb-text)]";
  nominalValue.textContent = formatCurrency(Number(transaction?.dp_amount ?? 0));

  const rows = [
    ["Bank", bank.bank_type || "-"],
    ["Nomor rekening", bank.bank_account_number || "-"],
    ["Atas nama", bank.bank_account_name || bank.showroom_name || "-"],
  ];

  box.append(nominal, nominalValue);
  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "flex items-baseline justify-between gap-3 border-t border-[color-mix(in_srgb,var(--pb-brand-primary)_18%,white)] pt-2";
    const labelNode = document.createElement("span");
    labelNode.className = "text-gray-600";
    labelNode.textContent = label;
    const valueNode = document.createElement("span");
    valueNode.className = "break-all text-right font-bold text-gray-950";
    valueNode.textContent = value;
    row.append(labelNode, valueNode);
    box.append(row);
  });

  const hint = document.createElement("p");
  hint.className = "text-[10px] leading-5 text-gray-600";
  hint.textContent = "Transfer sesuai nominal persis, lalu unggah bukti transfernya di bawah ini.";
  box.append(hint);

  return box;
}

function rejectionNotice(reason) {
  const box = document.createElement("div");
  box.id = "byrpay_manual_transfer_rejected_notice";
  box.className = tw.alert.error;
  box.textContent = `Bukti transfer sebelumnya ditolak: ${reason}. Silakan unggah ulang bukti yang benar.`;
  return box;
}

function waitingConfirmationNotice(manualTransfer) {
  const box = document.createElement("div");
  box.id = "byrpay_manual_transfer_waiting_notice";
  box.className = `${tw.surface.inset} grid gap-2 text-xs leading-6 text-gray-600`;

  const title = document.createElement("p");
  title.className = "font-bold text-gray-950";
  title.textContent = "Bukti transfer sudah dikirim, menunggu konfirmasi showroom.";
  box.append(title);

  if (manualTransfer.note) {
    const note = document.createElement("p");
    note.textContent = `Catatan Anda: ${manualTransfer.note}`;
    box.append(note);
  }

  const info = document.createElement("p");
  info.textContent = "Status akan berubah otomatis begitu showroom mengonfirmasi pembayaran.";
  box.append(info);

  return box;
}

function uploadForm({ isSubmitting, error, onSubmit }) {
  const form = document.createElement("form");
  form.id = "byrpay_manual_transfer_upload_form";
  form.className = "grid gap-3";

  const fileLabel = document.createElement("label");
  fileLabel.className = "grid gap-1 text-xs font-bold text-gray-800";
  fileLabel.textContent = "Bukti transfer (jpg, png, atau pdf, maks 5 MB)";

  const fileInput = document.createElement("input");
  fileInput.id = "byrpay_manual_transfer_proof_input";
  fileInput.type = "file";
  fileInput.name = "proof";
  fileInput.accept = "image/jpeg,image/png,image/webp,application/pdf";
  fileInput.required = true;
  fileInput.className = "rounded-xl border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs";
  fileLabel.append(fileInput);

  const noteLabel = document.createElement("label");
  noteLabel.className = "grid gap-1 text-xs font-bold text-gray-800";
  noteLabel.textContent = "Catatan (opsional)";
  const noteInput = document.createElement("textarea");
  noteInput.id = "byrpay_manual_transfer_note_input";
  noteInput.name = "note";
  noteInput.rows = 2;
  noteInput.placeholder = "Contoh: transfer dari BCA a.n. Budi";
  noteInput.className = "rounded-xl border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs";
  noteLabel.append(noteInput);

  form.append(fileLabel, noteLabel);

  if (error) {
    const message = document.createElement("p");
    message.id = "byrpay_manual_transfer_upload_error";
    message.className = tw.alert.error;
    message.textContent = error;
    form.append(message);
  }

  const submit = Button({
    label: isSubmitting ? "Mengunggah..." : "Unggah Bukti Transfer",
    variant: "primary",
    disabled: isSubmitting,
  });
  submit.id = "byrpay_manual_transfer_submit_button";
  submit.type = "submit";
  submit.classList.add("w-full");
  form.append(submit);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const file = fileInput.files?.[0] ?? null;
    if (!file) {
      return;
    }
    onSubmit?.(file, noteInput.value.trim());
  });

  return form;
}
