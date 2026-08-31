import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { affiliateDashboardService } from "../services/affiliateDashboardService.js";
import { AffiliateSummaryCards } from "../components/affiliateSummaryCards.js";
import { AffiliateQuickActions } from "../components/affiliateQuickActions.js";
import { AffiliateIdentityPanel } from "../components/affiliateIdentityPanel.js";
import { AffiliateOwnerPanel } from "../components/affiliateOwnerPanel.js";
import { AffiliateActivityPanel } from "../components/affiliateActivityPanel.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { AffiliateAccountLayout, affiliateAccountActions } from "../components/affiliateAccountShell.js";

const RUNTIME_KEY = "affiliateDashboard";
const DEFAULT_RUNTIME = {
  copying: false,
};

export function AffiliateDashboardPage({ notFound = false } = {}) {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;

  const rerender = () => render(root, currentContext, notFound, actions);

  const actions = {
    openLanding() {
      const affiliate = currentAffiliate();
      const url = affiliateDashboardService.landingUrl(affiliate);
      if (!url) {
        showToast("Link landing marketing belum tersedia.", { type: "info" });
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    },
    async copyLanding() {
      const affiliate = currentAffiliate();
      const url = affiliateDashboardService.landingUrl(affiliate);
      if (!url) {
        showToast("Link landing marketing belum tersedia.", { type: "info" });
        return;
      }

      setRuntime({ copying: true });
      rerender();

      try {
        await navigator.clipboard.writeText(url);
        showToast("Link landing marketing berhasil disalin.", { type: "success" });
      } catch (error) {
        showToast("Clipboard tidak tersedia di browser ini.", { type: "error" });
      } finally {
        setRuntime({ copying: false });
        rerender();
      }
    },
    openActivity() {
      currentContext?.router?.navigate("/affiliate/activity");
    },
    openLedger() {
      currentContext?.router?.navigate("/affiliate/ledger");
    },
    openSettlements() {
      currentContext?.router?.navigate("/affiliate/settlements");
    },
    openCars() {
      currentContext?.router?.navigate("/affiliate/cars");
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      ensureRuntime();
      setRuntime(DEFAULT_RUNTIME);
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

function render(root, context, notFound, actions) {
  if (!root || !context) {
    return;
  }

  const snapshotAffiliate = appStore.get("snapshot.affiliate_admin.affiliateProfile.data", null);
  const workingAffiliate = appStore.get("working.affiliateDashboard.profile.data", null);
  const hydratedAt = appStore.get("working.affiliateDashboard.profile.hydratedAt", 0) ?? 0;
  const affiliate = workingAffiliate ?? snapshotAffiliate ?? null;
  const runtime = runtimeState();

  const frame = document.createElement("div");
  frame.className = "grid min-w-0 w-full gap-6";
  frame.append(
    SectionHeader({
      title: notFound ? "Halaman marketing tidak ditemukan" : "Dashboard Marketing",
      description: "Pantau identitas marketing, status landing, dan ringkasan aktivitas yang sudah tersedia saat ini.",
      action: Button({ label: "Buka landing", variant: "secondary", onClick: () => actions.openLanding(), designHook: "shared.button.secondary" }),
    }),
  );

  if (!hydratedAt && !affiliate) {
    frame.append(EmptyState({
      title: "Memuat dashboard marketing",
      description: "Profil marketing dan ringkasan aktivitas sedang dimuat.",
    }));
    root.replaceChildren(AffiliateAccountLayout({
      activePath: context.path,
      title: "Dashboard Marketing",
      subtitle: "Akun marketing",
      icon: "affiliate",
      actions: affiliateAccountActions(context),
      children: [frame],
    }));
    return;
  }

  if (!affiliate) {
    frame.append(EmptyState({
      title: "Marketing belum siap",
      description: "Akun ini belum terhubung ke profil marketing aktif. Showroom perlu membuat marketing terlebih dahulu atau data marketing belum lengkap.",
    }));
    root.replaceChildren(AffiliateAccountLayout({
      activePath: context.path,
      title: "Dashboard Marketing",
      subtitle: "Akun marketing",
      icon: "affiliate",
      actions: affiliateAccountActions(context),
      children: [frame],
    }));
    return;
  }

  frame.append(
    applyDesignHook(AffiliateSummaryCards({ items: affiliateDashboardService.summaryCards(affiliate) }), "affiliate.dashboard.summary"),
    applyDesignHook(AffiliateQuickActions({
      affiliate,
      copying: runtime.copying,
      onOpenLanding: () => actions.openLanding(),
      onCopyLanding: () => actions.copyLanding(),
      onOpenActivity: () => actions.openActivity(),
      onOpenLedger: () => actions.openLedger(),
      onOpenSettlements: () => actions.openSettlements(),
      onOpenCars: () => actions.openCars(),
    }), "affiliate.dashboard.quick_actions"),
  );

  const layout = document.createElement("div");
  layout.className = "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,760px)_minmax(280px,340px)] xl:justify-center xl:gap-8";
  layout.append(
    mainColumn(affiliate),
    sideColumn(affiliate),
  );

  frame.append(layout);
  root.replaceChildren(AffiliateAccountLayout({
    activePath: context.path,
    title: "Dashboard Marketing",
    subtitle: "Akun marketing",
    icon: "affiliate",
    actions: affiliateAccountActions(context),
    children: [frame],
  }));
}

function mainColumn(affiliate) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-6";
  wrap.append(
    applyDesignHook(AffiliateIdentityPanel({
      affiliate,
      statusMeta: affiliateDashboardService.statusMeta(affiliate.status),
      landingUrl: affiliateDashboardService.landingUrl(affiliate),
    }), "affiliate.dashboard.identity"),
    applyDesignHook(AffiliateActivityPanel({ affiliate }), "affiliate.dashboard.activity"),
  );
  return wrap;
}

function sideColumn(affiliate) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-w-0 gap-6 xl:sticky xl:top-8 xl:self-start";
  wrap.append(applyDesignHook(AffiliateOwnerPanel({ affiliate }), "affiliate.dashboard.owner"));
  return wrap;
}

function currentAffiliate() {
  return appStore.get("working.affiliateDashboard.profile.data", null)
    ?? appStore.get("snapshot.affiliate_admin.affiliateProfile.data", null)
    ?? null;
}

function ensureRuntime() {
  if (!appStore.get(`runtime.${RUNTIME_KEY}`, null)) {
    appStore.patchState(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME, "affiliate-dashboard:runtime-init");
  }
}

function runtimeState() {
  return appStore.get(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME) ?? DEFAULT_RUNTIME;
}

function setRuntime(patch = {}) {
  appStore.patchState(`runtime.${RUNTIME_KEY}`, {
    ...runtimeState(),
    ...patch,
  }, "affiliate-dashboard:runtime");
}
