import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { Button } from "../../../ui/primitives/button.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatDate } from "../../../utils/formatDate.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { showroomsResource } from "../../../resources/showroomsResource.js";
import { activeShowroom } from "../state/activeShowroom.js";
import { adminMasterService } from "../../admin/services/adminMasterService.js";
import { SubscriptionMidtransPanel } from "../../../ui/composites/subscriptionMidtransPanel.js";
import { confirmDialog } from "../../../ui/primitives/confirmDialog.js";

/**
 * Dibaca persis sama seperti render() menghitung `showroom` -- diekstrak
 * supaya actions (submitProof, changePlan, dst) tidak perlu menunggu
 * re-render untuk tahu cabang mana yang sedang ditampilkan.
 */
function currentShowroomId() {
  const working = appStore.get("working.sellerBilling.showroom.data", null);
  const snapshot = appStore.get("snapshot.seller.showroom.data", null);
  return (working ?? snapshot)?.id ?? null;
}

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
    changingPlanName: null,
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
        const showroomId = currentShowroomId();
        const showroom = showroomId
          ? await showroomsResource.submitSubscriptionProofFor(showroomId, state.proofFile, state.note)
          : await showroomsResource.submitSubscriptionProof(state.proofFile, state.note);
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
    async changePlan(plan, currentPlanName) {
      const isFirstPlan = !currentPlanName;
      const confirmed = isFirstPlan || await confirmDialog({
        title: `Ganti ke paket ${plan.name}?`,
        message: "Pembayaran siklus saat ini akan dianggap tidak berlaku untuk paket baru -- status langganan kembali ke \"Belum bayar\" dan Anda perlu membayar ulang sesuai harga paket baru.",
        confirmLabel: "Ya, ganti paket",
        cancelLabel: "Batal",
        tone: "danger",
        key: "seller-billing-change-plan-confirm",
      });

      if (!confirmed) {
        return;
      }

      state.changingPlanName = plan.name;
      rerender();

      try {
        const showroomId = currentShowroomId();
        const showroom = showroomId
          ? await showroomsResource.updateBranch(showroomId, { selected_plan_name: plan.name })
          : await showroomsResource.updateMine({ selected_plan_name: plan.name });
        appStore.patchState("working.sellerBilling.showroom", {
          data: showroom,
          hydratedAt: Date.now(),
        }, "seller-billing:plan-changed");
        appStore.patchState("snapshot.seller.showroom", {
          ...(appStore.get("snapshot.seller.showroom", {}) ?? {}),
          data: showroom,
        }, "seller-billing:snapshot-synced");
        showToast(`Paket berhasil diganti ke ${plan.name}. Silakan lanjutkan pembayaran.`, { type: "success" });
      } catch (error) {
        showToast(error.message || "Gagal mengganti paket.", { type: "error" });
      } finally {
        state.changingPlanName = null;
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
  const pricingMaster = appStore.get("working.sellerBilling.pricing.data", null);

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

  layout.append(plansSection(showroom, pricingMaster, state, actions));

  const history = appStore.get("working.sellerBilling.history.data", null);
  layout.append(historySection(history));

  root.replaceChildren(layout);

  if (!appStore.get("working.sellerBilling.showroom.hydratedAt", 0)) {
    activeShowroom.resolveMine().then((data) => {
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
  if (!appStore.get("working.sellerBilling.pricing.hydratedAt", 0)) {
    adminMasterService.getPricingMaster()
      .catch(() => adminMasterService.normalizePricingMaster(null))
      .then((master) => {
        appStore.patchState("working.sellerBilling.pricing", { data: master, hydratedAt: Date.now() }, "seller-billing:pricing-loaded");
      });
  }
  if (!appStore.get("working.sellerBilling.history.hydratedAt", 0)) {
    const showroomId = showroom?.id ?? null;
    (showroomId ? showroomsResource.subscriptionHistoryForOwned(showroomId) : showroomsResource.subscriptionHistory())
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
      getShowroomId: () => currentShowroomId(),
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

/**
 * Sebelumnya kartu pilih paket cuma tampil sekali di alur registrasi
 * (showroomRegisterPage.js) -- showroom yang sudah aktif tidak punya cara
 * upgrade/downgrade sendiri, harus minta Admin ubah manual di database.
 * Memakai endpoint yang sama (PATCH /showrooms/me dengan selected_plan_name)
 * -- harga & periode tetap diambil ulang di server dari Master Harga
 * (ShowroomService::resolveSelectedPlan()), bukan dipercaya dari sini.
 */
function plansSection(showroom, pricingMaster, state, actions) {
  const section = document.createElement("section");
  section.id = "slrbil_plans_section";
  section.className = "grid gap-3 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-white/85 p-5 shadow-sm";

  section.append(
    textNode("h2", "text-sm font-black text-gray-950", "Ganti Paket"),
    textNode("p", "text-xs text-gray-600", "Mengganti paket akan mengembalikan status pembayaran siklus ini ke \"Belum bayar\" -- Anda perlu membayar ulang sesuai harga paket baru."),
  );

  const plans = (pricingMaster?.data?.plans ?? [])
    .filter((plan) => (plan?.status ?? "active") === "active")
    .sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));

  if (!plans.length) {
    section.append(textNode("p", "text-xs text-gray-500", "Belum ada paket aktif yang bisa dipilih."));
    return section;
  }

  const grid = document.createElement("div");
  grid.id = "slrbil_plan_cards_section";
  grid.className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";
  grid.append(...plans.map((plan) => planChangeCard(plan, showroom, state, actions)));
  section.append(grid);

  return section;
}

function planChangeCard(plan, showroom, state, actions) {
  const isCurrent = (showroom.selected_plan_name || "") === plan.name;
  const isBusy = state.changingPlanName === plan.name;

  const card = document.createElement("article");
  card.id = `slrbil_plan_card_${plan.id}`;
  card.className = [
    "grid gap-2 rounded-2xl border p-4 text-xs",
    isCurrent
      ? "border-[var(--pb-brand-primary)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_6%,white)]"
      : "border-[var(--pb-card-border)] bg-gray-50",
  ].join(" ");

  const nameRow = document.createElement("div");
  nameRow.className = "flex flex-wrap items-center gap-2";
  nameRow.append(textNode("p", "font-black text-gray-950", plan.name));
  if (plan.is_recommended) {
    nameRow.append(Badge({ label: "Rekomendasi", variant: "info" }));
  }
  card.append(nameRow);

  card.append(textNode("p", "text-sm font-black text-gray-900", `${formatCurrency(plan.price)}${plan.billing_period ? ` ${plan.billing_period}` : ""}`));
  card.append(textNode("p", "text-gray-600", plan.listing_limit ? `Maks ${plan.listing_limit} listing mobil` : "Listing mobil tanpa batas"));

  if (plan.features?.length) {
    card.append(textNode("p", "text-gray-500", plan.features.join(", ")));
  }

  if (isCurrent) {
    const badge = Badge({ label: "Paket Anda saat ini", variant: "success" });
    badge.id = `slrbil_plan_current_badge_${plan.id}`;
    card.append(badge);
  } else {
    const button = Button({
      label: isBusy ? "Mengganti..." : "Pilih paket ini",
      variant: "secondary",
      disabled: isBusy || Boolean(state.changingPlanName),
      onClick: () => actions.changePlan(plan, showroom.selected_plan_name),
    });
    button.id = `slrbil_plan_select_button_${plan.id}`;
    card.append(button);
  }

  return card;
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
