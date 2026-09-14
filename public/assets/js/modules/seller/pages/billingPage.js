import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { Button } from "../../../ui/primitives/button.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatDate } from "../../../utils/formatDate.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { showroomsResource } from "../../../resources/showroomsResource.js";
import { adminMasterService } from "../../admin/services/adminMasterService.js";
import { SubscriptionMidtransPanel } from "../../../ui/composites/subscriptionMidtransPanel.js";

const STATUS_LABEL = {
  unpaid: "Belum bayar",
  pending_verification: "Menunggu verifikasi",
  paid: "Lunas",
  rejected: "Bukti ditolak",
};

const STATUS_VARIANT = {
  unpaid: "default",
  pending_verification: "warning",
  paid: "success",
  rejected: "danger",
};

export function SellerBillingPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const state = {
    proofFile: null,
    note: "",
    isSubmitting: false,
    error: "",
    // "midtrans" (Virtual Account, instan -- ditampilkan lebih dulu) atau
    // "manual" (transfer + upload bukti, alur lama, tetap tersedia).
    paymentMethodTab: "midtrans",
    midtransShowroom: null,
    midtransPanelWidget: null,
  };

  const rerender = () => render(root, currentContext, state, actions);

  const actions = {
    switchPaymentMethodTab(tab) {
      state.paymentMethodTab = tab;
      rerender();
    },
    handleMidtransPaid(showroom) {
      state.midtransShowroom = showroom;
      if (showroom) {
        appStore.patchState("working.sellerBilling.showroom", {
          data: showroom,
          hydratedAt: Date.now(),
        }, "seller-billing:midtrans-updated");
        appStore.patchState("snapshot.seller.showroom", {
          ...(appStore.get("snapshot.seller.showroom", {}) ?? {}),
          data: showroom,
        }, "seller-billing:snapshot-synced");
      }
      rerender();
    },
    updateProofFile(file) {
      state.proofFile = file;
      state.error = "";
      rerender();
    },
    updateNote(note) {
      state.note = note;
    },
    async submitProof() {
      if (!state.proofFile) {
        state.error = "Pilih file bukti transfer terlebih dahulu.";
        rerender();
        return;
      }

      state.isSubmitting = true;
      state.error = "";
      rerender();

      try {
        const showroom = await showroomsResource.submitSubscriptionProof(state.proofFile, state.note);
        appStore.patchState("working.sellerBilling.showroom", {
          data: showroom,
          hydratedAt: Date.now(),
        }, "seller-billing:proof-submitted");
        appStore.patchState("snapshot.seller.showroom", {
          ...(appStore.get("snapshot.seller.showroom", {}) ?? {}),
          data: showroom,
        }, "seller-billing:snapshot-synced");
        state.proofFile = null;
        state.note = "";
        showToast("Bukti transfer berhasil diunggah.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal mengunggah bukti transfer.";
        showToast(state.error, { type: "error" });
      } finally {
        state.isSubmitting = false;
        rerender();
      }
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      state.proofFile = null;
      state.note = "";
      state.error = "";
      state.isSubmitting = false;
    },
    mount(context) {
      currentContext = context;
      root = document.createElement("div");
      rerender();
      return root;
    },
    hydrate(context) {
      currentContext = context;
      rerender();
    },
    bindEvents(context) {
      currentContext = context;
      unsubscribe = appStore.subscribe(() => rerender());
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
      state.midtransPanelWidget?.dispose?.();
      state.midtransPanelWidget = null;
      root = null;
    },
  });
}

function render(root, context, state, actions) {
  if (!root || !context) {
    return;
  }

  const snapshotShowroom = appStore.get("snapshot.seller.showroom.data", null);
  const workingShowroom = appStore.get("working.sellerBilling.showroom.data", null);
  const showroom = workingShowroom ?? snapshotShowroom;
  const destinationMaster = appStore.get("working.sellerBilling.destination.data", null);

  const layout = document.createElement("section");
  layout.id = "slrbil_page_section";
  layout.className = "grid gap-6";

  layout.append(hero());

  if (!showroom) {
    root.replaceChildren(layout);
    return;
  }

  const status = showroom.subscription_payment_status || "unpaid";
  const needsAction = status === "unpaid" || status === "rejected" || (status === "paid" && showroom.subscription_is_due);

  const card = document.createElement("div");
  card.id = "slrbil_status_card";
  card.className = "grid gap-3 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-white/85 p-5 shadow-sm";

  const statusRow = document.createElement("div");
  statusRow.className = "flex flex-wrap items-center gap-2";
  statusRow.append(
    textNode("p", "text-sm font-black text-gray-950", showroom.selected_plan_name || "Belum memilih paket"),
    Badge({ label: STATUS_LABEL[status] || status, variant: STATUS_VARIANT[status] || "default" }),
  );
  if (status === "paid" && showroom.subscription_is_due) {
    statusRow.append(Badge({ label: "Jatuh tempo", variant: "danger" }));
  }
  card.append(statusRow);

  if (showroom.selected_plan_price) {
    card.append(textNode("p", "text-xs text-gray-600", `${formatCurrency(showroom.selected_plan_price)}${showroom.selected_plan_billing_period ? ` ${showroom.selected_plan_billing_period}` : ""}`));
  }
  if (showroom.subscription_next_due_at) {
    card.append(textNode("p", "text-xs text-gray-600", `Jatuh tempo berikutnya: ${formatDate(showroom.subscription_next_due_at)}`));
  }
  if (status === "rejected" && showroom.subscription_rejected_reason) {
    card.append(textNode("p", "text-xs text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]", `Bukti sebelumnya ditolak: ${showroom.subscription_rejected_reason}`));
  }
  if (status === "pending_verification") {
    card.append(textNode("p", "text-xs text-gray-600", "Bukti transfer Anda sedang ditinjau Admin."));
  }

  layout.append(card);

  if (needsAction) {
    layout.append(paymentForm(state, actions, destinationMaster));
  }

  const history = appStore.get("working.sellerBilling.history.data", null);
  layout.append(historySection(history));

  root.replaceChildren(layout);

  if (!appStore.get("working.sellerBilling.showroom.hydratedAt", 0)) {
    showroomsResource.mine().then((data) => {
      appStore.patchState("working.sellerBilling.showroom", { data, hydratedAt: Date.now() }, "seller-billing:initial-load");
    }).catch(() => {});
  }
  if (!appStore.get("working.sellerBilling.destination.hydratedAt", 0)) {
    adminMasterService.getSubscriptionDestinationMaster()
      .catch(() => adminMasterService.normalizeSubscriptionDestinationMaster(null))
      .then((master) => {
        appStore.patchState("working.sellerBilling.destination", { data: master, hydratedAt: Date.now() }, "seller-billing:destination-loaded");
      });
  }
  if (!appStore.get("working.sellerBilling.history.hydratedAt", 0)) {
    showroomsResource.subscriptionHistory()
      .catch(() => [])
      .then((data) => {
        appStore.patchState("working.sellerBilling.history", { data, hydratedAt: Date.now() }, "seller-billing:history-loaded");
      });
  }
}

function hero() {
  const section = document.createElement("section");
  section.id = "slrbil_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(250,244,237,0.86),rgba(234,244,249,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6";

  const icon = document.createElement("div");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-secondary),var(--pb-brand-accent))] text-white shadow-[0_16px_40px_rgba(30,129,176,0.24)]";
  icon.append(createIcon("creditCard", { className: "h-5 w-5" }));

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-2";
  copy.append(
    icon,
    textNode("h1", "text-2xl font-black leading-tight tracking-normal text-gray-950 sm:text-3xl", "Langganan"),
    textNode("p", "max-w-xl text-xs leading-6 text-gray-600", "Status pembayaran paket showroom Anda dan tagihan siklus berikutnya."),
  );

  section.append(copy);
  return section;
}

function paymentForm(state, actions, destinationMaster) {
  const section = document.createElement("section");
  section.id = "slrbil_payment_section";
  section.className = "grid gap-3 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-white/85 p-5 shadow-sm";

  section.append(
    textNode("h2", "text-sm font-black text-gray-950", "Bayar paket showroom"),
    billingPaymentMethodTabs(state, actions),
  );

  if (state.paymentMethodTab === "midtrans") {
    state.midtransPanelWidget?.dispose?.();
    state.midtransPanelWidget = SubscriptionMidtransPanel({
      getShowroom: () => state.midtransShowroom,
      onPaid: (showroom) => actions.handleMidtransPaid(showroom),
    });
    section.append(state.midtransPanelWidget.element);
    return section;
  }

  const destination = destinationMaster?.data;
  if (destination?.account_number) {
    const recap = document.createElement("div");
    recap.className = "grid gap-1 rounded-2xl border border-[var(--pb-card-border)] bg-gray-50 p-3 text-xs";
    recap.append(
      textNode("p", "text-gray-600", `Bank: ${destination.bank_name || "-"}`),
      textNode("p", "text-gray-600", `Nomor rekening: ${destination.account_number}`),
      textNode("p", "text-gray-600", `Atas nama: ${destination.account_holder || "-"}`),
    );
    section.append(recap);
  }

  const fileLabel = document.createElement("label");
  fileLabel.className = "grid gap-1 text-xs font-semibold text-gray-700";
  fileLabel.textContent = "Bukti transfer (JPG, PNG, atau PDF, maks. 5 MB)";
  const fileInput = document.createElement("input");
  fileInput.id = "slrbil_proof_file_input";
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp,application/pdf";
  fileInput.className = "min-h-10 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-white px-3 py-2 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  fileInput.addEventListener("change", (event) => actions.updateProofFile(event.target.files?.[0] ?? null));
  fileLabel.append(fileInput);

  const noteLabel = document.createElement("label");
  noteLabel.className = "grid gap-1 text-xs font-semibold text-gray-700";
  noteLabel.textContent = "Catatan (opsional)";
  const noteInput = document.createElement("textarea");
  noteInput.id = "slrbil_proof_note_input";
  noteInput.rows = 2;
  noteInput.className = "min-h-10 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-white px-3 py-2 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  noteInput.value = state.note;
  noteInput.addEventListener("input", (event) => actions.updateNote(event.target.value));
  noteLabel.append(noteInput);

  section.append(fileLabel, noteLabel);

  if (state.error) {
    const message = document.createElement("p");
    message.className = "rounded-xl border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    message.textContent = state.error;
    section.append(message);
  }

  const submit = Button({
    label: state.isSubmitting ? "Mengunggah..." : "Kirim bukti transfer",
    variant: "primary",
    disabled: state.isSubmitting || !state.proofFile,
    onClick: () => actions.submitProof(),
  });
  submit.id = "slrbil_submit_button";
  section.append(submit);

  return section;
}

const HISTORY_STATUS_LABEL = {
  paid: "Lunas",
  rejected: "Ditolak",
};

const HISTORY_STATUS_VARIANT = {
  paid: "success",
  rejected: "danger",
};

/**
 * Siklus-siklus SEBELUMNYA -- terpisah dari status siklus BERJALAN di atas
 * (card "slrbil_status_card"). Ditulis oleh Admin tiap kali konfirmasi/tolak
 * (lihat ShowroomService::recordSubscriptionPaymentHistory()), jadi daftar
 * ini tidak berubah walau siklus berjalan sudah ditimpa perpanjangan baru.
 */
function historySection(history) {
  const section = document.createElement("section");
  section.id = "slrbil_history_section";
  section.className = "grid gap-3 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-white/85 p-5 shadow-sm";

  section.append(textNode("h2", "text-sm font-black text-gray-950", "Riwayat Pembayaran"));

  if (history === null) {
    section.append(textNode("p", "text-xs text-gray-500", "Memuat riwayat..."));
    return section;
  }

  if (!history.length) {
    section.append(textNode("p", "text-xs text-gray-500", "Belum ada siklus pembayaran yang selesai ditinjau Admin."));
    return section;
  }

  const list = document.createElement("div");
  list.id = "slrbil_history_list";
  list.className = "grid gap-2";
  list.append(...history.map(historyRow));
  section.append(list);

  return section;
}

function historyRow(entry) {
  const row = document.createElement("div");
  row.className = "grid gap-1 rounded-2xl border border-[var(--pb-card-border)] bg-gray-50 p-3 text-xs";

  const top = document.createElement("div");
  top.className = "flex flex-wrap items-center gap-2";
  top.append(
    textNode("p", "font-black text-gray-900", entry.plan_name || "-"),
    Badge({ label: HISTORY_STATUS_LABEL[entry.status] || entry.status, variant: HISTORY_STATUS_VARIANT[entry.status] || "default" }),
  );
  row.append(top);

  row.append(textNode("p", "text-gray-600", `${formatCurrency(entry.plan_price || 0)}${entry.plan_billing_period ? ` ${entry.plan_billing_period}` : ""} · ${entry.payment_method === "midtrans" ? "Virtual Account" : "Transfer manual"}`));
  row.append(textNode("p", "text-gray-600", `Diputuskan: ${formatDate(entry.decided_at)}${entry.decided_by_name ? ` oleh ${entry.decided_by_name}` : ""}`));

  if (entry.status === "rejected" && entry.rejected_reason) {
    row.append(textNode("p", "text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]", `Alasan ditolak: ${entry.rejected_reason}`));
  }

  if (entry.payment_method === "midtrans" && entry.midtrans_payment_data?.va_number) {
    row.append(textNode("p", "text-gray-500", `VA ${String(entry.midtrans_payment_data.bank || "").toUpperCase()} ${entry.midtrans_payment_data.va_number}`));
  }

  if (entry.proof_path) {
    const link = document.createElement("a");
    link.href = entry.proof_path;
    link.target = "_blank";
    link.rel = "noopener";
    link.className = "w-fit text-xs font-semibold text-[var(--pb-brand-secondary)] underline underline-offset-2";
    link.textContent = "Lihat bukti transfer";
    row.append(link);
  }

  return row;
}

function billingPaymentMethodTabs(state, actions) {
  const wrap = document.createElement("div");
  wrap.id = "slrbil_payment_method_tabs";
  wrap.className = "grid grid-cols-2 gap-2";

  [
    { value: "midtrans", label: "Virtual Account (Instan)" },
    { value: "manual", label: "Transfer Manual" },
  ].forEach(({ value, label }) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.dataset.paymentMethodTab = value;
    const isActive = state.paymentMethodTab === value;
    tab.className = [
      "rounded-xl border px-3 py-2 text-xs font-bold transition",
      isActive
        ? "border-[var(--pb-brand-primary)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_8%,white)] text-[var(--pb-brand-secondary)]"
        : "border-[var(--pb-card-border)] bg-white text-gray-700 hover:border-[color-mix(in_srgb,var(--pb-brand-primary)_35%,var(--pb-card-border))]",
    ].join(" ");
    tab.textContent = label;
    tab.addEventListener("click", () => actions.switchPaymentMethodTab(value));
    wrap.append(tab);
  });

  return wrap;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}
