import { authStore } from "../../../state/authStore.js";
import { appStore } from "../../../state/store.js";
import { syncBusinessTransaction } from "../../../state/sync/businessStatusSync.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { Skeleton } from "../../../ui/primitives/skeleton.js";
import { createBackgroundVideoLayer } from "../../../ui/composites/backgroundVideo.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { createPageLifecycle } from "../../../core/lifecycle.js";
import { PublicAffiliateContextBanner } from "../components/publicAffiliateContextBanner.js";
import { PublicCarTitleBlock } from "../components/publicCarTitleBlock.js";
import { TransactionAuthGate } from "../components/transactionAuthGate.js";
import { TransactionEntryForm } from "../components/transactionEntryForm.js";
import { TransactionResultPanel } from "../components/transactionResultPanel.js";
import { markGopayAutoOpened, resolvePaymentArtifacts, shouldAutoOpenGopay } from "../../transactions/paymentMethodSupport.js";
import { publicAffiliateTrackingService } from "../services/publicAffiliateTrackingService.js";
import { publicContextService } from "../services/publicContextService.js";
import { publicTransactionService } from "../services/publicTransactionService.js";
import { googleLoginService } from "../../auth/services/googleLoginService.js";
import { transactionEntryState } from "../state/transactionEntryState.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { getListingLockStatus } from "../../../utils/transactionStatus.js";

const PUBLIC_TRANSACTION_FALLBACK = "bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--pb-brand-accent)_18%,transparent),transparent_24%),linear-gradient(180deg,var(--pb-public-canvas-start)_0%,var(--pb-public-canvas-mid)_48%,var(--pb-public-canvas-end)_100%)]";

export function TransactionEntryPage() {
  let root = null;
  let unsubscribe = null;
  let backgroundVideoLayer = null;
  const getBackgroundVideoLayer = () => {
    backgroundVideoLayer ??= createBackgroundVideoLayer({
      id: "public_transaction_background_video_layer",
      fallbackClassName: PUBLIC_TRANSACTION_FALLBACK,
      overlayClassName: "bg-black/35",
    });
    return backgroundVideoLayer;
  };

  return createPageLifecycle({
    async bootstrap(context) {
      publicContextService.syncRouteContext(context);
      const affiliateSlug = publicContextService.routeAffiliateSlug(context);

      if (affiliateSlug) {
        await publicContextService.activateAffiliateBySlug(affiliateSlug).catch(() => null);
      }
    },
    mount(context) {
      transactionEntryState.ensureForm();
      root = document.createElement("div");
      root.className = "min-h-screen";
      render(root, context, getBackgroundVideoLayer);
      publicAffiliateTrackingService.trackCurrentPage();
      return root;
    },
    hydrate(context) {
      render(root, context, getBackgroundVideoLayer);
    },
    bindEvents(context) {
      unsubscribe = appStore.subscribe(() => render(root, context, getBackgroundVideoLayer));
      return () => unsubscribe?.();
    },
    unmount() {
      unsubscribe?.();
      transactionEntryState.reset();
    },
    dispose() {
      backgroundVideoLayer?.dispose?.();
      backgroundVideoLayer = null;
      unsubscribe = null;
    },
  });
}

function render(root, context, getBackgroundVideoLayer) {
  if (!root) {
    return;
  }

  const detailNode = appStore.get("working.transactionEntry.detail", null);
  const detail = detailNode?.data ?? null;
  const hasHydrated = Boolean(detailNode?.hydratedAt);
  const car = detail?.car ?? null;
  const entry = transactionEntryState.get();
  const user = authStore.user();
  const isBuyer = authStore.isAuthenticated() && authStore.role() === "buyer";
  const affiliate = publicContextService.activeAffiliate();
  const backgroundVideoLayer = isPublicTransactionEntryRoute(context) ? getBackgroundVideoLayer?.() : null;

  maybeAutoOpenGopayResult(entry.result);

  if (!context.query.car_id) {
    root.replaceChildren(backgroundShell(backgroundVideoLayer, emptyState(context, "Mobil belum dipilih", "Buka detail mobil dari katalog untuk Booking Sekarang.")));
    return;
  }

  if (!car && !hasHydrated) {
    root.replaceChildren(backgroundShell(backgroundVideoLayer, loadingState(context)));
    return;
  }

  if (!car) {
    root.replaceChildren(backgroundShell(backgroundVideoLayer, emptyState(context, "Mobil tidak tersedia", "Mobil ini tidak ditemukan atau belum bisa ditransaksikan.")));
    return;
  }

  const lock = getListingLockStatus({ car });
  if (lock.locked || car.listing_status !== "published") {
    root.replaceChildren(backgroundShell(backgroundVideoLayer, emptyState(context, lock.label || "Mobil tidak tersedia", "Mobil ini sudah dikunci transaksi dan tidak bisa dibeli ulang.")));
    return;
  }

  const page = document.createElement("main");
  page.className = "mx-auto grid w-full max-w-[1180px] gap-6 px-3 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,400px)] lg:items-start xl:gap-8";

  const left = document.createElement("div");
  left.className = "grid gap-4";
  const banner = affiliate
    ? PublicAffiliateContextBanner({
      affiliate,
      onClear: () => {
        publicContextService.clear();
        context.router.navigate(`/transactions/new?car_id=${encodeURIComponent(car.id)}`);
      },
    })
    : null;
  left.append(
    backButton(context, car),
    heroCopy(),
    ...(banner ? [banner] : []),
    selectedCarPanel(car)
  );

  const right = document.createElement("aside");
  right.className = "grid gap-4 lg:sticky lg:top-6 xl:top-8";

  if (entry.result) {
    right.append(applyDesignHook(TransactionResultPanel({
      transaction: entry.result,
      onOpenDashboard: () => context.router.navigate("/buyer/transactions"),
      onOpenStatus: () => context.router.navigate(`/buyer/transactions/${entry.result.id}`),
    }), "buyer.transaction.form"));
  } else if (!authStore.isAuthenticated()) {
    right.append(applyDesignHook(TransactionAuthGate({
      mode: entry.authMode ?? "login",
      isSubmitting: Boolean(entry.isSubmitting),
      error: entry.error ?? "",
      onModeChange: (mode) => transactionEntryState.setMode(mode),
      onLogin: () => redirectToGoogleLogin(),
      onRegister: (payload) => registerBuyer(payload),
    }), "buyer.transaction.form"));
  } else if (!isBuyer) {
    right.append(nonBuyerGate({ user, onLogout: () => logoutAndStay() }));
  } else {
    right.append(applyDesignHook(TransactionEntryForm({
      car,
      form: transactionEntryState.form(),
      isSubmitting: Boolean(entry.isSubmitting),
      error: entry.error ?? "",
      onChange: (values) => transactionEntryState.patchForm(values),
      onSubmit: (values) => submitTransaction(car, values),
    }), "buyer.transaction.form"));
  }

  page.append(left, right);
  root.replaceChildren(backgroundShell(backgroundVideoLayer, page));
}

function backgroundShell(backgroundVideoLayer, ...children) {
  const shell = document.createElement("section");
  shell.className = backgroundVideoLayer
    ? "relative isolate min-h-screen overflow-x-clip bg-transparent"
    : `relative isolate min-h-screen overflow-x-clip ${PUBLIC_TRANSACTION_FALLBACK}`;
  if (backgroundVideoLayer) {
    shell.append(backgroundVideoLayer);
  }

  const content = document.createElement("section");
  content.className = "relative z-10";
  content.append(...children.filter(Boolean));
  shell.append(content);
  return shell;
}

function loadingState(context) {
  const wrap = document.createElement("main");
  wrap.className = "mx-auto grid w-full max-w-[1180px] gap-6 px-3 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,400px)]";
  const left = document.createElement("div");
  left.className = "grid gap-4";
  left.append(Button({ label: "Kembali", variant: "secondary", onClick: () => context.router.navigate("/") }), Skeleton({ lines: 6 }));
  const right = document.createElement("div");
  right.append(Skeleton({ lines: 8 }));
  wrap.append(left, right);
  return wrap;
}

function emptyState(context, title, description) {
  const wrap = document.createElement("main");
  wrap.className = "mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-4 py-10";
  const content = document.createElement("div");
  content.className = "grid gap-4";
  content.append(EmptyState({ title, description }));
  const button = Button({ label: "Kembali ke katalog", variant: "secondary", onClick: () => context.router.navigate(publicContextService.catalogPath()) });
  button.classList.add("justify-self-center");
  content.append(button);
  wrap.append(content);
  return wrap;
}

function heroCopy() {
  const section = "";
  // const section = document.createElement("section");
  // section.className = `${tw.surface.raisedCard} hidden grid gap-3 p-5 sm:p-6`;
  applyDesignHook(section, "buyer.transaction.hero");
  const badgeRow = document.createElement("div");
  badgeRow.className = "flex flex-wrap items-center gap-2";
  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Transaction entry";
  const pill = document.createElement("span");
  pill.className = tw.interactive.pillIdle;
  pill.textContent = "Buyer checkout";
  const title = document.createElement("h1");
  title.className = "text-xl font-bold tracking-normal text-gray-950";
  title.textContent = "Booking Sekarang dengan data yang sudah dicek.";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = "Form ini membuat transaksi awal dan sesi pembayaran dari endpoint payment yang sudah tersedia.";
  badgeRow.append(eyebrow, pill);
  // section.append(badgeRow, title, body, heroTrustRow());
  return section;
}

function selectedCarPanel(car) {
  const section = document.createElement("section");
  section.className = `grid gap-4 ${tw.surface.raisedCard} p-5 sm:p-6`;
  applyDesignHook(section, "buyer.transaction.summary");
  section.append(PublicCarTitleBlock({ car }), priceRow(car));
  return section;
}

function priceRow(car) {
  const row = document.createElement("div");
  row.className = `flex items-center justify-between gap-3 ${tw.surface.inset} shadow-sm`;
  const label = document.createElement("span");
  label.className = "text-xs font-medium text-gray-500";
  label.textContent = "Harga transaksi";
  const value = document.createElement("strong");
  value.className = "text-xl font-bold text-gray-950";
  value.textContent = formatCurrency(effectivePrice(car));
  row.append(label, value);
  return row;
}

function backButton(context, car) {
  const button = Button({
    label: "Kembali ke detail",
    variant: "secondary",
    onClick: () => context.router.navigate(publicContextService.carDetailPath(car.id)),
  });
  button.classList.add("w-fit");
  return button;
}

function nonBuyerGate({ user, onLogout }) {
  const section = document.createElement("section");
  section.className = `grid gap-4 ${tw.surface.warningPanel} p-5`;
  const title = document.createElement("h2");
  title.className = "text-lg font-bold tracking-normal text-gray-950";
  title.textContent = "Gunakan akun buyer";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = `${user?.email ?? "Akun aktif"} bukan role buyer. Logout lalu masuk memakai akun buyer untuk melanjutkan transaksi.`;
  section.append(title, body, Button({ label: "Logout", variant: "secondary", onClick: onLogout }));
  return section;
}

function heroTrustRow() {
  const row = document.createElement("div");
  row.className = "grid gap-2 border-t border-[var(--pb-card-border)] pt-4 text-xs text-gray-600 sm:grid-cols-3";
  [
    "Data mobil aktif sudah dibawa dari detail page",
    "Payment session dibuat tanpa memutus funnel public",
    "Marketing context tetap ikut bila sedang aktif",
  ].forEach((copy) => {
    const item = document.createElement("p");
    item.className = "break-words rounded-2xl bg-[var(--pb-surface-muted)] px-3 py-2";
    item.textContent = copy;
    row.append(item);
  });
  return row;
}

async function redirectToGoogleLogin() {
  await runAction(async () => {
    const config = googleLoginService.configForSlug("buyer");
    const nextPath = window.location.hash.substring(1) || "/";
    const authUrl = await googleLoginService.begin(config, nextPath);
    window.location.assign(authUrl);
  });
}

async function registerBuyer(payload) {
  await runAction(async () => {
    await publicTransactionService.registerBuyer(payload);
    transactionEntryState.setError("");
    showToast("Buyer baru berhasil dibuat.", { type: "success" });
  });
}

async function logoutAndStay() {
  await runAction(async () => {
    await publicTransactionService.logout();
    transactionEntryState.setError("");
    showToast("Logout berhasil.", { type: "success" });
  });
}

async function submitTransaction(car, values) {
  transactionEntryState.patchForm(values);
  const affiliate = publicContextService.activeAffiliate();
  await runAction(async () => {
    const transaction = await publicTransactionService.create({
      car_id: car.id,
      payment_type: values.payment_type,
      dp_amount: values.payment_type === "dp" ? Number(values.dp_amount) : 0,
      payment_method: values.payment_method || "bca_va",
      affiliate_referral_code: affiliate?.slug || undefined,
    });
    syncBusinessTransaction(transaction, {
      primaryRole: "buyer",
      source: "public-transaction-entry:create",
    });
    transactionEntryState.setResult(transaction);
    transactionEntryState.setError("");
    showToast("Transaksi berhasil dibuat.", { type: "success" });
  });
}

async function runAction(callback, { errorToastKey = "" } = {}) {
  transactionEntryState.setSubmitting(true);
  transactionEntryState.setError("");

  try {
    await callback();
  } catch (error) {
    transactionEntryState.setError(error.message || "Proses gagal.");
    showToast(error.message || "Proses gagal.", {
      type: "error",
      key: errorToastKey,
      dedupeMs: errorToastKey ? 3000 : 1500,
    });
  } finally {
    transactionEntryState.setSubmitting(false);
  }
}

function effectivePrice(car) {
  const discount = Number(car?.price_discount ?? 0);
  const cash = Number(car?.price_cash ?? 0);
  return discount > 0 && discount < cash ? discount : cash || Number(car?.price_credit ?? 0);
}

function isPublicTransactionEntryRoute(context) {
  const name = String(context?.name ?? context?.route?.name ?? "");
  const path = String(context?.path ?? "");
  return name === "public.transaction-entry"
    || name === "public.affiliate.transaction-entry"
    || path === "/transactions/new"
    || /^\/af\/[^/]+\/transactions\/new$/.test(path);
}

function maybeAutoOpenGopayResult(transaction) {
  if (!transaction) {
    return;
  }

  const details = resolvePaymentArtifacts(transaction);
  if (!shouldAutoOpenGopay(details)) {
    return;
  }

  markGopayAutoOpened(details.autoOpenKey);
  window.setTimeout(() => {
    window.location.assign(details.deeplinkUrl);
  }, 200);
}
