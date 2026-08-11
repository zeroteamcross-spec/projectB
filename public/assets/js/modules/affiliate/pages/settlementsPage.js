import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { AffiliateSummaryCards } from "../components/affiliateSummaryCards.js";
import { AffiliateEligibleLedgerList } from "../components/affiliateEligibleLedgerList.js";
import { AffiliateSettlementList } from "../components/affiliateSettlementList.js";
import { affiliateSettlementService } from "../services/affiliateSettlementService.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { AffiliateAccountLayout, affiliateAccountActions } from "../components/affiliateAccountShell.js";

export function AffiliateSettlementsPage() {
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

  const snapshotPayload = appStore.get("snapshot.affiliate_admin.settlementActivity.data", null);
  const workingPayload = appStore.get("working.affiliateSettlements.settlements.data", null);
  const hydratedAt = appStore.get("working.affiliateSettlements.settlements.hydratedAt", 0) ?? 0;
  const payload = workingPayload ?? snapshotPayload ?? null;

  const backButton = Button({ label: "Dashboard marketing", variant: "secondary", onClick: () => context.router.navigate("/affiliate"), designHook: "shared.button.secondary" });
  backButton.id = "aff_settlements_dashboard_button";

  const frame = document.createElement("div");
  frame.id = "aff_settlements_page_section";
  frame.className = "grid min-w-0 w-full gap-6";
  frame.append(
    SectionHeader({
      title: "Marketing Settlements",
      description: "Pantau komisi yang masih unsettled, ledger yang sudah eligible, dan riwayat batch settlement manual yang sudah dicatat.",
      action: backButton,
    }),
  );

  if (!hydratedAt && !payload) {
    frame.append(EmptyState({
      title: "Memuat settlement marketing",
      description: "Snapshot dan working set payout baseline sedang disiapkan.",
    }));
    root.replaceChildren(AffiliateAccountLayout({
      activePath: context.path,
      title: "Marketing Settlements",
      subtitle: "Settlement komisi",
      icon: "transaction",
      actions: affiliateAccountActions(context),
      children: [frame],
    }));
    return;
  }

  frame.append(applyDesignHook(AffiliateSummaryCards({ items: affiliateSettlementService.summaryCards(payload) }), "affiliate.settlements.summary"));

  const layout = document.createElement("div");
  layout.className = "grid min-w-0 gap-6 xl:grid-cols-[minmax(0,700px)_minmax(280px,380px)] xl:justify-center xl:gap-8";

  const left = document.createElement("div");
  left.className = "grid min-w-0 gap-6";
  left.append(
    applyDesignHook(sectionBlock("Ledger eligible untuk settlement", "Daftar ini adalah ledger accrual canon yang sudah final di transaksi, tetapi belum pernah disettle.", AffiliateEligibleLedgerList({
      ledgers: affiliateSettlementService.normalizedEligibleLedgers(payload),
    })), "affiliate.settlements.eligible"),
  );

  const right = document.createElement("div");
  right.className = "grid min-w-0 gap-6 xl:sticky xl:top-8 xl:self-start";
  right.append(
    applyDesignHook(sectionBlock("Riwayat settlement", "Batch settlement dicatat manual sebagai baseline operasional. Tidak ada transfer bank otomatis di tahap ini.", AffiliateSettlementList({
      settlements: affiliateSettlementService.normalizedSettlements(payload),
    })), "affiliate.settlements.history"),
  );

  layout.append(left, right);
  frame.append(layout);
  root.replaceChildren(AffiliateAccountLayout({
    activePath: context.path,
    title: "Marketing Settlements",
    subtitle: "Settlement komisi",
    icon: "transaction",
    actions: affiliateAccountActions(context),
    children: [frame],
  }));
}

function sectionBlock(titleText, descriptionText, content) {
  const section = document.createElement("section");
  section.className = "grid min-w-0 gap-4";

  const header = document.createElement("div");
  header.className = "grid min-w-0 gap-1 text-[var(--pb-text)]";
  const title = document.createElement("h2");
  title.className = tw.text.sectionTitle;
  title.textContent = titleText;
  const description = document.createElement("p");
  description.className = "break-words text-sm font-semibold leading-6 text-[var(--pb-text-muted)]";
  description.textContent = descriptionText;
  header.append(title, description);

  section.append(header, content);
  return section;
}
