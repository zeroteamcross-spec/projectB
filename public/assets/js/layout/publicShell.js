import { renderBrandLockup } from "../theme/brandLockup.js";
import { brandConfig } from "../theme/brandConfig.js";
import { createIcon } from "../theme/iconRegistry.js";
import { RouteHydrateAlert } from "../ui/composites/routeHydrateAlert.js";
import { tw } from "../theme/tailwindClasses.js";
import { applyDesignHook } from "../theme/designStudioHooks.js";
import { renderImpersonationBanner as mountImpersonationBanner } from "./impersonationBanner.js";
import { loginPathForCurrentHost } from "../core/roleGuard.js";
import { navigateTo } from "../core/router.js";
import { BuyerMobileFooterNav } from "../modules/buyer/components/buyerMobileFooterNav.js";
import { publicContextService } from "../modules/public/services/publicContextService.js";
import { publicReservedRoutePrefixes } from "../core/publicReservedRouteWords.js";

/**
 * Rute publik yang sengaja tidak menampilkan tombol Login di header.
 *
 * Halaman pendaftaran showroom memang dirancang hanya untuk mendaftar; jalan
 * masuk login-nya ada di landing page, bukan di sini.
 */
const RUTE_TANPA_TOMBOL_LOGIN = Object.freeze(["/daftar-showroom", "/login/seller", "/google-login/buyer"]);

const RESERVED_ROOT_WORD_PATTERN = new RegExp(`^(?:${publicReservedRoutePrefixes.join("|")})$`);

/**
 * Slug showroom di bentuk baru (carlynk.id/{slug}) tidak punya prefix --
 * satu-satunya penanda adalah segmen pertamanya BUKAN kata cadangan (rute
 * sistem lain semua terdaftar di publicReservedRoutePrefixes).
 */
function bareShowroomSlugFromPath(path) {
  const match = String(path ?? "").match(/^\/([^/]+)/);
  return match && !RESERVED_ROOT_WORD_PATTERN.test(match[1]) ? match[1] : "";
}

// Kotak lambang saat belum ada logo yang diunggah. Begitu logonya ada, kelas
// ini tidak dipakai sama sekali -- gambarnya berdiri sendiri tanpa kotak.
const PUBLIC_MARK_CLASS = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--pb-radius-xl)] bg-[linear-gradient(135deg,var(--pb-brand-primary),var(--pb-brand-accent),var(--pb-brand-secondary))] text-white leading-none shadow-[var(--pb-shadow-card)]";

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
      this.mobileFooterContainer = document.createElement("div");
      this.root.append(this.headerNode, this.alertHost, this.outlet, this.mobileFooterContainer);
      this.unsubscribe = this.store?.subscribe?.(() => this.syncActionLink()) ?? null;
      window.addEventListener("popstate", () => this.syncActionLink());
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
    brand.href = "/";
    brand.className = "flex min-w-0 flex-1 items-center gap-2.5 no-underline";
    this.brandLinkNode = brand;

    const mark = document.createElement("span");

    const copy = document.createElement("span");
    copy.className = "grid min-w-0";

    const title = document.createElement("strong");
    title.className = `min-w-0 truncate text-sm font-bold tracking-normal ${tw.text.gradientBrand}`;
    title.textContent = brandConfig.appName;

    const subtitle = document.createElement("span");
    subtitle.className = "hidden text-[10px] font-medium text-[var(--pb-text-muted)] sm:block";
    subtitle.textContent = "Showroom mobil pilihan";

    copy.append(title, subtitle);

    const bootPath = window.location.pathname || "/";
    syncBrandMark(mark, [copy], bootPath);

    brand.append(mark, copy);

    const actions = document.createElement("div");
    actions.className = "flex shrink-0 items-center gap-1.5 sm:gap-2";

    const login = document.createElement("a");
    this.actionLink = login;
    login.className = "inline-flex h-10 shrink-0 items-center justify-center rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-btn-secondary-bg)] px-3 text-xs font-semibold text-[var(--pb-btn-secondary-text)] leading-none shadow-[var(--pb-shadow-soft)] transition hover:brightness-95";
    login.setAttribute("aria-label", "Akun");
    this.syncActionLink();

    actions.append(login);
    inner.append(brand, actions);
    this.bannerHost = document.createElement("div");
    this.bannerHost.id = "public_impersonation_banner_host";
    this.bannerHost.className = "mx-auto hidden w-full max-w-[1200px] px-4 pb-3 pt-2 sm:px-6 2xl:max-w-[1240px]";
    this.brandTitleNode = title;
    this.brandSubtitleNode = subtitle;
    this.brandMarkNode = mark;
    this.brandCopyNode = copy;
    header.append(inner);
    header.append(this.bannerHost);
    return header;
  }

  contentOutlet() {
    return this.outlet;
  }

  syncActionLink() {
    const currentPath = window.location.pathname || "/";
    publicContextService.syncBrandingFromPath(currentPath);

    if (!this.actionLink) {
      return;
    }

    const isAuthenticated = this.store?.get("auth.isAuthenticated", false) ?? false;
    const role = this.store?.get("auth.role", "public") ?? "public";
    const target = isAuthenticated ? dashboardHash(role) : loginHashForShowroomRoute() ?? loginHashForCurrentHost();

    // Saat sudah login tautan ini menjadi pintasan dashboard, bukan tombol
    // login, jadi yang disembunyikan hanya versi tamunya.
    this.actionLink.style.display = !isAuthenticated && tanpaTombolLogin() ? "none" : "";
    this.brandTitleNode && (this.brandTitleNode.textContent = brandConfig.appName);
    this.brandSubtitleNode && (this.brandSubtitleNode.textContent = brandConfig.appTagline || "Showroom mobil pilihan");
    syncBrandMark(this.brandMarkNode, [this.brandCopyNode], currentPath);
    if (this.brandLinkNode) {
      this.brandLinkNode.href = ownCatalogHrefForPath(currentPath);
    }
    this.actionLink.href = target;
    this.actionLink.title = isAuthenticated ? "Dashboard akun" : "Masuk";
    const isTargetBuyer = isAuthenticated && target === "/buyer";
    this.actionLink.classList.toggle("w-10", isAuthenticated && !isTargetBuyer);
    this.actionLink.classList.toggle("px-0", isAuthenticated && !isTargetBuyer);
    this.actionLink.classList.toggle("px-3", !isAuthenticated || isTargetBuyer);
    this.actionLink.replaceChildren(
      isAuthenticated
        ? (isTargetBuyer
            ? document.createTextNode("Back To Home")
            : createIcon("user", { className: "block h-4 w-4 leading-none" }))
        : document.createTextNode("Login")
    );
    this.renderImpersonationBanner();

    // Toggle public header, sync mobile footer.
    const isBuyerLoggedIn = isAuthenticated && role === "buyer";
    // Bottom footer juga tampil di halaman showroom bahkan sebelum login,
    // supaya pengunjung mobile langsung punya navigasi -- klik menunya nanti
    // yang mengarahkan ke login buyer kalau memang belum masuk.
    const isShowroomPage = /^\/(?:s|showrooms)\/[^/]+/.test(currentPath) || Boolean(bareShowroomSlugFromPath(currentPath));
    const showMobileFooter = isBuyerLoggedIn || isShowroomPage;

    if (this.headerNode) {
      this.headerNode.classList.toggle("hidden", isAuthenticated);
      this.headerNode.classList.toggle("sm:block", false);
    }

    if (this.mobileFooterContainer) {
      this.mobileFooterContainer.replaceChildren();
      if (showMobileFooter) {
        const activePath = window.location.pathname || "/";
        const footer = BuyerMobileFooterNav({
          activePath,
          onNavigate: (path) => {
            if (!isBuyerLoggedIn) {
              navigateTo(loginHashForShowroomRoute() ?? loginHashForCurrentHost());
              return;
            }
            navigateTo(path);
          }
        });
        this.mobileFooterContainer.append(footer);
      }
    }
  }

  dispose() {
    this.unsubscribe?.();
  }
}

function tanpaTombolLogin() {
  const jalur = window.location.pathname || "/";
  const dinormalkan = jalur.length > 1 ? jalur.replace(/\/$/, "") : jalur;

  return RUTE_TANPA_TOMBOL_LOGIN.includes(dinormalkan);
}

function publicLogoIcon() {
  return brandConfig.logoIcon === "bell" ? "brandMark" : brandConfig.logoIcon;
}

/**
 * Logo header pojok kiri atas milik showroom sendiri -- hanya dipakai kalau
 * showroom itu sedang aktif (halaman #/showrooms/:slug dan sejenisnya) dan
 * showroom itu memang sudah mengunggah header_logo_url-nya sendiri. Field
 * ini sengaja terpisah dari icon_url (favicon): favicon dipotong persegi
 * untuk tab browser, logo header biasanya memanjang, jadi keduanya tidak
 * boleh berbagi satu gambar. Di luar itu, renderBrandLockup() jatuh kembali
 * ke logo global Konfigurasi WEB.
 *
 * Halaman marketing (#/af/:slug) tidak punya showroom-nya sendiri di
 * publicContextState -- affiliate itu MEWAKILI sebuah showroom, bukan
 * showroom itu sendiri -- tapi affiliate.showroom (dikembalikan bersama
 * validateReferralCode()) berisi data showroom yang sama. Jatuhkan ke situ
 * kalau tidak ada showroom aktif, supaya logo pojok kiri atas tetap
 * menampilkan logo showroom pemilik affiliate itu, bukan logo default.
 */
function showroomLogoUrl() {
  const showroom = publicContextService.activeShowroom();
  const direct = String(showroom?.showroom?.header_logo_url ?? "").trim();
  if (direct) {
    return direct;
  }

  const affiliate = publicContextService.activeAffiliate();
  return String(affiliate?.showroom?.header_logo_url ?? "").trim();
}

function showroomSlugFromPath(path) {
  const cocok = String(path ?? "").match(/^\/(?:showrooms|s)\/([^/]+)/);
  return cocok ? cocok[1] : bareShowroomSlugFromPath(path);
}

function affiliateSlugFromPath(path) {
  const cocok = String(path ?? "").match(/^\/(?:af|a)\/([^/]+)/);
  return cocok ? cocok[1] : "";
}

/**
 * Konteks showroom/affiliate baru terisi setelah validateSlug()/
 * validateReferralCode() selesai di latar belakang -- tidak diblokir
 * menunggu, sesuai desain SPA ini, tapi itu berarti render pertama header
 * kadang terjadi sebelum konteksnya sampai. Dipakai syncBrandMark() untuk
 * tahu kapan showroomLogoUrl() masih boleh dipercaya untuk path saat ini.
 */
function showroomContextMatchesPath(path) {
  const slug = showroomSlugFromPath(path).toLowerCase();
  if (slug) {
    return publicContextService.activeShowroom()?.slug?.toLowerCase?.() === slug;
  }

  const affiliateSlug = affiliateSlugFromPath(path).toLowerCase();
  if (affiliateSlug) {
    return publicContextService.activeAffiliate()?.slug?.toLowerCase?.() === affiliateSlug;
  }

  return true;
}

/**
 * Tanpa ini, pembuka halaman showroom sempat melihat brand global (logo DAN
 * teks nama aplikasi) berkedip lalu berganti ke milik showroom begitu
 * context-nya sampai -- salah satu bug yang dilaporkan. Awalnya hanya
 * lambangnya yang disembunyikan; teksnya ("Siata Mobilindo" dkk, dari
 * brandConfig.appName yang memang selalu global) tetap kelihatan sendirian
 * di sebelah kotak kosong, jadi tetap terlihat seperti header yang salah
 * muncul duluan. Sekarang keduanya ditahan sebagai satu kesatuan: selama
 * slug di URL belum cocok dengan showroom aktif di state, tidak ada logo
 * ATAU teks apa pun yang tampil -- kotaknya tetap ada supaya tata letak
 * header tidak ikut melompat begitu brand yang benar muncul.
 */
function syncBrandMark(mark, copyNodes, currentPath) {
  if (!mark) {
    return;
  }

  const menahan = !showroomContextMatchesPath(currentPath);
  copyNodes.forEach((node) => {
    if (!node) {
      return;
    }
    node.hidden = menahan;
    if (menahan) {
      node.style.display = "none";
    } else {
      node.style.removeProperty("display");
    }
  });

  if (menahan) {
    mark.className = PUBLIC_MARK_CLASS;
    mark.replaceChildren();
    mark.style.visibility = "hidden";
    return;
  }

  mark.style.removeProperty("visibility");
  renderBrandLockup(mark, copyNodes, {
    markClass: PUBLIC_MARK_CLASS,
    iconName: publicLogoIcon(),
    logoUrlOverride: showroomLogoUrl(),
  });
}

/**
 * Buyer yang belum login juga punya "showroom sendiri" -- showroom yang
 * sedang mereka jelajahi. brand.href dulu selalu #/ , jadi klik logo di
 * halaman showroom malah melempar pengunjung ke landing page, bukan
 * mengembalikannya ke katalog showroom yang sama. catalogPath() sudah
 * tahu jalur showroom/affiliate aktif; dipakai di sini juga supaya logo
 * ikut pola yang sama seperti untuk buyer/marketing yang sudah login.
 */
function ownCatalogHrefForPath(currentPath) {
  if (!showroomContextMatchesPath(currentPath)) {
    return "/";
  }

  return publicContextService.catalogPath();
}

function dashboardHash(role) {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "affiliate_admin") {
    return "/affiliate";
  }

  if (role === "seller") {
    return "/seller";
  }

  if (role === "buyer") {
    return "/buyer";
  }

  return "/";
}

/**
 * On a showroom's own catalog page, "Login" should return the buyer to that
 * same showroom rather than to the generic buyer home. Returns null outside
 * that route so the caller falls back to loginHashForCurrentHost().
 */
function loginHashForShowroomRoute() {
  const jalur = window.location.pathname || "/";

  const legacy = jalur.match(/^\/(?:s|showrooms)\/([^/]+)$/);
  if (legacy) {
    return `/${legacy[1]}/login`;
  }

  const bare = jalur.match(/^\/([^/]+)$/);
  if (bare && !RESERVED_ROOT_WORD_PATTERN.test(bare[1])) {
    return `/${bare[1]}/login`;
  }

  return null;
}

/**
 * Peta host-nya ada di roleGuard, bukan di sini. Berkas ini dulu menyimpan
 * salinannya sendiri yang dipatok ke garasi-mobil.com, jadi begitu domainnya
 * berganti tombol Login berhenti mengenali host mana pun.
 */
function loginHashForCurrentHost() {
  return loginPathForCurrentHost();
}

PublicShell.prototype.renderImpersonationBanner = function renderImpersonationBanner() {
  mountImpersonationBanner(this.bannerHost, this.store, { redirectTo: "/admin" });
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
