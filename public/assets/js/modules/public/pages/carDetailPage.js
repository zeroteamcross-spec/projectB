import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { Skeleton } from "../../../ui/primitives/skeleton.js";
import { createBackgroundVideoLayer } from "../../../ui/composites/backgroundVideo.js";
import { PublicAffiliateContextBanner } from "../components/publicAffiliateContextBanner.js";
import { PublicCarGallery } from "../components/publicCarGallery.js";
import { PublicCarTitleBlock } from "../components/publicCarTitleBlock.js";
import { PublicInspectionSummary } from "../components/publicInspectionSummary.js";
import { PublicPriceBlock } from "../components/publicPriceBlock.js";
import { PublicSellerSummary } from "../components/publicSellerSummary.js";
import { PublicSpecSummary } from "../components/publicSpecSummary.js";
import { PublicStickyCta } from "../components/publicStickyCta.js";
import { publicAffiliateTrackingService } from "../services/publicAffiliateTrackingService.js";
import { publicContactService } from "../services/publicContactService.js";
import { publicContextService } from "../services/publicContextService.js";
import { publicCatalogState } from "../state/publicCatalogState.js";
import { MaintenancePage } from "./maintenancePage.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { getListingLockStatus, getListingStatusMeta } from "../../../utils/transactionStatus.js";

const PUBLIC_DETAIL_FALLBACK = "bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--pb-brand-accent)_18%,transparent),transparent_24%),linear-gradient(180deg,var(--pb-public-canvas-start)_0%,var(--pb-public-canvas-mid)_48%,var(--pb-public-canvas-end)_100%)]";

export function PublicCarDetailPage({ preview = false } = {}) {
  let root = null;
  let unsubscribe = null;
  let backgroundVideoLayer = null;
  const getBackgroundVideoLayer = () => {
    backgroundVideoLayer ??= createBackgroundVideoLayer({
      id: "public_car_detail_background_video_layer",
      fallbackClassName: PUBLIC_DETAIL_FALLBACK,
      overlayClassName: "bg-black/30",
    });
    return backgroundVideoLayer;
  };

  return createPageLifecycle({
    async bootstrap(context) {
      if (preview) {
        return;
      }
      publicContextService.syncRouteContext(context);
      const affiliateSlug = publicContextService.routeAffiliateSlug(context);
      const showroomSlug = publicContextService.routeShowroomSlug(context);

      if (affiliateSlug) {
        await publicContextService.activateAffiliateBySlug(affiliateSlug).catch(() => null);
      }

      if (showroomSlug) {
        await publicContextService.activateShowroomBySlug(showroomSlug).catch(() => null);
      }
    },
    mount(context) {
      root = document.createElement("div");
      root.className = "min-h-screen pb-24 sm:pb-0";
      render(root, context, getBackgroundVideoLayer, preview);
      if (!preview) {
        publicAffiliateTrackingService.trackCurrentPage();
      }
      return root;
    },
    hydrate(context) {
      render(root, context, getBackgroundVideoLayer, preview);
    },
    bindEvents(context) {
      unsubscribe = appStore.subscribe(() => render(root, context, getBackgroundVideoLayer, preview));
      return () => unsubscribe?.();
    },
    unmount() {},
    dispose() {
      backgroundVideoLayer?.dispose?.();
      backgroundVideoLayer = null;
      unsubscribe = null;
    },
  });
}

function render(root, context, getBackgroundVideoLayer, preview) {
  if (!root) {
    return;
  }

  const routeCarId = String(context.params?.id ?? "");
  const detailNode = appStore.get(preview ? "working.sellerCarPreview.detail" : "working.publicCarDetail.detail", null);
  const previewResult = preview ? detailNode?.data ?? null : null;
  const rawDetail = preview
    ? (previewResult?.status === "ready" ? previewResult.detail : null)
    : detailNode?.data ?? null;
  const detail = String(rawDetail?.car?.id ?? "") === routeCarId ? rawDetail : null;
  const hasHydrated = Boolean(detailNode?.hydratedAt);
  const affiliate = preview ? null : publicContextService.activeAffiliate();
  const showroom = preview ? null : publicContextService.activeShowroom();
  const activeContext = affiliate || showroom;

  if (!preview && (publicContextService.routeAffiliateSlug(context) || publicContextService.routeShowroomSlug(context))) {
    const maintenance = publicContextService.inactiveShowroomContext();
    if (maintenance.isInactive) {
      root.replaceChildren(MaintenancePage({ showroomName: maintenance.showroomName }));
      return;
    }
  }

  const summary = preview ? null : publicCatalogState.selectedCarSummary(context.params.id, {
    affiliateSlug: publicContextService.routeAffiliateSlug(context),
    showroomSlug: publicContextService.routeShowroomSlug(context),
    filters: publicCatalogState.filters(),
    page: publicCatalogState.page(),
  });
  const car = detail?.car ?? summary;
  const images = detail?.images ?? car?.images ?? [];
  const inspection = detail?.inspection ?? null;
  const backgroundVideoLayer = preview || isPublicCarDetailRoute(context) ? getBackgroundVideoLayer?.() : null;

  if (preview && previewResult?.status === "error") {
    root.replaceChildren(backgroundShell(backgroundVideoLayer, previewLoadFailure(context, previewResult)));
    return;
  }

  if (preview && previewResult?.status === "not_found") {
    root.replaceChildren(backgroundShell(backgroundVideoLayer, notFound(context, true)));
    return;
  }

  if (!car && !hasHydrated) {
    root.replaceChildren(backgroundShell(backgroundVideoLayer, loadingDetail(context, preview)));
    return;
  }

  if (!car) {
    root.replaceChildren(backgroundShell(backgroundVideoLayer, notFound(context, preview)));
    return;
  }

  const frame = document.createElement("main");
  frame.className = "mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:gap-8 2xl:max-w-[1240px]";
  applyDesignHook(frame, "public.car_detail.page");

  const mainColumn = document.createElement("div");
  mainColumn.className = "grid gap-6";
  const banner = activeContext
    ? PublicAffiliateContextBanner({
      affiliate: activeContext,
      onClear: () => {
        publicContextService.clear();
        context.router.navigate(`/cars/${car.id}`);
      },
    })
    : null;
  mainColumn.append(
    backButton(context, preview),
    ...(preview ? [previewNotice(car)] : []),
    ...(banner ? [banner] : []),
    applyDesignHook(PublicCarGallery({ car, images }), "public.car_detail.gallery"),
    applyDesignHook(PublicCarTitleBlock({ car }), "public.car_detail.title"),
    PublicSpecSummary({ car }),
    applyDesignHook(PublicInspectionSummary({ car, inspection }), "public.car_detail.inspection"),
    descriptionSection(car)
  );

  const aside = document.createElement("aside");
  aside.className = "grid gap-4 lg:sticky lg:top-6 xl:top-8";
  aside.append(applyDesignHook(PublicPriceBlock({ car }), "public.car_detail.price_panel"));
  if (!preview) {
    aside.append(desktopCta({ car, context }));
  }
  aside.append(applyDesignHook(PublicSellerSummary({ car }), "public.car_detail.seller_summary"));

  frame.append(mainColumn, aside);

  root.replaceChildren(backgroundShell(
    backgroundVideoLayer,
    frame,
    preview ? null : PublicStickyCta({
      car,
      onStartTransaction: (selectedCar) => startTransactionEntry(context, selectedCar),
      onConsult: (selectedCar) => publicContactService.openWhatsAppConsultation(selectedCar),
    }),
  ));
}

function backgroundShell(backgroundVideoLayer, ...children) {
  const shell = document.createElement("section");
  shell.className = "relative isolate min-h-screen overflow-x-clip bg-transparent";
  if (backgroundVideoLayer) {
    shell.append(backgroundVideoLayer);
  }

  const content = document.createElement("section");
  content.className = "relative z-10";
  content.append(...children.filter(Boolean));
  shell.append(content);
  return shell;
}

function loadingDetail(context, preview) {
  const wrap = document.createElement("main");
  wrap.className = "mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_360px] 2xl:max-w-[1240px]";

  const left = document.createElement("div");
  left.className = "grid gap-4";
  left.append(backButton(context, preview), Skeleton({ lines: 8 }), Skeleton({ lines: 6 }));

  const right = document.createElement("div");
  right.className = "grid gap-4";
  right.append(Skeleton({ lines: 6 }), Skeleton({ lines: 4 }));

  wrap.append(left, right);
  return wrap;
}

function notFound(context, preview) {
  const wrap = document.createElement("main");
  wrap.className = "mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-4 py-10";
  const content = document.createElement("div");
  content.className = "grid gap-4";
  content.append(EmptyState({
    title: preview ? "Pratinjau mobil tidak tersedia" : "Mobil tidak ditemukan",
    description: preview
      ? "Mobil ini tidak ditemukan atau akun Anda tidak memiliki akses ke listing tersebut."
      : "Kembali ke katalog untuk melihat mobil publik yang masih tersedia.",
  }));
  const button = backButton(context, preview);
  button.classList.add("justify-self-center");
  content.append(button);
  wrap.append(content);
  return wrap;
}

function previewLoadFailure(context, result) {
  const wrap = document.createElement("main");
  wrap.className = "mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-4 py-10";

  const content = document.createElement("section");
  content.className = "grid justify-items-center gap-4 rounded-[24px] border border-[var(--pb-border)] bg-white/95 p-6 text-center shadow-card sm:p-8";
  content.append(EmptyState({
    title: "Live preview gagal dimuat",
    description: result.message || "Terjadi kendala koneksi atau server. Silakan coba lagi.",
  }));

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap justify-center gap-3";
  const retry = Button({
    id: "slrc_preview_retry_button",
    label: "Coba lagi",
    onClick: () => retrySellerCarPreview(context),
  });
  retry.prepend(createIcon("history", { className: "h-4 w-4" }));
  actions.append(retry, backButton(context, true));
  content.append(actions);
  wrap.append(content);
  return wrap;
}

function retrySellerCarPreview(context) {
  const query = new URLSearchParams();
  if (context.query?.status === "archived") {
    query.set("status", "archived");
  }
  query.set("retry", String(Date.now()));
  context.router.navigate(`/seller/cars/${encodeURIComponent(context.params?.id ?? "")}/preview?${query.toString()}`);
}

function backButton(context, preview = false) {
  const button = Button({
    label: preview ? "Kembali ke daftar mobil" : "Kembali ke katalog",
    variant: "secondary",
    onClick: () => context.router.navigate(preview ? "/seller/cars" : publicContextService.catalogPath()),
  });
  button.classList.add("w-fit");
  button.prepend(createIcon("search", { className: "h-4 w-4" }));
  return button;
}

function previewNotice(car) {
  const notice = document.createElement("section");
  notice.className = "grid gap-1 rounded-[24px] border border-[var(--pb-border)] bg-white/95 px-5 py-4 shadow-card";

  const title = document.createElement("h2");
  title.className = "text-sm font-bold text-gray-950";
  title.textContent = "Live Preview";

  const description = document.createElement("p");
  description.className = "text-xs leading-6 text-gray-600";
  description.textContent = `Pratinjau khusus akun showroom · Status listing: ${getListingStatusMeta(car?.listing_status).label}. Aksi pembelian dan konsultasi tidak tersedia di halaman ini.`;

  notice.append(title, description);
  return notice;
}

function desktopCta({ car, context }) {
  const section = document.createElement("section");
  section.className = "hidden gap-4 rounded-[28px] border border-[var(--pb-card-border)] bg-white/95 p-5 shadow-card backdrop-blur sm:grid";
  applyDesignHook(section, "public.car_detail.cta_panel");
  const lock = getListingLockStatus({ car });

  const eyebrow = document.createElement("span");
  eyebrow.className = "text-[10px] font-semibold uppercase tracking-normal text-[var(--pb-brand-secondary)]";
  eyebrow.textContent = "Lanjutkan minat";

  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = lock.locked ? `${lock.label}. Konsultasi seller untuk alternatif unit.` : "Buka transaksi atau konsultasi lebih dulu.";

  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = lock.locked
    ? "Unit ini tidak lagi tersedia untuk checkout karena sudah dikunci transaksi."
    : "Gunakan WhatsApp untuk tanya kondisi, lalu lanjutkan ke transaksi saat sudah yakin.";

  const primary = Button({
    label: lock.locked ? lock.label : "Booking Sekarang",
    variant: "primary",
    disabled: lock.locked,
    onClick: lock.locked ? null : () => startTransactionEntry(context, car),
  });

  const secondary = Button({
    label: "Konsultasi WhatsApp",
    variant: "secondary",
    onClick: () => publicContactService.openWhatsAppConsultation(car),
  });

  section.append(eyebrow, title, body, primary, secondary);
  return section;
}

function descriptionSection(car) {
  const section = document.createElement("section");
  section.className = "grid gap-3 rounded-[28px] border border-[var(--pb-card-border)] bg-white/95 p-5 shadow-card backdrop-blur";
  applyDesignHook(section, "public.car_detail.description");

  const eyebrow = document.createElement("span");
  eyebrow.className = "text-[10px] font-semibold uppercase tracking-normal text-[var(--pb-brand-secondary)]";
  eyebrow.textContent = "Catatan listing";

  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = "Catatan mobil";

  const body = document.createElement("p");
  body.className = "text-xs leading-7 text-gray-600";
  body.textContent = car?.description || "Deskripsi detail belum tersedia. Gunakan konsultasi untuk menanyakan kondisi dan dokumen mobil.";

  section.append(eyebrow, title, body);
  return section;
}

function startTransactionEntry(context, car) {
  publicCatalogState.setSelectedCar(car?.id);
  context.router.navigate(publicContextService.transactionEntryPath(car?.id ?? ""));
}

function isPublicCarDetailRoute(context) {
  const name = String(context?.name ?? context?.route?.name ?? "");
  const path = String(context?.path ?? "");
  return name === "public.car-detail"
    || name === "public.affiliate.car-detail"
    || name === "public.showroom.car-detail"
    || /^\/cars\/[^/]+$/.test(path)
    || /^\/af\/[^/]+\/cars\/[^/]+$/.test(path)
    || /^\/showrooms\/[^/]+\/cars\/[^/]+$/.test(path);
}
