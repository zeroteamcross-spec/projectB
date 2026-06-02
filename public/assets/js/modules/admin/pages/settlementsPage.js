import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { syncBusinessSettlement } from "../../../state/sync/businessStatusSync.js";
import { Button } from "../../../ui/primitives/button.js";
import { openModal } from "../../../ui/primitives/modal.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { AdminSettlementList } from "../components/adminSettlementList.js";
import { adminSessionService } from "../services/adminSessionService.js";
import { adminSettlementService } from "../services/adminSettlementService.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";

export function AdminSettlementsPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const state = {
    isUpdatingId: null,
    query: createSettlementsQuery(),
  };

  const rerender = () => render(root, currentContext, state, actions);

  const actions = {
    applyFilters(nextFilters = {}) {
      state.query = {
        ...state.query,
        ...nextFilters,
        page: 1,
      };
      syncSettlementsUrl(state.query);
      rerender();
    },
    changePage(nextPage) {
      state.query = {
        ...state.query,
        page: nextPage,
      };
      syncSettlementsUrl(state.query);
      rerender();
    },
    changePerPage(nextPerPage) {
      state.query = {
        ...state.query,
        page: 1,
        pageSize: nextPerPage,
      };
      syncSettlementsUrl(state.query);
      rerender();
    },
    viewDetail(settlement) {
      contextNavigate(currentContext, buildSettlementsPath({
        ...state.query,
        settlementId: settlement.id,
      }));
    },
    async updateStatus(settlement, status) {
      state.isUpdatingId = settlement.id;
      rerender();

      try {
        const updated = status === "settled"
          ? await adminSessionService.settleSettlement(settlement.id, { status })
          : await adminSessionService.cancelSettlement(settlement.id, { status });
        const nextSettlement = updated ?? { ...settlement, status };
        syncBusinessSettlement(nextSettlement, {
          primaryRole: "admin",
          source: "admin-settlements:status-snapshot-upsert",
        });
        showToast(`Settlement batch berhasil ditandai ${status}.`, { type: "success" });
      } catch (error) {
        showToast(error.message || "Gagal memperbarui status settlement.", { type: "error" });
      } finally {
        state.isUpdatingId = null;
        rerender();
      }
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      state.query = createSettlementsQuery(context?.query);
    },
    mount(context) {
      currentContext = context;
      root = document.createElement("div");
      rerender();
      return root;
    },
    hydrate(context) {
      currentContext = context;
      state.query = createSettlementsQuery(context?.query);
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
  if (!root || !context) {
    return;
  }

  const filters = { ...state.query };
  const workingPayload = appStore.get("working.adminSettlements.settlements.data", null);
  const snapshotPayload = appStore.get("snapshot.admin.settlements.data", null);
  const payload = workingPayload ?? snapshotPayload ?? { settlements: [], meta: {} };
  const hydratedAt = appStore.get("working.adminSettlements.settlements.hydratedAt", 0) ?? 0;
  const hasSource = Boolean(workingPayload || snapshotPayload);
  const allSettlements = adminSettlementService.normalizedSettlements(payload.settlements ?? []);
  const settlements = adminSettlementService.filterSettlements(allSettlements, filters);
  const currentPage = Math.max(1, Number(filters.page || 1));
  const currentPageSize = Math.max(1, Number(filters.pageSize || 10));
  const totalItems = settlements.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / currentPageSize));
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * currentPageSize;
  const pagedSettlements = settlements.slice(pageStart, pageStart + currentPageSize);
  const summary = adminSettlementService.summarize(allSettlements);
  const detailPayload = appStore.get("working.adminSettlements.detail.data", null);
  const selectedDetailId = state.query.settlementId ?? "";

  const frame = document.createElement("section");
  frame.id = "adst_page_section";
  frame.className = "mx-auto grid min-w-0 w-full max-w-[1240px] gap-6";

  const dashboardButton = Button({
    label: "Ledger komisi",
    variant: "secondary",
    onClick: () => context.router?.navigate("/admin/affiliate-commissions"),
    designHook: "shared.button.secondary",
  });
  dashboardButton.id = "adst_dashboard_button";
  dashboardButton.prepend(createIcon("dashboard", { className: "h-4 w-4" }));

  frame.append(
    settlementsHero({ action: dashboardButton, summary }),
    applyDesignHook(settlementsSummary(summary), "admin.settlements.summary"),
    applyDesignHook(settlementFilterBar(filters, summary, actions), "admin.settlements.filters"),
  );

  frame.append(applyDesignHook(AdminSettlementList({
    loading: !hydratedAt && !hasSource,
    settlements: pagedSettlements,
    page: safePage,
    perPage: currentPageSize,
    totalItems,
    isUpdatingId: state.isUpdatingId,
    onView: (settlement) => actions.viewDetail(settlement),
    onMarkSettled: (settlement) => actions.updateStatus(settlement, "settled"),
    onCancel: (settlement) => actions.updateStatus(settlement, "cancelled"),
    onPageChange: (nextPage) => actions.changePage(nextPage),
    onPerPageChange: (nextPerPage) => actions.changePerPage(nextPerPage),
  }), "admin.settlements.list"));

  renderSettlementDetailModal({
    detail: detailPayload,
    selectedDetailId,
    fallback: allSettlements.find((settlement) => String(settlement.id) === String(selectedDetailId)) ?? null,
    query: state.query,
    onClose: () => {
      state.query = { ...state.query, settlementId: "" };
      syncSettlementsUrl(state.query);
    },
  });

  replaceStableFrame(root, frame);
}

function settlementsHero({ action, summary = {} }) {
  const section = document.createElement("section");
  section.id = "adst_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(255,247,237,0.86),rgba(240,253,250,0.74))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-shadow duration-150 sm:p-6 lg:p-7";

  const layout = document.createElement("div");
  layout.className = "relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-3";

  const icon = document.createElement("div");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#14b8a6,#f97316)] text-white shadow-[0_16px_40px_rgba(20,184,166,0.20)]";
  icon.append(createIcon("commission", { className: "h-5 w-5" }));

  copy.append(
    icon,
    textNode("p", "text-xs font-black uppercase tracking-[0.18em] text-orange-700", "Admin settlement desk"),
    textNode("h1", "max-w-2xl text-3xl font-black leading-tight tracking-normal text-gray-950 sm:text-4xl", "Admin Settlements"),
    textNode("p", "max-w-2xl text-sm leading-6 text-gray-600", "Monitoring batch settlement affiliate, nilai pending, dan finalisasi manual dari satu layar operasional."),
  );

  const stats = document.createElement("section");
  stats.id = "adst_hero_stats_section";
  stats.className = "grid gap-2 sm:grid-cols-3 lg:min-w-[360px]";
  [
    ["Batch", summary.totalBatches ?? 0],
    ["Pending", summary.pendingBatches ?? 0],
    ["Settled", summary.settledBatches ?? 0],
  ].forEach(([label, value]) => {
    const card = document.createElement("section");
    card.id = `adst_hero_stat_${String(label).toLowerCase()}_section`;
    card.className = "rounded-[1.25rem] border border-white/80 bg-white/78 p-3 shadow-sm";
    card.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textNode("p", "text-2xl font-black text-gray-950", String(value)),
    );
    stats.append(card);
  });

  const side = document.createElement("div");
  side.className = "grid gap-3";
  side.append(stats, action);

  layout.append(copy, side);
  section.append(layout);
  return section;
}

function settlementsSummary(summary = {}) {
  const section = document.createElement("section");
  section.id = "adst_summary_section";
  section.className = "grid gap-3 sm:grid-cols-2 xl:grid-cols-4";

  adminSettlementService.summaryCardsFromSummary(summary).forEach((item, index) => {
    const card = document.createElement("section");
    card.id = `adst_summary_${item.key}_section`;
    card.className = [
      "grid gap-2 rounded-[1.5rem] border p-4 shadow-[0_16px_45px_rgba(15,23,42,0.06)] backdrop-blur transition-shadow duration-150",
      summaryCardTone(index),
    ].join(" ");
    card.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", item.label),
      textNode("p", "break-words text-xl font-black text-gray-950", item.value),
      textNode("p", "text-sm leading-6 text-gray-500", item.helper),
    );
    section.append(card);
  });

  return section;
}

function summaryCardTone(index) {
  return [
    "border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,247,237,0.92),rgba(255,255,255,0.86))]",
    "border-amber-100/80 bg-[linear-gradient(135deg,rgba(254,243,199,0.78),rgba(255,255,255,0.86))]",
    "border-teal-100/80 bg-[linear-gradient(135deg,rgba(204,251,241,0.72),rgba(255,255,255,0.86))]",
    "border-sky-100/80 bg-[linear-gradient(135deg,rgba(219,234,254,0.78),rgba(255,255,255,0.86))]",
  ][index % 4];
}

function settlementFilterBar(filters, summary, actions) {
  const section = document.createElement("section");
  section.id = "adst_filter_section";
  section.className = "grid min-w-0 gap-4 rounded-[var(--pb-radius-2xl)] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(239,246,255,0.72),rgba(255,247,237,0.72))] p-3 shadow-[var(--pb-shadow-card)] backdrop-blur-xl transition-shadow duration-150 xl:p-4";

  const heading = document.createElement("div");
  heading.className = "flex min-w-0 items-start gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#2563eb,#06b6d4)] text-white shadow-[0_14px_34px_rgba(37,99,235,0.20)]";
  icon.append(createIcon("filter", { className: "h-4 w-4" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textNode("p", "text-[11px] font-black uppercase tracking-[0.16em] text-blue-700", "Settlement filter"),
    textNode("p", "text-sm leading-6 text-gray-600", "Cari batch, affiliate, referral code, atau catatan lalu saring status finalisasi."),
  );
  heading.append(icon, copy);

  const form = document.createElement("form");
  form.id = "adst_filter_form_section";
  form.className = "grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px_auto]";

  const keyword = document.createElement("input");
  keyword.id = "adst_keyword_input";
  keyword.name = "keyword";
  keyword.value = filters.keyword ?? "";
  keyword.placeholder = "Cari affiliate, referral, batch, catatan";
  keyword.className = "max-h-[50px] min-h-10 min-w-0 w-full rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-sm text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";

  const status = document.createElement("select");
  status.id = "adst_status_input";
  status.name = "status";
  status.className = keyword.className;
  [
    ["", "Semua status"],
    ["pending", "Pending"],
    ["settled", "Settled"],
    ["cancelled", "Cancelled"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === (filters.status ?? "");
    status.append(option);
  });

  const actionsWrap = document.createElement("div");
  actionsWrap.className = "grid gap-2 sm:grid-cols-2 lg:grid-cols-1";
  const submit = Button({ label: "Terapkan", variant: "primary" });
  submit.id = "adst_apply_filter_button";
  submit.type = "submit";
  submit.prepend(createIcon("search", { className: "h-4 w-4" }));
  const reset = Button({
    label: "Reset",
    variant: "secondary",
    onClick: () => actions.applyFilters({ keyword: "", status: "" }),
  });
  reset.id = "adst_reset_filter_button";
  reset.type = "button";
  actionsWrap.append(submit, reset);

  form.append(labelWrap("Keyword", keyword), labelWrap("Status", status), actionsWrap);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    actions.applyFilters({
      keyword: keyword.value.trim(),
      status: status.value,
    });
  });

  const chips = document.createElement("section");
  chips.id = "adst_filter_chips_section";
  chips.className = "flex flex-wrap gap-2 border-t border-white/60 pt-4";
  [
    `${summary.totalBatches ?? 0} batch`,
    `${summary.pendingBatches ?? 0} pending`,
    `${summary.settledBatches ?? 0} settled`,
    `${summary.cancelledBatches ?? 0} cancelled`,
  ].forEach((label) => {
    const chip = document.createElement("span");
    chip.className = "max-w-full break-words rounded-full border border-[var(--pb-border)] bg-[var(--pb-chip-bg)] px-4 py-2 text-sm font-semibold text-[var(--pb-chip-text)] shadow-[var(--pb-shadow-soft)]";
    chip.textContent = label;
    chips.append(chip);
  });

  section.append(heading, form, chips);
  return section;
}

function labelWrap(label, control) {
  const node = document.createElement("label");
  node.className = "grid gap-1 text-sm font-medium text-[var(--pb-text-strong)]";
  node.textContent = label;
  node.append(control);
  return node;
}

function buildSettlementsPath({ keyword = "", status = "", page = "", pageSize = "", settlementId = "" } = {}) {
  const params = new URLSearchParams();

  if (keyword) {
    params.set("keyword", keyword);
  }

  if (status) {
    params.set("status", status);
  }

  if (page && Number(page) > 1) {
    params.set("page", String(page));
  }

  if (pageSize && Number(pageSize) > 0) {
    params.set("page_size", String(pageSize));
  }

  if (settlementId) {
    params.set("settlement_id", String(settlementId));
  }

  const query = params.toString();
  return query ? `/admin/settlements?${query}` : "/admin/settlements";
}

function createSettlementsQuery(query = {}) {
  return {
    keyword: query.keyword ?? "",
    status: query.status ?? "",
    page: Math.max(1, Number(query.page || 1)),
    pageSize: Math.max(1, Number(query.page_size || query.pageSize || 10)),
    settlementId: query.settlement_id ?? query.settlementId ?? "",
  };
}

function syncSettlementsUrl(query) {
  const nextHash = `#${buildSettlementsPath(query)}`;
  const url = new URL(window.location.href);
  url.hash = nextHash;
  window.history.replaceState(window.history.state, "", url);
}

function contextNavigate(context, path) {
  if (context?.router?.navigate) {
    context.router.navigate(path);
  }
}

function renderSettlementDetailModal({ detail, selectedDetailId, fallback, query, onClose }) {
  if (!selectedDetailId) {
    return;
  }

  const settlement = detail || fallback;
  const content = settlement
    ? settlementDetailContent(settlement)
    : textNode("p", "text-sm font-semibold text-gray-600", "Detail settlement sedang dimuat dari working preload.");

  openModal(content, {
    key: `admin-settlement-detail-${selectedDetailId}`,
    title: settlement ? `Detail settlement #${settlement.id}` : "Detail settlement",
    description: "Items ledger, metadata pembayaran, dan history status batch affiliate.",
    size: "xl",
    closeLabel: "Tutup",
    preserveContentOnSameSignature: true,
    contentSignature: settlement
      ? `${settlement.id}:${settlement.status}:${settlement.updated_at ?? ""}:${settlement.histories?.length ?? 0}:${settlement.items?.length ?? 0}`
      : `loading:${selectedDetailId}`,
    onClose,
  });
}

function settlementDetailContent(settlement) {
  const wrap = document.createElement("div");
  wrap.id = `adst_settlement_detail_${settlement.id}`;
  wrap.className = "grid min-w-0 gap-5";

  const meta = document.createElement("section");
  meta.className = "grid min-w-0 gap-3 rounded-[var(--pb-radius-2xl)] border border-[var(--pb-border)] bg-white/85 p-4 sm:grid-cols-2";
  [
    ["Status", settlement.status],
    ["Nominal", adminSettlementService.normalizedSettlements([settlement])[0]?.requestedAmountLabel ?? "-"],
    ["Metode", settlement.payment_method || "-"],
    ["Referensi", settlement.payment_reference || "-"],
    ["Catatan", settlement.payment_note || settlement.notes || "-"],
    ["Proof URL", settlement.proof_file_url || "-"],
    ["Paid by", settlement.paid_by ? `User #${settlement.paid_by}` : "-"],
    ["Paid at", settlement.settled_at || "-"],
    ["Cancelled by", settlement.cancelled_by ? `User #${settlement.cancelled_by}` : "-"],
    ["Cancelled at", settlement.cancelled_at || "-"],
  ].forEach(([label, value]) => meta.append(detailRow(label, value)));

  wrap.append(meta, detailSection("Items ledger", settlementItems(settlement.items ?? [])), detailSection("History status", settlementHistories(settlement.histories ?? [])));
  return wrap;
}

function detailSection(title, content) {
  const section = document.createElement("section");
  section.className = "grid min-w-0 gap-3";
  section.append(textNode("h3", "text-base font-black text-gray-950", title), content);
  return section;
}

function settlementItems(items) {
  if (!items.length) {
    return textNode("p", "rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-white/80 p-3 text-sm font-semibold text-gray-500", "Item ledger tidak tersedia di payload detail.");
  }

  const list = document.createElement("div");
  list.className = "grid min-w-0 gap-2";
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "grid min-w-0 gap-2 rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-white/85 p-3 sm:grid-cols-4";
    row.append(
      detailRow("Ledger", item.ledger_id ? `#${item.ledger_id}` : "-"),
      detailRow("Amount", item.amount_snapshot ?? "-"),
      detailRow("Status", item.ledger_status || "-"),
      detailRow("Transaksi", item.transaction_code || (item.transaction_id ? `#${item.transaction_id}` : "-")),
    );
    list.append(row);
  });
  return list;
}

function settlementHistories(histories) {
  if (!histories.length) {
    return textNode("p", "rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-white/80 p-3 text-sm font-semibold text-gray-500", "History status belum tersedia.");
  }

  const list = document.createElement("div");
  list.className = "grid min-w-0 gap-2";
  histories.forEach((history) => {
    const row = document.createElement("div");
    row.className = "grid min-w-0 gap-2 rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-white/85 p-3 sm:grid-cols-[1fr_1fr_1.2fr]";
    row.append(
      detailRow("Status", `${history.from_status || "-"} -> ${history.to_status || "-"}`),
      detailRow("Actor", history.actor?.name || (history.actor_user_id ? `User #${history.actor_user_id}` : "-")),
      detailRow("Note", history.note || "-"),
    );
    list.append(row);
  });
  return list;
}

function detailRow(label, value) {
  const row = document.createElement("div");
  row.className = "grid min-w-0 gap-1";
  row.append(
    textNode("p", "text-xs font-black uppercase tracking-normal text-gray-500", label),
    textNode("p", "break-words text-sm font-semibold text-gray-900", String(value ?? "-")),
  );
  return row;
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
