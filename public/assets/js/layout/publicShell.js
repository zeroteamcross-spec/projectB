import { getAsset } from "../theme/assetRegistry.js";
import { brandConfig } from "../theme/brandConfig.js";
import { createIcon } from "../theme/iconRegistry.js";
import { RouteHydrateAlert } from "../ui/composites/routeHydrateAlert.js";
import { tw } from "../theme/tailwindClasses.js";
import { applyDesignHook } from "../theme/designStudioHooks.js";
import { renderImpersonationBanner as mountImpersonationBanner } from "./impersonationBanner.js";

export class PublicShell {
  constructor({ store } = {}) {
    this.store = store;
    this.root = null;
    this.outlet = document.createElement("main");
    this.outlet.className = tw.brand.page;
    this.headerNode = null;
    this.actionLink = null;
    this.bannerHost = null;
    this.alertHost = document.createElement("div");
    this.alertHost.className = "mx-auto w-full max-w-[1200px] px-4 pt-4 sm:px-6 2xl:max-w-[1240px]";
    this.unsubscribe = null;
  }

  render() {
    if (!this.root) {
      this.root = document.createElement("div");
      this.root.className = tw.layout.publicRoot;
      applyDesignHook(this.root, "shell.public.root");
      this.headerNode = this.header();
      this.outlet.className = tw.layout.publicMain;
      this.root.append(this.headerNode, this.alertHost, this.outlet);
      this.unsubscribe = this.store?.subscribe?.(() => this.syncActionLink()) ?? null;
    }

    this.syncActionLink();
    this.renderHydrateAlert();
    return this.root;
  }

  header() {
    const header = document.createElement("header");
    header.className = "sticky top-0 z-30 border-b border-[var(--pb-border)] bg-[var(--pb-shell-public-header)] shadow-[var(--pb-shadow-soft)] backdrop-blur-xl";
    applyDesignHook(header, "shell.public.header");

    const inner = document.createElement("div");
    inner.className = "mx-auto flex min-w-0 w-full max-w-[1200px] flex-wrap items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6 2xl:max-w-[1240px]";

    const brand = document.createElement("a");
    brand.href = "#/";
    brand.className = "flex min-w-0 flex-1 items-center gap-2.5 no-underline";

    const mark = document.createElement("span");
    mark.className = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--pb-radius-xl)] bg-[linear-gradient(135deg,var(--pb-brand-primary),var(--pb-brand-accent),var(--pb-brand-secondary))] text-white leading-none shadow-[var(--pb-shadow-card)]";
    const logoMark = getAsset(brandConfig.logoMarkAsset);
    if (logoMark) {
      const image = document.createElement("img");
      image.src = logoMark;
      image.alt = brandConfig.appName;
      image.className = "h-6 w-6 object-contain";
      mark.append(image);
    } else {
      mark.append(createIcon(publicLogoIcon(), { className: "block h-5 w-5 leading-none" }));
    }

    const copy = document.createElement("span");
    copy.className = "grid min-w-0";

    const title = document.createElement("strong");
    title.className = `min-w-0 truncate text-base font-bold tracking-normal ${tw.text.gradientBrand}`;
    title.textContent = brandConfig.appName;

    const subtitle = document.createElement("span");
    subtitle.className = "hidden text-xs font-medium text-[var(--pb-text-muted)] sm:block";
    subtitle.textContent = "Showroom mobil pilihan";

    copy.append(title, subtitle);
    brand.append(mark, copy);

    const actions = document.createElement("div");
    actions.className = "flex shrink-0 items-center gap-1.5 sm:gap-2";

    const login = document.createElement("a");
    this.actionLink = login;
    login.className = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-btn-secondary-bg)] text-[var(--pb-btn-secondary-text)] leading-none shadow-[var(--pb-shadow-soft)] transition hover:brightness-95";
    login.setAttribute("aria-label", "Akun");
    login.append(createIcon("user", { className: "block h-4 w-4 leading-none" }));
    this.syncActionLink();

    actions.append(login);
    inner.append(brand, actions);
    this.bannerHost = document.createElement("div");
    this.bannerHost.id = "public_impersonation_banner_host";
    this.bannerHost.className = "mx-auto hidden w-full max-w-[1200px] px-4 pb-3 pt-2 sm:px-6 2xl:max-w-[1240px]";
    this.brandTitleNode = title;
    this.brandSubtitleNode = subtitle;
    this.brandMarkNode = mark;
    header.append(inner);
    header.append(this.bannerHost);
    return header;
  }

  contentOutlet() {
    return this.outlet;
  }

  syncActionLink() {
    if (!this.actionLink) {
      return;
    }

    const isAuthenticated = this.store?.get("auth.isAuthenticated", false) ?? false;
    const role = this.store?.get("auth.role", "public") ?? "public";
    const target = isAuthenticated ? dashboardHash(role) : "#/auth";
    this.brandTitleNode && (this.brandTitleNode.textContent = brandConfig.appName);
    this.brandSubtitleNode && (this.brandSubtitleNode.textContent = brandConfig.appTagline || "Showroom mobil pilihan");
    if (this.brandMarkNode) {
      this.brandMarkNode.replaceChildren();
      const logoMark = getAsset(brandConfig.logoMarkAsset);
      if (logoMark) {
        const image = document.createElement("img");
        image.src = logoMark;
        image.alt = brandConfig.appName;
        image.className = "h-6 w-6 object-contain";
        this.brandMarkNode.append(image);
      } else {
        this.brandMarkNode.append(createIcon(publicLogoIcon(), { className: "block h-5 w-5 leading-none" }));
      }
    }
    this.actionLink.href = target;
    this.actionLink.title = isAuthenticated ? "Dashboard akun" : "Masuk";
    this.renderImpersonationBanner();
  }

  dispose() {
    this.unsubscribe?.();
  }
}

function publicLogoIcon() {
  return brandConfig.logoIcon === "bell" ? "brandMark" : brandConfig.logoIcon;
}

function dashboardHash(role) {
  if (role === "admin") {
    return "#/admin";
  }

  if (role === "affiliate_admin") {
    return "#/affiliate";
  }

  if (role === "seller") {
    return "#/seller";
  }

  if (role === "buyer") {
    return "#/buyer";
  }

  return "#/";
}

PublicShell.prototype.renderImpersonationBanner = function renderImpersonationBanner() {
  mountImpersonationBanner(this.bannerHost, this.store, { redirectTo: "#/admin" });
};

PublicShell.prototype.renderHydrateAlert = function renderHydrateAlert() {
  if (!this.alertHost) {
    return;
  }

  const error = this.store?.get("app.routeHydrateError", null) ?? null;
  const alert = RouteHydrateAlert({
    error,
    onDismiss: () => this.store?.patchState("app.routeHydrateError", null, "route:hydrate-error-dismiss"),
  });
  this.alertHost.classList.toggle("hidden", !alert);
  this.alertHost.replaceChildren(...(alert ? [alert] : []));
};
