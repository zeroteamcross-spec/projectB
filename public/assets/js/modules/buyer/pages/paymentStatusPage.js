import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { syncBusinessTransaction } from "../../../state/sync/businessStatusSync.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { Skeleton } from "../../../ui/primitives/skeleton.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { buyerTransactionService } from "../services/buyerTransactionService.js";
import { CompletionPaymentPanel } from "../components/completionPaymentPanel.js";
import { ManualTransferPanel } from "../components/manualTransferPanel.js";
import { PaymentActionPanel } from "../components/paymentActionPanel.js";
import { PaymentInstructionPanel } from "../components/paymentInstructionPanel.js";
import { PaymentStatusSummary } from "../components/paymentStatusSummary.js";
import { downloadBlobFile } from "../../transactions/paymentDownload.js";
import { markGopayAutoOpened, resolvePaymentArtifacts, shouldAutoOpenGopay } from "../../transactions/paymentMethodSupport.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { BUYER_MOBILE_FOOTER_ITEMS, BuyerMobileFooterNav } from "../components/buyerMobileFooterNav.js";
import { BuyerDesktopTopNav } from "../components/buyerDesktopTopNav.js";
import { isPaymentPaid } from "../../../utils/transactionStatus.js";

// Booking Fee menutup kewajiban bayar, jadi tidak ada pelunasan lanjutan.
// Setel true untuk menghidupkan kembali jalur pelunasan lama.
const PELUNASAN_AKTIF = false;

const AUTO_STATUS_POLL_INTERVAL_MS = 12000;
const PAYMENT_SUCCESS_SEEN_PREFIX = "projectB:payment_success_seen:";

export function PaymentStatusPage() {
  let root = null;
  let unsubscribe = null;
  let visibilityCleanup = null;
  const flags = {
    isRefreshing: false,
    isAutoChecking: false,
    isCompleting: false,
    isFinishing: false,
    isCancelling: false,
    isDownloadingQr: false,
    isSubmittingManualTransfer: false,
    hasStartedInitialSync: false,
  };
  const poller = {
    timer: null,
    transactionId: null,
    inFlight: false,
  };

  return createPageLifecycle({
    mount(context) {
      root = document.createElement("div");
      root.className = "grid gap-6";
      scrollToPageTop();
      render(root, context, flags);
      syncAutoStatusPolling(context, flags, poller);
      return root;
    },
    hydrate(context) {
      scrollToPageTop();
      render(root, context, flags);
      syncAutoStatusPolling(context, flags, poller);
      syncInitialPaymentStatus(context, flags);
    },
    bindEvents(context) {
      unsubscribe = appStore.subscribe(() => {
        render(root, context, flags);
        syncAutoStatusPolling(context, flags, poller);
      });
      visibilityCleanup = bindVisibilityResume(context, flags, poller);
      return () => {
        unsubscribe?.();
        visibilityCleanup?.();
        stopAutoStatusPolling(poller);
      };
    },
    unmount() {
      unsubscribe?.();
      visibilityCleanup?.();
      stopAutoStatusPolling(poller);
      appStore.destroyRuntimeState("buyerPaymentStatus");
    },
    dispose() {
      unsubscribe = null;
      visibilityCleanup = null;
    },
  });
}

function scrollToPageTop() {
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

function render(root, context, flags) {
  if (!root) {
    return;
  }

  const routeTransactionId = String(context.params?.id ?? "");
  const node = appStore.get("working.buyerPaymentStatus.transaction", null);
  const rawTransaction = node?.data ?? null;
  const transaction = String(rawTransaction?.id ?? "") === routeTransactionId ? rawTransaction : null;
  const hasHydrated = Boolean(node?.hydratedAt);
  const completion = appStore.get("runtime.buyerPaymentStatus.completion", {
    open: false,
    form: { payment_method: "bca_va" },
    result: null,
    error: "",
  });
  const successOverlay = appStore.get("runtime.buyerPaymentStatus.successOverlay", {
    open: false,
    transactionId: null,
  });

  if (!transaction && !hasHydrated) {
    disposeChildren(root);
    root.replaceChildren(buyerTopNavigation(context), loadingState(), buyerFooter(context));
    return;
  }

  if (!transaction) {
    disposeChildren(root);
    root.replaceChildren(buyerTopNavigation(context), emptyState(context), buyerFooter(context));
    return;
  }

  maybeAutoOpenGopay(transaction);
  markInitialPaidSeen(transaction);

  const back = Button({ label: "Kembali ke transaksi", variant: "secondary", onClick: () => context.router.navigate("/buyer/transactions") });
  back.classList.add("w-fit");

  const layout = document.createElement("div");
  layout.className = "grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:gap-6";

  const main = document.createElement("div");
  main.className = "grid gap-4";
  if (isPaymentPaid(transaction)) {
    main.append(paymentSuccessPanel(transaction));
    main.append(PaymentStatusSummary({ transaction }), carSummary(transaction));
  } else {
    if (isPendingPayment(transaction) && transaction.payment_method === "manual_transfer") {
      main.append(applyDesignHook(ManualTransferPanel({
        transaction,
        isSubmitting: flags.isSubmittingManualTransfer,
        error: appStore.get("runtime.buyerPaymentStatus.manualTransferError", ""),
        onSubmit: (file, note) => submitManualTransferProof(context, flags, file, note),
      }), "buyer.payment.manual-transfer"));
    } else if (isPendingPayment(transaction)) {
      main.append(applyDesignHook(PaymentInstructionPanel({
        transaction,
        isDownloadingQr: flags.isDownloadingQr,
        onDownloadQr: () => downloadPaymentQr(context, flags, transaction),
        onOpenGopay: () => openGopayDeeplink(transaction),
      }), "buyer.payment.instructions"));
    }
    main.append(PaymentStatusSummary({ transaction }));
    if (isPendingPayment(transaction)) {
      main.append(pendingPaymentGuidePanel({
        transaction,
        isRefreshing: flags.isRefreshing,
        onRefresh: () => refreshStatus(context, flags, {
          source: "buyer-payment-status:refresh",
        }),
      }));
    }
    if (canBuyerCancel(transaction)) {
      main.append(cancelTransactionPanel({
        transaction,
        isCancelling: flags.isCancelling,
        onCancel: () => cancelTransaction(context, flags),
      }));
    }
    main.append(carSummary(transaction));
  }

  const aside = document.createElement("aside");
  aside.className = "grid min-w-0 gap-4 lg:sticky lg:top-6 xl:top-8";
  if (!isPaymentPaid(transaction) && !isPendingPayment(transaction)) {
    aside.append(applyDesignHook(PaymentActionPanel({
      transaction,
      isRefreshing: flags.isRefreshing,
      isCompleting: flags.isCompleting,
      completionOpen: Boolean(completion.open),
      onRefresh: () => refreshStatus(context, flags, {
        showToastOnSuccess: true,
        source: "buyer-payment-status:refresh",
      }),
      onOpenCompletion: () => openCompletionFlow(),
    }), "buyer.payment.actions"));
  }

  // Pelunasan ditutup dari UI sejak Booking Fee menjadi pembayaran terakhir.
  // Kodenya dibiarkan utuh agar jalur lama bisa dihidupkan lagi bila perlu.
  if (completion.open && PELUNASAN_AKTIF) {
    aside.append(applyDesignHook(CompletionPaymentPanel({
      transaction,
      form: completion.form ?? { payment_method: "bca_va" },
      result: completion.result ?? null,
      isSubmitting: flags.isCompleting,
      error: completion.error ?? "",
      onChange: (values) => patchCompletionForm(values),
      onSubmit: (values) => createCompletionPayment(context, flags, values),
      onCancel: () => closeCompletionFlow(),
    }), "buyer.payment.completion"));
  }

  if (aside.childElementCount) {
    layout.append(main, aside);
  } else {
    layout.className = "grid gap-5 xl:gap-6";
    layout.append(main);
  }
  disposeChildren(root);
  const children = [buyerTopNavigation(context), back, layout, buyerFooter(context)];
  if (successOverlay.open && String(successOverlay.transactionId ?? "") === String(transaction.id ?? "")) {
    children.push(paymentSuccessOverlay(() => closePaymentSuccessOverlay()));
  }
  root.replaceChildren(...children);
}

function buyerTopNavigation(context) {
  return BuyerDesktopTopNav({
    activePath: context?.path ?? "/buyer/transactions",
    onNavigate: (path) => context?.router?.navigate(path),
    brandLabel: "Status Transaksi",
    brandIcon: "transaction",
  });
}

function buyerFooter(context) {
  return BuyerMobileFooterNav({
    activePath: context?.path ?? "/buyer/transactions",
    items: BUYER_MOBILE_FOOTER_ITEMS,
    onNavigate: (path) => context?.router?.navigate(path),
  });
}

function disposeChildren(root) {
  root?.querySelectorAll?.("*").forEach((node) => node.dispose?.());
}

function loadingState() {
  const wrap = document.createElement("div");
  wrap.className = "grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]";
  const main = document.createElement("div");
  main.className = "grid gap-4";
  main.append(Skeleton({ lines: 8 }), Skeleton({ lines: 5 }));
  const side = document.createElement("div");
  side.className = "grid gap-4";
  side.append(Skeleton({ lines: 5 }), Skeleton({ lines: 4 }));
  wrap.append(main, side);
  return wrap;
}

function emptyState(context) {
  const wrap = document.createElement("div");
  wrap.className = "grid min-h-[60vh] place-items-center gap-4";
  const content = document.createElement("div");
  content.className = "grid max-w-lg gap-4";
  wrap.append(EmptyState({
    title: "Transaksi tidak ditemukan",
    description: "Pastikan transaksi dibuka dari daftar transaksi buyer yang sesuai.",
  }));
  const button = Button({ label: "Kembali ke transaksi", variant: "secondary", onClick: () => context.router.navigate("/buyer/transactions") });
  button.classList.add("justify-self-center");
  content.append(...wrap.childNodes, button);
  wrap.replaceChildren(content);
  return wrap;
}

function carSummary(transaction) {
  const section = document.createElement("section");
  section.className = `grid gap-3 ${tw.surface.raisedCard} p-5`;
  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = "Mobil yang dibeli";
  const name = document.createElement("p");
  name.className = "text-xs leading-6 text-gray-700";
  name.textContent = [transaction?.car?.brand_name, transaction?.car?.model_name].filter(Boolean).join(" ") || `Mobil #${transaction?.car_id ?? "-"}`;
  const seller = document.createElement("p");
  seller.className = "text-xs text-gray-500";
  seller.textContent = transaction?.seller?.name ? `Seller: ${transaction.seller.name}` : "Showroom terdaftar";
  section.append(title, name, seller);
  return section;
}

function paymentSuccessPanel(transaction) {
  const isCompleted = ["dp_paid", "paid", "completed"].includes(
    String(transaction?.transaction_status ?? "").toLowerCase(),
  );
  const section = document.createElement("section");
  section.className = `grid gap-4 ${tw.surface.successInset} p-5`;
  applyDesignHook(section, "buyer.payment.success");

  const copy = document.createElement("div");
  copy.className = "grid gap-2";
  const title = document.createElement("h2");
  title.className = "text-xl font-bold tracking-normal text-[color-mix(in_srgb,var(--pb-success)_84%,black)]";
  title.textContent = isCompleted ? "Transaksi Selesai" : "Pembayaran Berhasil";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-[color-mix(in_srgb,var(--pb-success)_84%,black)]";
  body.textContent = isCompleted
    ? "Pembayaran sudah diterima dan transaksi ini sudah selesai."
    : "Pembayaran Anda sudah diterima.";
  const detail = document.createElement("p");
  detail.className = "text-xs leading-6 text-[color-mix(in_srgb,var(--pb-success)_84%,black)]";
  detail.textContent = isCompleted
    ? "Terima kasih, status akhir transaksi sudah tercatat."
    : "Status pembayaran sedang diproses.";
  copy.append(title, body, detail);

  const action = Button({
    label: "Lihat Detail Transaksi",
    variant: "secondary",
    onClick: () => document.querySelector("#buyer_payment_detail_summary")?.scrollIntoView({ behavior: "smooth", block: "start" }),
  });
  action.classList.add("w-full", "sm:w-fit");

  section.append(copy, action);
  return section;
}

function fulfillmentProgressPanel({ transaction, isFinishing = false, onFinish = null } = {}) {
  const checklist = transaction?.fulfillment_checklist ?? [];
  const status = String(transaction?.transaction_status ?? "").toLowerCase();
  const isCompleted = status === "completed";
  const canFinish = ["dp_paid", "paid"].includes(status) && isFulfillmentChecklistComplete(transaction);
  const doneCount = checklist.filter((item) => Boolean(item.is_completed)).length;

  const section = document.createElement("section");
  section.className = `grid gap-4 ${tw.surface.raisedCard} p-5`;
  applyDesignHook(section, "buyer.payment.fulfillment");

  const header = document.createElement("div");
  header.className = "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between";
  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Proses showroom";
  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = "Checklist penyelesaian";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = isCompleted
    ? "Semua proses sudah selesai dan transaksi sudah ditutup."
    : "Buyer bisa menyelesaikan transaksi setelah seluruh checklist showroom selesai.";
  copy.append(eyebrow, title, body);

  const progress = document.createElement("span");
  progress.className = "inline-flex w-fit items-center rounded-full border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] px-3 py-1 text-[10px] font-black text-[var(--pb-brand-secondary)]";
  progress.textContent = `${doneCount}/${checklist.length} selesai`;
  header.append(copy, progress);
  section.append(header);

  const list = document.createElement("div");
  list.className = "grid gap-3";
  if (checklist.length) {
    checklist.forEach((item) => list.append(readOnlyChecklistItem(item)));
  } else {
    list.append(textNode("p", "text-xs leading-6 text-gray-600", "Checklist belum tersedia dari seller."));
  }
  section.append(list);

  const action = Button({
    label: isCompleted ? "Transaksi Selesai" : isFinishing ? "Menyelesaikan..." : "Selesaikan",
    variant: canFinish && !isFinishing ? "primary" : "secondary",
    disabled: isCompleted || !canFinish || isFinishing,
    onClick: onFinish,
    designHook: canFinish && !isFinishing ? "shared.button.primary" : "shared.button.secondary",
  });
  action.id = "buyer_finish_transaction_button";
  action.classList.add("w-full", "sm:w-fit", "sm:justify-self-end");
  section.append(action);

  return section;
}

function readOnlyChecklistItem(item) {
  const row = document.createElement("section");
  row.className = "grid gap-2 rounded-[1rem] border border-[var(--pb-card-border)] bg-gray-50/70 p-3";

  const top = document.createElement("div");
  top.className = "flex min-w-0 items-start gap-3";
  const mark = document.createElement("span");
  mark.className = [
    "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black",
    item.is_completed ? "bg-[color-mix(in_srgb,var(--pb-success)_14%,white)] text-[color-mix(in_srgb,var(--pb-success)_84%,black)]" : "bg-gray-200 text-gray-500",
  ].join(" ");
  mark.textContent = item.is_completed ? "OK" : "-";

  const label = document.createElement("p");
  label.className = "break-words text-xs font-black text-gray-950";
  label.textContent = item.label ?? item.key;
  top.append(mark, label);
  row.append(top);

  if (item.notes) {
    row.append(textNode("p", "break-words pl-8 text-xs leading-6 text-gray-600", item.notes));
  }

  return row;
}

function handoverInstructionPanel() {
  const section = document.createElement("section");
  section.className = `grid gap-3 ${tw.surface.raisedCard} p-5`;
  applyDesignHook(section, "buyer.payment.handover");

  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Serah terima";
  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = "Instruksi serah terima";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = "Showroom akan menghubungi buyer untuk jadwal serah terima, kesiapan dokumen, dan konfirmasi unit.";

  section.append(eyebrow, title, body);
  return section;
}

function pendingPaymentGuidePanel({ transaction, isRefreshing = false, onRefresh = null } = {}) {
  const section = document.createElement("section");
  section.className = `grid gap-4 ${tw.surface.accentPanel} p-5`;
  applyDesignHook(section, "buyer.payment.pendingGuide");

  const copy = document.createElement("div");
  copy.className = "grid gap-2";
  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Menunggu pembayaran";
  const title = document.createElement("h2");
  title.className = "text-lg font-bold tracking-normal text-gray-950";
  title.textContent = "Lanjutkan dari instruksi pembayaran di bawah";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-700";
  body.textContent = "Status transaksi belum berubah karena pembayaran belum terkonfirmasi. Setelah membayar, halaman ini akan mengecek otomatis dan menampilkan notifikasi saat status berubah.";
  copy.append(eyebrow, title, body);

  const steps = document.createElement("div");
  steps.className = "grid gap-2 sm:grid-cols-3";
  [
    ["1", "Ikuti instruksi", "Gunakan VA, QRIS, atau GoPay yang aktif."],
    ["2", "Selesaikan pembayaran", paymentDueCopy(transaction)],
    ["3", "Tunggu konfirmasi", "Halaman akan refresh otomatis; gunakan refresh manual hanya jika perlu."],
  ].forEach(([number, label, description]) => {
    const item = document.createElement("section");
    item.className = "grid gap-2 rounded-2xl border border-[var(--pb-card-border)] bg-white/90 p-4 shadow-sm";
    const mark = document.createElement("span");
    mark.className = "grid h-8 w-8 place-items-center rounded-full bg-[var(--pb-brand-primary)] text-xs font-black text-white";
    mark.textContent = number;
    const itemTitle = document.createElement("h3");
    itemTitle.className = "text-xs font-black text-gray-950";
    itemTitle.textContent = label;
    const itemBody = document.createElement("p");
    itemBody.className = "text-xs leading-6 text-gray-600";
    itemBody.textContent = description;
    item.append(mark, itemTitle, itemBody);
    steps.append(item);
  });

  section.append(copy, steps);

  const refresh = Button({
    label: isRefreshing ? "Memuat status..." : "Refresh status",
    variant: "secondary",
    disabled: isRefreshing,
    onClick: onRefresh,
    designHook: "shared.button.secondary",
  });
  refresh.id = "byrpay_refresh_status_button";
  refresh.classList.add("w-full", "sm:w-fit");
  section.append(refresh);

  return section;
}

function cancelTransactionPanel({ transaction, isCancelling = false, onCancel = null } = {}) {
  const status = String(transaction?.transaction_status ?? "").toLowerCase();
  const isDpPaid = status === "dp_paid";
  const section = document.createElement("section");
  section.className = `grid gap-3 ${tw.surface.raisedCard} p-5`;

  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = "Batalkan transaksi";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = isDpPaid
    ? "Buyer bisa membatalkan sebelum pelunasan. Refund DP akan dipotong 10%, dan nomor rekening wajib diisi."
    : "Buyer bisa membatalkan selama pembayaran belum lunas.";

  const action = Button({
    label: isCancelling ? "Membatalkan..." : "Batalkan Transaksi",
    variant: "secondary",
    disabled: isCancelling,
    onClick: onCancel,
    designHook: "shared.button.secondary",
  });
  action.classList.add("w-full", "sm:w-fit");

  section.append(title, body, action);
  return section;
}

async function refreshStatus(context, flags, {
  silent = false,
  showToastOnSuccess = true,
  source = "buyer-payment-status:refresh",
} = {}) {
  if (flags.isRefreshing || flags.isAutoChecking) {
    return null;
  }

  const current = appStore.get("working.buyerPaymentStatus.transaction", null)?.data ?? null;
  const wasPaid = isPaymentPaid(current);

  if (silent) {
    flags.isAutoChecking = true;
  } else {
    flags.isRefreshing = true;
  }
  setActionState(flags);

  try {
    const transaction = await buyerTransactionService.syncPaymentStatus(context.params.id);

    if (!transaction) {
      return null;
    }

    if (!wasPaid && isPaymentPaid(transaction)) {
      showPaymentSuccessOverlay(transaction);
    }

    appStore.patchState("working.buyerPaymentStatus.transaction", {
      data: transaction,
      hydratedAt: Date.now(),
    }, source);
    syncBusinessTransaction(transaction, {
      primaryRole: "buyer",
      source,
    });

    if (!silent && showToastOnSuccess) {
      const feedback = statusFeedback(transaction);
      showToast(feedback.message, { type: feedback.type });
      scrollPaymentSummaryIntoView();
    }

    return transaction;
  } catch (error) {
    if (!silent) {
      showToast(error.message || "Gagal refresh status.", { type: "error" });
    }

    return null;
  } finally {
    if (silent) {
      flags.isAutoChecking = false;
    } else {
      flags.isRefreshing = false;
    }
    setActionState(flags);
  }
}

function syncInitialPaymentStatus(context, flags) {
  if (flags.hasStartedInitialSync) {
    return;
  }

  const transaction = appStore.get("working.buyerPaymentStatus.transaction", null)?.data ?? null;
  if (!isPendingPayment(transaction)) {
    return;
  }

  flags.hasStartedInitialSync = true;
  void refreshStatus(context, flags, {
    silent: true,
    showToastOnSuccess: false,
    source: "buyer-payment-status:initial-sync",
  });
}

function syncAutoStatusPolling(context, flags, poller) {
  const transaction = appStore.get("working.buyerPaymentStatus.transaction", null)?.data ?? null;

  if (!shouldAutoPollTransaction(transaction) || document.visibilityState === "hidden") {
    stopAutoStatusPolling(poller);
    return;
  }

  const transactionId = String(transaction.id);
  if (poller.timer && poller.transactionId === transactionId) {
    return;
  }

  stopAutoStatusPolling(poller);
  poller.transactionId = transactionId;
  poller.timer = window.setInterval(() => {
    runAutoStatusCheck(context, flags, poller);
  }, AUTO_STATUS_POLL_INTERVAL_MS);
}

async function runAutoStatusCheck(context, flags, poller) {
  const transaction = appStore.get("working.buyerPaymentStatus.transaction", null)?.data ?? null;
  if (poller.inFlight || !shouldAutoPollTransaction(transaction) || document.visibilityState === "hidden") {
    syncAutoStatusPolling(context, flags, poller);
    return;
  }

  poller.inFlight = true;
  try {
    await refreshStatus(context, flags, {
      silent: true,
      showToastOnSuccess: false,
      source: "buyer-payment-status:auto-refresh",
    });
  } finally {
    poller.inFlight = false;
    syncAutoStatusPolling(context, flags, poller);
  }
}

function stopAutoStatusPolling(poller) {
  if (poller.timer) {
    window.clearInterval(poller.timer);
  }

  poller.timer = null;
  poller.transactionId = null;
}

function bindVisibilityResume(context, flags, poller) {
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      stopAutoStatusPolling(poller);
      return;
    }

    syncAutoStatusPolling(context, flags, poller);
    runAutoStatusCheck(context, flags, poller);
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => document.removeEventListener("visibilitychange", onVisibilityChange);
}

function shouldAutoPollTransaction(transaction) {
  return Boolean(transaction?.id) && isPendingPayment(transaction);
}

function openCompletionFlow() {
  const current = appStore.get("runtime.buyerPaymentStatus.completion", {});
  appStore.patchState("runtime.buyerPaymentStatus.completion", {
    open: true,
    form: {
      payment_method: current.form?.payment_method ?? "bca_va",
    },
    result: current.result ?? null,
    error: "",
  }, "buyer-payment-status:completion-open");
}

function closeCompletionFlow() {
  appStore.patchState("runtime.buyerPaymentStatus.completion", {
    open: false,
    form: { payment_method: "bca_va" },
    result: null,
    error: "",
  }, "buyer-payment-status:completion-close");
}

function patchCompletionForm(values) {
  const current = appStore.get("runtime.buyerPaymentStatus.completion", {});
  appStore.patchState("runtime.buyerPaymentStatus.completion", {
    ...current,
    form: {
      payment_method: "bca_va",
      ...(current.form ?? {}),
      ...values,
    },
  }, "buyer-payment-status:completion-form");
}

async function downloadPaymentQr(context, flags, transaction) {
  if (flags.isDownloadingQr || !transaction?.id) {
    return;
  }

  flags.isDownloadingQr = true;
  setActionState(flags);

  try {
    const result = await buyerTransactionService.downloadPaymentQr(context.params.id);
    downloadBlobFile(result.blob, paymentQrFilename(transaction));
    showToast("QR pembayaran berhasil diunduh.", { type: "success" });
  } catch (error) {
    showToast(error.message || "Gagal mengunduh QR pembayaran.", { type: "error" });
  } finally {
    flags.isDownloadingQr = false;
    setActionState(flags);
  }
}

async function createCompletionPayment(context, flags, values = {}) {
  flags.isCompleting = true;
  patchCompletionRuntime({ error: "" });
  setActionState(flags);

  try {
    const transaction = await buyerTransactionService.completePayment(context.params.id, {
      payment_method: values.payment_method || "bca_va",
    });
    appStore.patchState("working.buyerPaymentStatus.transaction", {
      data: transaction,
      hydratedAt: Date.now(),
    }, "buyer-payment-status:complete");
    syncBusinessTransaction(transaction, {
      primaryRole: "buyer",
      source: "buyer-payment-status:complete",
    });
    patchCompletionRuntime({
      open: true,
      result: transaction,
      error: "",
    });
    showToast("Sesi pelunasan berhasil dibuat. Instruksi pembayaran terbaru sudah ditampilkan.", { type: "success" });
    scrollPaymentSummaryIntoView();
  } catch (error) {
    patchCompletionRuntime({ error: error.message || "Gagal membuat sesi pelunasan." });
    showToast(error.message || "Gagal membuat sesi pelunasan.", { type: "error" });
  } finally {
    flags.isCompleting = false;
    setActionState(flags);
  }
}

async function finishTransaction(context, flags) {
  const transaction = appStore.get("working.buyerPaymentStatus.transaction", null)?.data ?? null;
  if (!transaction?.id || flags.isFinishing) {
    return;
  }

  if (!isFulfillmentChecklistComplete(transaction)) {
    showToast("Checklist showroom belum lengkap.", { type: "error" });
    return;
  }

  flags.isFinishing = true;
  setActionState(flags);

  try {
    const updated = await buyerTransactionService.updateStatus(context.params.id, {
      transaction_status: "completed",
    });
    const nextTransaction = updated ?? { ...transaction, transaction_status: "completed" };
    appStore.patchState("working.buyerPaymentStatus.transaction", {
      data: nextTransaction,
      hydratedAt: Date.now(),
    }, "buyer-payment-status:finish");
    syncBusinessTransaction(nextTransaction, {
      primaryRole: "buyer",
      source: "buyer-payment-status:finish",
    });
    showToast("Transaksi selesai.", { type: "success" });
    scrollPaymentSummaryIntoView();
  } catch (error) {
    showToast(error.message || "Gagal menyelesaikan transaksi.", { type: "error" });
  } finally {
    flags.isFinishing = false;
    setActionState(flags);
  }
}

async function submitManualTransferProof(context, flags, file, note) {
  const transaction = appStore.get("working.buyerPaymentStatus.transaction", null)?.data ?? null;
  if (!transaction?.id || flags.isSubmittingManualTransfer) {
    return;
  }

  flags.isSubmittingManualTransfer = true;
  appStore.patchState("runtime.buyerPaymentStatus.manualTransferError", "", "buyer-payment-status:manual-transfer-error-clear");
  setActionState(flags);

  try {
    const updated = await buyerTransactionService.submitManualTransferProof(context.params.id, file, note);
    if (updated) {
      appStore.patchState("working.buyerPaymentStatus.transaction", {
        data: updated,
        hydratedAt: Date.now(),
      }, "buyer-payment-status:manual-transfer-submitted");
      syncBusinessTransaction(updated, {
        primaryRole: "buyer",
        source: "buyer-payment-status:manual-transfer-submitted",
      });
    }
    showToast("Bukti transfer berhasil diunggah. Menunggu konfirmasi showroom.", { type: "success" });
  } catch (error) {
    appStore.patchState("runtime.buyerPaymentStatus.manualTransferError", error.message || "Gagal mengunggah bukti transfer.", "buyer-payment-status:manual-transfer-error");
    showToast(error.message || "Gagal mengunggah bukti transfer.", { type: "error" });
  } finally {
    flags.isSubmittingManualTransfer = false;
    setActionState(flags);
  }
}

async function cancelTransaction(context, flags) {
  const transaction = appStore.get("working.buyerPaymentStatus.transaction", null)?.data ?? null;
  if (!transaction?.id || flags.isCancelling || !canBuyerCancel(transaction)) {
    return;
  }

  const payload = collectBuyerCancelPayload(transaction);
  if (payload === null) {
    return;
  }

  flags.isCancelling = true;
  setActionState(flags);

  try {
    const updated = await buyerTransactionService.cancel(context.params.id, payload);
    const nextTransaction = updated ?? { ...transaction, transaction_status: "cancelled" };
    appStore.patchState("working.buyerPaymentStatus.transaction", {
      data: nextTransaction,
      hydratedAt: Date.now(),
    }, "buyer-payment-status:cancel");
    syncBusinessTransaction(nextTransaction, {
      primaryRole: "buyer",
      source: "buyer-payment-status:cancel",
    });
    showToast("Transaksi berhasil dibatalkan.", { type: "success" });
  } catch (error) {
    showToast(error.message || "Gagal membatalkan transaksi.", { type: "error" });
  } finally {
    flags.isCancelling = false;
    setActionState(flags);
  }
}

function collectBuyerCancelPayload(transaction) {
  const status = String(transaction?.transaction_status ?? "").toLowerCase();
  const isDpPaid = status === "dp_paid";
  const message = isDpPaid
    ? "Batalkan transaksi ini? Refund DP akan dipotong 10%."
    : "Batalkan transaksi ini?";

  if (!window.confirm(message)) {
    return null;
  }

  const payload = {
    cancel_reason: window.prompt("Alasan pembatalan", "") ?? "",
  };

  if (!isDpPaid) {
    return payload;
  }

  const refundBankName = window.prompt("Nama bank untuk refund DP", "");
  if (refundBankName === null) {
    return null;
  }
  const refundAccountNumber = window.prompt("Nomor rekening untuk refund DP", "");
  if (refundAccountNumber === null) {
    return null;
  }
  const refundAccountName = window.prompt("Nama pemilik rekening", "");
  if (refundAccountName === null) {
    return null;
  }

  return {
    ...payload,
    refund_bank_name: refundBankName.trim(),
    refund_account_number: refundAccountNumber.trim(),
    refund_account_name: refundAccountName.trim(),
  };
}

function isFulfillmentChecklistComplete(transaction) {
  const checklist = transaction?.fulfillment_checklist ?? [];
  return checklist.length > 0 && checklist
    .filter((item) => item.is_required !== false)
    .every((item) => Boolean(item.is_completed));
}

function isPendingPayment(transaction) {
  return String(transaction?.transaction_status ?? "").toLowerCase() === "pending_payment";
}

function canBuyerCancel(transaction) {
  return ["pending_payment", "dp_paid"].includes(String(transaction?.transaction_status ?? "").toLowerCase());
}

function paymentDueCopy(transaction) {
  return transaction?.expires_at
    ? `Selesaikan sebelum batas waktu: ${transaction.expires_at}.`
    : "Selesaikan pembayaran sebelum sesi provider berakhir.";
}

function statusFeedback(transaction) {
  if (isPaymentPaid(transaction)) {
    return {
      message: "Pembayaran sudah terkonfirmasi. Detail transaksi diperbarui.",
      type: "success",
    };
  }

  if (isPendingPayment(transaction)) {
    return {
      message: "Pembayaran masih menunggu konfirmasi. Ikuti instruksi pembayaran aktif di halaman ini.",
      type: "info",
    };
  }

  const status = String(transaction?.transaction_status ?? "").toLowerCase();
  if (status === "expired" || status === "cancelled") {
    return {
      message: "Transaksi sudah tidak aktif untuk pembayaran.",
      type: "error",
    };
  }

  return {
    message: "Status transaksi diperbarui.",
    type: "success",
  };
}

function setActionState(flags) {
  appStore.patchState("runtime.buyerPaymentStatus.loading", { ...flags }, "buyer-payment-status:loading");
}

function patchCompletionRuntime(values) {
  const current = appStore.get("runtime.buyerPaymentStatus.completion", {});
  appStore.patchState("runtime.buyerPaymentStatus.completion", {
    open: false,
    form: { payment_method: "bca_va" },
    result: null,
    error: "",
    ...current,
    ...values,
  }, "buyer-payment-status:completion-patch");
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}

function scrollPaymentSummaryIntoView() {
  window.setTimeout(() => {
    document.querySelector("#buyer_payment_detail_summary")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 80);
}

function paymentSuccessOverlay(onClose = null) {
  const overlay = document.createElement("section");
  overlay.className = "fixed inset-0 z-[120] grid place-items-center bg-[color-mix(in_srgb,var(--pb-success)_84%,black)] px-4 backdrop-blur-sm";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");

  const card = document.createElement("div");
  card.className = "grid w-full max-w-md place-items-center gap-5 rounded-[2rem] border border-white/40 bg-white px-6 py-8 text-center shadow-2xl";

  const mark = document.createElement("div");
  mark.className = "grid h-28 w-28 place-items-center rounded-full bg-[var(--pb-success)] shadow-[0_0_60px_rgba(34,197,94,0.55)] animate-[paymentSuccessPop_700ms_cubic-bezier(.2,1.4,.3,1)_both]";
  const tick = document.createElement("span");
  tick.className = "block h-12 w-6 rotate-45 border-b-[10px] border-r-[10px] border-white";
  tick.setAttribute("aria-hidden", "true");
  mark.append(tick);

  const copy = document.createElement("div");
  copy.className = "grid gap-2";
  const title = document.createElement("h2");
  title.className = "text-2xl font-black tracking-tight text-[color-mix(in_srgb,var(--pb-success)_84%,black)]";
  title.textContent = "Pembayaran Berhasil";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-[color-mix(in_srgb,var(--pb-success)_84%,black)]";
  body.textContent = "Transaksi Anda sudah dibayar.";
  copy.append(title, body);

  const close = Button({
    label: "Lanjut",
    variant: "primary",
    onClick: onClose,
  });
  close.classList.add("w-full");

  card.append(mark, copy, close, paymentSuccessStyle());
  overlay.append(card);
  return overlay;
}

function paymentSuccessStyle() {
  const style = document.createElement("style");
  style.textContent = "@keyframes paymentSuccessPop{0%{opacity:0;transform:scale(.55) rotate(-18deg)}65%{opacity:1;transform:scale(1.08) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0)}}";
  return style;
}

function showPaymentSuccessOverlay(transaction) {
  const transactionId = transaction?.id;
  if (!transactionId || hasPaymentSuccessBeenSeen(transactionId)) {
    return;
  }

  markPaymentSuccessSeen(transactionId);
  appStore.patchState("runtime.buyerPaymentStatus.successOverlay", {
    open: true,
    transactionId,
  }, "buyer-payment-status:success-overlay-open");
  window.setTimeout(() => closePaymentSuccessOverlay(), 2800);
}

function closePaymentSuccessOverlay() {
  appStore.patchState("runtime.buyerPaymentStatus.successOverlay", {
    open: false,
    transactionId: null,
  }, "buyer-payment-status:success-overlay-close");
}

function markInitialPaidSeen(transaction) {
  if (isPaymentPaid(transaction) && transaction?.id && !hasPaymentSuccessBeenSeen(transaction.id)) {
    markPaymentSuccessSeen(transaction.id);
  }
}

function hasPaymentSuccessBeenSeen(transactionId) {
  try {
    return window.sessionStorage?.getItem(paymentSuccessSeenKey(transactionId)) === "1";
  } catch {
    return false;
  }
}

function markPaymentSuccessSeen(transactionId) {
  try {
    window.sessionStorage?.setItem(paymentSuccessSeenKey(transactionId), "1");
  } catch {
    // no-op
  }
}

function paymentSuccessSeenKey(transactionId) {
  return `${PAYMENT_SUCCESS_SEEN_PREFIX}${transactionId}`;
}

function maybeAutoOpenGopay(transaction) {
  const details = resolvePaymentArtifacts(transaction);
  if (!shouldAutoOpenGopay(details)) {
    return;
  }

  markGopayAutoOpened(details.autoOpenKey);
  window.setTimeout(() => {
    window.location.assign(details.deeplinkUrl);
  }, 200);
}

function openGopayDeeplink(transaction) {
  const details = resolvePaymentArtifacts(transaction);
  if (!details.deeplinkUrl) {
    showToast("Link GoPay belum tersedia.", { type: "error" });
    return;
  }

  window.location.assign(details.deeplinkUrl);
}

function paymentQrFilename(transaction) {
  const code = String(transaction?.transaction_code ?? transaction?.id ?? "payment")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `qris-payment-${code || "transaction"}.png`;
}
