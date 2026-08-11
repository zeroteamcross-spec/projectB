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

  /**
   * Sidebar diciutkan jadi rail icon, atau melebar penuh dengan nama menu.
   *
   * Bawaannya melebar. Sebelumnya keadaan ini bernama sidebarCompactExpanded
   * dengan arti terbalik dan hanya berlaku di bawah xl -- di atas itu sidebar
   * dipaksa penuh lewat kelas `xl:`, sehingga tombolnya tidak berguna di layar
   * besar. Sekarang satu keadaan ini yang menentukan, di semua lebar mulai md.
   */
  setSidebarCollapsed(value) {
    appStore.patchState("ui.sidebarCollapsed", Boolean(value), "ui:sidebar-collapsed");
  },

  toggleSidebarCollapsed() {
    appStore.patchState(
      "ui.sidebarCollapsed",
      !Boolean(appStore.get("ui.sidebarCollapsed", false)),
      "ui:sidebar-collapse-toggle",
    );
  },
};
