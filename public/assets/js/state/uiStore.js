import { appStore } from "./store.js";

export const uiStore = {
  setLoading(value) {
    appStore.patchState("ui.loading", Boolean(value), "ui:loading");
  },

  openModal(modal) {
    appStore.patchState("ui.modal", modal, "ui:modal-open");
  },

  closeModal() {
    appStore.patchState("ui.modal", null, "ui:modal-close");
  },

  pushToast(toast) {
    const toasts = appStore.get("ui.toasts", []);
    appStore.patchState("ui.toasts", [...toasts, toast], "ui:toast-add");
  },

  removeToast(id) {
    const toasts = appStore.get("ui.toasts", []);
    appStore.patchState("ui.toasts", toasts.filter((toast) => toast.id !== id), "ui:toast-remove");
  },

  openSidebar() {
    appStore.patchState("ui.sidebarOpen", true, "ui:sidebar-open");
  },

  closeSidebar() {
    appStore.patchState("ui.sidebarOpen", false, "ui:sidebar-close");
  },

  toggleSidebar() {
    appStore.patchState("ui.sidebarOpen", !Boolean(appStore.get("ui.sidebarOpen", false)), "ui:sidebar-toggle");
  },

  setSidebarCompactExpanded(value) {
    appStore.patchState("ui.sidebarCompactExpanded", Boolean(value), "ui:sidebar-compact-expanded");
  },

  toggleSidebarCompactExpanded() {
    appStore.patchState(
      "ui.sidebarCompactExpanded",
      !Boolean(appStore.get("ui.sidebarCompactExpanded", false)),
      "ui:sidebar-compact-toggle",
    );
  },
};
