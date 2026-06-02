import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { Skeleton } from "../../../ui/primitives/skeleton.js";
import { sellerState } from "../state/sellerState.js";
import { SellerTransactionDetailPanel } from "../components/sellerTransactionDetailPanel.js";
import { sellerTransactionService } from "../services/sellerTransactionService.js";

export function SellerTransactionDetailPage() {
  let root = null;
  let unsubscribe = null;

  return createPageLifecycle({
    mount(context) {
      root = document.createElement("div");
      root.className = "grid gap-5";
      render(root, context);
      return root;
    },
    hydrate(context) {
      render(root, context);
    },
    bindEvents(context) {
      unsubscribe = appStore.subscribe(() => render(root, context));
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
    },
  });
}

function render(root, context) {
  if (!root) {
    return;
  }

  const snapshotTransactions = sellerState.snapshot("transactions", { transactions: [] });
  const snapshotTransaction = sellerTransactionService.findInSnapshot(snapshotTransactions, context.params.id);
  const node = appStore.get("working.sellerTransactionDetail.transaction", null);
  const transaction = node?.data ?? snapshotTransaction ?? null;
  const hasHydrated = Boolean(node?.hydratedAt);

  if (!transaction && !hasHydrated) {
    root.replaceChildren(
      header(context, snapshotTransaction),
      Skeleton({ lines: 10 })
    );
    return;
  }

  if (!transaction) {
    root.replaceChildren(
      header(context, null),
      EmptyState({
        title: "Transaksi tidak ditemukan",
        description: "Pastikan transaksi dibuka dari daftar transaksi seller yang sesuai.",
      })
    );
    return;
  }

  root.replaceChildren(
    header(context, transaction),
    SellerTransactionDetailPanel({ transaction })
  );
}

function header(context, transaction) {
  return SectionHeader({
    title: transaction?.transaction_code ?? "Detail transaksi seller",
    description: "Ringkasan buyer, mobil, status transaksi, dan nominal pembayaran.",
    action: Button({
      label: "Kembali ke list",
      variant: "secondary",
      onClick: () => context.router.navigate("/seller/transactions"),
    }),
  });
}
