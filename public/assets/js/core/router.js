/**
 * Satu-satunya jalan menulis URL, dipakai router sendiri maupun modul lain
 * yang tidak punya akses ke instance Router (banner, popover, dsb -- lihat
 * publicShell.js, header.js, dkk). pushState tidak memicu apa pun sendirian,
 * jadi popstate disintesis manual di sini supaya router.handleChange() ikut
 * jalan, sama seperti hashchange dulu memicu otomatis.
 *
 * Navigasi ke path yang sama persis (termasuk query) tidak melakukan apa-apa
 * -- meniru perilaku lama saat location.hash diisi nilai yang sudah sama
 * (browser tidak memicu hashchange untuk itu).
 */
export function navigateTo(path) {
  const target = normalizePathForNavigation(path);
  const current = window.location.pathname + window.location.search;

  if (target === current) {
    return;
  }

  window.history.pushState(null, "", target);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function normalizePathForNavigation(path) {
  const raw = String(path ?? "").replace(/^#/, "");
  return raw.startsWith("/") ? raw : `/${raw}`;
}

/**
 * Dulu tiap `<a href="#/x">` otomatis "gratis" jadi navigasi SPA: klik pada
 * fragment tidak pernah memicu muat ulang, jadi tidak satu pun tempat yang
 * merender anchor (sidebar, publicShell, notifikasi, dll.) perlu event
 * handler sendiri. Begitu href berisi path asli, browser akan memuat ulang
 * halaman sungguhan pada setiap klik kecuali dicegat di sini -- jadi
 * interceptor ini menggantikan "keuntungan gratis" yang hilang itu, dipasang
 * sekali secara global saat app boot (lihat app.js).
 *
 * href berformat lama `#/x` (mis. dari data Master Sidebar yang disimpan
 * admin sebelum migrasi ini) sengaja tetap diterima di sini selamanya --
 * dibaca toleran, bukan dipaksa migrasi -- supaya menu custom yang sudah
 * disimpan tidak mendadak diam.
 */
export function bindInternalLinkInterceptor(root = document) {
  const handleClick = (event) => {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const anchor = event.target.closest?.("a[href]");
    if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) {
      return;
    }

    const rawHref = anchor.getAttribute("href") || "";

    if (rawHref.startsWith("#/")) {
      event.preventDefault();
      navigateTo(rawHref);
      return;
    }

    if (rawHref === "" || rawHref === "#") {
      event.preventDefault();
      return;
    }

    let url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch {
      return;
    }

    if (url.origin !== window.location.origin) {
      return;
    }

    const samePage = url.pathname === window.location.pathname && url.search === window.location.search;
    if (samePage && url.hash) {
      return;
    }

    event.preventDefault();
    navigateTo(url.pathname + url.search);
  };

  root.addEventListener("click", handleClick);
  return () => root.removeEventListener("click", handleClick);
}

export class Router {
  constructor({ outlet, store, preloadManager, bus, notFound = null, guard = null, resolveMissing = null } = {}) {
    this.routes = [];
    // Dipanggil bila sebuah path tidak cocok dengan rute mana pun. Dipakai
    // untuk memuat manifest role secara malas, supaya tamu tidak ikut
    // mengunduh graf modul admin, seller, dan marketing.
    this.resolveMissing = resolveMissing;
    this.outletResolver = outlet;
    this.store = store;
    this.preloadManager = preloadManager;
    this.bus = bus;
    this.notFound = notFound;
    this.guard = guard;
    this.activePage = null;
    // Jalur yang sedang tampil, dipakai untuk membedakan "pindah halaman" dari
    // "query berubah di halaman yang sama" (mis. tab role di /auth). Hanya yang
    // pertama yang memulangkan gulir ke atas.
    this.jalurTampil = null;
    this.gulirDitahan = false;
    this.handleChange = this.handleChange.bind(this);
  }

  // route.pattern (RegExp siap pakai, dengan named group lewat (?<nama>...))
  // dipakai apa adanya kalau disediakan -- jalan keluar untuk rute yang
  // butuh pengecualian tidak bisa diekspresikan lewat sintaks ":nama" biasa,
  // mis. slug showroom di root yang harus menolak kata cadangan seperti
  // "admin" (lihat public.showroom.catalog-root di modules/public/routes.js).
  add(route) {
    this.routes.push({
      ...route,
      pattern: route.pattern ?? this.compile(route.path),
    });

    return this;
  }

  start() {
    // Peramban memulihkan posisi gulir sendiri saat hash berubah atau saat
    // tombol back ditekan, dan itu bertabrakan dengan halaman yang baru saja
    // kita pasang. Kita yang pegang kendali gulirnya.
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    window.addEventListener("popstate", this.handleChange);
    this.handleChange();

    return () => this.dispose();
  }

  navigate(path) {
    navigateTo(path);
  }

  async handleChange() {
    const location = this.location();
    let match = this.match(location.path);

    // Rute bisa belum terdaftar karena manifest pemiliknya sengaja ditunda.
    // Muat dulu, baru cocokkan ulang. Ini harus terjadi sebelum guard, karena
    // guard memutuskan berdasarkan ada tidaknya rute.
    if (!match && typeof this.resolveMissing === "function") {
      try {
        const dimuat = await this.resolveMissing(location.path);
        if (dimuat) {
          match = this.match(location.path);
        }
      } catch (error) {
        console.error("Gagal memuat modul rute secara malas.", error);
      }
    }

    const requestedRoute = match?.route ?? null;
    const requestedParams = match?.params ?? {};
    const access = this.guard?.({
      route: requestedRoute,
      params: requestedParams,
      location,
      router: this,
      store: this.store,
      bus: this.bus,
    }) ?? { type: "allow", route: requestedRoute };
    const route = access.route ?? requestedRoute;
    const params = access.params ?? requestedParams;

    if (access.type === "redirect") {
      await this.leaveActivePage();
      this.bus?.emit("route:guard-redirect", {
        ...access.meta,
        toPath: access.path,
      });
      this.navigate(access.path);
      return;
    }

    const context = {
      name: route?.name ?? null,
      path: location.path,
      params,
      query: location.query,
      route,
      requestedRoute,
      access,
      store: this.store,
      router: this,
      bus: this.bus,
    };

    await this.ensureRoleSnapshot(route);
    await this.leaveActivePage();
    this.store.patchState("app.currentRoute", {
      name: context.name,
      path: context.path,
      params: context.params,
      query: context.query,
      route: route ? {
        name: route.name,
        path: route.path,
        shell: route.shell ?? "public",
        role: route.role ?? "public",
        workingStateKey: route.workingStateKey ?? null,
      } : null,
    }, "route:change");
    this.bus?.emit("route:change", context);

    const pindahHalaman = this.jalurTampil !== location.path;
    this.jalurTampil = location.path;
    // Dibersihkan sebelum halaman dipasang, supaya penahanan dari navigasi
    // sebelumnya tidak terbawa ke navigasi ini.
    this.gulirDitahan = false;

    if (!route) {
      await this.mountPage(this.notFound(context), context);
      this.pulangkanGulir(pindahHalaman);
      this.bus?.emit("route:mounted", context);
      return;
    }

    if (route.workingStateKey) {
      this.store.destroyWorkingState(route.workingStateKey);
    }

    await this.mountPage(route.page(context), context);
    this.pulangkanGulir(pindahHalaman);
    this.bus?.emit("route:mounted", context);

    this.preloadManager?.hydrateRoute(route, context)
      .then(() => {
        if (this.activePage?.__routeName === route.name) {
          return this.call(this.activePage, "hydrate", context);
        }

        return null;
      })
      .catch((error) => this.bus?.emit("route:hydrate-error", { error, route, context }));
  }

  /**
   * Halaman baru selalu dibaca dari atas. Ini yang dilakukan peramban pada
   * situs biasa, dan pengguna tetap mengharapkannya walau ini SPA: berpindah
   * dari daftar transaksi yang tergulir jauh ke halaman detail tidak boleh
   * mendarat di tengah-tengah isinya.
   *
   * Modal dan popup tidak lewat sini -- keduanya dibuka tanpa mengubah rute --
   * jadi posisi gulir di belakangnya aman.
   *
   * Halaman berisi daftar panjang boleh mengecualikan diri lewat
   * tahanGulirSekali(); lihat catatannya di sana.
   */
  pulangkanGulir(pindahHalaman) {
    const ditahan = this.gulirDitahan;
    this.gulirDitahan = false;

    if (!pindahHalaman || ditahan) {
      return;
    }

    // "instant", bukan "auto". "auto" berarti ikut CSS, dan landing memasang
    // scroll-behavior:smooth di <html>; pemulangan gulir jadi dianimasikan,
    // lalu terpotong di tengah jalan saat halaman lama dilepas dan berhenti
    // beberapa piksel dari atas.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }

  /**
   * Membatalkan pemulangan gulir untuk satu navigasi ini saja.
   *
   * Dipakai daftar panjang yang ingin mengembalikan pembaca ke baris yang tadi
   * dibuka: katalog menyimpan posisinya sebelum membuka detail mobil, lalu
   * memulihkannya saat pembaca menekan kembali. Tanpa ini pembaca terlempar ke
   * baris pertama dan harus menggulir dari awal setiap kali melihat satu unit.
   *
   * Dipanggil dari mount() halaman, yang berjalan sebelum pulangkanGulir(),
   * dan hanya berlaku sekali -- navigasi berikutnya kembali ke aturan umum.
   */
  tahanGulirSekali() {
    this.gulirDitahan = true;
  }

  async leaveActivePage() {
    if (!this.activePage) {
      return;
    }

    await this.call(this.activePage, "unmount");
    await this.call(this.activePage, "dispose");

    if (this.activePage.__workingStateKey) {
      this.store.destroyWorkingState(this.activePage.__workingStateKey);
    }

    this.activePage = null;
  }

  async mountPage(page, context) {
    const outlet = this.outlet();
    const pageModule = normalizePage(page);
    pageModule.__workingStateKey = context.route?.workingStateKey ?? null;
    pageModule.__routeName = context.route?.name ?? null;
    this.activePage = pageModule;

    await this.call(pageModule, "bootstrap", context);
    const node = await pageModule.mount(context);
    outlet.replaceChildren(node);
    await this.call(pageModule, "bindEvents", context);
  }

  async ensureRoleSnapshot(route) {
    const role = route?.role ?? "public";
    if (!this.preloadManager || role === "public") {
      return null;
    }

    return this.preloadManager.boot(role);
  }

  async call(page, method, context = {}) {
    if (typeof page?.[method] === "function") {
      await page[method](context);
    }
  }

  outlet() {
    return typeof this.outletResolver === "function" ? this.outletResolver() : this.outletResolver;
  }

  location() {
    const path = window.location.pathname || "/";
    const queryString = window.location.search.replace(/^\?/, "");
    return {
      path: this.normalize(path),
      query: Object.fromEntries(new URLSearchParams(queryString)),
    };
  }

  match(path) {
    for (const route of this.routes) {
      const matches = path.match(route.pattern);

      if (matches) {
        return { route, params: matches.groups ?? {} };
      }
    }

    return null;
  }

  compile(path) {
    const normalized = this.normalize(path);
    const names = [];
    const pattern = normalized
      .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, name) => {
        names.push(name);
        return `__PARAM_${names.length - 1}__`;
      })
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/__PARAM_(\d+)__/g, (_, index) => `(?<${names[Number(index)]}>[^/]+)`);

    return new RegExp(`^${pattern}$`);
  }

  normalize(path) {
    const normalized = `/${String(path || "/").replace(/^#?\/?/, "")}`;
    return normalized === "/" ? "/" : normalized.replace(/\/$/, "");
  }

  dispose() {
    window.removeEventListener("popstate", this.handleChange);
    this.leaveActivePage();
  }
}

function normalizePage(page) {
  if (page instanceof Node) {
    return {
      mount: () => page,
      hydrate: () => {},
      bindEvents: () => {},
      unmount: () => {},
      dispose: () => {},
    };
  }

  return page;
}
