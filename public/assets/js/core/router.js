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
    this.handleChange = this.handleChange.bind(this);
  }

  add(route) {
    this.routes.push({
      ...route,
      pattern: this.compile(route.path),
    });

    return this;
  }

  start() {
    window.addEventListener("hashchange", this.handleChange);
    this.handleChange();

    return () => this.dispose();
  }

  navigate(path) {
    window.location.hash = path.startsWith("#") ? path : `#${path}`;
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

    if (!route) {
      await this.mountPage(this.notFound(context), context);
      this.bus?.emit("route:mounted", context);
      return;
    }

    if (route.workingStateKey) {
      this.store.destroyWorkingState(route.workingStateKey);
    }

    await this.mountPage(route.page(context), context);
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
    const hash = window.location.hash.replace(/^#/, "") || "/";
    const [path, queryString = ""] = hash.split("?");
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
    window.removeEventListener("hashchange", this.handleChange);
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
