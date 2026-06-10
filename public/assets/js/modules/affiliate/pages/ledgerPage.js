import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { AffiliateLedgerSummaryCards } from "../components/affiliateLedgerSummaryCards.js";
import { AffiliateLedgerList } from "../components/affiliateLedgerList.js";
import { affiliateLedgerService } from "../services/affiliateLedgerService.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { AffiliateAccountLayout, affiliateAccountActions } from "../components/affiliateAccountShell.js";

export function AffiliateLedgerPage() {
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

  const snapshotPayload = appStore.get("snapshot.affiliate_admin.ledgerActivity.data", null);
  const workingPayload = appStore.get("working.affiliateLedger.ledgers.data", null);
  const hydratedAt = appStore.get("working.affiliateLedger.ledgers.hydratedAt", 0) ?? 0;
  const payload = workingPayload ?? snapshotPayload ?? null;
  const ledgers = affiliateLedgerService.normalizedLedgers(payload);

  const frame = document.createElement("div");
  frame.className = "grid min-w-0 w-full gap-6";
  frame.append(
    SectionHeader({
      title: "Marketing Ledger",
      description: "Pantau komisi yang berasal dari penjualan, referensi transaksi, dan catatan ledger yang sudah tercatat saat ini.",
      action: Button({ label: "Dashboard marketing", variant: "secondary", onClick: () => context.router.navigate("/affiliate"), designHook: "shared.button.secondary" }),
    }),
  );

  if (!hydratedAt && !payload) {
    frame.append(EmptyState({
      title: "Memuat ledger marketing",
      description: "Snapshot dan working set ledger marketing sedang disiapkan.",
    }));
    root.replaceChildren(AffiliateAccountLayout({
      activePath: context.path,
      title: "Marketing Ledger",
      subtitle: "Komisi marketing",
      icon: "wallet",
      actions: affiliateAccountActions(context),
      children: [frame],
    }));
    return;
  }

  frame.append(
    applyDesignHook(AffiliateLedgerSummaryCards({ items: affiliateLedgerService.summaryCards(payload) }), "affiliate.ledger.summary"),
    applyDesignHook(AffiliateLedgerList({ ledgers }), "affiliate.ledger.list"),
  );

  root.replaceChildren(AffiliateAccountLayout({
    activePath: context.path,
    title: "Marketing Ledger",
    subtitle: "Komisi marketing",
    icon: "wallet",
    actions: affiliateAccountActions(context),
    children: [frame],
  }));
}
