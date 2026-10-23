import { appStore } from "../../../state/store.js";

const BASE = "runtime.transactionEntry";

const DEFAULT_FORM = {
  payment_type: "dp",
  dp_amount: "",
  // Transfer manual adalah pilihan awal pada mode "both"; setPaymentMode
  // menggantinya ke BCA Virtual Account jika Master Pembayaran hanya otomatis.
  payment_method: "manual_transfer",
};

export const transactionEntryState = {
  get() {
    return appStore.get(BASE, {});
  },

  form() {
    return appStore.get(`${BASE}.form`, { ...DEFAULT_FORM });
  },

  paymentMode() {
    return appStore.get(`${BASE}.payment_mode`, "both");
  },

  ensureForm() {
    if (!appStore.get(`${BASE}.form`, null)) {
      appStore.patchState(`${BASE}.form`, { ...DEFAULT_FORM }, "transaction-entry:form-init");
    }
  },

  patchForm(values = {}) {
    appStore.patchState(`${BASE}.form`, {
      ...this.form(),
      ...values,
    }, "transaction-entry:form-patch");
  },

  setPaymentMode(value) {
    const rawMode = String(value ?? "both").trim().toLowerCase();
    const mode = ["manual", "midtrans", "both"].includes(rawMode) ? rawMode : "both";
    const currentMethod = this.form().payment_method;
    const nextMethod = mode === "manual"
      ? "manual_transfer"
      : mode === "midtrans" && currentMethod === "manual_transfer"
      ? "bca_va"
      : currentMethod;

    appStore.patchState(`${BASE}.payment_mode`, mode, "transaction-entry:payment-mode");
    if (nextMethod !== currentMethod) {
      this.patchForm({ payment_method: nextMethod });
    }
  },

  setSubmitting(value) {
    appStore.patchState(`${BASE}.isSubmitting`, Boolean(value), "transaction-entry:submitting");
  },

  setMode(mode) {
    appStore.patchState(`${BASE}.authMode`, mode, "transaction-entry:auth-mode");
  },

  setResult(transaction) {
    appStore.patchState(`${BASE}.result`, transaction, "transaction-entry:result");
  },

  setError(message) {
    appStore.patchState(`${BASE}.error`, message, "transaction-entry:error");
  },

  reset() {
    appStore.destroyRuntimeState("transactionEntry");
  },
};
