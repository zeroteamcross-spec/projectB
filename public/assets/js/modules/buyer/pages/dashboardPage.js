import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { authStore } from "../../../state/authStore.js";
import { canUseFavorites, favoritesStore } from "../../../state/favoritesStore.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { mergeActiveUserIdentity } from "../../../state/sync/authUserSync.js";
import { Button } from "../../../ui/primitives/button.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { DataTable } from "../../../ui/composites/dataTable.js";
import { SliderBanner } from "../../../ui/composites/sliderBanner.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDate } from "../../../utils/formatDate.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { NotificationBell } from "../../notifications/components/notificationBell.js";
import { PublicCarCard } from "../../public/components/publicCarCard.js";
import { publicContextService } from "../../public/services/publicContextService.js";
import { adminMasterService } from "../../admin/services/adminMasterService.js";
import { buyerState } from "../state/buyerState.js";
import { BUYER_MOBILE_FOOTER_ITEMS, BuyerMobileFooterNav } from "../components/buyerMobileFooterNav.js";
import { PublicSearchFilterBar } from "../../public/components/publicSearchFilterBar.js";

const CAR_MODAL_KEY = "byr-car-detail-modal";
const FILTER_MODAL_KEY = "byr-local-filter-modal";

const CATEGORY_ITEMS = BUYER_MOBILE_FOOTER_ITEMS.map((item) => ({ ...item }));
const CATEGORY_ICON_STYLES = [
  "bg-[var(--pb-brand-primary)]",
  "bg-[var(--pb-warning)]",
  "bg-[var(--pb-info)]",
  "bg-[var(--pb-success)]",
  "bg-[var(--pb-text-strong)]",
];
const LOCAL_FILTER_CATEGORY_ITEMS = [
  { id: "new", label: "Mobil Baru", icon: "car" },
  { id: "used", label: "Mobil Bekas", icon: "car" },
  { id: "suv", label: "SUV", icon: "truck" },
  { id: "sport", label: "Sport", icon: "bolt" },
  { id: "credit", label: "Kredit", icon: "creditCard" },
  { id: "all", label: "Lainnya", icon: "ellipsis" },
];

export function BuyerDashboardPage({ notFound = false } = {}) {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const uiState = {
    search: "",
    category: "all",
    brand: "",
    brands: [],
    transmission: "",
    location_name: "",
    locations: [],
    quickFilter: "newest",
  };

  const actions = {
    openCatalog() {
      currentContext?.router?.navigate("/buyer/cars");
    },
    openTransactions() {
      currentContext?.router?.navigate("/buyer/transactions");
    },
    navigate(path) {
      currentContext?.router?.navigate(path);
    },
    setSearch(value, cars) {
      uiState.search = value;
      refreshRecommendations(root, cars, actions, uiState);
    },
    setQuickFilter(value, cars) {
      uiState.quickFilter = value;
      refreshRecommendations(root, cars, actions, uiState);
    },
    setCategory(value) {
      uiState.category = value;
      render(root, currentContext, actions, uiState, notFound);
    },
    openFilter(cars) {
      openBuyerFilterModal({
        cars,
        uiState,
        locationOptions: resolveLocationOptions(),
        onApply: () => render(root, currentContext, actions, uiState, notFound),
      });
    },
    openCar(car) {
      buyerState.setSelectedCar(car.id);
      if (car?.id) {
        currentContext?.router?.navigate(publicContextService.carDetailPath(car.id));
      }
    },
    toggleFavorite(car) {
      return favoritesStore.toggle(car?.id).catch((error) => {
        showToast(error?.message || "Favorit gagal disimpan.", {
          type: "error",
          key: "favorite-toggle-error",
          dedupeMs: 3000,
        });
      });
    },
  };

  const rerender = () => render(root, currentContext, actions, uiState, notFound);

  return createPageLifecycle({
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
      unsubscribe = appStore.subscribe((state, action) => {
        if (String(action ?? "").startsWith("ui:")) {
          return;
        }
        rerender();
      });
      return () => unsubscribe?.();
    },
    dispose() {
      closeBuyerCarModal();
      closeBuyerFilterModal();
      unsubscribe = null;
    },
  });
}

function render(root, context, actions, uiState, notFound) {
  if (!root) {
    return;
  }

  const snapshotTransactions = buyerState.snapshot("transactions", { transactions: [] });
  const workingTransactions = buyerState.working("buyerDashboard", "transactions", snapshotTransactions);
  // Home is favorites-only. It deliberately no longer lists cars across every
  // showroom; buyers save cars from a showroom catalog and find them here.
  const cars = marketableCars(normalizeCars(favoritesStore.cars()));
  const transactions = normalizeTransactions(workingTransactions ?? snapshotTransactions);
  const filteredCars = filterCars(cars, uiState);
  const hasFavorites = cars.length > 0;
  const activePath = context?.path ?? appStore.get("app.currentRoute.path", "/buyer");
  const user = resolveBuyerUser();

  const page = document.createElement("section");
  page.id = "byr_page";
  page.className = "mx-auto grid min-w-0 w-full max-w-[430px] gap-5 pb-28 text-[var(--pb-text)] md:max-w-[1180px] md:gap-6 md:pb-8";
  page.dataset.ds = "buyer.dashboard.page";

  page.append(
    buyerTopNavigation({ activePath, actions }),
    buyerProfileHeader({
      user,
      actions,
    }),
    ...(hasFavorites ? [buyerSearchBar({ cars, uiState, actions })] : []),
    SliderBanner({
      sliders: resolveBuyerSliders(),
      idPrefix: "byr",
      context: "buyer",
      onNavigate: actions.navigate,
      fallback: () => buyerHero({ cars, notFound, actions }),
    }),
    buyerCategoryMenu({ activePath, actions }),
    latestTransactionsSection({ transactions, actions }),
    recommendationsSection({ cars: filteredCars, actions, hasFavorites }),
    creditPromoBanner(actions),
    buyerBottomNavigation({ activePath, actions }),
  );

  disposeChildren(root);
  root.replaceChildren(page);
}

function disposeChildren(root) {
  root?.querySelectorAll?.("*").forEach((node) => node.dispose?.());
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

function buyerTopNavigation({ activePath, actions }) {
  const user = resolveBuyerUser();
  const nav = document.createElement("nav");
  nav.id = "byrtx_desktop_top_nav";
  nav.className = "sticky top-0 z-40 hidden min-w-0 items-center justify-between gap-4 rounded-[1.75rem] border border-[var(--pb-border)] bg-[color-mix(in_srgb,var(--pb-surface-card)_92%,transparent)] p-3 shadow-[var(--pb-shadow-card)] backdrop-blur-xl md:flex";
  nav.setAttribute("aria-label", "Navigasi buyer desktop");

  const brand = document.createElement("section");
  brand.className = "flex min-w-0 items-center gap-3 px-1";
  const brandCopy = document.createElement("section");
  brandCopy.className = "grid min-w-0 gap-0.5";
  brandCopy.append(
    textNode("strong", "truncate text-sm font-black text-[var(--pb-text)]", "Premium Buyer"),
    textNode("span", "truncate text-xs font-bold text-[var(--pb-brand-secondary)]", `Halo, ${buyerName(user)}`),
  );
  brand.append(
    iconBox({ size: "h-11 w-11", className: "bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white shadow-[var(--pb-shadow-soft)]", icon: "car", iconSize: "h-5 w-5" }),
    brandCopy,
  );

  const right = document.createElement("section");
  right.className = "flex min-w-0 items-center justify-end gap-2";
  const links = document.createElement("section");
  links.className = "flex min-w-0 items-center justify-end gap-2";
  BUYER_MOBILE_FOOTER_ITEMS.forEach((item) => links.append(navLink(item, activePath, actions, "desktop")));
  const actionGroup = document.createElement("section");
  actionGroup.className = "inline-flex shrink-0 items-center justify-end gap-2";
  actionGroup.append(NotificationBell({
    idPrefix: "byr_desktop",
    onNavigate: actions.navigate,
    withBackdrop: true,
  }), buyerProfileAction({ user, actions }));
  right.append(links, actionGroup);

  nav.append(brand, right);
  return nav;
}

function buyerSearchBar({ cars, uiState, actions }) {
  return PublicSearchFilterBar({
    filters: { keyword: uiState.search, location_name: uiState.location_name, location_names: selectedLocations(uiState) },
    quickFilter: uiState.quickFilter || "newest",
    activeFilterCount: activeBuyerFilterCount(uiState),
    options: { locations: resolveLocationOptions() },
    onSearch: (nextFilters) => {
      if (Object.prototype.hasOwnProperty.call(nextFilters, "location_name")) {
        uiState.location_name = nextFilters.location_name ?? "";
        uiState.locations = nextFilters.location_name ? [nextFilters.location_name] : [];
      }
      actions.setSearch(nextFilters.keyword ?? uiState.search ?? "", cars);
    },
    onQuickFilter: (value) => {
      actions.setQuickFilter(value, cars);
    },
    onOpenFilter: () => {
      actions.openFilter(cars);
    },
  });
}

function buyerHero({ cars, notFound, actions }) {
  const section = document.createElement("section");
  section.id = "byr_hero_banner";
  section.className = "relative min-h-[340px] overflow-hidden rounded-[1.9rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_12%,var(--pb-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--pb-brand-primary)_10%,white),var(--pb-surface-card)_46%,color-mix(in_srgb,var(--pb-brand-accent)_10%,white))] p-5 shadow-[0_22px_64px_rgba(15,23,42,0.12)] md:min-h-[360px] md:rounded-[2rem] md:p-8";
  section.dataset.ds = "buyer.dashboard.hero";

  const showroom = document.createElement("span");
  showroom.className = "pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.94)_0%,rgba(255,255,255,0.70)_42%,rgba(255,255,255,0.28)_100%),radial-gradient(circle_at_75%_18%,rgba(255,255,255,0.92),transparent_28%),linear-gradient(120deg,transparent_0%,rgba(30,129,176,0.10)_100%)]";

  const copy = document.createElement("section");
  copy.className = "relative z-10 grid max-w-[300px] gap-4 md:max-w-[430px] md:gap-5";
  copy.append(
    textNode("p", "inline-flex w-fit rounded-full border border-[color-mix(in_srgb,var(--pb-brand-primary)_20%,var(--pb-border))] bg-[color-mix(in_srgb,var(--pb-brand-primary)_8%,white)] px-4 py-2 text-[10px] font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-soft)]", "Temukan Sekarang"),
    textNode("h1", "break-words text-3xl font-black leading-[1.08] tracking-normal text-[var(--pb-text)] md:text-4xl", notFound ? "HALAMAN TIDAK DITEMUKAN" : "MILIKI MOBIL IMPIAN ANDA"),
    textNode("p", "max-w-[25rem] text-xs font-semibold leading-6 text-[var(--pb-text-muted)] md:text-sm", "Kualitas terbaik, pilihan premium untuk setiap perjalanan."),
  );

  const cta = Button({ label: "Lihat Koleksi", onClick: actions.openCatalog, designHook: "shared.button.primary" });
  cta.id = "byr_hero_collection_button";
  cta.classList.add("w-fit", "px-5", "py-3");
  cta.append(createIcon("arrowRight", { className: "block h-4 w-4 leading-none" }));
  copy.append(cta);

  const imageWrap = document.createElement("section");
  imageWrap.className = "absolute bottom-5 right-[-4.5rem] z-0 w-[86%] max-w-[560px] md:bottom-3 md:right-2 md:w-[56%]";
  const image = document.createElement("img");
  image.id = "byr_hero_car_image";
  image.src = heroImageUrl(cars);
  image.alt = "Mobil premium";
  image.loading = "eager";
  image.className = "block h-auto w-full object-contain drop-shadow-[0_26px_34px_rgba(15,23,42,0.24)]";
  image.addEventListener("error", () => {
    image.src = fallbackCarImageUrl();
  }, { once: true });
  imageWrap.append(image);

  const dots = document.createElement("section");
  dots.className = "absolute inset-x-0 bottom-5 z-10 flex justify-center gap-2";
  Array.from({ length: 5 }).forEach((_, index) => {
    const dot = document.createElement("span");
    dot.className = index === 0
      ? "h-2.5 w-6 rounded-full bg-[var(--pb-brand-primary)] shadow-[var(--pb-shadow-soft)]"
      : "h-2.5 w-2.5 rounded-full bg-[var(--pb-border-strong)]";
    dots.append(dot);
  });

  section.append(showroom, imageWrap, copy, dots);
  return section;
}

function resolveBuyerSliders() {
  const working = appStore.get("working.buyerDashboard.sliders.data", null);
  const landingPageSnapshot = buyerState.snapshot("slidersLandingPage", null);
  const publicHomeSnapshot = buyerState.snapshot("slidersPublicHome", null);
  const landingHeroSnapshot = buyerState.snapshot("slidersLandingHero", null);
  return [
    ...normalizeSliderPayload(working),
    ...normalizeSliderPayload(landingPageSnapshot),
    ...normalizeSliderPayload(publicHomeSnapshot),
    ...normalizeSliderPayload(landingHeroSnapshot),
  ].filter((slider, index, items) => {
    const key = String(slider?.id ?? slider?.code ?? index);
    return items.findIndex((item, itemIndex) => String(item?.id ?? item?.code ?? itemIndex) === key) === index;
  }).slice(0, 5);
}

function normalizeSliderPayload(payload) {
  if (Array.isArray(payload)) return payload.filter(Boolean);
  if (Array.isArray(payload?.sliders)) return payload.sliders.filter(Boolean);
  if (Array.isArray(payload?.data?.sliders)) return payload.data.sliders.filter(Boolean);
  return [];
}

function buyerCategoryMenu({ activePath, actions }) {
  const section = document.createElement("section");
  section.id = "byr_category_menu";
  section.className = "hidden";
  section.dataset.ds = "buyer.dashboard.categories";

  const grid = document.createElement("section");
  grid.className = "grid grid-cols-3 gap-4 lg:grid-cols-5";
  CATEGORY_ITEMS.forEach((item, index) => {
    const active = isActiveNav(item, activePath);
    const button = document.createElement("button");
    button.id = `byr_category_${item.id}_button`;
    button.type = "button";
    button.disabled = Boolean(item.disabled);
    if (item.disabled) {
      button.setAttribute("aria-disabled", "true");
    }
    button.className = active
      ? "group grid min-w-0 place-items-center gap-3 rounded-[1.5rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_24%,var(--pb-border))] bg-[color-mix(in_srgb,var(--pb-brand-primary)_8%,white)] p-4 text-center shadow-[var(--pb-shadow-soft)] transition focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-55"
      : "group grid min-w-0 place-items-center gap-3 rounded-[1.5rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-4 text-center shadow-[var(--pb-shadow-soft)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-55";
    button.addEventListener("click", () => {
      if (item.disabled) {
        return;
      }
      if (item.path) {
        actions.navigate(item.path);
        return;
      }
      actions.setCategory(item.id);
    });

    const icon = iconBox({
      size: "h-20 w-20",
      className: [
        "rounded-full text-white shadow-[0_16px_34px_rgba(15,23,42,0.14)]",
        CATEGORY_ICON_STYLES[index % CATEGORY_ICON_STYLES.length],
      ].join(" "),
      icon: item.icon,
      iconSize: "text-[24.9px]",
    });

    button.append(icon, textNode("span", "max-w-full truncate text-xs font-semibold text-[var(--pb-text-strong)]", item.label));
    section.append(grid);
    grid.append(button);
  });

  return section;
}

function latestTransactionsSection({ transactions, actions }) {
  const rows = transactions.slice(0, 5);

  return DataTable({
    shellId: "byr_latest_transactions_table",
    title: "Transaksi Terakhir",
    // subtitle: rows.length
      // ? `${rows.length} transaksi terbaru dari data lokal`
      // : "Riwayat transaksi buyer akan muncul di sini.",
    icon: iconBox({
      size: "h-10 w-10",
      className: "rounded-full bg-[var(--pb-brand-primary)] text-white shadow-[var(--pb-shadow-soft)]",
      icon: "transaction",
      iconSize: "h-4 w-4",
    }),
    columns: [
      { label: "Transaksi", render: (transaction) => transactionIdentity(transaction) },
      { label: "Mobil", render: (transaction) => transactionCar(transaction) },
      { label: "Tanggal", render: (transaction) => textNode("span", "text-xs font-semibold text-[var(--pb-text-strong)]", formatDate(transaction.created_at)) },
      { label: "Nilai", render: (transaction) => textNode("span", "text-xs font-black text-[var(--pb-text-strong)]", formatCurrency(transaction.car_price ?? transaction.dp_amount ?? 0)) },
      { label: "Status", render: (transaction) => transactionStatusBadge(transaction.transaction_status) },
      { label: "Aksi", render: (transaction) => transactionAction(transaction, actions) },
    ],
    rows,
    emptyTitle: "Belum ada transaksi",
    emptyDescription: "Transaksi pembelian Anda akan ditampilkan setelah ada aktivitas.",
    mobileMode: "stack",
    tableMinWidth: "min-w-[900px]",
    getRowKey: (transaction) => transaction.id ?? transaction.transaction_code,
    mobileCardId: (transaction) => `byr_latest_transaction_${transaction.id ?? transaction.transaction_code}_card`,
    mobileCardTitle: (transaction) => transaction.transaction_code || `Transaksi #${transaction.id ?? "-"}`,
    mobileCardSubtitle: (transaction) => transactionCarLabel(transaction),
    mobileCardBadges: (transaction) => [transactionStatusBadge(transaction.transaction_status)],
    mobileCardFields: (transaction) => [
      { label: "Tanggal", value: formatDate(transaction.created_at) },
      { label: "Nilai", value: formatCurrency(transaction.car_price ?? transaction.dp_amount ?? 0) },
      { label: "Showroom", value: transaction.seller?.name || transaction.car?.seller?.name || "Showroom terdaftar" },
    ],
    mobileCardActions: (transaction) => transactionAction(transaction, actions),
  });
}

function recommendationsSection({ cars, actions, hasFavorites = false }) {
  const section = document.createElement("section");
  section.id = "byr_recommendations_section";
  section.className = "grid min-w-0 gap-4";
  section.dataset.ds = "buyer.dashboard.recommendations";

  section.append(recommendationsToolbar({ count: cars.length, actions }));

  if (!hasFavorites) {
    section.append(EmptyState({
      title: "Belum ada mobil favorit",
      description: "Buka halaman showroom, lalu tekan ikon hati pada mobil yang Anda minati. Mobil itu akan muncul di sini.",
    }));
    return section;
  }

  if (!cars.length) {
    section.append(EmptyState({
      title: "Favorit tidak ditemukan",
      description: "Ubah pencarian atau filter lokal untuk melihat favorit lainnya.",
    }));
    return section;
  }

  const grid = document.createElement("section");
  grid.id = "byr_recommendations_grid";
  grid.className = "grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3";
  cars.forEach((car) => {
    grid.append(PublicCarCard({
      car,
      onOpenDetail: actions.openCar,
      showFavorite: canUseFavorites(),
      isFavorite: favoritesStore.isFavorited(car.id),
      onToggleFavorite: actions.toggleFavorite,
    }));
  });
  section.append(grid);
  return section;
}

function recommendationsToolbar({ count, actions }) {
  const bar = document.createElement("section");
  bar.className = "mt-1 rounded-[24px] border border-white/16 bg-white/10 px-4 py-3 backdrop-blur md:flex md:items-center md:justify-between xl:px-5";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-1";
  // copy.className = "";
  copy.append(
    textNode("h2", "break-words text-xs font-bold tracking-normal text-[var(--pb-text-strong)]", "Mobil Favorit Saya"),
    // textNode("p", "text-xs font-medium text-white/70", count ? `${count} rekomendasi tersedia` : "Rekomendasi akan muncul di sini"),
  );

  const action = "";
  // const action = sectionTextButton("Semua", actions.openCatalog);
  // action.classList.add("mt-3", "text-white", "hover:bg-white/10", "md:mt-0");

  bar.append(copy, action);
  return bar;
}

function creditPromoBanner(actions) {
  const section = document.createElement("section");
  section.id = "byr_credit_promo_banner";
  section.className = "relative grid min-w-0 gap-5 overflow-hidden rounded-[1.75rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_16%,var(--pb-border))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--pb-brand-primary)_9%,white),var(--pb-surface-card)_48%,white)] p-5 shadow-[0_20px_58px_rgba(15,23,42,0.10)] md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)_auto] md:items-center md:rounded-[2rem] md:p-7";
  section.dataset.ds = "buyer.dashboard.credit_promo";

  const copy = document.createElement("section");
  copy.className = "relative z-10 grid min-w-0 gap-2";
  copy.append(
    textNode("p", "text-xs font-black uppercase text-[var(--pb-brand-secondary)]", "PROMO TERBATAS"),
    textNode("h2", "break-words text-xl font-black tracking-normal text-[var(--pb-text)]", "Kredit Mobil Lebih Mudah"),
    textNode("p", "text-xs font-semibold text-[var(--pb-text-muted)]", "Bunga mulai dari"),
  );

  const rate = document.createElement("section");
  rate.className = "flex min-w-0 flex-wrap items-end gap-2";
  rate.append(
    textNode("strong", "text-4xl font-black leading-none text-[var(--pb-brand-secondary)] md:text-5xl", "2,49%*"),
    textNode("span", "pb-1 text-xs font-bold text-[var(--pb-text-strong)]", "per tahun"),
  );
  copy.append(rate, textNode("p", "text-[10px] font-semibold text-[var(--pb-text-muted)]", "*S&K Berlaku"));

  const visual = document.createElement("section");
  visual.className = "relative z-10 hidden min-w-0 md:block";
  const image = document.createElement("img");
  image.src = fallbackCarImageUrl();
  image.alt = "Promo kredit mobil";
  image.loading = "lazy";
  image.className = "block w-full object-contain drop-shadow-[0_20px_28px_rgba(30,129,176,0.20)]";
  visual.append(image);

  const benefit = document.createElement("section");
  benefit.className = "relative z-10 grid min-w-0 gap-3";
  ["Proses Cepat", "DP Ringan", "Tenor Hingga 7 Tahun"].forEach((item) => {
    const row = document.createElement("section");
    row.className = "flex min-w-0 items-center gap-3 text-xs font-semibold text-[var(--pb-text-strong)]";
    row.append(
      iconBox({ size: "h-7 w-7", className: "rounded-full text-[var(--pb-brand-secondary)]", icon: "circleCheck", iconSize: "h-4 w-4" }),
      textNode("span", "min-w-0 break-words", item),
    );
    benefit.append(row);
  });

  const cta = Button({ label: "Ajukan Sekarang", onClick: () => actions.navigate("/"), designHook: "shared.button.primary" });
  cta.id = "byr_credit_apply_button";
  cta.classList.add("mt-2", "w-full", "py-3");
  cta.append(createIcon("arrowRight", { className: "block h-4 w-4 leading-none" }));
  benefit.append(cta);

  section.append(copy, visual, benefit);
  return section;
}

function buyerBottomNavigation({ activePath, actions }) {
  return BuyerMobileFooterNav({
    activePath,
    items: BUYER_MOBILE_FOOTER_ITEMS,
    onNavigate: (path) => actions.navigate(path),
  });
}

function navLink(item, activePath, actions, mode) {
  const active = isActiveNav(item, activePath);
  const link = item.disabled ? document.createElement("button") : document.createElement("a");
  link.id = `byr_nav_${mode}_${item.id}`;
  if (item.disabled) {
    link.type = "button";
    link.disabled = true;
    link.setAttribute("aria-disabled", "true");
  } else {
    link.href = `#${item.path}`;
  }
  link.className = desktopNavClassName({ active, disabled: item.disabled });
  if (active) {
    link.setAttribute("aria-current", "page");
  }
  link.addEventListener("click", (event) => {
    event.preventDefault();
    if (item.disabled) {
      return;
    }
    actions.navigate(item.path);
  });
  link.append(navIcon(item.icon, active), textNode("span", "truncate", item.label));
  link.setAttribute("aria-label", item.label);
  link.title = item.label;
  return link;
}

function openBuyerFilterModal({ cars, uiState, locationOptions = [], onApply }) {
  const draft = {
    category: uiState.category,
    brands: selectedBrands(uiState),
    transmission: uiState.transmission,
    locations: selectedLocations(uiState),
  };
  const content = document.createElement("section");
  content.id = "byr_filter_modal_content";
  content.className = "grid min-w-0 gap-5";

  content.append(
    filterGroup("Kategori", LOCAL_FILTER_CATEGORY_ITEMS.map((item) => ({
      label: item.label,
      value: item.id,
      icon: item.icon,
      active: draft.category === item.id,
      onClick: (button, siblings) => {
        draft.category = item.id;
        syncOptionButtons(button, siblings);
      },
    }))),
    filterGroup("Merek", localOptions(cars, "brand_name", "Semua Merek").map((item) => ({
      label: item.label,
      value: item.value,
      icon: "car",
      active: item.value === "" ? draft.brands.length === 0 : draft.brands.includes(item.value),
      onClick: (button, siblings) => {
        if (item.value === "") {
          draft.brands = [];
        } else {
          draft.brands = toggleValue(draft.brands, item.value);
        }
        syncMultiOptionButtons(siblings, draft.brands);
      },
    }))),
    filterGroup("Transmisi", localOptions(cars, "transmission", "Semua Transmisi").map((item) => ({
      label: item.label,
      value: item.value,
      icon: "sort",
      active: draft.transmission === item.value,
      onClick: (button, siblings) => {
        draft.transmission = item.value;
        syncOptionButtons(button, siblings);
      },
    }))),
    filterGroup("Lokasi", optionList(locationOptions, "Semua Lokasi").map((item) => ({
      label: item.label,
      value: item.value,
      icon: "location",
      active: item.value === "" ? draft.locations.length === 0 : draft.locations.includes(item.value),
      onClick: (button, siblings) => {
        if (item.value === "") {
          draft.locations = [];
        } else {
          draft.locations = toggleValue(draft.locations, item.value);
        }
        syncMultiOptionButtons(siblings, draft.locations);
      },
    }))),
  );

  const actions = document.createElement("section");
  actions.className = "grid grid-cols-2 gap-3";

  const reset = Button({
    label: "Reset",
    variant: "secondary",
    onClick: () => {
      uiState.category = "all";
      uiState.brand = "";
      uiState.brands = [];
      uiState.transmission = "";
      uiState.location_name = "";
      uiState.locations = [];
      closeModal({ notify: false });
      onApply?.();
    },
    designHook: "shared.button.secondary",
  });
  reset.id = "byr_filter_reset_button";

  const apply = Button({
    label: "Terapkan",
    onClick: () => {
      uiState.category = draft.category;
      uiState.brand = "";
      uiState.brands = [...draft.brands];
      uiState.transmission = draft.transmission;
      uiState.location_name = "";
      uiState.locations = [...draft.locations];
      closeModal({ notify: false });
      onApply?.();
    },
    designHook: "shared.button.primary",
  });
  apply.id = "byr_filter_apply_button";

  actions.append(reset, apply);
  content.append(actions);

  openModal(content, {
    key: FILTER_MODAL_KEY,
    title: "Filter Mobil",
    description: "Filter lokal dari data mobil yang sudah tersedia di halaman.",
    size: "lg",
    footer: null,
    panelId: "byr_filter_modal",
    headerId: "byr_filter_modal_header",
    bodyId: "byr_filter_modal_body",
    closeButtonId: "byr_filter_modal_close_button",
  });
}

function openBuyerCarModal(car) {
  const content = document.createElement("section");
  content.id = "byr_car_detail_modal_content";
  content.className = "grid min-w-0 gap-4";

  const image = document.createElement("img");
  image.src = carImageUrl(car) || fallbackCarImageUrl();
  image.alt = carTitle(car);
  image.loading = "lazy";
  image.className = "block aspect-[1.75/1] w-full rounded-[1.25rem] object-cover";
  image.addEventListener("error", () => {
    image.src = fallbackCarImageUrl();
  }, { once: true });

  content.append(
    image,
    detailCard("Mobil", [
      ["Unit", carTitle(car)],
      ["Tahun", car.year ?? car.production_year ?? "-"],
      ["Kilometer", mileageLabel(car)],
      ["Transmisi", car.transmission ?? "-"],
    ]),
    detailCard("Harga", [
      ["Harga", formatCurrency(carPrice(car))],
      ["Status", statusLabel(car.listing_status ?? "published")],
      ["Lokasi", car.location_name ?? "-"],
    ]),
  );

  openModal(content, {
    key: CAR_MODAL_KEY,
    title: "Detail mobil",
    description: "Ringkasan mobil dari data katalog yang sudah tersedia.",
    size: "lg",
    footer: null,
    panelId: "byr_detail_modal",
    headerId: "byr_detail_modal_header",
    bodyId: "byr_detail_modal_body",
    closeButtonId: "byr_detail_modal_close_button",
  });
}

function closeBuyerCarModal() {
  const modal = appStore.get("ui.modal", null);
  if (modal?.key === CAR_MODAL_KEY) {
    closeModal({ notify: false });
  }
}

function closeBuyerFilterModal() {
  const modal = appStore.get("ui.modal", null);
  if (modal?.key === FILTER_MODAL_KEY) {
    closeModal({ notify: false });
  }
}

function refreshRecommendations(root, cars, actions, uiState) {
  const section = root?.querySelector?.("#byr_recommendations_section");
  if (!section) {
    return;
  }
  const source = marketableCars(cars);
  section.replaceWith(recommendationsSection({
    cars: filterCars(source, uiState),
    actions,
    hasFavorites: source.length > 0,
  }));
}

function filterGroup(title, options) {
  const section = document.createElement("section");
  section.className = "grid min-w-0 gap-3";
  section.append(textNode("h3", "text-xs font-black text-[var(--pb-text)]", title));

  const grid = document.createElement("section");
  grid.className = "grid grid-cols-2 gap-2 sm:grid-cols-3";
  const buttons = [];
  options.forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = optionButtonClassName(option.active);
    button.dataset.active = option.active ? "true" : "false";
    button.dataset.value = option.value ?? "";
    button.append(
      iconBox({ size: "h-8 w-8", className: "rounded-full text-[var(--pb-brand-secondary)]", icon: option.icon, iconSize: "h-4 w-4" }),
      textNode("span", "min-w-0 truncate text-left", option.label),
    );
    button.addEventListener("click", () => option.onClick(button, buttons));
    buttons.push(button);
    grid.append(button);
  });
  section.append(grid);
  return section;
}

function filterCars(cars, uiState) {
  const search = String(uiState.search ?? "").trim().toLowerCase();
  const category = String(uiState.category || "all");
  const brands = selectedBrands(uiState);
  const transmission = String(uiState.transmission || "");
  const locations = selectedLocations(uiState).map((location) => location.toLowerCase());

  const filtered = cars.filter((car) => {
    const haystack = [
      carTitle(car),
      car.sub_model_name,
      car.location_name,
      car.transmission,
      car.body_type,
      car.segment,
      car.listing_status,
    ].filter(Boolean).join(" ").toLowerCase();
    if (search && !haystack.includes(search)) {
      return false;
    }
    if (brands.length > 0 && !brands.includes(String(car.brand_name ?? ""))) {
      return false;
    }
    if (transmission && String(car.transmission ?? "") !== transmission) {
      return false;
    }
    if (locations.length > 0 && !locations.includes(String(car.location_name ?? "").toLowerCase())) {
      return false;
    }
    return matchesCategory(car, category);
  });

  return applyQuickFilter(filtered, uiState.quickFilter || "newest");
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

function effectivePrice(car) {
  const price = Number(car.price_cash ?? 0);
  const discount = Number(car.price_discount ?? 0);
  return discount > 0 && discount < price ? discount : price;
}

function activeBuyerFilterCount(uiState) {
  let count = selectedBrands(uiState).length;
  if (String(uiState?.category ?? "all") !== "all") {
    count += 1;
  }
  if (String(uiState?.transmission ?? "")) {
    count += 1;
  }
  count += selectedLocations(uiState).length;
  return count;
}

function selectedBrands(uiState) {
  if (Array.isArray(uiState?.brands)) {
    return [...new Set(uiState.brands.map(String).filter(Boolean))];
  }
  const legacyBrand = String(uiState?.brand ?? "");
  return legacyBrand ? [legacyBrand] : [];
}

function selectedLocations(uiState) {
  if (Array.isArray(uiState?.locations)) {
    return [...new Set(uiState.locations.map(String).filter(Boolean))];
  }
  const legacyLocation = String(uiState?.location_name ?? "");
  return legacyLocation ? [legacyLocation] : [];
}

function toggleValue(values, value) {
  const current = new Set((Array.isArray(values) ? values : []).map(String).filter(Boolean));
  if (current.has(value)) {
    current.delete(value);
  } else {
    current.add(value);
  }
  return [...current];
}

function matchesCategory(car, category) {
  const text = [car.body_type, car.segment, car.model_name, car.sub_model_name, car.description].filter(Boolean).join(" ").toLowerCase();
  if (!category || category === "all") {
    return true;
  }
  if (category === "new") {
    const year = Number(car.year ?? car.production_year ?? 0);
    return year >= new Date().getFullYear() - 1 || String(car.condition ?? "").toLowerCase().includes("new");
  }
  if (category === "used") {
    return Number(car.mileage_km ?? 0) > 0 || String(car.condition ?? "").toLowerCase().includes("used");
  }
  if (category === "suv") {
    return text.includes("suv");
  }
  if (category === "sport") {
    return text.includes("sport") || text.includes("coupe") || text.includes("performance");
  }
  if (category === "credit") {
    return Number(car.price_credit ?? 0) > 0;
  }
  return true;
}

function resolveBuyerUser() {
  const profile = buyerState.snapshot("profile", null);
  const authUser = authStore.user();
  return mergeActiveUserIdentity(profile, authUser);
}

function avatarNode(user) {
  const src = user?.avatar_url ?? user?.photo_url ?? user?.profile_photo_url ?? "";
  const wrap = document.createElement("span");
  wrap.className = "inline-flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-sm font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)]";

  if (src) {
    const image = document.createElement("img");
    image.src = normalizeImageUrl(src);
    image.alt = "Avatar buyer";
    image.loading = "lazy";
    image.className = "block h-full w-full object-cover";
    image.addEventListener("error", () => {
      wrap.textContent = userInitials(user);
    }, { once: true });
    wrap.append(image);
    return wrap;
  }

  wrap.textContent = userInitials(user);
  return wrap;
}

function buyerProfileAction({ user, actions, compact = false } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = compact
    ? "inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
    : "inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-xs font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
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

function greetingBlock(user) {
  const name = buyerName(user) || "Alex";
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-0.5";

  const greeting = document.createElement("h1");
  greeting.className = "truncate text-lg font-black leading-tight tracking-normal text-[var(--pb-text-strong)]";
  greeting.textContent = ` ${name}`;

  wrap.append(greeting, textNode("p", "truncate text-[5] font-semibold text-[var(--pb-text-muted)]", "Selamat datang kembali!"));
  return wrap;
}

function localOptions(cars, key, allLabel) {
  const values = [...new Set(cars.map((car) => car?.[key]).filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b));
  return [{ label: allLabel, value: "" }, ...values.slice(0, 8).map((value) => ({ label: value, value }))];
}

function optionList(values, allLabel) {
  return [{ label: allLabel, value: "" }, ...values.filter(Boolean).map((value) => ({ label: value, value }))];
}

function resolveLocationOptions() {
  const master = adminMasterService.normalizeLocationMaster(
    appStore.get("working.buyerDashboard.masterLocation.data", null)
      ?? buyerState.snapshot("masterLocation", null)
  );

  return (master?.data?.cities ?? [])
    .filter((city) => city.status === "active")
    .map((city) => city.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function normalizeCars(cars) {
  return Array.isArray(cars) ? cars.filter(Boolean) : [];
}

function marketableCars(cars = []) {
  return (Array.isArray(cars) ? cars : []).filter((car) => String(car?.listing_status ?? "").toLowerCase() === "published");
}

function normalizeTransactions(payload) {
  if (Array.isArray(payload)) {
    return payload.filter(Boolean);
  }
  if (Array.isArray(payload?.transactions)) {
    return payload.transactions.filter(Boolean);
  }
  if (Array.isArray(payload?.data?.transactions)) {
    return payload.data.transactions.filter(Boolean);
  }
  return [];
}

function transactionIdentity(transaction) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("p", "break-words text-xs font-black text-[var(--pb-text-strong)]", transaction.transaction_code || `Transaksi #${transaction.id ?? "-"}`),
    textNode("p", "break-words text-[10px] font-semibold text-[var(--pb-text-muted)]", transaction.payment_type ? paymentTypeLabel(transaction.payment_type) : "Pembelian mobil"),
  );
  return wrap;
}

function transactionCar(transaction) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("p", "break-words text-xs font-black text-[var(--pb-text-strong)]", transactionCarLabel(transaction)),
    textNode("p", "break-words text-[10px] font-semibold text-[var(--pb-text-muted)]", transaction.car?.year ? `Tahun ${transaction.car.year}` : `Mobil #${transaction.car_id ?? "-"}`),
  );
  return wrap;
}

function transactionCarLabel(transaction) {
  return [transaction.car?.brand_name, transaction.car?.model_name, transaction.car?.sub_model_name].filter(Boolean).join(" ") || `Mobil #${transaction.car_id ?? "-"}`;
}

function transactionStatusBadge(status) {
  const meta = transactionStatusMeta(status);
  return Badge({ label: meta.label, variant: meta.variant });
}

function transactionStatusMeta(status) {
  const normalized = String(status ?? "").toLowerCase();
  const map = {
    pending_payment: { label: "Menunggu Pembayaran", variant: "warning" },
    pending: { label: "Pending", variant: "warning" },
    dp_pending: { label: "Menunggu DP", variant: "warning" },
    dp_paid: { label: "Booking Fee Lunas", variant: "success" },
    paid: { label: "Lunas", variant: "success" },
    completed: { label: "Selesai", variant: "success" },
    expired: { label: "Kadaluarsa", variant: "danger" },
    cancelled: { label: "Dibatalkan", variant: "danger" },
    refunded: { label: "Refunded", variant: "danger" },
  };
  return map[normalized] ?? { label: statusLabel(status), variant: "default" };
}

function transactionAction(transaction, actions) {
  const button = Button({
    label: "Detail",
    variant: "secondary",
    onClick: () => {
      if (transaction?.id) {
        actions.navigate(`/buyer/transactions/${transaction.id}`);
        return;
      }
      actions.openTransactions();
    },
    designHook: "shared.button.secondary",
  });
  button.id = `byr_latest_transaction_${transaction.id ?? "unknown"}_detail_button`;
  button.prepend(createIcon("eye", { className: "block h-4 w-4 leading-none" }));
  return button;
}

function navIcon(icon, active) {
  const wrap = document.createElement("span");
  wrap.className = active
    ? "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--pb-brand-secondary)] leading-none"
    : "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--pb-text-muted)] leading-none";
  wrap.append(createIcon(icon, { className: "block h-[1.35rem] w-[1.35rem] leading-none" }));
  return wrap;
}

function desktopNavClassName({ active, disabled }) {
  if (disabled) {
    return "inline-flex min-w-0 items-center justify-center gap-2 rounded-full border border-transparent px-4 py-2 text-xs font-bold text-[var(--pb-text-muted)] opacity-55";
  }
  return active
    ? "inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-4 py-2 text-xs font-black text-[var(--pb-brand-secondary)] no-underline shadow-[var(--pb-shadow-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]"
    : "inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-[var(--pb-text-muted)] no-underline transition hover:bg-[var(--pb-surface-muted)] hover:text-[var(--pb-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
}

function isActiveNav(item, activePath) {
  const path = String(activePath ?? "");
  if (item.path === "/buyer") {
    return path === "/buyer";
  }
  if (item.path === "/buyer/portfolio") {
    return path === "/buyer/portfolio" || path.startsWith("/buyer/transactions");
  }
  if (item.path === "/") {
    return path === "/" || path === "/buyer/cars";
  }
  return path === item.path || path.startsWith(`${item.path}/`);
}

function sectionTextButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "inline-flex min-h-9 items-center justify-center gap-2 rounded-full px-2 text-xs font-black text-[var(--pb-brand-secondary)] transition hover:bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  button.textContent = label;
  button.addEventListener("click", onClick);
  button.append(createIcon("arrowRight", { className: "block h-3.5 w-3.5 leading-none" }));
  return button;
}

function cardDetailButton(car, actions) {
  const button = document.createElement("button");
  button.id = `byr_car_${car.id ?? "unknown"}_detail_button`;
  button.type = "button";
  button.className = "inline-flex min-h-8 shrink-0 items-center justify-center rounded-full px-3 text-[10px] font-black text-[var(--pb-brand-secondary)] transition hover:bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  button.textContent = "Detail";
  button.addEventListener("click", () => actions.openCar(car));
  return button;
}

function premiumBadge(car) {
  const premium = isPremiumCar(car);
  return Badge({ label: premium ? "Premium" : statusLabel(car.listing_status ?? "Published"), variant: premium ? "warning" : "default" });
}

function isPremiumCar(car) {
  const price = Number(carPrice(car));
  const text = [car.brand_name, car.model_name, car.sub_model_name, car.segment].filter(Boolean).join(" ").toLowerCase();
  return price >= 500000000 || ["mercedes", "bmw", "lexus", "audi", "porsche", "premium"].some((keyword) => text.includes(keyword));
}

function optionButtonClassName(active) {
  return active
    ? "inline-flex min-w-0 items-center gap-2 rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_30%,var(--pb-border))] bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-3 py-2 text-xs font-black text-[var(--pb-brand-secondary)]"
    : "inline-flex min-w-0 items-center gap-2 rounded-[1rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] px-3 py-2 text-xs font-bold text-[var(--pb-text-strong)] transition hover:bg-[var(--pb-surface-muted)]";
}

function syncOptionButtons(activeButton, siblings) {
  siblings.forEach((button) => {
    const active = button === activeButton;
    button.dataset.active = active ? "true" : "false";
    button.className = optionButtonClassName(active);
  });
}

function syncMultiOptionButtons(siblings, activeValues) {
  const activeSet = new Set(activeValues.map(String));
  siblings.forEach((button) => {
    const value = String(button.dataset.value ?? "");
    const active = value === "" ? activeSet.size === 0 : activeSet.has(value);
    button.dataset.active = active ? "true" : "false";
    button.className = optionButtonClassName(active);
  });
}

function detailCard(title, rows = []) {
  const card = document.createElement("section");
  card.className = "grid gap-3 rounded-[1.5rem] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-4 shadow-sm";
  card.append(textNode("h3", "text-sm font-black text-[var(--pb-text)]", title));
  rows.forEach(([label, value]) => {
    const row = document.createElement("section");
    row.className = "grid gap-1 border-b border-[var(--pb-border)] pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[160px_minmax(0,1fr)]";
    row.append(
      textNode("p", "text-xs font-semibold text-[var(--pb-text-muted)]", label),
      textNode("p", "break-words text-xs font-bold text-[var(--pb-text)] sm:text-right", value),
    );
    card.append(row);
  });
  return card;
}

function carImageUrl(car) {
  const images = Array.isArray(car?.images) ? car.images : [];
  const media = Array.isArray(car?.media) ? car.media : [];
  const gallery = Array.isArray(car?.gallery) ? car.gallery : [];
  const photos = Array.isArray(car?.photos) ? car.photos : [];
  const cover = images.find((image) => image?.is_cover || image?.is_primary) ?? images[0] ?? null;
  const altCover = [...media, ...gallery, ...photos].find((image) => image?.is_cover || image?.is_primary)
    ?? media[0]
    ?? gallery[0]
    ?? photos[0]
    ?? null;
  const url = car?.cover_image
    ?? car?.cover_image_url
    ?? car?.car_cover_image
    ?? car?.image_url
    ?? car?.primary_image_url
    ?? car?.thumbnail_url
    ?? car?.photo_url
    ?? (typeof car?.image === "string" ? car.image : "")
    ?? (typeof cover === "string" ? cover : "")
    ?? (typeof altCover === "string" ? altCover : "")
    ?? cover?.url
    ?? cover?.public_url
    ?? cover?.file_url
    ?? cover?.file_path
    ?? altCover?.url
    ?? altCover?.public_url
    ?? altCover?.file_url
    ?? altCover?.file_path
    ?? "";
  return normalizeImageUrl(url);
}

function heroImageUrl(cars) {
  const withImage = cars.find((car) => carImageUrl(car));
  return carImageUrl(withImage) || fallbackCarImageUrl();
}

function normalizeImageUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) {
    return "";
  }
  if (/^(https?:|data:|blob:)/.test(value) || value.startsWith("/")) {
    return value;
  }
  return `/${value}`;
}

function fallbackCarImageUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 560">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#faf4ed"/>
          <stop offset="0.52" stop-color="#ffffff"/>
          <stop offset="1" stop-color="#efe3d5"/>
        </linearGradient>
        <linearGradient id="car" x1="0" x2="1">
          <stop offset="0" stop-color="#111827"/>
          <stop offset="0.55" stop-color="#374151"/>
          <stop offset="1" stop-color="#030712"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="28" stdDeviation="24" flood-color="#111827" flood-opacity="0.24"/>
        </filter>
      </defs>
      <rect width="960" height="560" fill="url(#bg)"/>
      <path d="M0 420 C180 360 330 430 510 380 C690 330 790 360 960 308 L960 560 L0 560 Z" fill="#f5ece1"/>
      <g filter="url(#shadow)" transform="translate(130 150)">
        <path d="M110 230 C142 148 207 102 317 96 L462 96 C563 99 628 150 676 230 L724 244 C753 252 773 278 773 309 L773 346 L694 346 C687 298 647 263 599 263 C551 263 511 298 504 346 L289 346 C282 298 242 263 194 263 C146 263 106 298 99 346 L38 346 L38 305 C38 268 67 237 104 234 Z" fill="url(#car)"/>
        <path d="M213 129 L321 129 L305 214 L130 214 C154 169 176 143 213 129 Z" fill="#e0eff7" opacity="0.86"/>
        <path d="M347 129 L454 129 C514 131 557 158 596 214 L332 214 Z" fill="#e0eff7" opacity="0.78"/>
        <path d="M80 255 L166 255" stroke="#eab676" stroke-width="16" stroke-linecap="round"/>
        <path d="M650 255 L730 255" stroke="#efe3d5" stroke-width="16" stroke-linecap="round"/>
        <circle cx="194" cy="354" r="60" fill="#111827"/>
        <circle cx="194" cy="354" r="30" fill="#f8fafc"/>
        <circle cx="599" cy="354" r="60" fill="#111827"/>
        <circle cx="599" cy="354" r="30" fill="#f8fafc"/>
      </g>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function carTitle(car = {}) {
  return [car.brand_name, car.model_name, car.sub_model_name].filter(Boolean).join(" ") || `Mobil #${car.id ?? "-"}`;
}

function carMeta(car = {}) {
  return [car.year ?? car.production_year, mileageLabel(car)].filter(Boolean).join(" - ") || car.location_name || "Unit showroom";
}

function mileageLabel(car = {}) {
  const mileage = Number(car.mileage_km ?? 0);
  return mileage ? `${mileage.toLocaleString("id-ID")} km` : "";
}

function carPrice(car = {}) {
  return car.price_discount ?? car.price_cash ?? car.price_credit ?? 0;
}

function buyerName(user = {}) {
  return user.name ?? user.full_name ?? user.username ?? user.email?.split("@")[0] ?? "Buyer";
}

function userInitials(user = {}) {
  return buyerName(user)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "B";
}

function statusLabel(status) {
  return String(status ?? "-").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function paymentTypeLabel(paymentType) {
  return paymentType === "dp" ? "DP" : paymentType === "full" ? "Full payment" : statusLabel(paymentType);
}

function iconBox({ size = "h-10 w-10", className = "", icon = "info", iconSize = "h-4 w-4" } = {}) {
  const box = document.createElement("span");
  box.className = ["inline-flex shrink-0 items-center justify-center leading-none", size, className].filter(Boolean).join(" ");
  box.append(createIcon(icon, { className: `block ${iconSize} leading-none` }));
  return box;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
