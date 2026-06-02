import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { AffiliateActivitySummaryCards } from "../components/affiliateActivitySummaryCards.js";
import { AffiliateClickList } from "../components/affiliateClickList.js";
import { affiliateActivityService } from "../services/affiliateActivityService.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { AffiliateAccountLayout, affiliateAccountActions } from "../components/affiliateAccountShell.js";

export function AffiliateActivityPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;

  const rerender = () => render(root, currentContext);

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

function render(root, context) {
  if (!root || !context) {
    return;
  }

  const snapshotPayload = appStore.get("snapshot.affiliate_admin.clickActivity.data", null);
  const workingPayload = appStore.get("working.affiliateActivity.clicks.data", null);
  const hydratedAt = appStore.get("working.affiliateActivity.clicks.hydratedAt", 0) ?? 0;
  const payload = workingPayload ?? snapshotPayload ?? null;
  const clicks = affiliateActivityService.normalizedClicks(payload);

  const frame = document.createElement("div");
  frame.className = "grid min-w-0 gap-6";
  frame.append(
    SectionHeader({
      title: "Affiliate Activity",
      description: "Pantau click terbaru dari landing affiliate, route yang paling sering dibuka, dan ringkasan traffic dasar yang sudah tersedia saat ini.",
      action: Button({ label: "Dashboard affiliate", variant: "secondary", onClick: () => context.router.navigate("/affiliate"), designHook: "shared.button.secondary" }),
    }),
  );

  if (!hydratedAt && !payload) {
    frame.append(EmptyState({
      title: "Memuat activity affiliate",
      description: "Snapshot dan working set aktivitas click sedang disiapkan.",
    }));
    root.replaceChildren(AffiliateAccountLayout({
      activePath: context.path,
      title: "Affiliate Activity",
      subtitle: "Aktivitas referral",
      icon: "chart",
      actions: affiliateAccountActions(context),
      children: [frame],
    }));
    return;
  }

  frame.append(
    applyDesignHook(AffiliateActivitySummaryCards({ items: affiliateActivityService.summaryCards(payload) }), "affiliate.activity.summary"),
    applyDesignHook(AffiliateClickList({ clicks }), "affiliate.activity.list"),
  );

  root.replaceChildren(AffiliateAccountLayout({
    activePath: context.path,
    title: "Affiliate Activity",
    subtitle: "Aktivitas referral",
    icon: "chart",
    actions: affiliateAccountActions(context),
    children: [frame],
  }));
}
