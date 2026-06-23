import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { Skeleton } from "../../../ui/primitives/skeleton.js";
import { authStore } from "../../../state/authStore.js";
import { NotificationBell } from "../../notifications/components/notificationBell.js";
import { createBackgroundVideoLayer } from "../../../ui/composites/backgroundVideo.js";
import { SliderBanner } from "../../../ui/composites/sliderBanner.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { publicCatalogService } from "../services/publicCatalogService.js";
import { publicCarDetailPreloadService } from "../services/publicCarDetailPreloadService.js";
import { publicAffiliateTrackingService } from "../services/publicAffiliateTrackingService.js";
import { publicContextService } from "../services/publicContextService.js";
import { publicCatalogState } from "../state/publicCatalogState.js";
import { PublicAffiliateContextBanner } from "../components/publicAffiliateContextBanner.js";
import { PublicCarCard } from "../components/publicCarCard.js";
import { PublicFilterBottomSheet } from "../components/publicFilterBottomSheet.js";
import { PublicSearchFilterBar } from "../components/publicSearchFilterBar.js";
import { adminMasterService } from "../../admin/services/adminMasterService.js";
import { BuyerDesktopTopNav } from "../../buyer/components/buyerDesktopTopNav.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";

const PUBLIC_CATALOG_FALLBACK = "bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--pb-brand-accent)_22%,transparent),transparent_22%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_12%),linear-gradient(180deg,var(--pb-public-canvas-start)_0%,var(--pb-public-canvas-mid)_45%,var(--pb-public-canvas-end)_100%)]";
let publicSliderCache = [];

export function PublicCatalogPage({ notFound = false } = {}) {
  let root = null;
  let unsubscribe = null;
  let backgroundVideoLayer = null;
  let isLoadingMore = false;
  let isRefreshing = false;
  let didRestoreScroll = false;
  const getBackgroundVideoLayer = () => {
    backgroundVideoLayer ??= createBackgroundVideoLayer({
      id: "public_catalog_background_video_layer",
      fallbackClassName: PUBLIC_CATALOG_FALLBACK,
      overlayClassName: "bg-black/35",
    });
    return backgroundVideoLayer;
  };

  return createPageLifecycle({
    async bootstrap(context) {
      const affiliateSlug = String(context.params?.slug ?? "").trim().toLowerCase();

      if (affiliateSlug) {
        await publicContextService.activateAffiliateBySlug(affiliateSlug).catch(() => null);
      }
    },
    mount(context) {
      root = document.createElement("div");
      root.className = "min-h-screen";
      render(root, context, { notFound, isLoadingMore, isRefreshing, getBackgroundVideoLayer });
      publicAffiliateTrackingService.trackCurrentPage();
      restoreCatalogScrollOnce(() => didRestoreScroll, () => {
        didRestoreScroll = true;
      });
      return root;
    },
    hydrate(context) {
      render(root, context, { notFound, isLoadingMore, isRefreshing, getBackgroundVideoLayer });
    },
    bindEvents(context) {
      unsubscribe = appStore.subscribe((state, action) => {
        if (!shouldRenderCatalogForAction(action)) {
          return;
        }
        render(root, context, { notFound, isLoadingMore, isRefreshing, getBackgroundVideoLayer });
      });
      return () => unsubscribe?.();
    },
    unmount() {
      publicCatalogState.setFilterOpen(false);
    },
    dispose() {
      disposeSliderBanners(root);
      backgroundVideoLayer?.dispose?.();
      backgroundVideoLayer = null;
      unsubscribe = null;
    },
  });
}

function shouldRenderCatalogForAction(action) {
  const value = String(action ?? "");
  if (!value) {
    return true;
  }

  if (value.startsWith("ui:")) {
    return false;
  }

  if (value === "public:selected-car" || value === "public:scroll-save" || value === "public:scroll-consume") {
    return false;
  }

  return [
    "auth.",
    "auth:",
    "public:",
    "public-context:",
    "working:set",
    "snapshot:set",
    "route:",
    "app.route",
  ].some((prefix) => value.startsWith(prefix) || value.includes(prefix));
}

function render(root, context, flags) {
  if (!root) {
    return;
  }

  const affiliate = publicContextService.activeAffiliate();
  const affiliateSlug = String(context.params?.slug ?? "").trim().toLowerCase();
  const isAffiliateRoute = Boolean(affiliateSlug);
  const invalidAffiliateRoute = isAffiliateRoute && publicContextService.invalidSlug() === affiliateSlug;
  const catalogState = publicCatalogState.get();
  const snapshot = publicCatalogState.snapshotCatalog({ cars: [], meta: {} });
  const working = publicCatalogState.workingCatalog(snapshot);
  const workingHydratedAt = appStore.get("working.publicCatalog.catalog.hydratedAt", 0) ?? 0;
  const meta = working?.meta ?? snapshot?.meta ?? {};
  const filters = catalogState.filters ?? {};
  const sourceCars = marketableCars(working?.cars ?? snapshot?.cars ?? []);
  const allCars = applyQuickFilter(applyLocalFilters(sourceCars, filters), catalogState.quickFilter);
  const filterOptions = buildFilterOptions(sourceCars, resolveLocationMaster());
  const canLoadMore = canLoadMoreCatalog(meta, allCars.length, catalogState.page, catalogState.limit);
  const contextReady = !isAffiliateRoute || (affiliate?.slug ?? "") === affiliateSlug;
  const useBackgroundVideo = isLandingRoute(context);

  if (isAffiliateRoute && !invalidAffiliateRoute && (!contextReady || !workingHydratedAt)) {
    disposeSliderBanners(root);
    root.replaceChildren(loadingFrame(
      filters,
      catalogState.quickFilter,
      filterOptions,
      useBackgroundVideo ? flags.getBackgroundVideoLayer?.() : null,
      useBackgroundVideo,
      affiliate,
    ));
    return;
  }

  const shell = document.createElement("div");
  shell.className = useBackgroundVideo
    ? "relative isolate min-h-screen overflow-x-clip bg-transparent"
    : `relative isolate min-h-screen overflow-x-clip ${PUBLIC_CATALOG_FALLBACK}`;
  applyDesignHook(shell, "catalog.page");
  appendBackground(shell, useBackgroundVideo ? flags.getBackgroundVideoLayer?.() : null, cosmicTexture());

  const frame = document.createElement("div");
  frame.className = "relative z-10 mx-auto grid w-full max-w-[1200px] gap-5 px-3 py-4 sm:gap-6 sm:px-6 sm:py-6 2xl:max-w-[1240px]";

  const isAuthenticated = authStore.isAuthenticated();
  const role = authStore.role();
  const showDesktopTopNav = isAuthenticated && (role === "buyer" || role === "seller");
  if (showDesktopTopNav) {
    frame.append(BuyerDesktopTopNav({
      activePath: context?.path ?? "/",
      brandLabel: role === "seller" ? "Marketing" : "Premium Buyer",
      brandIcon: role === "seller" ? "showroom" : "car",
      user: authStore.user(),
      onNavigate: (path) => context.router?.navigate(path),
    }));
  }

  if (isAuthenticated && (role === "buyer" || role === "seller")) {
    frame.append(buyerProfileHeader({
      user: authStore.user(),
      actions: {
        navigate: (path) => context.router?.navigate(path),
      },
    }));
  }

  if (affiliate) {
    const banner = PublicAffiliateContextBanner({
      affiliate,
      onClear: () => {
        publicContextService.clear();
        context.router.navigate("/");
      },
    });

    if (banner) {
      frame.append(banner);
    }
  }

  if (invalidAffiliateRoute) {
    frame.append(EmptyState({
      title: "Marketing tidak ditemukan",
      description: "Slug marketing ini tidak aktif atau tidak tersedia lagi. Kembali ke landing utama untuk melihat katalog publik.",
    }));
  } else {
    frame.append(PublicSearchFilterBar({
      filters,
      quickFilter: catalogState.quickFilter,
      activeFilterCount: activeFilterCount(filters),
      options: filterOptions,
      onSearch: (nextFilters) => publicCatalogState.setFilters(nextFilters),
      onQuickFilter: (value) => publicCatalogState.setQuickFilter(value),
      onOpenFilter: () => publicCatalogState.setFilterOpen(true),
    }));
    frame.append(SliderBanner({
      sliders: resolvePublicSliders(),
      idPrefix: "pubcat",
      context: "public",
      onNavigate: (path) => context.router?.navigate(path),
      resolveCtaUrl: (url) => isAffiliateRoute ? affiliateSliderCtaUrl(url, affiliateSlug) : url,
      fallback: () => sliderSkeletonPlaceholder(),
    }));
    frame.append(statsPanel({ count: allCars.length, meta, affiliate }));
    frame.append(
      catalogToolbar(allCars.length, meta, affiliate),
      carGrid({
        cars: allCars,
        router: context.router,
        isRefreshing: flags.isRefreshing,
      }),
      loadMoreSection({
        canLoadMore,
        isLoadingMore: flags.isLoadingMore,
        onLoadMore: () => loadMore(root, context, flags),
      })
    );
  }

  shell.append(
    frame,
    PublicFilterBottomSheet({
      open: Boolean(catalogState.isFilterOpen),
      filters,
      options: filterOptions,
      onApply: (nextFilters) => {
        publicCatalogState.setFilterOpen(false);
        publicCatalogState.setFilters(nextFilters);
      },
      onReset: () => {
        publicCatalogState.resetFilters();
        publicCatalogState.setFilterOpen(false);
      },
      onClose: () => publicCatalogState.setFilterOpen(false),
    })
  );
  disposeSliderBanners(root);
  root.replaceChildren(shell);
  publicCarDetailPreloadService.enqueueCars(allCars, { affiliateSlug });
}

function heroSection(notFound) {
  const { notFound: isNotFound, count = 0, meta = {}, affiliate = null } = typeof notFound === "object"
    ? notFound
    : { notFound };
  const section = document.createElement("section");
  section.className = "mb-2 grid gap-4 sm:mb-3";

  if (isNotFound) {
    const eyebrow = document.createElement("p");
    eyebrow.className = tw.text.eyebrow;
    eyebrow.textContent = "Katalog publik";

    const title = document.createElement("h1");
    title.className = "max-w-2xl text-2xl font-bold tracking-normal text-gray-950 xsm:text-1xl";
    title.textContent = "Halaman tidak ditemukan";

    const body = document.createElement("p");
    body.className = "max-w-2xl text-base leading-7 text-gray-600";
    body.textContent = "Kembali ke katalog untuk melihat mobil yang tersedia.";

    section.append(eyebrow, title, body);
    return section;
  }

  const promo = document.createElement("div");
  promo.id = "byr_credit_promo_banner";
  promo.className = "relative max-w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-orange-500 via-red-500 to-red-700 p-4 text-white shadow-card sm:p-6 xl:p-7";
  applyDesignHook(promo, "catalog.hero.banner");

  const overlay = document.createElement("div");
  overlay.className = "absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.35),transparent_40%)]";

  const inner = document.createElement("div");
  inner.className = "relative grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center xl:grid-cols-[minmax(0,1fr)_260px]";

  const copy = document.createElement("div");
  copy.className = "grid gap-3";

  const eyebrow = document.createElement("p");
  eyebrow.className = "inline-flex w-fit max-w-full items-center gap-2 rounded-full bg-white/16 px-3 py-1 text-[11px] font-semibold uppercase tracking-normal text-orange-100";
  const eyebrowIcon = document.createElement("span");
  eyebrowIcon.className = "inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15";
  eyebrowIcon.append(createIcon("bolt", { className: "block h-3 w-3 leading-none" }));
  const eyebrowText = document.createElement("span");
  eyebrowText.textContent = affiliate ? "Mega sale affiliate" : "Mega sale!";
  eyebrow.append(eyebrowIcon, eyebrowText);

  const title = document.createElement("h1");
  title.className = "max-w-3xl break-words text-[1.85rem] font-bold leading-tight tracking-normal text-white sm:text-4xl xl:text-[2.65rem]";
  title.textContent = affiliate?.showroom?.name
    ? `Diskon mobil ${affiliate.showroom.name} sampai 50 juta.`
    : "Diskon hingga 50 Juta";

  const body = document.createElement("p");
  body.className = "max-w-2xl text-sm leading-6 text-white/85 sm:text-base";
  body.textContent = affiliate?.profile?.name
    ? `Masuk lewat affiliate ${affiliate.profile.name}. Context katalog, CTA konsultasi, dan transaksi akan tetap ikut selama sesi ini.`
    : "Berlaku dalam 2 hari lagi";

  const promoMeta = document.createElement("p");
  promoMeta.className = "text-xs font-semibold text-white/75";
  promoMeta.textContent = "Promo mobil pilihan";

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap items-center gap-2.5 pt-1";

  const cta = document.createElement("span");
  cta.className = "inline-flex items-center rounded-full bg-white/18 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur";
  cta.textContent = "Promo";

  const countText = document.createElement("span");
  countText.className = "text-xs font-medium text-white/75";
  countText.textContent = `${metaCount(meta?.total ?? count)} unit siap tampil`;

  actions.append(cta, countText);

  copy.append(eyebrow, title, body, promoMeta, actions);

  const badgeStack = document.createElement("div");
  badgeStack.className = "hidden justify-items-end gap-2 lg:grid";

  const dotRow = document.createElement("div");
  dotRow.className = "flex items-center gap-1.5 justify-self-end";
  ["bg-[var(--pb-brand-primary)]", "bg-[var(--pb-brand-accent)]", "bg-white/70"].forEach((className) => {
    const dot = document.createElement("span");
    dot.className = `h-2.5 w-2.5 rounded-full ${className}`;
    dotRow.append(dot);
  });

  const carBadge = document.createElement("div");
  carBadge.className = "inline-flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/14 text-white shadow-lg backdrop-blur";
  carBadge.append(createIcon("car", { className: "block h-7 w-7 leading-none" }));

  badgeStack.append(dotRow, carBadge);

  inner.append(copy, badgeStack);
  promo.append(overlay, inner);

  section.append(promo);
  return section;
}

function resolvePublicSliders() {
  const working = appStore.get("working.publicCatalog.sliders.data", null);
  const publicHome = appStore.get("snapshot.public.slidersPublicHome.data", null);
  const landingHero = appStore.get("snapshot.public.slidersLandingHero.data", null);
  const items = [
    ...normalizeSliderPayload(working),
    ...normalizeSliderPayload(publicHome),
    ...normalizeSliderPayload(landingHero),
  ];
  const seen = new Set();
  const resolved = items.filter((slider) => {
    const key = String(slider?.id ?? slider?.code ?? "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 5);

  if (resolved.length) {
    publicSliderCache = resolved;
    return resolved;
  }

  return publicSliderCache;
}

function affiliateSliderCtaUrl(url, affiliateSlug) {
  const catalogUrl = `#/af/${encodeURIComponent(affiliateSlug)}`;
  const value = String(url || "").trim();

  if (!value) {
    return catalogUrl;
  }

  const hashPath = sliderHashPath(value);

  if (!hashPath || hashPath === "/" || hashPath === "/public") {
    return catalogUrl;
  }

  if (hashPath.startsWith("/cars/")) {
    return `#/af/${encodeURIComponent(affiliateSlug)}${hashPath}`;
  }

  if (hashPath.startsWith("/transactions/")) {
    return `#/af/${encodeURIComponent(affiliateSlug)}${hashPath}`;
  }

  if (hashPath.startsWith("/af/") || hashPath.startsWith("/a/")) {
    return `#${hashPath}`;
  }

  return catalogUrl;
}

function sliderHashPath(url) {
  const value = String(url || "").trim();

  if (value.startsWith("#/")) {
    return value.slice(1);
  }

  if (value.startsWith("/#/")) {
    return value.slice(2);
  }

  if (value.startsWith("/")) {
    return value.replace(/\/$/, "") || "/";
  }

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.hash.startsWith("#/")) {
      return parsed.hash.slice(1);
    }

    if (parsed.origin === window.location.origin || parsed.hostname.endsWith("garasi-mobil.com")) {
      return parsed.pathname.replace(/\/$/, "") || "/";
    }
  } catch (error) {
    // Treat unsupported CTA values as a request to stay on the affiliate catalog.
  }

  return "";
}

function normalizeSliderPayload(payload) {
  if (Array.isArray(payload)) return payload.filter(Boolean);
  if (Array.isArray(payload?.sliders)) return payload.sliders.filter(Boolean);
  if (Array.isArray(payload?.data?.sliders)) return payload.data.sliders.filter(Boolean);
  return [];
}

function catalogToolbar(count, meta, affiliate = null) {
  const bar = document.createElement("div");
  bar.className = "mt-1 rounded-[24px] border border-white/16 bg-white/10 px-4 py-3 backdrop-blur md:flex md:items-center md:justify-between xl:px-5";
  applyDesignHook(bar, "catalog.filter.toolbar");

  const copy = document.createElement("div");
  copy.className = "";
  // copy.className = "grid min-w-0 gap-1";

  const title = document.createElement("h2");
  title.className = "break-words text-sm font-bold tracking-normal text-white";
  title.textContent = affiliate?.showroom?.name
    ? `Mobil Pilihan ${affiliate.showroom.name}`
    : "Mobil Pilihan Terbaik";

  const summary = document.createElement("p");
  summary.className = "text-sm font-medium text-white/70";
  // summary.textContent = `${count} tampil${meta?.total ? ` dari ${meta.total}` : ""}`;

  const action = document.createElement("a");
  action.href = publicContextService.catalogPath();
  action.className = "hidden inline-flex w-fit items-center gap-1 text-sm font-semibold text-orange-200 no-underline";
  action.textContent = "Semua >";

  copy.append(title, summary);
  bar.append(copy, action);
  return bar;
}

function carGrid({ cars, router, isRefreshing }) {
  if (isRefreshing) {
    const grid = document.createElement("div");
    grid.className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
    grid.append(Skeleton({ lines: 4 }), Skeleton({ lines: 4 }), Skeleton({ lines: 4 }), Skeleton({ lines: 4 }));
    return grid;
  }

  if (!cars.length) {
    return EmptyState({
      title: "Mobil tidak ditemukan",
      description: "Ubah kata kunci atau filter untuk melihat katalog lainnya.",
    });
  }

  const grid = document.createElement("div");
  grid.className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
  cars.forEach((car) => {
    grid.append(PublicCarCard({
      car,
      onOpenDetail: (selectedCar) => {
        publicCatalogState.saveScrollPosition(window.scrollY);
        publicCatalogState.setSelectedCar(selectedCar.id);
        router.navigate(publicContextService.carDetailPath(selectedCar.id));
      },
    }));
  });
  return grid;
}

function loadingFrame(filters = {}, quickFilter = "newest", options = {}, backgroundVideoLayer = null, useBackgroundVideo = false, affiliate = null) {
  const shell = document.createElement("div");
  shell.className = useBackgroundVideo
    ? "relative isolate min-h-screen overflow-x-clip bg-transparent"
    : `relative isolate min-h-screen overflow-x-clip ${PUBLIC_CATALOG_FALLBACK}`;
  appendBackground(shell, backgroundVideoLayer, cosmicTexture());

  const frame = document.createElement("div");
  frame.className = "relative z-10 mx-auto grid w-full max-w-[1200px] gap-5 px-4 py-4 sm:px-6 sm:py-6 2xl:max-w-[1240px]";
  frame.append(
    PublicSearchFilterBar({
      filters,
      quickFilter,
      options,
      activeFilterCount: activeFilterCount(filters),
    }),
    SliderBanner({
      sliders: resolvePublicSliders(),
      idPrefix: "pubcat",
      context: "public",
      fallback: () => sliderSkeletonPlaceholder(),
    }),
    statsPanel({ count: 0, meta: {}, affiliate }),
    Skeleton({ lines: 8 }),
  );
  shell.append(frame);
  return shell;
}

function sliderSkeletonPlaceholder() {
  const section = document.createElement("section");
  section.id = "pubcat_slider_skeleton";
  section.className = "relative overflow-hidden rounded-[24px] border border-white/45 bg-white/20 shadow-[0_22px_58px_rgba(15,23,42,.10)] backdrop-blur";
  section.style.aspectRatio = "16 / 5";
  section.setAttribute("aria-hidden", "true");

  const shimmer = document.createElement("span");
  shimmer.className = "absolute inset-0 -translate-x-full bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.58),transparent)] animate-[pbPublicSliderShimmer_1.2s_infinite]";

  const content = document.createElement("span");
  content.className = "absolute inset-4 grid grid-cols-[minmax(0,1fr)_34%] items-center gap-4";

  const copy = document.createElement("span");
  copy.className = "grid gap-3";
  ["h-4 w-24", "h-8 w-3/4", "h-4 w-1/2"].forEach((size) => {
    const line = document.createElement("span");
    line.className = `${size} rounded-full bg-white/55`;
    copy.append(line);
  });

  const media = document.createElement("span");
  media.className = "h-full min-h-0 rounded-[18px] bg-white/45";

  content.append(copy, media);
  section.append(shimmer, content);
  injectPublicSliderSkeletonStyle();
  return section;
}

let publicSliderSkeletonStyleInjected = false;

function injectPublicSliderSkeletonStyle() {
  if (publicSliderSkeletonStyleInjected || typeof document === "undefined") {
    return;
  }
  publicSliderSkeletonStyleInjected = true;
  const style = document.createElement("style");
  style.id = "pubcat-slider-skeleton-style";
  style.textContent = "@keyframes pbPublicSliderShimmer{100%{transform:translateX(100%)}}";
  document.head.append(style);
}

function restoreCatalogScrollOnce(hasRestored, markRestored) {
  if (hasRestored()) {
    return;
  }

  const position = publicCatalogState.consumeScrollPosition();

  if (position === null) {
    return;
  }

  markRestored();
  requestAnimationFrame(() => {
    window.scrollTo({ top: position, behavior: "auto" });
  });
}

function loadMoreSection({ canLoadMore, isLoadingMore, onLoadMore }) {
  const wrap = document.createElement("div");
  wrap.className = "mt-6 grid gap-4 place-items-center";

  if (!canLoadMore) {
    const end = document.createElement("p");
    end.className = "text-sm text-white/70";
    end.textContent = "Semua mobil yang cocok sudah ditampilkan.";
    wrap.append(end, trustMarks());
    return wrap;
  }

  const button = Button({
    label: isLoadingMore ? "Memuat..." : "Muat lebih banyak",
    variant: "secondary",
    disabled: isLoadingMore,
    onClick: onLoadMore,
    designHook: "catalog.load_more.button",
  });
  button.classList.add("w-full", "xsm:w-auto", "px-6", "py-3");
  wrap.append(button, trustMarks());
  return wrap;
}

function statsPanel({ count, meta, affiliate }) {
  const panel = "";
  // const panel = document.createElement("section");
  // panel.className = "grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-white/70 bg-white/96 shadow-card sm:grid-cols-4";
  // applyDesignHook(panel, "catalog.stats.panel");
  // panel.append(
  //   compactStat(String(meta?.total ?? count ?? 0), "Mobil Tersedia", "text-[var(--pb-brand-secondary)]"),
  //   compactStat(affiliate ? "100%" : "98%", affiliate ? "Context Aktif" : "Kepuasan", "text-[var(--pb-success)]"),
  //   compactStat(affiliate ? "24/7" : "24/7", "Support", "text-[var(--pb-info)]"),
  //   compactStat(meta?.page ? `${meta.page}` : "Baru", affiliate ? "Page aktif" : "Update", "text-[var(--pb-text-muted)]"),
  // );
  return panel;
}

function compactStat(value, label, colorClass) {
  const item = document.createElement("div");
  item.className = "grid min-w-0 gap-1 bg-white px-3 py-3 text-center";

  const number = document.createElement("strong");
  number.className = `break-words text-base font-bold sm:text-lg ${colorClass}`;
  number.textContent = value;

  const caption = document.createElement("span");
  caption.className = "text-[10px] font-medium leading-4 text-slate-400";
  caption.textContent = label;

  item.append(number, caption);
  return item;
}

function cosmicTexture() {
  const layer = document.createElement("div");
  layer.className = "pointer-events-none absolute inset-0";
  layer.innerHTML = `
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(255,255,255,0.18)_0,transparent_2px),radial-gradient(circle_at_72%_18%,rgba(255,255,255,0.14)_0,transparent_2px),radial-gradient(circle_at_36%_42%,rgba(255,255,255,0.12)_0,transparent_2px),radial-gradient(circle_at_83%_34%,rgba(255,255,255,0.14)_0,transparent_2px),radial-gradient(circle_at_22%_62%,rgba(255,255,255,0.12)_0,transparent_2px),radial-gradient(circle_at_64%_72%,rgba(255,255,255,0.12)_0,transparent_2px),radial-gradient(circle_at_48%_88%,rgba(255,255,255,0.14)_0,transparent_2px)] bg-[length:100%_100%] opacity-70"></div>
  `;
  return layer;
}

function appendBackground(shell, ...layers) {
  layers.filter(Boolean).forEach((layer) => shell.append(layer));
}

function disposeSliderBanners(root) {
  root?.querySelectorAll?.(".pb-slider-banner").forEach((node) => node.dispose?.());
}

function metaCount(value) {
  return Number(value ?? 0).toLocaleString("id-ID");
}

function trustMarks() {
  const row = document.createElement("div");
  row.className = "flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-white/75";

  ["Inspeksi jelas", "Harga terarah", "Support cepat"].forEach((item) => {
    const pill = document.createElement("span");
    pill.className = "inline-flex items-center gap-2";
    const dot = document.createElement("span");
    dot.className = "h-2 w-2 rounded-full bg-[var(--pb-brand-primary)]";
    const text = document.createElement("span");
    text.textContent = item;
    pill.append(dot, text);
    row.append(pill);
  });

  return row;
}

async function loadMore(root, context, flags) {
  flags.isLoadingMore = true;
  render(root, context, flags);

  try {
    const affiliateSlug = String(context.params?.slug ?? "").trim().toLowerCase();
    const nextPage = publicCatalogState.page() + 1;
    const current = publicCatalogState.workingCatalog({ cars: [], meta: {} });
    const next = await publicCatalogService.list({
      page: nextPage,
      limit: publicCatalogState.limit(),
      filters: publicCatalogState.filters(),
      affiliateSlug,
    });

    publicCatalogState.incrementPage();
    publicCatalogState.setWorkingCatalog({
      cars: [...(current?.cars ?? []), ...(next?.cars ?? [])],
      meta: next?.meta ?? current?.meta ?? {},
    });
  } catch (error) {
    showToast(error.message || "Gagal memuat mobil tambahan.", { type: "error" });
  } finally {
    flags.isLoadingMore = false;
    render(root, context, flags);
  }
}

function activeFilterCount(filters) {
  return Object.entries(filters).reduce((count, [key, value]) => {
    if (key === "keyword" || key === "brand_name" || key === "location_name") return count;
    if (key === "brand_names" && Array.isArray(value)) return count + value.filter(Boolean).length;
    if (key === "location_names" && Array.isArray(value)) return count + value.filter(Boolean).length;
    return value !== "" && value !== null && value !== undefined ? count + 1 : count;
  }, 0);
}

function buildFilterOptions(cars, locationMaster = null) {
  cars = marketableCars(cars);
  return {
    brands: unique(cars.map((car) => car.brand_name)),
    transmissions: unique(cars.map((car) => car.transmission)),
    locations: masterLocationOptions(locationMaster),
  };
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function resolveLocationMaster() {
  return adminMasterService.normalizeLocationMaster(
    appStore.get("working.publicCatalog.masterLocation.data", null)
      ?? appStore.get("snapshot.public.masterLocation.data", null)
  );
}

function masterLocationOptions(master) {
  return (master?.data?.cities ?? [])
    .filter((city) => city.status === "active")
    .map((city) => city.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function canLoadMoreCatalog(meta, shownCount, page, limit) {
  if (meta?.total) {
    return shownCount < Number(meta.total);
  }

  return shownCount >= page * limit;
}

function applyQuickFilter(cars, quickFilter) {
  const nextCars = [...cars];

  if (quickFilter === "promo") {
    return nextCars.filter((car) => Number(car.price_discount ?? 0) > 0 && Number(car.price_discount) < Number(car.price_cash ?? 0));
  }

  if (quickFilter === "price-low") {
    return nextCars.sort((a, b) => effectivePrice(a) - effectivePrice(b));
  }

  if (quickFilter === "mileage-low") {
    return nextCars.sort((a, b) => Number(a.mileage_km ?? 999999999) - Number(b.mileage_km ?? 999999999));
  }

  return nextCars.sort((a, b) => {
    const left = Date.parse(a.published_at ?? a.created_at ?? "") || Number(a.id ?? 0);
    const right = Date.parse(b.published_at ?? b.created_at ?? "") || Number(b.id ?? 0);
    return right - left;
  });
}

function applyLocalFilters(cars, filters = {}) {
  const keyword = String(filters.keyword ?? "").trim().toLowerCase();
  const brands = selectedBrands(filters).map((brand) => brand.toLowerCase());
  const transmission = String(filters.transmission ?? "").trim().toLowerCase();
  const locations = selectedLocations(filters).map((location) => location.toLowerCase());
  const minPrice = Number(filters.min_price_cash ?? 0);
  const maxPrice = Number(filters.max_price_cash ?? 0);

  return marketableCars(cars).filter((car) => {
    const searchable = [
      car.brand_name,
      car.model_name,
      car.sub_model_name,
      car.location_name,
      car.transmission,
    ].filter(Boolean).join(" ").toLowerCase();
    const price = effectivePrice(car);

    if (keyword && !searchable.includes(keyword)) return false;
    if (brands.length > 0 && !brands.includes(String(car.brand_name ?? "").toLowerCase())) return false;
    if (transmission && String(car.transmission ?? "").toLowerCase() !== transmission) return false;
    if (locations.length > 0 && !locations.includes(String(car.location_name ?? "").toLowerCase())) return false;
    if (minPrice > 0 && price < minPrice) return false;
    if (maxPrice > 0 && price > maxPrice) return false;
    return true;
  });
}

function selectedBrands(filters) {
  if (Array.isArray(filters?.brand_names)) {
    return [...new Set(filters.brand_names.map(String).filter(Boolean))];
  }
  const legacyBrand = String(filters?.brand_name ?? "");
  return legacyBrand ? [legacyBrand] : [];
}

function selectedLocations(filters) {
  if (Array.isArray(filters?.location_names)) {
    return [...new Set(filters.location_names.map(String).filter(Boolean))];
  }
  const legacyLocation = String(filters?.location_name ?? "");
  return legacyLocation ? [legacyLocation] : [];
}

function marketableCars(cars = []) {
  return (Array.isArray(cars) ? cars : []).filter((car) => String(car?.listing_status ?? "").toLowerCase() === "published");
}

function effectivePrice(car) {
  const discount = Number(car.price_discount ?? 0);
  const cash = Number(car.price_cash ?? 0);
  return discount > 0 && discount < cash ? discount : cash;
}

function isLandingRoute(context) {
  const name = String(context?.name ?? context?.route?.name ?? "");
  const path = String(context?.path ?? "");
  return name === "public.catalog"
    || name === "public.catalog-alias"
    || path === "/"
    || path === "/public";
}

function buyerProfileHeader({ user, actions }) {
  const header = document.createElement("header");
  header.id = "byr_profile_header";
  header.className = "relative flex min-w-0 items-start justify-between gap-3 px-1 py-1 md:hidden";
  header.dataset.ds = "buyer.dashboard.profile_header";

  const identity = document.createElement("section");
  identity.className = "flex min-w-0 flex-1 items-start gap-3";

  const menu = document.createElement("button");
  menu.id = "byr_mobile_menu_button";
  menu.type = "button";
  menu.hidden = true;
  menu.className = "hidden";
  menu.setAttribute("aria-hidden", "true");
  menu.setAttribute("aria-label", "Open menu");
  menu.append(createIcon("bars", { className: "block h-5 w-5 leading-none" }));

  identity.append(menu, greetingBlock(user));

  const actionGroup = document.createElement("section");
  actionGroup.className = "relative z-20 inline-flex shrink-0 items-center justify-end gap-2";
  actionGroup.append(NotificationBell({
    idPrefix: "byr_mobile",
    compact: true,
    onNavigate: actions.navigate,
    withBackdrop: true,
  }), buyerProfileAction({ user, actions, compact: true }));

  header.append(identity, actionGroup);
  return header;
}

function greetingBlock(user) {
  const name = buyerName(user) || "User";
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-0.5";

  const greeting = document.createElement("h1");
  greeting.className = "truncate text-xl font-black leading-tight tracking-normal text-white";
  greeting.textContent = ` ${name}`;

  wrap.append(greeting, textNode("p", "truncate text-[5] font-semibold text-white/75", "Selamat datang kembali!"));
  return wrap;
}

function buyerName(user = {}) {
  return user.name ?? user.full_name ?? user.username ?? user.email?.split("@")[0] ?? "User";
}

function userInitials(user = {}) {
  return buyerName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "U";
}

function buyerProfileAction({ user, actions, compact = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = compact
    ? "inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-sm font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
    : "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-sm font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  button.setAttribute("aria-label", "Buka profil buyer");
  button.title = "Profil";
  button.addEventListener("click", () => actions?.navigate?.("/profile"));
  const src = user?.avatar_url ?? user?.photo_url ?? user?.profile_photo_url ?? "";
  if (src) {
    const image = document.createElement("img");
    image.src = normalizeImageUrl(src);
    image.alt = "Avatar buyer";
    image.loading = "lazy";
    image.className = "block h-full w-full object-cover";
    image.addEventListener("error", () => {
      button.textContent = userInitials(user);
    }, { once: true });
    button.append(image);
    return button;
  }

  button.textContent = userInitials(user);
  return button;
}

function normalizeImageUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) {
    return "";
  }
  if (/^(https?:|data:|blob:)/.test(value) || value.startsWith("/")) {
    return value;
  }
  return `/storage/${value.replace(/^\/+/, "")}`;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
