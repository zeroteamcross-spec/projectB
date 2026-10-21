import { Card } from "../../../ui/composites/card.js";
import { Button } from "../../../ui/primitives/button.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { sellerTransactionService } from "../services/sellerTransactionService.js";
import { offlineField, offlineNoteField, readOfflinePaymentFields } from "./sellerOfflinePaymentFields.js";

export function SellerOfflinePaymentForm({
  transaction,
  open = false,
  draft = {},
  saving = false,
  error = "",
  onOpen,
  onClose,
  onChange,
  onSubmit,
} = {}) {
  if (!sellerTransactionService.canRecordOfflinePayment(transaction)) {
    return document.createDocumentFragment();
  }

  const card = Card();
  card.id = "slrtx_offline_payment_card";
  card.classList.add("grid", "gap-3");
  const title = document.createElement("h2");
  title.className = "text-base font-bold text-gray-950";
  title.textContent = "Pembayaran di luar aplikasi";
  const description = document.createElement("p");
  description.className = "text-xs leading-6 text-gray-600";
  description.textContent = `Catat Booking Fee ${formatCurrency(transaction.dp_amount ?? 0)} yang sudah diterima showroom. Jika ada sesi pembayaran online aktif, sistem akan menutupnya sebelum mencatat pembayaran.`;
  card.append(title, description);

  if (!open) {
    const action = Button({ label: "Catat pembayaran offline", variant: "primary", onClick: onOpen });
    action.id = "slrtx_open_offline_payment_button";
    action.classList.add("w-full", "sm:w-fit");
    card.append(action);
    return card;
  }

  const form = document.createElement("form");
  form.id = "slrtx_offline_payment_form";
  form.className = "grid gap-3";
  const fields = document.createElement("div");
  fields.className = "grid gap-3 sm:grid-cols-2";
  fields.append(
    offlineField({ label: "Nominal diterima (Booking Fee)", name: "payment_amount", type: "number", value: draft.payment_amount ?? transaction.dp_amount ?? "", required: true }),
    offlineField({ label: "Tanggal dan waktu pembayaran", name: "paid_at", type: "datetime-local", value: draft.paid_at ?? "", required: true }),
  );
  const note = offlineNoteField(draft.note ?? "");
  form.append(fields, note);
  form.addEventListener("input", (event) => {
    const field = event.target;
    if (field?.name) {
      onChange?.({ [field.name]: field.value });
    }
  });

  const errorNode = document.createElement("p");
  errorNode.id = "slrtx_offline_payment_error";
  errorNode.className = "text-xs font-semibold text-[var(--pb-danger)]";
  errorNode.setAttribute("role", "alert");
  errorNode.textContent = error;
  errorNode.hidden = !error;

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap justify-end gap-2";
  const cancel = Button({ label: "Batal", variant: "secondary", disabled: saving, onClick: onClose });
  const submit = Button({ label: saving ? "Mencatat..." : "Simpan pembayaran offline", variant: "primary", disabled: saving });
  submit.type = "submit";
  submit.id = "slrtx_offline_payment_submit_button";
  actions.append(cancel, submit);
  form.append(errorNode, actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (saving || !form.reportValidity()) {
      return;
    }
    try {
      errorNode.hidden = true;
      onSubmit?.(readOfflinePaymentFields(form, transaction.dp_amount));
    } catch (failure) {
      errorNode.textContent = failure?.message || "Periksa nominal dan tanggal pembayaran.";
      errorNode.hidden = false;
    }
  });
  card.append(form);
  return card;
}
