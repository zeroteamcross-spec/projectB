const CONTROL_CLASS = "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-sm text-[var(--pb-text)] outline-none focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";

export function localPaidAtValue(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function offlineField({ label, name, value = "", type = "text", required = false, autocomplete = "", placeholder = "", minLength = null, maxLength = null }) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1.5 text-xs font-bold text-gray-700";

  const caption = document.createElement("span");
  caption.textContent = label;
  const input = document.createElement("input");
  input.name = name;
  input.type = type;
  input.value = String(value ?? "");
  input.required = required;
  input.autocomplete = autocomplete;
  input.placeholder = placeholder;
  if (Number.isInteger(minLength) && minLength > 0) {
    input.minLength = minLength;
  }
  if (Number.isInteger(maxLength) && maxLength > 0) {
    input.maxLength = maxLength;
  }
  input.className = CONTROL_CLASS;
  if (type === "number") {
    input.min = "1";
    input.step = "1";
    input.inputMode = "numeric";
  }
  if (type === "datetime-local") {
    input.step = "60";
  }
  wrap.append(caption, input);
  return wrap;
}

export function offlineNoteField(value = "") {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1.5 text-xs font-bold text-gray-700";
  const caption = document.createElement("span");
  caption.textContent = "Catatan (opsional)";
  const input = document.createElement("textarea");
  input.name = "note";
  input.value = value;
  input.rows = 3;
  input.className = CONTROL_CLASS;
  wrap.append(caption, input);
  return wrap;
}

export function readOfflineBookingFields(form, car = {}) {
  const values = asFormData(form);
  const carId = Number(car?.id);
  const buyerName = String(values.get("buyer_name") ?? "").trim();
  const buyerUsername = String(values.get("buyer_username") ?? "").trim();
  const buyerPassword = String(values.get("buyer_password") ?? "");
  const phone = String(values.get("buyer_phone_number") ?? "").trim();
  const email = String(values.get("buyer_email") ?? "").trim();

  if (!Number.isSafeInteger(carId) || carId <= 0) {
    throw new Error("Listing mobil tidak valid. Muat ulang halaman lalu coba lagi.");
  }
  if (!buyerName || buyerName.length > 200) {
    throw new Error("Isi nama buyer (maksimal 200 karakter).");
  }
  if (buyerUsername.length < 3 || buyerUsername.length > 50) {
    throw new Error("Username buyer harus berisi 3–50 karakter.");
  }
  if (buyerPassword.length < 8 || buyerPassword.length > 72) {
    throw new Error("Password buyer harus berisi 8–72 karakter.");
  }
  if (!phone && !email) {
    throw new Error("Isi nomor telepon atau email buyer sebagai kontak.");
  }
  if (phone.length > 25 || email.length > 100) {
    throw new Error("Periksa panjang nomor telepon atau email buyer.");
  }

  return {
    car_id: carId,
    buyer_name: buyerName,
    ...(phone ? { buyer_phone_number: phone } : {}),
    ...(email ? { buyer_email: email } : {}),
    buyer_username: buyerUsername,
    buyer_password: buyerPassword,
    ...readOfflinePaymentFields(values, car?.dp_amount),
  };
}

export function readOfflinePaymentFields(form, expectedAmount) {
  const values = asFormData(form);
  const expected = Number(expectedAmount);
  const amount = Number(values.get("payment_amount"));
  if (!Number.isSafeInteger(expected) || expected <= 0) {
    throw new Error("Booking Fee mobil belum valid. Perbarui listing sebelum mencatat pembayaran.");
  }
  if (!Number.isSafeInteger(amount) || amount !== expected) {
    throw new Error("Nominal pembayaran harus sama persis dengan Booking Fee.");
  }

  const paidAt = String(values.get("paid_at") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(paidAt)) {
    throw new Error("Isi tanggal dan waktu pembayaran.");
  }

  const note = String(values.get("note") ?? "").trim();
  return {
    payment_amount: amount,
    paid_at: paidAt,
    ...(note ? { note } : {}),
  };
}

function asFormData(formOrValues) {
  return typeof FormData !== "undefined" && formOrValues instanceof FormData
    ? formOrValues
    : new FormData(formOrValues);
}
