import { createPageLifecycle } from "../../../core/lifecycle.js";
import { showroomsResource } from "../../../resources/showroomsResource.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { adminMasterService } from "../../admin/services/adminMasterService.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { sellerState } from "../state/sellerState.js";
import { SellerShowroomForm } from "../components/sellerShowroomForm.js";
import { SellerShowroomView } from "../components/sellerShowroomView.js";
import { ModalHeaderFormActions } from "../../../ui/composites/modalHeaderFormActions.js";

const FORM_ID = "slrsr_form_section";

const RUNTIME_KEY = "sellerShowroom";
const EDIT_MODAL_KEY = "seller-showroom-edit-modal";
const DEFAULT_RUNTIME = {
  editing: false,
  saving: false,
  uploading: false,
  error: "",
  iconUrlDraft: null,
};

export function SellerShowroomPage() {
  let root = null;
  let unsubscribe = null;

  return createPageLifecycle({
    mount({ router }) {
      ensureRuntime();
      root = document.createElement("div");
      render(root, router);
      return root;
    },
    hydrate({ router }) {
      render(root, router);
    },
    bindEvents({ router }) {
      unsubscribe = appStore.subscribe(() => render(root, router));
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
      appStore.destroyRuntimeState(RUNTIME_KEY);
    },
  });
}

function render(root, router) {
  if (!root) {
    return;
  }

  const snapshotShowroom = sellerState.snapshot("showroom", null);
  const showroom = sellerState.working("sellerShowroom", "showroom", snapshotShowroom);
  const snapshotBankMaster = sellerState.snapshot("masterBank", adminMasterService.normalizeBankMaster(null));
  const bankMaster = sellerState.working("sellerShowroom", "masterBank", snapshotBankMaster);
  const bankOptions = adminMasterService.normalizeBankMaster(bankMaster).data.banks;
  const snapshotLocationMaster = sellerState.snapshot("masterLocation", adminMasterService.normalizeLocationMaster(null));
  const workingLocationMaster = sellerState.working("sellerShowroom", "masterLocation", snapshotLocationMaster);
  const locationMaster = adminMasterService.normalizeLocationMaster(workingLocationMaster ?? snapshotLocationMaster);
  const cityOptions = locationMaster?.data?.cities ?? [];
  const runtime = runtimeState();

  const body = applyDesignHook(SellerShowroomView({
    showroom,
    onEdit: () => setRuntime({ editing: true, error: "" }),
  }), "seller.showroom.view");

  if (runtime.editing) {
    openShowroomEditModal({ showroom, bankOptions, cityOptions, runtime, router });
  } else {
    closeShowroomEditModal();
  }

  const layout = document.createElement("section");
  layout.id = "slrsr_page_section";
  layout.className = "grid min-w-0 gap-6";
  layout.dataset.ds = "seller.showroom.page";
  layout.append(showroomHero({ router, showroom, editing: false }), body);

  root.replaceChildren(layout);
}

function openShowroomEditModal({ showroom, bankOptions, cityOptions, runtime, router }) {
  const modalBody = document.createElement("section");
  modalBody.id = "slrsr_edit_modal_content_section";
  modalBody.className = "grid min-w-0 gap-4";
  modalBody.dataset.ds = "seller.showroom.editModal";
  const showroomDraft = runtime.iconUrlDraft !== null
    ? { ...(showroom ?? {}), icon_url: runtime.iconUrlDraft }
    : showroom;

  modalBody.append(applyDesignHook(SellerShowroomForm({
    showroom: showroomDraft,
    saving: runtime.saving,
    error: runtime.error,
    bankOptions,
    cityOptions,
    uploading: runtime.uploading,
    onUploadIcon: (file) => uploadBrandingIcon(file),
    onSubmit: (payload) => saveShowroom(payload, router),
  }), "seller.showroom.form"));

  openModal(modalBody, {
    key: EDIT_MODAL_KEY,
    title: showroom ? "Edit showroom" : "Buat showroom",
    description: "Perbarui profil, kontak, dan rekening pembayaran showroom.",
    size: "xl",
    footer: null,
    closeLabel: "Tutup",
    panelId: "slrsr_edit_modal_section",
    bodyId: "slrsr_edit_modal_body_section",
    headerId: "slrsr_edit_modal_header_section",
    // Batal/Simpan showroom replace the corner close button, since the form
    // (profil + kontak + rekening) is long enough to need scrolling.
    headerActions: () => ModalHeaderFormActions({
      formId: FORM_ID,
      idPrefix: "slrsr_edit_modal",
      submitLabel: "Simpan showroom",
      saving: runtime.saving,
      onCancel: () => closeModal(),
    }),
    onClose: () => setRuntime({ editing: false, error: "", iconUrlDraft: null }),
    preserveContentOnSameSignature: true,
    contentSignature: showroomModalSignature({ showroom, runtime }),
  });
}

function closeShowroomEditModal() {
  const modal = appStore.get("ui.modal", null);
  if (modal?.key === EDIT_MODAL_KEY) {
    closeModal({ notify: false });
  }
}

function showroomModalSignature({ showroom, runtime }) {
  return [
    showroom?.id ?? "new",
    runtime.saving ? "saving" : "idle",
    runtime.uploading ? "uploading" : "idle",
    runtime.iconUrlDraft ?? "",
    runtime.error ?? "",
  ].join("|");
}

async function uploadBrandingIcon(file) {
  setRuntime({ uploading: true, error: "" });
  try {
    const asset = await showroomsResource.uploadBrandingIcon(file);
    const path = asset?.path ?? asset?.url ?? "";
    if (!path) throw new Error("Upload icon tidak mengembalikan path.");
    setRuntime({ uploading: false, iconUrlDraft: path });
    showToast("Icon showroom berhasil diupload.", { type: "success" });
  } catch (error) {
    const message = error?.message ?? "Gagal upload icon showroom.";
    setRuntime({ uploading: false });
    showToast(message, { type: "error" });
  }
}

async function saveShowroom(payload) {
  const isCreate = !sellerState.working("sellerShowroom", "showroom", sellerState.snapshot("showroom", null));
  setRuntime({ saving: true, error: "" });

  try {
    const showroom = await showroomsResource.updateMine(payload);
    appStore.patchState("working.sellerShowroom.showroom", {
      data: showroom,
      hydratedAt: Date.now(),
    }, "seller:showroom-saved");
    appStore.patchState("snapshot.seller.showroom", {
      data: showroom,
      fetchedAt: Date.now(),
      ttl: 120,
      version: "seller-showroom-v1",
      stale: false,
    }, "seller:showroom-snapshot");
    setRuntime({ editing: false, saving: false, error: "", iconUrlDraft: null });
    closeModal({ notify: false });
    showToast(isCreate ? "Showroom berhasil dibuat." : "Showroom berhasil diperbarui.", { type: "success" });
  } catch (error) {
    const message = error?.message ?? (isCreate ? "Showroom gagal dibuat." : "Showroom gagal diperbarui.");
    setRuntime({
      saving: false,
      error: message,
    });
    showToast(message, { type: "error" });
  }
}

function ensureRuntime() {
  if (!appStore.get(`runtime.${RUNTIME_KEY}`, null)) {
    appStore.patchState(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME, "seller:showroom-runtime-init");
  }
}

function runtimeState() {
  return appStore.get(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME) ?? DEFAULT_RUNTIME;
}

function setRuntime(patch = {}) {
  appStore.patchState(`runtime.${RUNTIME_KEY}`, {
    ...runtimeState(),
    ...patch,
  }, "seller:showroom-runtime");
}

function showroomHero({ router, showroom, editing }) {
  const section = document.createElement("section");
  section.id = "slrsr_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,244,237,0.84),rgba(234,244,249,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-shadow duration-150 sm:p-6 lg:p-7";
  section.dataset.ds = "seller.showroom.hero";

  const layout = document.createElement("div");
  layout.className = "grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-3";

  const icon = document.createElement("div");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_16px_40px_rgba(30,129,176,0.22)]";
  icon.append(createIcon("showroom", { className: "h-5 w-5" }));

  copy.append(
    icon,
    textNode("p", "text-[10px] font-black uppercase tracking-[0.18em] text-[var(--pb-brand-secondary)]", "Seller showroom profile"),
    textNode("h1", "max-w-3xl text-2xl font-black leading-tight tracking-normal text-gray-950 sm:text-3xl", showroom?.name || "Showroom Saya"),
    textNode("p", "max-w-2xl text-xs leading-6 text-gray-600", "Kelola identitas showroom, kontak aktif, dan rekening pencairan seller dalam satu tempat.")
  );

  const dashboardButton = Button({
    label: "Dashboard",
    variant: "secondary",
    onClick: () => router?.navigate("/seller"),
    designHook: "shared.button.secondary",
  });
  dashboardButton.id = "slrsr_dashboard_button";
  dashboardButton.prepend(createIcon("dashboard", { className: "h-4 w-4" }));

  const side = document.createElement("section");
  side.id = "slrsr_hero_actions_section";
  side.className = "grid gap-3";
  const status = document.createElement("section");
  status.id = "slrsr_mode_status_section";
  status.className = "rounded-[1.25rem] border border-[var(--pb-card-border)] bg-white/78 px-4 py-3 text-xs font-bold text-gray-700 shadow-sm";
  status.append(createIcon(editing ? "edit" : "eye", { className: "mr-2 h-4 w-4 text-[var(--pb-brand-secondary)]" }), document.createTextNode(editing ? "Mode edit showroom" : "Mode lihat showroom"));
  side.append(status, dashboardButton);

  layout.append(copy, side);
  section.append(layout);
  return section;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
