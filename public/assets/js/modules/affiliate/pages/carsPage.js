import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { affiliateCarsService } from "../services/affiliateCarsService.js";
import { AffiliateCarShareList } from "../components/affiliateCarShareList.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { AffiliateAccountLayout, affiliateAccountActions } from "../components/affiliateAccountShell.js";

const RUNTIME_KEY = "affiliateCars";
const DEFAULT_RUNTIME = {
  loading: true,
  cars: [],
  error: "",
  copyingId: null,
};

export function AffiliateCarsPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  let loadedForAffiliateId = null;

  const rerender = () => render(root, currentContext, actions);

  const actions = {
    async copyLink(car) {
      const affiliate = currentAffiliate();
      const url = affiliateCarsService.shareUrl(affiliate, car?.id ?? "");
      if (!url) {
        showToast("Link share mobil ini belum tersedia.", { type: "info" });
        return;
      }

      setRuntime({ copyingId: car.id });
      rerender();

      try {
        await navigator.clipboard.writeText(url);
        showToast("Link mobil berhasil disalin.", { type: "success" });
      } catch (error) {
        showToast("Clipboard tidak tersedia di browser ini.", { type: "error" });
      } finally {
        setRuntime({ copyingId: null });
        rerender();
      }
    },
  };

  async function loadCars() {
    const affiliate = currentAffiliate();
    const affiliateId = affiliate?.id ?? null;

    if (!affiliate || loadedForAffiliateId === affiliateId) {
      return;
    }

    loadedForAffiliateId = affiliateId;
    setRuntime({ loading: true, error: "" });
    rerender();

    try {
      const result = await affiliateCarsService.listSellerCars(affiliate);
      setRuntime({ loading: false, cars: result.cars ?? [] });
    } catch (error) {
      setRuntime({ loading: false, error: error?.message ?? "Mobil showroom gagal dimuat." });
    }
    rerender();
  }

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      ensureRuntime();
    },
    mount(context) {
      currentContext = context;
      ensureRuntime();
      root = document.createElement("div");
      rerender();
      loadCars();
      return root;
    },
    hydrate(context) {
      currentContext = context;
      rerender();
      loadCars();
    },
    bindEvents(context) {
      currentContext = context;
      unsubscribe = appStore.subscribe(() => {
        rerender();
        loadCars();
      });
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
      appStore.destroyRuntimeState(RUNTIME_KEY);
    },
  });
}

function currentAffiliate() {
  return appStore.get("working.affiliateCars.profile.data", null)
    ?? appStore.get("working.affiliateDashboard.profile.data", null)
    ?? appStore.get("snapshot.affiliate_admin.affiliateProfile.data", null)
    ?? null;
}

function render(root, context, actions) {
  if (!root || !context) {
    return;
  }

  const affiliate = currentAffiliate();
  const runtime = runtimeState();

  const backButton = Button({ label: "Dashboard marketing", variant: "secondary", onClick: () => context.router.navigate("/affiliate") });
  backButton.id = "aff_cars_dashboard_button";

  const frame = document.createElement("div");
  frame.id = "aff_cars_page_section";
  frame.className = "grid min-w-0 gap-6";
  frame.append(
    SectionHeader({
      title: "Bagikan Mobil",
      description: "Bagikan link mobil tertentu ke calon pembeli. Link ini membawa slug marketing Anda, jadi transaksi yang lahir darinya tetap teratribusi ke Anda.",
      action: backButton,
    }),
  );

  if (!affiliate) {
    frame.append(EmptyState({
      title: "Memuat profil marketing",
      description: "Profil marketing sedang dimuat.",
    }));
  } else if (runtime.error) {
    frame.append(EmptyState({ title: "Mobil gagal dimuat", description: runtime.error }));
  } else if (runtime.loading) {
    frame.append(EmptyState({
      title: "Memuat mobil showroom",
      description: "Daftar mobil yang dipublikasikan showroom sedang dimuat.",
    }));
  } else {
    frame.append(applyDesignHook(AffiliateCarShareList({
      affiliate,
      cars: runtime.cars,
      copyingId: runtime.copyingId,
      onCopyLink: (car) => actions.copyLink(car),
    }), "affiliate.cars.share_list"));
  }

  root.replaceChildren(AffiliateAccountLayout({
    activePath: context.path,
    title: "Bagikan Mobil",
    subtitle: "Marketing per mobil",
    icon: "car",
    actions: affiliateAccountActions(context),
    children: [frame],
  }));
}

function ensureRuntime() {
  if (!appStore.get(`runtime.${RUNTIME_KEY}`, null)) {
    appStore.patchState(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME, "affiliate-cars:runtime-init");
  }
}

function runtimeState() {
  return appStore.get(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME) ?? DEFAULT_RUNTIME;
}

function setRuntime(patch = {}) {
  appStore.patchState(`runtime.${RUNTIME_KEY}`, {
    ...runtimeState(),
    ...patch,
  }, "affiliate-cars:runtime");
}
