import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { carsResource } from "../../../resources/carsResource.js";
import { Button } from "../../../ui/primitives/button.js";
import { Card } from "../../../ui/composites/card.js";
import { DataTablePagination } from "../../../ui/composites/dataTable.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDate } from "../../../utils/formatDate.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { sellerState } from "../state/sellerState.js";
import { sellerAffiliateCommissionService } from "../services/sellerAffiliateCommissionService.js";
import { SellerCommissionGlobalForm } from "../components/sellerCommissionGlobalForm.js";
import { SellerCommissionOverridesList } from "../components/sellerCommissionOverridesList.js";
import { SellerCommissionOverrideForm } from "../components/sellerCommissionOverrideForm.js";
import { SellerCommissionRuleStatusBadge } from "../components/sellerCommissionRuleStatusBadge.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";

const RUNTIME_KEY = "sellerAffiliateCommissions";
const COMMISSION_MODAL_KEY = "slrafc-commission-modal";
const DEFAULT_RUNTIME = {
  globalSaving: false,
  overrideSaving: false,
  globalError: "",
  overrideError: "",
  query: {
    keyword: "",
    status: "",
    type: "",
    period: "",
    page: 1,
    pageSize: 10,
  },
};

export function SellerAffiliateCommissionsPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;

  const rerender = () => render(root, currentContext, actions);

  const actions = {
    openGlobalRule() {
      runtimeReset();
      currentContext?.router?.navigate(buildPath({ mode: "global" }));
    },
    createOverride() {
      runtimeReset();
      currentContext?.router?.navigate(buildPath({ mode: "create" }));
    },
    detailOverride(rule) {
      runtimeReset();
      currentContext?.router?.navigate(buildPath({ ruleId: rule.id, mode: "detail" }));
    },
    editOverride(rule) {
      runtimeReset();
      currentContext?.router?.navigate(buildPath({ ruleId: rule.id, mode: "edit" }));
    },
    closeDetail() {
      runtimeReset();
      currentContext?.router?.navigate("/seller/affiliate-commissions");
    },
    applyFilters(nextFilters) {
      setRuntime({
        query: {
          ...runtimeState().query,
          ...nextFilters,
          page: 1,
        },
      });
    },
    changePage(nextPage) {
      setRuntime({
        query: {
          ...runtimeState().query,
          page: nextPage,
        },
      });
    },
    changePerPage(nextPageSize) {
      setRuntime({
        query: {
          ...runtimeState().query,
          page: 1,
          pageSize: nextPageSize,
        },
      });
    },
    async saveGlobalRule(payload) {
      setRuntime({ globalSaving: true, globalError: "" });

      try {
        await sellerAffiliateCommissionService.saveGlobalRule(payload);
        await refreshWorkingState(currentContext, currentContext?.query?.rule_id ?? null);
        syncCommissionSnapshot();
        setRuntime({ globalSaving: false, globalError: "" });
        showToast("Aturan komisi umum berhasil disimpan.", { type: "success" });
        currentContext?.router?.navigate("/seller/affiliate-commissions");
      } catch (error) {
        setRuntime({
          globalSaving: false,
          globalError: error?.message ?? "Aturan komisi umum gagal disimpan.",
        });
        showToast(error?.message ?? "Aturan komisi umum gagal disimpan.", { type: "error" });
      }
    },
    async saveOverride(payload) {
      const mode = currentMode(currentContext);
      const ruleId = currentContext?.query?.rule_id ?? "";
      setRuntime({ overrideSaving: true, overrideError: "" });

      try {
        const rule = mode === "edit" && ruleId
          ? await sellerAffiliateCommissionService.updateOverride(ruleId, payload)
          : await sellerAffiliateCommissionService.createOverride(payload);

        await refreshWorkingState(currentContext, rule?.id ?? null);
        syncCommissionSnapshot();
        setRuntime({ overrideSaving: false, overrideError: "" });
        showToast(mode === "edit" ? "Aturan khusus berhasil diperbarui." : "Aturan khusus berhasil dibuat.", { type: "success" });
        currentContext?.router?.navigate(buildPath({ ruleId: rule?.id, mode: "detail" }));
      } catch (error) {
        setRuntime({
          overrideSaving: false,
          overrideError: error?.message ?? "Aturan khusus gagal disimpan.",
        });
        showToast(error?.message ?? "Aturan khusus gagal disimpan.", { type: "error" });
      }
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      ensureRuntime();
      runtimeReset();
    },
    mount(context) {
      currentContext = context;
      ensureRuntime();
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
      closeCommissionModal();
      unsubscribe = null;
      appStore.destroyRuntimeState(RUNTIME_KEY);
    },
  });
}

function render(root, context, actions) {
  if (!root || !context) {
    return;
  }

  const snapshotPayload = sellerState.snapshot("affiliateCommissionRules", { global_rule: null, overrides: [], meta: {} });
  const workingPayload = sellerState.working("sellerAffiliateCommissions", "rules", snapshotPayload);
  const carsSnapshot = sellerState.snapshot("cars", { cars: [] });
  const carsPayload = sellerState.working("sellerAffiliateCommissions", "cars", carsSnapshot);
  const payload = workingPayload ?? snapshotPayload ?? { global_rule: null, overrides: [], meta: {} };
  const overrides = payload.overrides ?? [];
  const globalRule = payload.global_rule ?? null;
  const cars = carsPayload?.cars ?? carsSnapshot?.cars ?? [];
  const rulesHydratedAt = appStore.get("working.sellerAffiliateCommissions.rules.hydratedAt", 0) ?? 0;
  const carsHydratedAt = appStore.get("working.sellerAffiliateCommissions.cars.hydratedAt", 0) ?? 0;
  const runtime = runtimeState();
  const query = runtime.query ?? DEFAULT_RUNTIME.query;
  const filteredOverrides = filterOverrides(overrides, query);
  const pageSize = Math.max(1, Number(query.pageSize || 10));
  const totalPages = Math.max(1, Math.ceil(filteredOverrides.length / pageSize));
  const safePage = Math.min(Math.max(1, Number(query.page || 1)), totalPages);
  const pagedOverrides = filteredOverrides.slice((safePage - 1) * pageSize, safePage * pageSize);
  const summary = sellerAffiliateCommissionService.summary({ globalRule, overrides });
  const mode = currentMode(context);
  const selectedOverride = sellerAffiliateCommissionService.resolveSelectedOverride({
    overrides,
    ruleId: context.query.rule_id ?? "",
  });
  const availableCars = sellerAffiliateCommissionService.eligibleCars(cars, overrides, context.query.rule_id ?? "");

  const frame = document.createElement("section");
  frame.id = "slrafc_page";
  frame.className = "grid min-w-0 gap-5";
  frame.dataset.ds = "seller.commissions.page";
  frame.append(
    commissionsHero({ summary, actions }),
    applyDesignHook(summaryCards(summary, globalRule), "seller.commissions.summary"),
    filterBar({ query, overrides, onChange: actions.applyFilters }),
  );

  const layout = document.createElement("div");
  layout.id = "slrafc_content_section";
  layout.className = "grid gap-6";

  const left = document.createElement("div");
  left.className = "grid gap-4";
  left.append(applyDesignHook(priorityPanel(), "seller.commissions.priority"));

  if (!rulesHydratedAt && !(snapshotPayload?.global_rule || snapshotPayload?.overrides?.length)) {
    left.append(EmptyState({
      title: "Memuat aturan komisi affiliate",
      description: "Snapshot dan working set komisi marketing seller sedang disiapkan.",
    }));
  } else {
    left.append(applyDesignHook(SellerCommissionOverridesList({
      overrides: pagedOverrides,
      totalItems: filteredOverrides.length,
      loading: false,
      onDetail: (rule) => actions.detailOverride(rule),
      onEdit: (rule) => actions.editOverride(rule),
      pagination: filteredOverrides.length > pageSize
        ? DataTablePagination({
          page: safePage,
          totalPages,
          totalItems: filteredOverrides.length,
          perPage: pageSize,
          itemLabel: "aturan",
          onChange: (nextPage) => actions.changePage(nextPage),
          onPerPageChange: (nextPageSize) => actions.changePerPage(nextPageSize),
          onJump: (nextPage) => actions.changePage(nextPage),
          buttonIds: {
            previous: "slrafc_pagination_previous_button",
            next: "slrafc_pagination_next_button",
            jump: "slrafc_pagination_jump_button",
            page: (page) => `slrafc_pagination_page_${page}_button`,
          },
          inputIds: {
            perPage: "slrafc_pagination_page_size_input",
            jump: "slrafc_pagination_jump_input",
          },
        })
        : null,
    }), "seller.commissions.overrides"));
  }

  frame.append(layout);
  layout.append(left);
  root.replaceChildren(frame);

  if (mode === "detail" && selectedOverride) {
    openDetailModal({ rule: selectedOverride, actions });
  } else if (mode === "global") {
    openGlobalRuleModal({ globalRule, runtime, actions });
  } else if (mode === "create" || mode === "edit") {
    openOverrideFormModal({
      mode,
      selectedOverride,
      availableCars,
      carsSnapshot,
      carsHydratedAt,
      runtime,
      actions,
    });
  } else {
    closeCommissionModal();
  }
}

function summaryCards(summary, globalRule) {
  const section = document.createElement("section");
  section.id = "slrafc_summary_section";
  section.className = "grid gap-3 sm:grid-cols-2 xl:grid-cols-4";

  [
    ["Aturan umum", summary.hasGlobalRule ? sellerAffiliateCommissionService.formatValue(globalRule) : "Belum diatur", "Fallback komisi bila tidak ada aturan khusus aktif."],
    ["Status umum", summary.hasGlobalRule ? (summary.activeGlobalRule ? "Aktif" : "Nonaktif") : "Belum ada", "Status aturan dasar seller."],
    ["Khusus aktif", String(summary.activeOverrides), "Aturan per mobil yang sedang aktif."],
    ["Total khusus", String(summary.totalOverrides), "Jumlah aturan khusus dari data lokal."],
  ].forEach(([label, value, note], index) => {
    const card = document.createElement("section");
    card.id = `slrafc_summary_${slugify(label)}_section`;
    card.className = [
      "grid gap-2 rounded-[1.5rem] border p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl",
      summaryCardClass(index),
    ].join(" ");
    card.append(
      textBlock("text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textBlock("text-2xl font-black text-gray-950", value),
      textBlock("text-sm leading-6 text-gray-600", note),
    );
    section.append(card);
  });

  return section;
}

function commissionsHero({ summary, actions }) {
  const section = document.createElement("section");
  section.id = "slrafc_header";
  section.className = "relative overflow-hidden rounded-[2rem] border border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,237,0.84),rgba(240,253,250,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 lg:p-7";
  section.dataset.ds = "seller.commissions.hero";

  const layout = document.createElement("section");
  layout.className = "grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";
  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f97316,#14b8a6)] text-white shadow-[0_16px_40px_rgba(249,115,22,0.22)]";
  icon.append(createIcon("commission", { className: "h-5 w-5" }));
  copy.append(
    icon,
    textBlock("p", "text-xs font-black uppercase tracking-[0.18em] text-orange-700", "Seller commission desk"),
    textBlock("h1", "max-w-3xl text-3xl font-black leading-tight tracking-normal text-gray-950 sm:text-4xl", "Komisi Marketing"),
    textBlock("p", "max-w-2xl text-sm leading-6 text-gray-600", "Pantau komisi dari referral affiliate, status pembayaran, dan riwayat performa."),
  );

  const stats = document.createElement("section");
  stats.className = "grid gap-2 sm:grid-cols-3 lg:min-w-[420px]";
  [
    ["Umum", summary.activeGlobalRule ? "Aktif" : "Nonaktif"],
    ["Khusus", summary.totalOverrides],
    ["Aktif", summary.activeOverrides],
  ].forEach(([label, value]) => {
    const stat = document.createElement("section");
    stat.className = "rounded-[1.25rem] border border-white/80 bg-white/78 p-3 shadow-sm";
    stat.append(
      textBlock("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textBlock("p", "text-2xl font-black text-gray-950", String(value)),
    );
    stats.append(stat);
  });

  layout.append(copy, heroActions(actions));
  section.append(layout, stats);
  return section;
}

function heroActions(actions) {
  const wrap = document.createElement("section");
  wrap.id = "slrafc_header_actions_section";
  wrap.className = "grid gap-2 sm:grid-cols-2 lg:min-w-[360px]";

  const global = Button({ label: "Atur komisi umum", onClick: () => actions.openGlobalRule(), designHook: "shared.button.primary" });
  global.id = "slrafc_global_rule_button";
  global.classList.add("min-h-11", "w-full", "px-5");
  global.prepend(createIcon("settings", { className: "h-4 w-4" }));

  const special = Button({ label: "Tambah aturan khusus", onClick: () => actions.createOverride(), designHook: "shared.button.primary" });
  special.id = "slrafc_create_button";
  special.classList.add("min-h-11", "w-full", "px-5");
  special.prepend(createIcon("plus", { className: "h-4 w-4" }));

  wrap.append(global, special);
  return wrap;
}

function filterBar({ query, overrides, onChange }) {
  const section = document.createElement("section");
  section.id = "slrafc_filter_section";
  section.className = "grid gap-3 rounded-[1.5rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_180px_180px_180px] lg:items-end";
  section.dataset.ds = "seller.commissions.filters";

  const searchWrap = fieldWrap("Cari komisi");
  const search = document.createElement("input");
  search.id = "slrafc_search_input";
  search.value = query.keyword ?? "";
  search.placeholder = "Mobil, status, tipe komisi";
  search.className = controlClassName();
  search.addEventListener("input", () => onChange?.({ keyword: search.value }));
  searchWrap.append(search);

  const statusWrap = fieldWrap("Status");
  const status = document.createElement("select");
  status.id = "slrafc_status_filter";
  status.className = controlClassName();
  [
    ["", `Semua (${overrides.length})`],
    ["active", `Aktif (${overrides.filter((rule) => rule.status === "active").length})`],
    ["inactive", `Nonaktif (${overrides.filter((rule) => rule.status === "inactive").length})`],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = String(query.status ?? "") === value;
    status.append(option);
  });
  status.addEventListener("change", () => onChange?.({ status: status.value }));
  statusWrap.append(status);

  const typeWrap = fieldWrap("Tipe");
  const type = document.createElement("select");
  type.id = "slrafc_type_filter";
  type.className = controlClassName();
  [
    ["", "Semua tipe"],
    ["percent", "Persentase"],
    ["flat", "Nominal"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = String(query.type ?? "") === value;
    type.append(option);
  });
  type.addEventListener("change", () => onChange?.({ type: type.value }));
  typeWrap.append(type);

  const periodWrap = fieldWrap("Periode");
  const period = document.createElement("select");
  period.id = "slrafc_period_filter";
  period.className = controlClassName();
  [
    ["", "Semua waktu"],
    ["30", "30 hari"],
    ["90", "90 hari"],
    ["365", "12 bulan"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = String(query.period ?? "") === value;
    period.append(option);
  });
  period.addEventListener("change", () => onChange?.({ period: period.value }));
  periodWrap.append(period);

  section.append(searchWrap, statusWrap, typeWrap, periodWrap);
  return section;
}

function priorityPanel() {
  const card = Card([], { variant: "raised" });
  card.classList.add("grid", "gap-3");

  const top = document.createElement("div");
  top.className = "flex flex-wrap items-center gap-2";
  top.append(
    Badge({ label: "Prioritas aturan", variant: "info" }),
    textBlock("text-sm font-semibold text-gray-900", "Aturan khusus per mobil selalu diprioritaskan"),
  );

  card.append(
    top,
    textBlock(`text-sm ${tw.text.muted}`, sellerAffiliateCommissionService.priorityCopy()),
  );

  return card;
}

async function refreshWorkingState(context, selectedRuleId = null) {
  const [rules, cars] = await Promise.all([
    sellerAffiliateCommissionService.list({ limit: 50 }),
    carsResource.sellerList({ limit: 100 }).catch(() => ({ cars: [] })),
  ]);

  appStore.patchState("working.sellerAffiliateCommissions.rules", {
    data: rules,
    hydratedAt: Date.now(),
  }, "seller-affiliate-commissions:refresh-rules");
  appStore.patchState("working.sellerAffiliateCommissions.cars", {
    data: cars,
    hydratedAt: Date.now(),
  }, "seller-affiliate-commissions:refresh-cars");

  const ruleId = selectedRuleId ?? context?.query?.rule_id ?? null;
  if (ruleId && !rules.overrides?.some((rule) => Number(rule.id) === Number(ruleId))) {
    context?.router?.navigate("/seller/affiliate-commissions");
  }
}

function syncCommissionSnapshot() {
  const workingPayload = appStore.get("working.sellerAffiliateCommissions.rules.data", { global_rule: null, overrides: [], meta: {} }) ?? { global_rule: null, overrides: [], meta: {} };
  appStore.patchState("snapshot.seller.affiliateCommissionRules", {
    data: workingPayload,
    fetchedAt: Date.now(),
    ttl: 120,
    version: "seller-affiliate-commission-rules-v1",
    stale: false,
  }, "seller-affiliate-commissions:snapshot-sync");
}

function ensureRuntime() {
  if (!appStore.get(`runtime.${RUNTIME_KEY}`, null)) {
    appStore.patchState(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME, "seller-affiliate-commissions:runtime-init");
  }
}

function runtimeState() {
  return appStore.get(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME) ?? DEFAULT_RUNTIME;
}

function setRuntime(patch = {}) {
  appStore.patchState(`runtime.${RUNTIME_KEY}`, {
    ...runtimeState(),
    ...patch,
  }, "seller-affiliate-commissions:runtime");
}

function runtimeReset() {
  setRuntime({
    globalSaving: false,
    overrideSaving: false,
    globalError: "",
    overrideError: "",
  });
}

function buildPath({ ruleId = "", mode = "" } = {}) {
  const params = new URLSearchParams();

  if (ruleId) {
    params.set("rule_id", String(ruleId));
  }

  if (mode) {
    params.set("mode", mode);
  }

  const query = params.toString();
  return query ? `/seller/affiliate-commissions?${query}` : "/seller/affiliate-commissions";
}

function currentMode(context) {
  const mode = String(context?.query?.mode ?? "");
  if (mode === "global" || mode === "create" || mode === "edit" || mode === "detail") {
    return mode;
  }

  return context?.query?.rule_id ? "detail" : "list";
}

function ensureSelectedCar(cars, selectedCar) {
  const list = Array.isArray(cars) ? [...cars] : [];

  if (!selectedCar || list.some((car) => Number(car.id) === Number(selectedCar.id))) {
    return list;
  }

  return [
    {
      id: selectedCar.id,
      brand_name: selectedCar.brand_name,
      model_name: selectedCar.model_name,
      sub_model_name: selectedCar.sub_model_name,
      listing_status: selectedCar.listing_status,
      price_cash: selectedCar.price_cash,
    },
    ...list,
  ];
}

function openDetailModal({ rule, actions }) {
  const content = document.createElement("section");
  content.id = "slrafc_detail_modal_content_section";
  content.className = "grid min-w-0 gap-4";
  content.append(commissionDetailPanel({
    rule,
    onEdit: () => actions.editOverride(rule),
  }));

  openModal(content, {
    key: `${COMMISSION_MODAL_KEY}-detail`,
    title: "Detail komisi affiliate",
    description: "Informasi aturan komisi dari working set halaman tanpa fetch detail tambahan.",
    size: "lg",
    footer: null,
    panelId: "slrafc_detail_modal",
    headerId: "slrafc_detail_modal_header_section",
    bodyId: "slrafc_detail_modal_body_section",
    closeButtonId: "slrafc_detail_modal_close_button",
    onClose: () => actions.closeDetail(),
  });
}

function openGlobalRuleModal({ globalRule, runtime, actions }) {
  const content = document.createElement("section");
  content.id = "slrafc_global_modal_content_section";
  content.className = "grid min-w-0 gap-4";
  content.append(applyDesignHook(SellerCommissionGlobalForm({
    rule: globalRule,
    saving: runtime.globalSaving,
    error: runtime.globalError,
    onSubmit: (payload) => actions.saveGlobalRule(payload),
  }), "seller.commissions.global_form"));

  openModal(content, {
    key: `${COMMISSION_MODAL_KEY}-global`,
    title: "Aturan komisi umum",
    description: "Atur komisi dasar yang dipakai saat mobil tidak memiliki aturan khusus.",
    size: "lg",
    footer: null,
    panelId: "slrafc_global_rule_modal",
    headerId: "slrafc_global_rule_modal_header_section",
    bodyId: "slrafc_global_rule_modal_body_section",
    closeButtonId: "slrafc_global_rule_modal_close_button",
    onClose: () => actions.closeDetail(),
    preserveContentOnSameSignature: true,
    contentSignature: [
      "global",
      globalRule?.id ?? "new",
      runtime.globalSaving ? "saving" : "idle",
      runtime.globalError ?? "",
    ].join("|"),
  });
}

function openOverrideFormModal({ mode, selectedOverride, availableCars, carsSnapshot, carsHydratedAt, runtime, actions }) {
  const content = document.createElement("section");
  content.id = mode === "edit" ? "slrafc_edit_modal_content_section" : "slrafc_create_modal_content_section";
  content.className = "grid min-w-0 gap-4";

  if (!carsHydratedAt && !(carsSnapshot?.cars?.length)) {
    content.append(EmptyState({
      title: "Memuat daftar mobil seller",
      description: "Daftar mobil seller sedang dihydrate untuk form aturan khusus.",
    }));
  } else {
    content.append(applyDesignHook(SellerCommissionOverrideForm({
      rule: mode === "edit" ? selectedOverride : null,
      cars: mode === "edit" && selectedOverride?.car
        ? ensureSelectedCar(availableCars, selectedOverride.car)
        : availableCars,
      mode,
      saving: runtime.overrideSaving,
      error: runtime.overrideError,
      onSubmit: (payload) => actions.saveOverride(payload),
      onCreateNew: () => actions.createOverride(),
    }), "seller.commissions.override_form"));
  }

  openModal(content, {
    key: `${COMMISSION_MODAL_KEY}-${mode}`,
    title: mode === "edit" ? "Edit aturan khusus" : "Tambah aturan khusus",
    description: "Atur komisi khusus untuk mobil tertentu dari data yang sudah tersedia di halaman.",
    size: "lg",
    footer: null,
    panelId: mode === "edit" ? "slrafc_edit_modal" : "slrafc_create_modal",
    headerId: "slrafc_override_modal_header_section",
    bodyId: "slrafc_override_modal_body_section",
    closeButtonId: "slrafc_override_modal_close_button",
    onClose: () => actions.closeDetail(),
    preserveContentOnSameSignature: true,
    contentSignature: [
      mode,
      selectedOverride?.id ?? "new",
      runtime.overrideSaving ? "saving" : "idle",
      runtime.overrideError ?? "",
      carsHydratedAt ? "cars-ready" : "cars-loading",
    ].join("|"),
  });
}

function closeCommissionModal() {
  const modal = appStore.get("ui.modal", null);
  if (String(modal?.key ?? "").startsWith(COMMISSION_MODAL_KEY)) {
    closeModal({ notify: false });
  }
}

function commissionDetailPanel({ rule, onEdit }) {
  const section = document.createElement("section");
  section.id = "slrafc_detail_panel_section";
  section.className = "grid min-w-0 gap-4";

  const header = document.createElement("section");
  header.className = "grid gap-3 rounded-[1.5rem] border border-white/80 bg-[var(--pb-surface-inset)] p-4";
  header.append(
    textBlock("p", "text-2xl font-black text-gray-950", sellerAffiliateCommissionService.carLabel(rule.car)),
    textBlock("p", "text-sm font-semibold text-gray-600", "Aturan komisi ini berlaku untuk transaksi referral pada mobil terkait."),
    SellerCommissionRuleStatusBadge(rule.status),
  );

  const facts = document.createElement("section");
  facts.className = "grid gap-3 sm:grid-cols-2";
  [
    ["Marketing", "Semua marketing seller"],
    ["Kode referral", "Mengikuti slug affiliate pada transaksi"],
    ["Transaksi / mobil", sellerAffiliateCommissionService.carLabel(rule.car)],
    ["Nilai transaksi", rule.car?.price_cash ? formatCurrency(rule.car.price_cash) : "-"],
    ["Tipe komisi", labelize(rule.commission_type)],
    ["Nominal/rate komisi", sellerAffiliateCommissionService.formatValue(rule)],
    ["Status komisi", rule.status || "-"],
    ["Tanggal dibuat", formatDate(rule.created_at)],
    ["Tanggal diupdate", formatDate(rule.updated_at)],
    ["Catatan settlement", "Settlement mengikuti ledger canon setelah transaksi paid."],
  ].forEach(([label, value]) => {
    const item = document.createElement("section");
    item.className = "grid gap-1 rounded-[1.25rem] border border-[var(--pb-border)] bg-white/82 p-3";
    item.append(
      textBlock("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textBlock("p", "break-words text-sm font-semibold text-gray-900", value),
    );
    facts.append(item);
  });

  const actions = document.createElement("section");
  actions.className = "flex flex-wrap gap-2";
  const edit = Button({ label: "Edit aturan", variant: "primary", onClick: onEdit, designHook: "shared.button.primary" });
  edit.id = "slrafc_detail_edit_button";
  edit.prepend(createIcon("edit", { className: "h-4 w-4" }));
  actions.append(edit);

  section.append(header, facts, actions);
  return section;
}

function filterOverrides(overrides, query) {
  const keyword = String(query.keyword ?? "").trim().toLowerCase();
  const status = String(query.status ?? "");
  const type = String(query.type ?? "");
  const periodDays = Number(query.period || 0);
  const minTime = periodDays > 0 ? Date.now() - (periodDays * 24 * 60 * 60 * 1000) : 0;

  return overrides.filter((rule) => {
    const statusMatch = !status || rule.status === status;
    const typeMatch = !type || rule.commission_type === type;
    const haystack = [
      sellerAffiliateCommissionService.carLabel(rule.car),
      rule.car?.listing_status,
      rule.status,
      rule.commission_type,
      sellerAffiliateCommissionService.formatValue(rule),
    ].filter(Boolean).join(" ").toLowerCase();
    const keywordMatch = !keyword || haystack.includes(keyword);
    const dateValue = Date.parse(rule.updated_at || rule.created_at || "");
    const periodMatch = !minTime || (Number.isFinite(dateValue) && dateValue >= minTime);
    return statusMatch && typeMatch && keywordMatch && periodMatch;
  });
}

function summaryCardClass(index) {
  return [
    "border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,247,237,0.96),rgba(255,255,255,0.88))]",
    "border-emerald-100/80 bg-[linear-gradient(135deg,rgba(236,253,245,0.96),rgba(255,255,255,0.88))]",
    "border-sky-100/80 bg-[linear-gradient(135deg,rgba(240,249,255,0.96),rgba(255,255,255,0.88))]",
    "border-violet-100/80 bg-[linear-gradient(135deg,rgba(245,243,255,0.96),rgba(255,255,255,0.88))]",
  ][index % 4];
}

function fieldWrap(label) {
  const wrap = document.createElement("label");
  wrap.className = "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700";
  wrap.textContent = label;
  return wrap;
}

function controlClassName() {
  return "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--pb-text)] outline-none transition duration-150 placeholder:text-gray-400 focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
}

function labelize(value) {
  return String(value ?? "-").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function slugify(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "item";
}

function textBlock(tagNameOrClassName, classNameOrText, maybeText) {
  const hasTagName = maybeText !== undefined;
  const node = document.createElement(hasTagName ? tagNameOrClassName : "p");
  const className = hasTagName ? classNameOrText : tagNameOrClassName;
  const text = hasTagName ? maybeText : classNameOrText;
  node.className = className;
  node.textContent = text;
  return node;
}
