import { header } from "./header.js";
import { sidebar } from "./sidebar.js";
import { pageFrame } from "./pageFrame.js";
import { RouteHydrateAlert } from "../ui/composites/routeHydrateAlert.js";
import { createBackgroundVideoLayer } from "../ui/composites/backgroundVideo.js";
import { tw } from "../ui/theme/tailwindClasses.js";
import { applyDesignHook } from "../theme/designStudioHooks.js";
import { createIcon } from "../theme/iconRegistry.js";
import { uiStore } from "../state/uiStore.js";
import { renderImpersonationBanner as mountImpersonationBanner } from "./impersonationBanner.js";

export class AppShell {
  constructor({ store } = {}) {
    this.store = store;
    this.root = null;
    this.content = pageFrame();
    this.defaultContentClassName = this.content.className;
    this.sidebarNode = null;
    this.mobileSidebarNode = null;
    this.mobileSidebarContentNode = null;
    this.mobileBackdropNode = null;
    this.mobileToggleNode = null;
    this.headerNode = null;
    this.mainNode = null;
    this.backgroundVideoNode = null;
    this.alertHost = document.createElement("div");
    this.alertHost.className = "px-4 pt-4 md:px-6";
    this.defaultAlertHostClassName = this.alertHost.className;
    this.bannerHost = document.createElement("div");
    this.bannerHost.id = "app_impersonation_banner_host";
    this.bannerHost.className = "px-4 pt-4 md:px-6 hidden";
    this.unsubscribe = null;
  }

  render() {
    if (!this.root) {
      this.root = document.createElement("div");
      this.root.className = tw.layout.shell;
      applyDesignHook(this.root, "shell.app.root");
      this.backgroundVideoNode = createBackgroundVideoLayer({
        id: "buyer_background_video_layer",
        fallbackClassName: "bg-[var(--pb-page-bg)]",
        overlayClassName: "bg-black/35",
      });
      this.backgroundVideoNode.hidden = true;
      this.sidebarNode = sidebar(this.store);
      this.mobileBackdropNode = this.mobileBackdrop();
      this.mobileSidebarNode = this.mobileDrawer();
      this.mobileToggleNode = this.mobileToggle();
      this.root.append(this.backgroundVideoNode, this.sidebarNode, this.main(), this.mobileBackdropNode, this.mobileSidebarNode, this.mobileToggleNode);
      this.unsubscribe = this.store?.subscribe?.(() => {
        this.syncBuyerShell();
        this.syncMobileSidebar();
        this.renderImpersonationBanner();
        this.renderHydrateAlert();
      }) ?? null;
    }

    this.syncBuyerShell();
    this.syncMobileSidebar();
    this.renderImpersonationBanner();
    this.renderHydrateAlert();
    return this.root;
  }

  main() {
    const main = document.createElement("main");
    main.className = `${tw.layout.main} ${tw.layout.contentBackdrop}`;
    this.mainNode = main;
    this.headerNode = header(this.store);
    main.append(this.headerNode, this.bannerHost, this.alertHost, this.content);
    return main;
  }

  contentOutlet() {
    return this.content;
  }

  dispose() {
    this.sidebarNode?.dispose?.();
    this.mobileSidebarContentNode?.dispose?.();
    this.mobileSidebarNode?.dispose?.();
    this.headerNode?.dispose?.();
    this.backgroundVideoNode?.dispose?.();
    this.unsubscribe?.();
  }

  renderHydrateAlert() {
    const error = this.store?.get("app.routeHydrateError", null) ?? null;
    const alert = RouteHydrateAlert({
      error,
      onDismiss: () => this.store?.patchState("app.routeHydrateError", null, "route:hydrate-error-dismiss"),
    });
    this.alertHost.replaceChildren(...(alert ? [alert] : []));
  }

  renderImpersonationBanner() {
    mountImpersonationBanner(this.bannerHost, this.store, { redirectTo: "/admin" });
  }

  syncBuyerShell() {
    if (!this.root || !this.sidebarNode) {
      return;
    }

    const route = this.store?.get("app.currentRoute", null) ?? {};
    const path = route?.path ?? "";
    const routeRole = route?.route?.role ?? "";
    const appRole = this.store?.get("app.activeRole", "");
    const activeRole = appRole && appRole !== "public"
      ? appRole
      : this.store?.get("auth.user.role", "") || this.store?.get("working.profilePage.profile.data.role", "");
    const role = routeRole && routeRole !== "public" ? routeRole : activeRole;
    const isBuyerShell = role === "buyer" && this.isBuyerExperiencePath(path);
    const isAffiliateAccountShell = role === "affiliate_admin" && this.isAffiliateAccountExperiencePath(path);
    const isAccountShell = isBuyerShell || isAffiliateAccountShell;
    const hasSidebarShell = this.hasSidebarShell(role, path);
    const sidebarCollapsed = hasSidebarShell && Boolean(this.store?.get("ui.sidebarCollapsed", false));
    const isSuperAdminTool = this.isSuperAdminToolPath(path);

    // Lebar kolom sidebar mengikuti keadaan, bukan lebar layar. tw.layout.shell
    // masih memakai breakpoint (80px di md, 272px di xl) dan itu yang dulu
    // membuat tombol ciutkan tidak berpengaruh di layar besar.
    this.root.className = isAccountShell
      ? "relative isolate min-h-screen grid min-w-0 grid-cols-1 bg-[var(--pb-page-bg)]"
      : sidebarCollapsed
        ? "min-h-screen grid min-w-0 grid-cols-1 overflow-x-clip md:grid-cols-[80px_minmax(0,1fr)]"
        : "min-h-screen grid min-w-0 grid-cols-1 overflow-x-clip md:grid-cols-[272px_minmax(0,1fr)]";
    if (this.backgroundVideoNode) {
      this.backgroundVideoNode.hidden = !isAccountShell;
      this.backgroundVideoNode.setEnabled?.(isAccountShell);
    }
    if (this.mainNode) {
      this.mainNode.className = isAccountShell
        ? "relative z-10 grid min-w-0 grid-rows-[auto_1fr] bg-transparent"
        : `${tw.layout.main} ${tw.layout.contentBackdrop}`;
    }

    this.sidebarNode.hidden = !hasSidebarShell;
    this.sidebarNode.style.display = hasSidebarShell ? "" : "none";
    this.sidebarNode.setAttribute("aria-hidden", hasSidebarShell ? "false" : "true");
    this.content.className = isAccountShell
      ? "pb-bgv-buyer-content relative mx-auto grid min-w-0 w-full max-w-[1180px] gap-[var(--pb-space-xl)] overflow-x-clip px-3 py-4 pb-28 sm:px-5 md:px-6 md:py-6 md:pb-8 xl:px-8"
      : isSuperAdminTool
        ? "relative mx-auto grid min-w-0 w-full max-w-[1240px] gap-[var(--pb-space-xl)] overflow-x-clip px-[var(--pb-page-x)] pb-[var(--pb-page-y)] xl:max-w-[1320px] xl:px-8 2xl:max-w-[1400px]"
      : this.defaultContentClassName;
    this.content.style.paddingTop = isAccountShell ? "" : isSuperAdminTool ? "0.75rem" : "";
    if (this.headerNode) {
      this.headerNode.hidden = isAccountShell;
      this.headerNode.style.display = isAccountShell ? "none" : "";
      this.headerNode.setAttribute("aria-hidden", isAccountShell ? "true" : "false");
    }
    this.alertHost.className = isAccountShell
      ? "px-3 pt-3 sm:px-5 md:px-6"
      : isSuperAdminTool && !this.store?.get("app.routeHydrateError", null)
        ? "hidden"
        : isSuperAdminTool
          ? "px-4 pt-2 md:px-6"
          : this.defaultAlertHostClassName;

    if (!hasSidebarShell && this.store?.get("ui.sidebarOpen", false)) {
      uiStore.closeSidebar();
    }
    if (!hasSidebarShell && this.store?.get("ui.sidebarCollapsed", false)) {
      uiStore.setSidebarCollapsed(false);
    }
  }

  mobileBackdrop() {
    const backdrop = document.createElement("div");
    backdrop.className = "pointer-events-none fixed inset-0 z-[70] hidden bg-[var(--pb-overlay)] backdrop-blur-sm md:hidden";
    backdrop.setAttribute("aria-hidden", "true");
    return backdrop;
  }

  mobileDrawer() {
    const drawer = document.createElement("aside");
    drawer.id = "global_mobile_sidebar_drawer";
    drawer.className = "fixed inset-y-0 left-0 z-[80] hidden transform transition-transform duration-200 ease-out md:hidden";
    drawer.setAttribute("aria-label", "Sidebar mobile");
    this.mobileSidebarContentNode = sidebar(this.store, {
      mode: "drawer",
      onClose: () => uiStore.closeSidebar(),
      onNavigate: () => uiStore.closeSidebar(),
    });
    drawer.append(this.mobileSidebarContentNode);
    return drawer;
  }

  mobileToggle() {
    const button = document.createElement("button");
    button.id = "global_mobile_sidebar_toggle_button";
    button.type = "button";
    button.className = "fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[90] hidden h-14 w-14 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--pb-brand-primary)_36%,white)] bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white shadow-[var(--pb-shadow-elevated)] transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] md:hidden";
    button.setAttribute("aria-label", "Buka sidebar");
    button.title = "Buka sidebar";
    button.addEventListener("click", () => uiStore.toggleSidebar());
    return button;
  }

  syncMobileSidebar() {
    if (!this.mobileToggleNode || !this.mobileSidebarNode || !this.mobileBackdropNode) {
      return;
    }

    const route = this.store?.get("app.currentRoute", null) ?? {};
    const path = route?.path ?? "";
    const routeRole = route?.route?.role ?? "";
    const appRole = this.store?.get("app.activeRole", "");
    const activeRole = appRole && appRole !== "public"
      ? appRole
      : this.store?.get("auth.user.role", "") || this.store?.get("working.profilePage.profile.data.role", "");
    const role = routeRole && routeRole !== "public" ? routeRole : activeRole;
    const hasSidebarShell = this.hasSidebarShell(role, path);
    const open = hasSidebarShell && Boolean(this.store?.get("ui.sidebarOpen", false));

    this.mobileToggleNode.classList.toggle("hidden", !hasSidebarShell);
    this.mobileToggleNode.classList.toggle("flex", hasSidebarShell);
    this.mobileToggleNode.setAttribute("aria-expanded", open ? "true" : "false");
    this.mobileToggleNode.setAttribute("aria-label", open ? "Tutup sidebar" : "Buka sidebar");
    this.mobileToggleNode.title = open ? "Tutup sidebar" : "Buka sidebar";
    this.mobileToggleNode.replaceChildren(createIcon(open ? "circleXmark" : "bars", { className: "block h-5 w-5 leading-none" }));

    this.mobileBackdropNode.classList.toggle("hidden", !open);
    this.mobileSidebarNode.classList.toggle("hidden", !open);
    this.mobileSidebarNode.setAttribute("aria-hidden", open ? "false" : "true");
  }

  hasSidebarShell(role, path) {
    const normalizedRole = role === "affiliate_admin"
      ? "affiliate"
      : role === "super_admin"
        ? "admin"
        : role;
    const isBuyerShell = role === "buyer" && this.isBuyerExperiencePath(path);
    const isAffiliateAccountShell = role === "affiliate_admin" && this.isAffiliateAccountExperiencePath(path);
    return !isBuyerShell && !isAffiliateAccountShell && ["admin", "seller", "affiliate"].includes(normalizedRole);
  }

  isBuyerExperiencePath(path) {
    const value = String(path ?? "");
    return value === "/profile" || value === "/notifications" || value.startsWith("/buyer");
  }

  isAffiliateAccountExperiencePath(path) {
    const value = String(path ?? "");
    return value === "/profile" || value === "/notifications" || value.startsWith("/affiliate");
  }

  isSuperAdminToolPath(path) {
    return path === "/super-admin"
      || path === "/admin/release-versions"
      || path === "/admin/migrations";
  }
}
