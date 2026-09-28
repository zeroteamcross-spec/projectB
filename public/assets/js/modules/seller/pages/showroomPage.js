import { createPageLifecycle } from "../../../core/lifecycle.js";
import { showroomsResource } from "../../../resources/showroomsResource.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { Input } from "../../../ui/primitives/input.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { Card } from "../../../ui/composites/card.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { adminMasterService } from "../../admin/services/adminMasterService.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { sellerState } from "../state/sellerState.js";
import { SellerShowroomForm } from "../components/sellerShowroomForm.js";
import { SellerShowroomView } from "../components/sellerShowroomView.js";
import { SellerBranchSwitcher } from "../components/sellerBranchSwitcher.js";
import { ModalHeaderFormActions } from "../../../ui/composites/modalHeaderFormActions.js";

const FORM_ID = "slrsr_form_section";

const RUNTIME_KEY = "sellerShowroom";
const EDIT_MODAL_KEY = "seller-showroom-edit-modal";
const DEFAULT_RUNTIME = {
  editing: false,
  saving: false,
  uploadingIcon: false,
  uploadingLogo: false,
  error: "",
  iconUrlDraft: null,
  headerLogoUrlDraft: null,
  savingDomain: false,
  checkingDns: false,
  domainError: "",
};

const CUSTOM_DOMAIN_STATUS_LABEL = {
  pending_dns: "Menunggu DNS",
  verified: "DNS Terverifikasi, menunggu admin",
  active: "Aktif",
};

const CUSTOM_DOMAIN_STATUS_VARIANT = {
  pending_dns: "warning",
  verified: "info",
  active: "success",
};

// Draft ketikan domain SENGAJA di luar appStore (bukan runtime state) --
// appStore.subscribe() me-render ulang seluruh halaman (replaceChildren)
// pada perubahan apa pun, yang akan menghapus fokus & isi field di tengah
// mengetik kalau nilainya lewat store. Pola sama dipakai affiliateFormDraft
// di affiliatesModalPage.js.
let customDomainDraft = "";

export function SellerShowroomPage() {
  let root = null;
  let unsubscribe = null;
  let branchSwitcherWidget = null;

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
      branchSwitcherWidget?.dispose?.();
      branchSwitcherWidget = null;
      appStore.destroyRuntimeState(RUNTIME_KEY);
    },
  });

  function render(rootEl, router) {
    if (!rootEl) {
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

    // Dibuat sekali saja (bukan tiap render) -- widget ini punya state
    // (fetch mineList()) sendiri, membuatnya ulang tiap kali appStore
    // berubah akan mengulang fetch dan membuatnya berkedip kosong lagi.
    branchSwitcherWidget ??= SellerBranchSwitcher();

    const layout = document.createElement("section");
    layout.id = "slrsr_page_section";
    layout.className = "grid min-w-0 gap-6";
    layout.dataset.ds = "seller.showroom.page";
    layout.append(showroomHero({ router, showroom, editing: false }), branchSwitcherWidget.element, body);

    if (showroom?.id) {
      layout.append(applyDesignHook(customDomainCard(showroom, runtime), "seller.showroom.customDomain"));
    }

    rootEl.replaceChildren(layout);
  }
}

function openShowroomEditModal({ showroom, bankOptions, cityOptions, runtime, router }) {
  const modalBody = document.createElement("section");
  modalBody.id = "slrsr_edit_modal_content_section";
  modalBody.className = "grid min-w-0 gap-4";
  modalBody.dataset.ds = "seller.showroom.editModal";
  const showroomDraft = (runtime.iconUrlDraft !== null || runtime.headerLogoUrlDraft !== null)
    ? {
      ...(showroom ?? {}),
      ...(runtime.iconUrlDraft !== null ? { icon_url: runtime.iconUrlDraft } : {}),
      ...(runtime.headerLogoUrlDraft !== null ? { header_logo_url: runtime.headerLogoUrlDraft } : {}),
    }
    : showroom;

  modalBody.append(applyDesignHook(SellerShowroomForm({
    showroom: showroomDraft,
    saving: runtime.saving,
    error: runtime.error,
    bankOptions,
    cityOptions,
    uploadingIcon: runtime.uploadingIcon,
    uploadingLogo: runtime.uploadingLogo,
    onUploadIcon: (file) => uploadBrandingIcon(file, showroom?.id ?? null),
    onUploadLogo: (file) => uploadBrandingLogo(file, showroom?.id ?? null),
    onSubmit: (payload) => saveShowroom(payload, router),
  }), "seller.showroom.form"));

  openModal(modalBody, {
    key: EDIT_MODAL_KEY,
    title: showroom ? "Edit showroom" : "Buat showroom",
    size: "xl",
    closeLabel: "Tutup",
    panelId: "slrsr_edit_modal_section",
    bodyId: "slrsr_edit_modal_body_section",
    headerId: "slrsr_edit_modal_header_section",
    // Batal/Simpan showroom live in the footer, so the default close (X)
    // button stays in the header.
    footerNode: () => ModalHeaderFormActions({
      formId: FORM_ID,
      idPrefix: "slrsr_edit_modal",
      submitLabel: "Simpan showroom",
      saving: runtime.saving,
      onCancel: () => closeModal(),
    }),
    onClose: () => setRuntime({ editing: false, error: "", iconUrlDraft: null, headerLogoUrlDraft: null }),
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
    runtime.uploadingIcon ? "uploading-icon" : "idle",
    runtime.uploadingLogo ? "uploading-logo" : "idle",
    runtime.iconUrlDraft ?? "",
    runtime.headerLogoUrlDraft ?? "",
    runtime.error ?? "",
  ].join("|");
}

async function uploadBrandingIcon(file, showroomId = null) {
  setRuntime({ uploadingIcon: true, error: "" });
  try {
    const asset = showroomId
      ? await showroomsResource.uploadBrandingIconFor(showroomId, file)
      : await showroomsResource.uploadBrandingIcon(file);
    const path = asset?.path ?? asset?.url ?? "";
    if (!path) throw new Error("Upload icon tidak mengembalikan path.");
    setRuntime({ uploadingIcon: false, iconUrlDraft: path });
    showToast("Icon showroom berhasil diupload.", { type: "success" });
  } catch (error) {
    const message = error?.message ?? "Gagal upload icon showroom.";
    setRuntime({ uploadingIcon: false });
    showToast(message, { type: "error" });
  }
}

async function uploadBrandingLogo(file, showroomId = null) {
  setRuntime({ uploadingLogo: true, error: "" });
  try {
    const asset = showroomId
      ? await showroomsResource.uploadBrandingLogoFor(showroomId, file)
      : await showroomsResource.uploadBrandingLogo(file);
    const path = asset?.path ?? asset?.url ?? "";
    if (!path) throw new Error("Upload logo tidak mengembalikan path.");
    setRuntime({ uploadingLogo: false, headerLogoUrlDraft: path });
    showToast("Logo header showroom berhasil diupload.", { type: "success" });
  } catch (error) {
    const message = error?.message ?? "Gagal upload logo header showroom.";
    setRuntime({ uploadingLogo: false });
    showToast(message, { type: "error" });
  }
}

async function saveShowroom(payload) {
  const existing = sellerState.working("sellerShowroom", "showroom", sellerState.snapshot("showroom", null));
  const isCreate = !existing;
  setRuntime({ saving: true, error: "" });

  try {
    // Cabang yang sudah ada (existing.id) selalu lewat updateBranch() dengan
    // id eksplisit -- mengedit showroom TIDAK BOLEH diam-diam menyasar
    // cabang lain kalau seller sempat pindah cabang aktif di tab lain.
    // Pembuatan showroom PERTAMA (belum ada existing sama sekali) tetap
    // lewat updateMine() (jalur create lama, tidak berubah).
    const showroom = existing?.id
      ? await showroomsResource.updateBranch(existing.id, payload)
      : await showroomsResource.updateMine(payload);
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
    setRuntime({ editing: false, saving: false, error: "", iconUrlDraft: null, headerLogoUrlDraft: null });
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

/**
 * Backlog #7: showroom mendaftarkan domain sendiri. URL di domain custom
 * tetap menyertakan slug (mis. www.tokomobiljaya.com/toko-mobil-jaya/...),
 * jadi kartu ini murni pendaftaran + status -- tidak ada perubahan navigasi
 * apa pun di SPA. Siklusnya: pending_dns (baru daftar) -> verified (DNS
 * sudah dicek otomatis, benar mengarah ke server) -> active (ADMIN sudah
 * menyiapkan nginx/SSL manual dan menekan Aktifkan).
 */
function customDomainCard(showroom, runtime) {
  const card = Card();
  card.id = "slrsr_custom_domain_card";
  card.classList.add("grid", "min-w-0", "gap-4");

  const header = document.createElement("div");
  header.className = "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between";
  const heading = document.createElement("div");
  heading.className = "grid gap-1";
  heading.append(
    textNode("p", "text-sm font-black text-gray-950", "Domain Custom"),
    textNode(
      "p",
      "text-xs text-gray-600",
      "Pakai domain Anda sendiri untuk membuka showroom ini, alih-alih hanya lewat carlynk.id."
    ),
  );
  header.append(heading);

  const status = showroom.custom_domain_status;
  if (status) {
    header.append(Badge({ label: CUSTOM_DOMAIN_STATUS_LABEL[status] ?? status, variant: CUSTOM_DOMAIN_STATUS_VARIANT[status] ?? "default" }));
  }
  card.append(header);

  if (runtime.domainError) {
    const errorNode = document.createElement("div");
    errorNode.className = "rounded-xl bg-[color-mix(in_srgb,var(--pb-danger)_10%,transparent)] px-3 py-2 text-xs font-semibold text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    errorNode.textContent = runtime.domainError;
    card.append(errorNode);
  }

  if (!showroom.custom_domain) {
    const form = document.createElement("form");
    form.className = "grid gap-3 sm:flex sm:items-end sm:gap-3";
    const field = Input({
      id: "slrsr_custom_domain_input",
      name: "domain",
      label: "Domain Anda",
      value: customDomainDraft,
      placeholder: "www.tokomobiljaya.com",
    });
    field.classList.add("sm:flex-1");
    form.append(field);

    const submit = Button({
      id: "slrsr_custom_domain_submit_button",
      label: runtime.savingDomain ? "Menyimpan..." : "Daftarkan Domain",
      disabled: runtime.savingDomain,
      onClick: () => form.requestSubmit(),
    });
    submit.type = "submit";
    form.append(submit);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const domain = String(new FormData(form).get("domain") ?? "").trim();
      saveCustomDomain(showroom.id, domain);
    });
    // Disimpan ke variabel modul (customDomainDraft), BUKAN setRuntime() --
    // menulis ke appStore di sini akan memicu render ulang seluruh halaman
    // pada tiap ketikan dan menghapus fokus/isi field itu sendiri.
    form.addEventListener("input", () => {
      customDomainDraft = String(new FormData(form).get("domain") ?? "");
    });

    card.append(form);

    return card;
  }

  const info = document.createElement("div");
  info.className = "grid gap-1";
  info.append(textNode("p", "text-sm font-semibold text-gray-900", showroom.custom_domain));

  if (status === "pending_dns") {
    info.append(textNode(
      "p",
      "text-xs text-gray-600",
      `Arahkan A record domain Anda ke ${window.__PROJECTB_CUSTOM_DOMAIN_SERVER_IP__ || "IP server kami"}, lalu klik Cek DNS.`
    ));
  } else if (status === "verified") {
    info.append(textNode("p", "text-xs text-gray-600", "DNS sudah benar. Menunggu admin menyiapkan sertifikat & mengaktifkan domain ini."));
  } else if (status === "active" && showroom.slug) {
    info.append(textNode("p", "text-xs text-gray-600", `Aktif di: https://${showroom.custom_domain}/${showroom.slug}`));
  }
  card.append(info);

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap gap-2";

  if (status !== "active") {
    actions.append(Button({
      id: "slrsr_custom_domain_check_button",
      label: runtime.checkingDns ? "Memeriksa..." : "Cek DNS",
      disabled: runtime.checkingDns,
      onClick: () => checkCustomDomainDnsAction(showroom.id),
    }));
  }

  actions.append(Button({
    id: "slrsr_custom_domain_remove_button",
    label: "Cabut Domain",
    variant: "tidak",
    onClick: () => removeCustomDomainAction(showroom.id),
  }));

  card.append(actions);

  return card;
}

async function saveCustomDomain(showroomId, domain) {
  if (!domain) {
    setRuntime({ domainError: "Domain wajib diisi." });
    return;
  }

  setRuntime({ savingDomain: true, domainError: "" });

  try {
    const showroom = await showroomsResource.requestCustomDomain(showroomId, domain);
    patchShowroomState(showroom);
    customDomainDraft = "";
    setRuntime({ savingDomain: false });
    showToast("Domain berhasil didaftarkan, menunggu verifikasi DNS.", { type: "success" });
  } catch (error) {
    const message = customDomainErrorMessage(error, "Domain gagal didaftarkan.");
    setRuntime({ savingDomain: false, domainError: message });
    showToast(message, { type: "error" });
  }
}

async function checkCustomDomainDnsAction(showroomId) {
  setRuntime({ checkingDns: true, domainError: "" });

  try {
    const showroom = await showroomsResource.checkCustomDomainDns(showroomId);
    patchShowroomState(showroom);
    setRuntime({ checkingDns: false });
    showToast("DNS domain custom terverifikasi.", { type: "success" });
  } catch (error) {
    const message = customDomainErrorMessage(error, "DNS domain belum mengarah ke server kami.");
    setRuntime({ checkingDns: false, domainError: message });
    showToast(message, { type: "error" });
  }
}

async function removeCustomDomainAction(showroomId) {
  try {
    const showroom = await showroomsResource.removeCustomDomain(showroomId);
    patchShowroomState(showroom);
    setRuntime({ domainError: "" });
    showToast("Domain custom berhasil dicabut.", { type: "success" });
  } catch (error) {
    showToast(customDomainErrorMessage(error, "Domain custom gagal dicabut."), { type: "error" });
  }
}

/**
 * ValidationException backend selalu mengirim message generik "Validation
 * failed" -- pesan yang sebenarnya ada per-field di response.errors (lihat
 * App\Core\Exceptions\ValidationException). ApiError menyalinnya ke
 * error.errors -- ambil pesan field pertama dari situ dulu sebelum jatuh ke
 * error.message/fallback.
 */
function customDomainErrorMessage(error, fallback) {
  const errors = error?.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors)[0];
    if (typeof first === "string" && first) {
      return first;
    }
  }

  return error?.message ?? fallback;
}

function patchShowroomState(showroom) {
  appStore.patchState("working.sellerShowroom.showroom", {
    data: showroom,
    hydratedAt: Date.now(),
  }, "seller:showroom-custom-domain");
  appStore.patchState("snapshot.seller.showroom", {
    data: showroom,
    fetchedAt: Date.now(),
    ttl: 120,
    version: "seller-showroom-v1",
    stale: false,
  }, "seller:showroom-custom-domain-snapshot");
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
