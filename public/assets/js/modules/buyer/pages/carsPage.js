import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { authStore } from "../../../state/authStore.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { CarGridSection } from "../../../ui/sections/carGridSection.js";
import { NotificationBell } from "../../notifications/components/notificationBell.js";
import { BUYER_MOBILE_FOOTER_ITEMS, BuyerMobileFooterNav } from "../components/buyerMobileFooterNav.js";
import { BuyerDesktopTopNav } from "../components/buyerDesktopTopNav.js";
import { buyerState } from "../state/buyerState.js";

export function BuyerCarsPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;

  const actions = {
    navigate(path) {
      currentContext?.router?.navigate(path);
    },
  };

  return createPageLifecycle({
    mount(context) {
      currentContext = context;
      root = document.createElement("div");
      render(root, currentContext, actions);
      return root;
    },
    hydrate(context) {
      currentContext = context;
      render(root, currentContext, actions);
    },
    bindEvents(context) {
      currentContext = context;
      unsubscribe = appStore.subscribe(() => render(root, currentContext, actions));
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
    },
  });
}

function render(root, context, actions) {
  const snapshotCatalog = buyerState.snapshot("catalog", { cars: [] });
  const workingCatalog = buyerState.working("buyerCars", "catalog", snapshotCatalog);
  const cars = marketableCars(workingCatalog?.cars ?? snapshotCatalog?.cars ?? []);
  const activePath = context?.path ?? "/buyer/cars";
  const page = document.createElement("section");
  page.id = "byr_cars_page";
  page.className = "mx-auto grid min-w-0 w-full max-w-[430px] gap-5 pb-28 text-[var(--pb-text)] md:max-w-[1180px] md:gap-6 md:pb-8";

  page.append(
    BuyerDesktopTopNav({
      activePath,
      onNavigate: (path) => actions.navigate(path),
      brandLabel: "Katalog Mobil",
      brandIcon: "car",
    }),
    buyerMobileHeader({ actions }),
    SectionHeader({
      title: "Katalog Mobil",
      description: "Daftar mobil sedang dimuat.",
    }),
    CarGridSection({ cars, onOpenDetail: (car) => buyerState.setSelectedCar(car.id) }),
    BuyerMobileFooterNav({
      activePath,
      items: BUYER_MOBILE_FOOTER_ITEMS,
      onNavigate: (path) => actions.navigate(path),
    }),
  );

  disposeChildren(root);
  root.replaceChildren(page);
}

function buyerMobileHeader({ actions }) {
  const header = document.createElement("header");
  header.id = "byr_cars_mobile_header";
  header.className = "relative flex min-w-0 items-center justify-between gap-3 px-1 py-1 md:hidden";
  header.dataset.ds = "buyer.cars.mobile_header";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 flex-1 gap-0.5";
  copy.append(
    textNode("p", "text-sm font-bold text-[var(--pb-text-muted)]", "Buyer Center"),
    textNode("h1", "truncate text-xl font-black leading-tight tracking-normal text-[var(--pb-text-strong)]", "Katalog Mobil"),
  );

  const actionsWrap = document.createElement("section");
  actionsWrap.className = "relative z-20 inline-flex shrink-0 items-center justify-end gap-2";
  actionsWrap.append(
    NotificationBell({ idPrefix: "byr_cars_mobile", compact: true, onNavigate: actions.navigate, withBackdrop: true }),
    buyerProfileAction({ actions }),
  );

  header.append(copy, actionsWrap);
  return header;
}

function buyerProfileAction({ actions }) {
  const user = authStore.user() ?? {};
  const button = document.createElement("button");
  button.type = "button";
  button.className = "inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-sm font-black text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-card)] ring-1 ring-[var(--pb-border)] transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  button.setAttribute("aria-label", "Buka profil buyer");
  button.title = "Profil";
  button.addEventListener("click", () => actions.navigate("/profile"));

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

function disposeChildren(root) {
  root?.querySelectorAll?.("*").forEach((node) => node.dispose?.());
}

function marketableCars(cars = []) {
  return (Array.isArray(cars) ? cars : []).filter((car) => String(car?.listing_status ?? "").toLowerCase() === "published");
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

function userInitials(user = {}) {
  return (user.name ?? user.full_name ?? user.username ?? user.email?.split("@")[0] ?? "Buyer")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "B";
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
