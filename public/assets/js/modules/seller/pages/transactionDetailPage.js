import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { syncBusinessTransaction } from "../../../state/sync/businessStatusSync.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { Skeleton } from "../../../ui/primitives/skeleton.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { sellerState } from "../state/sellerState.js";
import { SellerTransactionDetailPanel } from "../components/sellerTransactionDetailPanel.js";
import { sellerTransactionService } from "../services/sellerTransactionService.js";

export function SellerTransactionDetailPage() {
  let root = null;
  let unsubscribe = null;
  const flags = {
    isCancelling: false,
    isReturning: false,
  };

  return createPageLifecycle({
    mount(context) {
      root = document.createElement("div");
      root.className = "grid gap-5";
      render(root, context, flags);
      return root;
    },
    hydrate(context) {
      render(root, context, flags);
    },
    bindEvents(context) {
      unsubscribe = appStore.subscribe(() => render(root, context, flags));
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
    },
  });
}

function render(root, context, flags) {
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
    SellerTransactionDetailPanel({
      transaction,
      isCancelling: flags.isCancelling,
      onCancel: () => cancelTransaction(root, context, flags, transaction),
      isReturning: flags.isReturning,
      onReturn: () => returnTransaction(root, context, flags, transaction),
    })
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

async function cancelTransaction(root, context, flags, transaction) {
  if (!transaction?.id || flags.isCancelling || !canSellerCancel(transaction)) {
    return;
  }

  const cancelReason = window.prompt("Alasan pembatalan transaksi", "");
  if (cancelReason === null) {
    return;
  }

  if (!window.confirm("Batalkan transaksi ini? Listing mobil akan kembali published.")) {
    return;
  }

  flags.isCancelling = true;
  render(root, context, flags);

  try {
    const updated = await sellerTransactionService.cancel(transaction.id, {
      cancel_reason: cancelReason,
    });
    if (updated) {
      appStore.patchState("working.sellerTransactionDetail.transaction", {
        data: updated,
        hydratedAt: Date.now(),
      }, "seller-transaction-detail:cancel");
      syncBusinessTransaction(updated, {
        primaryRole: "seller",
        source: "seller-transaction-detail:cancel",
      });
    }
    showToast("Transaksi berhasil dibatalkan.", { type: "success" });
  } catch (error) {
    showToast(error.message || "Gagal membatalkan transaksi.", { type: "error" });
  } finally {
    flags.isCancelling = false;
    render(root, context, flags);
  }
}

function canSellerCancel(transaction) {
  return ["pending_payment", "dp_paid"].includes(String(transaction?.transaction_status ?? "").toLowerCase());
}

function canSellerReturn(transaction) {
  return String(transaction?.transaction_status ?? "").toLowerCase() === "dp_paid";
}

async function returnTransaction(root, context, flags, transaction) {
  if (!transaction?.id || flags.isReturning || !canSellerReturn(transaction)) {
    return;
  }

  const reason = window.prompt("Alasan retur transaksi (minimal 5 karakter)", "");
  if (reason === null) {
    return;
  }

  if (!window.confirm("Retur transaksi ini? Mobil kembali dijual dan komisi marketing dibatalkan.")) {
    return;
  }

  flags.isReturning = true;
  render(root, context, flags);

  try {
    const updated = await sellerTransactionService.returnTransaction(transaction.id, {
      return_reason: reason,
    });
    if (updated) {
      appStore.patchState("working.sellerTransactionDetail.transaction", {
        data: updated,
        hydratedAt: Date.now(),
      }, "seller-transaction-detail:return");
      syncBusinessTransaction(updated, {
        primaryRole: "seller",
        source: "seller-transaction-detail:return",
      });
    }
    showToast("Transaksi berhasil diretur.", { type: "success" });
  } catch (error) {
    showToast(error.message || "Gagal meretur transaksi.", { type: "error" });
  } finally {
    flags.isReturning = false;
    render(root, context, flags);
  }
}
