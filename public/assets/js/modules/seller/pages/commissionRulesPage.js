import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { Button } from "../../../ui/primitives/button.js";
import { Card } from "../../../ui/composites/card.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { sellerState } from "../state/sellerState.js";
import { sellerCommissionRuleService } from "../services/sellerCommissionRuleService.js";
import { SellerCommissionGlobalForm } from "../components/sellerCommissionGlobalForm.js";
import { SellerCommissionOverridesList } from "../components/sellerCommissionOverridesList.js";
import { SellerCommissionOverrideForm } from "../components/sellerCommissionOverrideForm.js";

const RUNTIME_KEY = "sellerAffiliateCommissions";
const DEFAULT_RUNTIME = {
  savingGlobal: false,
  savingOverride: false,
  globalError: "",
  overrideError: "",
};

export function SellerCommissionRulesPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;

  const rerender = () => render(root, currentContext, actions);

  const actions = {
    createOverride() {
      resetRuntime();
      currentContext?.router?.navigate("/seller/affiliate-commissions?mode=create");
    },
    selectOverride(rule) {
      resetRuntime();
      currentContext?.router?.navigate(buildPath({ ruleId: rule.id }));
    },
    async saveGlobal(payload) {
      setRuntime({ savingGlobal: true, globalError: "" });
      rerender();

      try {
        await sellerCommissionRuleService.saveGlobal(payload);
        await refreshWorkingState();
        syncCommissionSnapshot();
        showToast("Global commission rule berhasil disimpan.", { type: "success" });
      } catch (error) {
        setRuntime({ globalError: error?.message ?? "Global commission rule gagal disimpan." });
        showToast(error?.message ?? "Global commission rule gagal disimpan.", { type: "error" });
      } finally {
        setRuntime({ savingGlobal: false });
        rerender();
      }
    },
    async saveOverride(payload) {
      const selectedRuleId = currentContext?.query?.rule_id ?? "";
      const mode = currentMode(currentContext);
      setRuntime({ savingOverride: true, overrideError: "" });
      rerender();

      try {
        const rule = mode === "edit" && selectedRuleId
          ? await sellerCommissionRuleService.updateOverride(selectedRuleId, payload)
          : await sellerCommissionRuleService.createOverride(payload);

        await refreshWorkingState();
        syncCommissionSnapshot();
        showToast(mode === "edit" ? "Override komisi berhasil diperbarui." : "Override komisi berhasil dibuat.", { type: "success" });
        currentContext?.router?.navigate(buildPath({ ruleId: rule?.id }));
      } catch (error) {
        setRuntime({ overrideError: error?.message ?? "Override komisi gagal disimpan." });
        showToast(error?.message ?? "Override komisi gagal disimpan.", { type: "error" });
      } finally {
        setRuntime({ savingOverride: false });
        rerender();
      }
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      ensureRuntime();
      resetRuntime();
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
  const payload = workingPayload ?? snapshotPayload ?? { global_rule: null, overrides: [], meta: {} };
  const carsSnapshot = sellerState.snapshot("cars", { cars: [] });
  const carsWorking = sellerState.working("sellerAffiliateCommissions", "cars", carsSnapshot);
  const carsPayload = carsWorking ?? carsSnapshot ?? { cars: [] };
  const overrides = payload.overrides ?? [];
  const globalRule = payload.global_rule ?? null;
  const cars = carsPayload.cars ?? [];
  const counts = sellerCommissionRuleService.counts(payload);
  const runtime = runtimeState();
  const selectedOverride = sellerCommissionRuleService.resolveSelectedOverride({
    overrides,
    ruleId: context.query.rule_id ?? "",
  });

  const frame = document.createElement("div");
  frame.className = "grid gap-6";
  frame.append(
    SectionHeader({
      title: "Komisi Affiliate",
      description: "Atur global commission rule dan override per mobil. Override per mobil selalu menang atas global rule.",
      action: Button({ label: "Override baru", onClick: () => actions.createOverride() }),
    }),
    summaryCards(counts),
  );

  const layout = document.createElement("div");
  layout.className = "grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]";

  const left = document.createElement("div");
  left.className = "grid gap-6";
  left.append(
    SellerCommissionGlobalForm({
      rule: globalRule,
      saving: runtime.savingGlobal,
      error: runtime.globalError,
      onSubmit: (payload) => actions.saveGlobal(payload),
    }),
    priorityPanel(),
    SellerCommissionOverridesList({
      overrides,
      selectedRuleId: context.query.rule_id ?? "",
      onSelect: (rule) => actions.selectOverride(rule),
    }),
  );

  const right = document.createElement("div");
  right.append(
    SellerCommissionOverrideForm({
      rule: currentMode(context) === "edit" ? selectedOverride : null,
      cars,
      saving: runtime.savingOverride,
      error: runtime.overrideError,
      onSubmit: (payload) => actions.saveOverride(payload),
      onCreateNew: () => actions.createOverride(),
    }),
  );

  if (!cars.length && !(carsSnapshot?.cars?.length)) {
    right.replaceChildren(EmptyState({
      title: "Mobil seller belum tersedia",
      description: "Tambahkan mobil lebih dulu sebelum membuat override komisi per mobil.",
    }));
  }

  layout.append(left, right);
  frame.append(layout);
  root.replaceChildren(frame);
}

function summaryCards(counts) {
  const section = document.createElement("section");
  section.className = "grid gap-3 sm:grid-cols-3";

  [
    ["Global rule", counts.hasGlobal ? (counts.activeGlobal ? "Aktif" : "Nonaktif") : "Belum ada"],
    ["Total override", String(counts.overrideCount)],
    ["Override aktif", String(counts.activeOverrides)],
  ].forEach(([label, value]) => {
    const card = Card();
    card.classList.add("grid", "gap-1");
    const title = document.createElement("p");
    title.className = "text-sm font-medium text-gray-500";
    title.textContent = label;
    const number = document.createElement("p");
    number.className = "text-2xl font-bold text-gray-950";
    number.textContent = value;
    card.append(title, number);
    section.append(card);
  });

  return section;
}

function priorityPanel() {
  const card = Card();
  card.classList.add("grid", "gap-2");

  const title = document.createElement("h2");
  title.className = "text-lg font-bold text-gray-950";
  title.textContent = "Priority rule";

  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-gray-600";
  body.textContent = sellerCommissionRuleService.priorityCopy();

  card.append(title, body);
  return card;
}

async function refreshWorkingState() {
  const [rules, cars] = await Promise.all([
    sellerCommissionRuleService.list({ limit: 100 }),
    sellerState.working("sellerAffiliateCommissions", "cars", null)
      ? Promise.resolve(sellerState.working("sellerAffiliateCommissions", "cars", { cars: [] }))
      : Promise.resolve(sellerState.snapshot("cars", { cars: [] })),
  ]);

  appStore.patchState("working.sellerAffiliateCommissions.rules", {
    data: rules,
    hydratedAt: Date.now(),
  }, "seller-affiliate-commissions:refresh-rules");

  if (cars) {
    appStore.patchState("working.sellerAffiliateCommissions.cars", {
      data: cars,
      hydratedAt: Date.now(),
    }, "seller-affiliate-commissions:refresh-cars");
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

function resetRuntime() {
  setRuntime(DEFAULT_RUNTIME);
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
  return String(context?.query?.mode ?? "") === "create" || !context?.query?.rule_id
    ? "create"
    : "edit";
}
