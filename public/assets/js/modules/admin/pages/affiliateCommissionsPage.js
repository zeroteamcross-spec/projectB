import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { syncBusinessSettlement } from "../../../state/sync/businessStatusSync.js";
import { markPreloadSnapshotsStale } from "../../../state/sync/sharedMutationSync.js";
import { Button } from "../../../ui/primitives/button.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { AdminAffiliateLedgerList } from "../components/adminAffiliateLedgerList.js";
import { adminAffiliateFinanceService } from "../services/adminAffiliateFinanceService.js";
import { adminSessionService } from "../services/adminSessionService.js";

export function AdminAffiliateCommissionsPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const state = {
    query: { keyword: "", status: "", page: 1, pageSize: 10 },
    selectedIds: new Set(),
    selectedAffiliateId: null,
    isCreating: false,
  };

  const rerender = () => render(root, currentContext, state, actions);

  const actions = {
    applyFilters(nextFilters = {}) {
      state.query = { ...state.query, ...nextFilters, page: 1 };
      rerender();
    },
    changePage(nextPage) {
      state.query = { ...state.query, page: nextPage };
      rerender();
    },
    changePerPage(nextPerPage) {
      state.query = { ...state.query, page: 1, pageSize: nextPerPage };
      rerender();
    },
    toggleLedger(ledger) {
      const ledgerId = Number(ledger.id);
      const affiliateId = Number(ledger.affiliate_id);

      if (state.selectedIds.has(ledgerId)) {
        state.selectedIds.delete(ledgerId);
        if (!state.selectedIds.size) {
          state.selectedAffiliateId = null;
        }
        rerender();
        return;
      }

      if (state.selectedAffiliateId && state.selectedAffiliateId !== affiliateId) {
        state.selectedIds.clear();
      }

      state.selectedAffiliateId = affiliateId;
      state.selectedIds.add(ledgerId);
      rerender();
    },
    openCreateModal(ledgers) {
      openSettlementModal({
        ledgers,
        state,
        onSubmit: async (payload) => {
          state.isCreating = true;
          rerender();
          try {
            const settlement = await adminSessionService.createSettlement(payload);
            if (settlement) {
              syncBusinessSettlement(settlement, {
                primaryRole: "admin",
                source: "admin-affiliate-commissions:create-settlement",
              });
            }
            markPreloadSnapshotsStale([
              { role: "admin", key: "affiliateLedgers" },
              { role: "admin", key: "settlements" },
              { role: "affiliate_admin", key: "ledgerActivity" },
              { role: "affiliate_admin", key: "settlementActivity" },
            ], { source: "admin-affiliate-commissions:create-settlement" });
            state.selectedIds.clear();
            state.selectedAffiliateId = null;
            closeModal();
            showToast("Settlement marketing berhasil dibuat.", { type: "success" });
          } catch (error) {
            showToast(error.message || "Gagal membuat settlement marketing.", { type: "error" });
          } finally {
            state.isCreating = false;
            rerender();
          }
        },
      });
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
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
}

function render(root, context, state, actions) {
  if (!root) {
    return;
  }

  const workingPayload = appStore.get("working.adminAffiliateCommissions.ledgers.data", null);
  const snapshotPayload = appStore.get("snapshot.admin.affiliateLedgers.data", null);
  const payload = workingPayload ?? snapshotPayload ?? { ledgers: [], meta: {} };
  const hydratedAt = appStore.get("working.adminAffiliateCommissions.ledgers.hydratedAt", 0) ?? 0;
  const ledgers = adminAffiliateFinanceService.normalizedLedgers(payload.ledgers ?? []);
  const filtered = adminAffiliateFinanceService.filterLedgers(ledgers, state.query);
  const summary = adminAffiliateFinanceService.summarize(ledgers);
  const page = Math.max(1, Number(state.query.page || 1));
  const pageSize = Math.max(1, Number(state.query.pageSize || 10));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedLedgers = ledgers.filter((ledger) => state.selectedIds.has(Number(ledger.id)));

  const frame = document.createElement("section");
  frame.id = "adfc_page_section";
  frame.className = "mx-auto grid min-w-0 w-full max-w-[1240px] gap-5";

  const createButton = Button({
    label: state.isCreating ? "Memproses..." : `Buat settlement (${state.selectedIds.size})`,
    variant: "primary",
    disabled: !state.selectedIds.size || state.isCreating,
    onClick: () => actions.openCreateModal(selectedLedgers),
  });
  createButton.id = "adfc_create_settlement_button";
  createButton.prepend(createIcon("plus", { className: "h-4 w-4" }));

  frame.append(
    hero(createButton, summary),
    filters(state.query, actions),
    AdminAffiliateLedgerList({
      loading: !hydratedAt && !workingPayload && !snapshotPayload,
      ledgers: paged,
      selectedIds: state.selectedIds,
      page: safePage,
      perPage: pageSize,
      totalItems: filtered.length,
      onToggle: actions.toggleLedger,
      onPageChange: actions.changePage,
      onPerPageChange: actions.changePerPage,
    }),
  );

  replaceStableFrame(root, frame);
}

function hero(action, summary) {
  const section = document.createElement("section");
  section.className = "grid gap-4 rounded-[var(--pb-radius-2xl)] border border-white/80 bg-white/88 p-5 shadow-[var(--pb-shadow-card)] lg:grid-cols-[minmax(0,1fr)_auto]";
  const copy = document.createElement("div");
  copy.className = "grid gap-2";
  copy.append(
    textNode("p", "text-xs font-black uppercase tracking-[0.14em] text-[var(--pb-brand-secondary)]", "Marketing finance"),
    textNode("h1", "text-3xl font-black text-gray-950", "Marketing Commissions"),
    textNode("p", "max-w-2xl text-sm leading-6 text-gray-600", "Kelola ledger komisi, status dibayar, dan pembuatan batch pembayaran marketing."),
  );
  const stats = document.createElement("div");
  stats.className = "grid gap-2 sm:grid-cols-3 lg:min-w-[480px]";
  [
    ["Belum Dibayar", `${summary.accruedCount} ledger`],
    ["Nominal Accrued", formatCurrency(summary.accruedAmount)],
    ["Sudah Dibayar", formatCurrency(summary.paidAmount)],
  ].forEach(([label, value]) => {
    const card = document.createElement("section");
    card.className = "rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-white px-4 py-3 shadow-sm";
    card.append(textNode("p", "text-xs font-bold uppercase text-gray-500", label), textNode("p", "text-lg font-black text-gray-950", value));
    stats.append(card);
  });
  const side = document.createElement("div");
  side.className = "grid gap-3";
  side.append(stats, action);
  section.append(copy, side);
  return section;
}

function filters(query, actions) {
  const form = document.createElement("form");
  form.className = "grid gap-3 rounded-[var(--pb-radius-2xl)] border border-white/80 bg-white/86 p-4 shadow-[var(--pb-shadow-card)] md:grid-cols-[minmax(0,1fr)_220px_auto]";
  const keyword = input("Cari marketing, transaksi, mobil", query.keyword);
  const status = document.createElement("select");
  status.className = keyword.className;
  [
    ["", "Semua status"],
    ["accrued", "Belum Dibayar"],
    ["pending", "Menunggu Pembayaran"],
    ["paid_out", "Sudah Dibayar"],
    ["voided", "Dibatalkan"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === query.status;
    status.append(option);
  });
  const submit = Button({ label: "Terapkan", variant: "primary" });
  submit.type = "submit";
  form.append(keyword, status, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    actions.applyFilters({ keyword: keyword.value.trim(), status: status.value });
  });
  return form;
}

function openSettlementModal({ ledgers, state, onSubmit }) {
  const form = document.createElement("form");
  form.className = "grid gap-4";
  const total = ledgers.reduce((sum, ledger) => sum + Number(ledger.commission_amount ?? ledger.amount ?? 0), 0);
  const reference = input("Referensi pembayaran", "");
  reference.id = "adfc_settlement_reference_input";
  const method = input("Metode pembayaran", "");
  method.id = "adfc_settlement_method_input";
  const note = document.createElement("textarea");
  note.id = "adfc_settlement_note_input";
  note.className = `${reference.className} min-h-24`;
  note.placeholder = "Catatan pembayaran";
  const summary = textNode("p", "text-sm font-semibold text-gray-800", `${ledgers.length} ledger | ${formatCurrency(total)}`);
  const submit = Button({ label: state.isCreating ? "Memproses..." : "Buat batch pending", variant: "primary" });
  submit.id = "adfc_settlement_submit_button";
  submit.type = "submit";
  form.append(summary, reference, method, note, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit({
      affiliate_id: state.selectedAffiliateId,
      ledger_ids: Array.from(state.selectedIds),
      payment_reference: reference.value.trim(),
      payment_method: method.value.trim(),
      payment_note: note.value.trim(),
      notes: note.value.trim(),
    });
  });

  openModal(form, {
    key: "admin-affiliate-create-settlement",
    title: "Buat settlement marketing",
    description: "Batch dibuat sebagai pending dan ledger terpilih berubah menjadi menunggu pembayaran.",
    size: "lg",
    closeLabel: "Tutup",
  });
}

function input(placeholder, value = "") {
  const control = document.createElement("input");
  control.className = "min-h-11 min-w-0 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  control.placeholder = placeholder;
  control.value = value;
  return control;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text;
  return node;
}

function replaceStableFrame(root, frame) {
  const existing = root.querySelector(`#${frame.id}`);
  if (!existing) {
    root.replaceChildren(frame);
    return;
  }

  existing.className = frame.className;
  existing.replaceChildren(...Array.from(frame.childNodes));
}
