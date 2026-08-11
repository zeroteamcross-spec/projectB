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
import { createIcon } from "../../../theme/iconRegistry.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { getListingLockStatus } from "../../../utils/transactionStatus.js";

const PUBLIC_DETAIL_FALLBACK = "bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--pb-brand-accent)_18%,transparent),transparent_24%),linear-gradient(180deg,var(--pb-public-canvas-start)_0%,var(--pb-public-canvas-mid)_48%,var(--pb-public-canvas-end)_100%)]";

export function PublicCarDetailPage() {
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
    unmount() {},
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

  const routeCarId = String(context.params?.id ?? "");
  const detailNode = appStore.get("working.publicCarDetail.detail", null);
  const rawDetail = detailNode?.data ?? null;
  const detail = String(rawDetail?.car?.id ?? "") === routeCarId ? rawDetail : null;
  const hasHydrated = Boolean(detailNode?.hydratedAt);
  const affiliate = publicContextService.activeAffiliate();
  const showroom = publicContextService.activeShowroom();
  const activeContext = affiliate || showroom;
  const summary = publicCatalogState.selectedCarSummary(context.params.id, {
    affiliateSlug: publicContextService.routeAffiliateSlug(context),
    showroomSlug: publicContextService.routeShowroomSlug(context),
    filters: publicCatalogState.filters(),
    page: publicCatalogState.page(),
  });
  const car = detail?.car ?? summary;
  const images = detail?.images ?? car?.images ?? [];
  const inspection = detail?.inspection ?? null;
  const backgroundVideoLayer = isPublicCarDetailRoute(context) ? getBackgroundVideoLayer?.() : null;

  if (!car && !hasHydrated) {
    root.replaceChildren(backgroundShell(backgroundVideoLayer, loadingDetail(context)));
    return;
  }

  if (!car) {
    root.replaceChildren(backgroundShell(backgroundVideoLayer, notFound(context)));
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
    backButton(context),
    ...(banner ? [banner] : []),
    applyDesignHook(PublicCarGallery({ car, images }), "public.car_detail.gallery"),
    applyDesignHook(PublicCarTitleBlock({ car }), "public.car_detail.title"),
    PublicSpecSummary({ car }),
    applyDesignHook(PublicInspectionSummary({ car, inspection }), "public.car_detail.inspection"),
    descriptionSection(car)
  );

  const aside = document.createElement("aside");
  aside.className = "grid gap-4 lg:sticky lg:top-6 xl:top-8";
  aside.append(
    applyDesignHook(PublicPriceBlock({ car }), "public.car_detail.price_panel"),
    desktopCta({ car, context }),
    applyDesignHook(PublicSellerSummary({ car }), "public.car_detail.seller_summary")
  );

  frame.append(mainColumn, aside);

  root.replaceChildren(backgroundShell(
    backgroundVideoLayer,
    frame,
    PublicStickyCta({
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

function loadingDetail(context) {
  const wrap = document.createElement("main");
  wrap.className = "mx-auto grid w-full max-w-[1200px] gap-6 px-4 py-5 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_360px] 2xl:max-w-[1240px]";

  const left = document.createElement("div");
  left.className = "grid gap-4";
  left.append(backButton(context), Skeleton({ lines: 8 }), Skeleton({ lines: 6 }));

  const right = document.createElement("div");
  right.className = "grid gap-4";
  right.append(Skeleton({ lines: 6 }), Skeleton({ lines: 4 }));

  wrap.append(left, right);
  return wrap;
}

function notFound(context) {
  const wrap = document.createElement("main");
  wrap.className = "mx-auto grid min-h-[70vh] w-full max-w-3xl place-items-center px-4 py-10";
  const content = document.createElement("div");
  content.className = "grid gap-4";
  content.append(EmptyState({
    title: "Mobil tidak ditemukan",
    description: "Kembali ke katalog untuk melihat mobil publik yang masih tersedia.",
  }));
  const button = Button({ label: "Kembali ke katalog", variant: "secondary", onClick: () => context.router.navigate(publicContextService.catalogPath()) });
  button.classList.add("justify-self-center");
  content.append(button);
  wrap.append(content);
  return wrap;
}

function backButton(context) {
  const button = Button({
    label: "Kembali ke katalog",
    variant: "secondary",
    onClick: () => context.router.navigate(publicContextService.catalogPath()),
  });
  button.classList.add("w-fit");
  button.prepend(createIcon("search", { className: "h-4 w-4" }));
  return button;
}

function desktopCta({ car, context }) {
  const section = document.createElement("section");
  section.className = "hidden gap-4 rounded-[28px] border border-white/75 bg-white/95 p-5 shadow-card backdrop-blur sm:grid";
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
  section.className = "grid gap-3 rounded-[28px] border border-white/75 bg-white/95 p-5 shadow-card backdrop-blur";
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
