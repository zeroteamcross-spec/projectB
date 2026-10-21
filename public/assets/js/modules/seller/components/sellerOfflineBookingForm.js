import { Button } from "../../../ui/primitives/button.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import {
  localPaidAtValue,
  offlineField,
  offlineNoteField,
  readOfflineBookingFields,
} from "./sellerOfflinePaymentFields.js";

export function SellerOfflineBookingForm({ car, onSubmit, onCancel } = {}) {
  const form = document.createElement("form");
  form.id = "slrc_offline_booking_form";
  form.className = "grid min-w-0 gap-4";

  const intro = document.createElement("p");
  intro.className = "rounded-[1rem] bg-[var(--pb-surface-muted)] px-4 py-3 text-xs leading-6 text-gray-700";
  intro.textContent = `${[car?.brand_name, car?.model_name, car?.sub_model_name].filter(Boolean).join(" ") || `Mobil #${car?.id}`} — Booking Fee ${formatCurrency(car?.dp_amount ?? 0)}. Nominal yang dicatat harus sama persis.`;

  const buyerFields = document.createElement("section");
  buyerFields.className = "grid gap-3 sm:grid-cols-2";
  buyerFields.append(
    offlineField({ label: "Nama buyer", name: "buyer_name", required: true, autocomplete: "name", maxLength: 200 }),
    offlineField({ label: "Nomor telepon buyer", name: "buyer_phone_number", type: "tel", autocomplete: "tel", maxLength: 25 }),
    offlineField({ label: "Email buyer", name: "buyer_email", type: "email", autocomplete: "email", maxLength: 100 }),
    offlineField({ label: "Username buyer", name: "buyer_username", required: true, autocomplete: "off", minLength: 3, maxLength: 50 }),
    offlineField({ label: "Password buyer", name: "buyer_password", type: "password", required: true, autocomplete: "new-password", minLength: 8, maxLength: 72 }),
  );
  const contactHint = document.createElement("p");
  contactHint.className = "text-xs leading-5 text-gray-600 sm:col-span-2";
  contactHint.textContent = "Isi setidaknya satu kontak: nomor telepon atau email.";
  buyerFields.append(contactHint);

  const paymentFields = document.createElement("section");
  paymentFields.className = "grid gap-3 sm:grid-cols-2";
  paymentFields.append(
    offlineField({ label: "Nominal diterima (Booking Fee)", name: "payment_amount", type: "number", value: car?.dp_amount ?? "", required: true }),
    offlineField({ label: "Tanggal dan waktu pembayaran", name: "paid_at", type: "datetime-local", value: localPaidAtValue(), required: true }),
  );

  const error = document.createElement("p");
  error.id = "slrc_offline_booking_error";
  error.className = "text-xs font-semibold text-[var(--pb-danger)]";
  error.setAttribute("role", "alert");
  error.hidden = true;

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap justify-end gap-2";
  const cancel = Button({ label: "Batal", variant: "secondary", onClick: onCancel });
  const submit = Button({ label: "Catat booking offline", variant: "primary" });
  submit.type = "submit";
  submit.id = "slrc_offline_booking_submit_button";
  actions.append(cancel, submit);

  form.append(intro, buyerFields, paymentFields, offlineNoteField(), error, actions);
  let saving = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving || !form.reportValidity()) {
      return;
    }

    try {
      const payload = readOfflineBookingFields(form, car);
      error.hidden = true;
      saving = true;
      submit.disabled = true;
      cancel.disabled = true;
      submit.textContent = "Mencatat...";
      await onSubmit?.(payload);
    } catch (failure) {
      error.textContent = failure?.message || "Booking offline gagal dicatat.";
      error.hidden = false;
      showToast(error.textContent, { type: "error" });
    } finally {
      saving = false;
      submit.disabled = false;
      cancel.disabled = false;
      submit.textContent = "Catat booking offline";
    }
  });

  return form;
}
