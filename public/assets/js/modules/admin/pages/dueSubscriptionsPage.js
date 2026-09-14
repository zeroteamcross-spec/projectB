import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { Button } from "../../../ui/primitives/button.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatDate } from "../../../utils/formatDate.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { showroomsResource } from "../../../resources/showroomsResource.js";

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

const HISTORY_STATUS_LABEL = {
  paid: "Lunas",
  rejected: "Ditolak",
};

const HISTORY_STATUS_VARIANT = {
  paid: "success",
  rejected: "danger",
};

export function AdminDueSubscriptionsPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const state = {
    processingShowroomId: null,
    error: "",
    // Showroom id -> array riwayat (atau null selagi dimuat). Dipisah dari
    // daftar tagihan due utama -- kebanyakan admin tidak perlu buka riwayat
    // tiap showroom, jadi baru diambil begitu tombolnya diklik.
    expandedHistoryByShowroomId: {},
  };

  const rerender = () => render(root, currentContext, state, actions);

  const actions = {
    async confirm(showroom) {
      state.processingShowroomId = showroom.id;
      state.error = "";
      rerender();
      try {
        await showroomsResource.confirmSubscriptionPayment(showroom.id);
        showToast(`Pembayaran ${showroom.name} berhasil dikonfirmasi.`, { type: "success" });
        await refresh();
      } catch (error) {
        state.error = error.message || "Gagal mengonfirmasi pembayaran.";
        showToast(state.error, { type: "error" });
      } finally {
        state.processingShowroomId = null;
        rerender();
      }
    },
    async reject(showroom) {
      const reason = window.prompt("Alasan penolakan bukti transfer (minimal 5 karakter)", "");
      if (reason === null) {
        return;
      }
      state.processingShowroomId = showroom.id;
      state.error = "";
      rerender();
      try {
        await showroomsResource.rejectSubscriptionPayment(showroom.id, reason);
        showToast("Bukti transfer ditolak.", { type: "success" });
        await refresh();
      } catch (error) {
        state.error = error.message || "Gagal menolak bukti transfer.";
        showToast(state.error, { type: "error" });
      } finally {
        state.processingShowroomId = null;
        rerender();
      }
    },
    async toggleHistory(showroom) {
      if (state.expandedHistoryByShowroomId[showroom.id] !== undefined) {
        const next = { ...state.expandedHistoryByShowroomId };
        delete next[showroom.id];
        state.expandedHistoryByShowroomId = next;
        rerender();
        return;
      }

      state.expandedHistoryByShowroomId = { ...state.expandedHistoryByShowroomId, [showroom.id]: null };
      rerender();

      try {
        const history = await showroomsResource.subscriptionHistoryFor(showroom.id);
        state.expandedHistoryByShowroomId = { ...state.expandedHistoryByShowroomId, [showroom.id]: history };
      } catch (error) {
        showToast(error.message || "Gagal memuat riwayat pembayaran.", { type: "error" });
        const next = { ...state.expandedHistoryByShowroomId };
        delete next[showroom.id];
        state.expandedHistoryByShowroomId = next;
      } finally {
        rerender();
      }
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      state.processingShowroomId = null;
      state.error = "";
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
    },
  });

  async function refresh() {
    const showrooms = await showroomsResource.dueSubscriptions().catch(() => []);
    appStore.patchState("working.adminDueSubscriptions.list", {
      data: showrooms,
      hydratedAt: Date.now(),
    }, "admin-due-subscriptions:refresh");
  }
}

function render(root, context, state, actions) {
  if (!root || !context) {
    return;
  }

  const showrooms = appStore.get("working.adminDueSubscriptions.list.data", null);
  const hydratedAt = appStore.get("working.adminDueSubscriptions.list.hydratedAt", 0) ?? 0;

  if (!hydratedAt && showrooms === null) {
    // First render: kick off the fetch, show a loading state meanwhile.
    showroomsResource.dueSubscriptions().then((data) => {
      appStore.patchState("working.adminDueSubscriptions.list", {
        data,
        hydratedAt: Date.now(),
      }, "admin-due-subscriptions:initial-load");
    }).catch((error) => {
      appStore.patchState("working.adminDueSubscriptions.list", {
        data: [],
        hydratedAt: Date.now(),
      }, "admin-due-subscriptions:initial-load-failed");
      showToast(error.message || "Gagal memuat tagihan berulang.", { type: "error" });
    });
  }

  const layout = document.createElement("section");
  layout.id = "admdue_page_section";
  layout.className = "grid gap-6";

  layout.append(hero(showrooms ?? []));

  if (state.error) {
    const error = document.createElement("div");
    error.className = "rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    error.textContent = state.error;
    layout.append(error);
  }

  if (!hydratedAt && showrooms === null) {
    layout.append(EmptyState({
      title: "Memuat tagihan berulang",
      description: "Daftar showroom yang siklus tagihannya perlu ditinjau sedang dimuat.",
    }));
  } else if (!showrooms.length) {
    layout.append(EmptyState({
      title: "Tidak ada tagihan yang perlu ditinjau",
      description: "Semua showroom aktif sedang lunas untuk siklus tagihan saat ini.",
    }));
  } else {
    const list = document.createElement("div");
    list.id = "admdue_list_section";
    list.className = "grid gap-3";
    list.append(...showrooms.map((showroom) => subscriptionCard(showroom, state, actions)));
    layout.append(list);
  }

  root.replaceChildren(layout);
}

function hero(showrooms) {
  const section = document.createElement("section");
  section.id = "admdue_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(250,244,237,0.86),rgba(234,244,249,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 lg:p-7";

  const icon = document.createElement("div");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-secondary),var(--pb-brand-accent))] text-white shadow-[0_16px_40px_rgba(30,129,176,0.24)]";
  icon.append(createIcon("creditCard", { className: "h-5 w-5" }));

  const overdueCount = showrooms.filter((item) => item.subscription_is_due && item.subscription_payment_status !== "pending_verification").length;
  const pendingCount = showrooms.filter((item) => item.subscription_payment_status === "pending_verification").length;

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-2";
  copy.append(
    icon,
    textNode("h1", "text-2xl font-black leading-tight tracking-normal text-gray-950 sm:text-3xl", "Tagihan Berulang"),
    textNode("p", "max-w-xl text-xs leading-6 text-gray-600", "Showroom aktif yang siklus tagihan paketnya jatuh tempo atau sudah unggah bukti transfer perpanjangan."),
    textNode("p", "text-xs font-semibold text-gray-700", `${overdueCount} jatuh tempo · ${pendingCount} menunggu verifikasi`),
  );

  section.append(copy);
  return section;
}

function subscriptionCard(showroom, state, actions) {
  const card = document.createElement("div");
  card.id = `admdue_card_${showroom.id}`;
  card.className = "grid gap-3 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-white/85 p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center";

  const info = document.createElement("div");
  info.className = "grid gap-1 min-w-0";

  const status = showroom.subscription_payment_status || "unpaid";
  const isOverdue = showroom.subscription_is_due && status !== "pending_verification";

  const nameRow = document.createElement("div");
  nameRow.className = "flex flex-wrap items-center gap-2";
  nameRow.append(
    textNode("p", "text-sm font-black text-gray-950", showroom.name),
    Badge({ label: STATUS_LABEL[status] || status, variant: STATUS_VARIANT[status] || "default" }),
  );
  if (isOverdue) {
    nameRow.append(Badge({ label: "Jatuh tempo", variant: "danger" }));
  }

  info.append(
    nameRow,
    textNode("p", "text-xs text-gray-600", `${showroom.seller_name || "-"} · ${showroom.seller_email || "-"}`),
    textNode("p", "text-xs text-gray-600", `${showroom.selected_plan_name || "-"} · ${formatCurrency(showroom.selected_plan_price || 0)}${showroom.selected_plan_billing_period ? ` ${showroom.selected_plan_billing_period}` : ""}`),
    textNode("p", "text-xs text-gray-500", `Jatuh tempo: ${formatDate(showroom.subscription_next_due_at)}`),
  );

  if (showroom.subscription_proof_path) {
    const link = document.createElement("a");
    link.href = showroom.subscription_proof_path;
    link.target = "_blank";
    link.rel = "noopener";
    link.className = "w-fit text-xs font-semibold text-[var(--pb-brand-secondary)] underline underline-offset-2";
    link.textContent = "Lihat bukti transfer";
    info.append(link);
  }

  if (status === "rejected" && showroom.subscription_rejected_reason) {
    info.append(textNode("p", "text-xs text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]", `Alasan ditolak: ${showroom.subscription_rejected_reason}`));
  }

  const actionsWrap = document.createElement("div");
  actionsWrap.className = "flex flex-wrap gap-2";

  if (status === "pending_verification") {
    const isBusy = state.processingShowroomId === showroom.id;
    const confirm = Button({
      label: isBusy ? "Memproses..." : "Konfirmasi",
      variant: "primary",
      disabled: isBusy,
      onClick: () => actions.confirm(showroom),
    });
    confirm.id = `admdue_confirm_button_${showroom.id}`;
    const reject = Button({
      label: "Tolak",
      variant: "secondary",
      disabled: isBusy,
      onClick: () => actions.reject(showroom),
    });
    reject.id = `admdue_reject_button_${showroom.id}`;
    actionsWrap.append(confirm, reject);
  } else {
    actionsWrap.append(textNode("p", "text-xs text-gray-500", "Menunggu showroom mengunggah bukti transfer perpanjangan."));
  }

  const isHistoryOpen = state.expandedHistoryByShowroomId[showroom.id] !== undefined;
  const historyToggle = document.createElement("button");
  historyToggle.type = "button";
  historyToggle.id = `admdue_history_toggle_${showroom.id}`;
  historyToggle.className = "w-fit text-xs font-semibold text-[var(--pb-brand-secondary)] underline underline-offset-2";
  historyToggle.textContent = isHistoryOpen ? "Sembunyikan riwayat" : "Lihat riwayat";
  historyToggle.addEventListener("click", () => actions.toggleHistory(showroom));
  actionsWrap.append(historyToggle);

  card.append(info, actionsWrap);

  if (isHistoryOpen) {
    const historyPanel = document.createElement("div");
    historyPanel.id = `admdue_history_panel_${showroom.id}`;
    historyPanel.className = "grid gap-2 sm:col-span-2";
    historyPanel.append(historySection(state.expandedHistoryByShowroomId[showroom.id]));
    card.append(historyPanel);
  }

  return card;
}

/**
 * Riwayat siklus-siklus SEBELUMNYA untuk satu showroom -- terpisah dari
 * status siklus BERJALAN yang sudah ditampilkan di kartu utama. Sama seperti
 * bagian riwayat di halaman Langganan showroom (billingPage.js), cuma dilihat
 * dari sisi Admin dan bisa untuk showroom mana pun.
 */
function historySection(history) {
  const wrap = document.createElement("div");
  wrap.className = "grid gap-2 rounded-2xl border border-[var(--pb-card-border)] bg-gray-50/70 p-3";

  if (history === null) {
    wrap.append(textNode("p", "text-xs text-gray-500", "Memuat riwayat..."));
    return wrap;
  }

  if (!history.length) {
    wrap.append(textNode("p", "text-xs text-gray-500", "Belum ada siklus pembayaran yang selesai ditinjau."));
    return wrap;
  }

  wrap.append(...history.map(historyRow));
  return wrap;
}

function historyRow(entry) {
  const row = document.createElement("div");
  row.className = "grid gap-1 rounded-xl border border-[var(--pb-card-border)] bg-white p-3 text-xs";

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

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}
