import { appStore } from "../../../state/store.js";

const BASE = "runtime.transactionEntry";

const DEFAULT_FORM = {
  payment_type: "dp",
  dp_amount: "",
  payment_method: "bca_va",
};

export const transactionEntryState = {
  get() {
    return appStore.get(BASE, {});
  },

  form() {
    return appStore.get(`${BASE}.form`, { ...DEFAULT_FORM });
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
