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

  const backButton = Button({ label: "Dashboard marketing", variant: "secondary", onClick: () => context.router.navigate("/affiliate"), designHook: "shared.button.secondary" });
  backButton.id = "aff_activity_dashboard_button";

  const frame = document.createElement("div");
  frame.id = "aff_activity_page_section";
  frame.className = "grid min-w-0 gap-6";
  frame.append(
    SectionHeader({
      title: "Marketing Activity",
      description: "Pantau click terbaru dari landing marketing, route yang paling sering dibuka, dan ringkasan traffic dasar yang sudah tersedia saat ini.",
      action: backButton,
    }),
  );

  if (!hydratedAt && !payload) {
    frame.append(EmptyState({
      title: "Memuat activity marketing",
      description: "Aktivitas klik sedang dimuat.",
    }));
    root.replaceChildren(AffiliateAccountLayout({
      activePath: context.path,
      title: "Marketing Activity",
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
    title: "Marketing Activity",
    subtitle: "Aktivitas referral",
    icon: "chart",
    actions: affiliateAccountActions(context),
    children: [frame],
  }));
}
