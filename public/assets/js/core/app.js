import { apiClient } from "./apiClient.js";
import { EventBus } from "./eventBus.js";
import { Router } from "./router.js";
import { ReleaseManager } from "./releaseManager.js";
import { VersionManager } from "./versionManager.js";
import { appStore } from "../state/store.js";
import { authStore } from "../state/authStore.js";
import { uiStore } from "../state/uiStore.js";
import { CacheManager } from "../preload/cacheManager.js";
import { PreloadManager } from "../preload/preloadManager.js";
import { preloadPlans } from "../preload/preloadPlans.js";
import { ShellHost } from "../layout/shellHost.js";
import { authManifest } from "../modules/auth/manifest.js";
import { publicManifest } from "../modules/public/manifest.js";
import { publicContextService } from "../modules/public/services/publicContextService.js";
import { notificationService } from "../modules/notifications/services/notificationService.js";
import { bindModal } from "../ui/primitives/modal.js";
import { bindToastContainer } from "../ui/primitives/toast.js";
import { showToast } from "../ui/primitives/toast.js";
import { createRoleGuard } from "./roleGuard.js";
import { bindDesignStudioPreviewRuntime } from "../theme/designStudioPreviewRuntime.js";
import { bindDesignStudioStyleLoader } from "../theme/designStudioStyleLoader.js";
import { bindUniqueControlIds } from "../utils/controlIds.js";

/**
 * Manifest yang dimuat sesuai kebutuhan, bukan di awal.
 *
 * Sebelumnya kedelapan manifest di-import statis, sehingga tamu yang membuka
 * halaman depan ikut mengunduh seluruh graf modul admin, seller, dan
 * marketing. Publik dan auth tetap statis karena selalu dibutuhkan: landing,
 * katalog, login, dan halaman notFound berasal dari sana.
 */
const MANIFEST_TERTUNDA = [
  {
    kunci: "buyer",
    awalan: ["/buyer"],
    role: ["buyer"],
    muat: () => import("../modules/buyer/manifest.js").then((m) => m.buyerManifest),
  },
  {
    kunci: "seller",
    awalan: ["/seller"],
    role: ["seller"],
    muat: () => import("../modules/seller/manifest.js").then((m) => m.sellerManifest),
  },
  {
    kunci: "admin",
    awalan: ["/admin", "/super-admin"],
    role: ["admin", "super_admin"],
    muat: () => import("../modules/admin/manifest.js").then((m) => m.adminManifest),
  },
  {
    kunci: "affiliate",
    awalan: ["/affiliate"],
    role: ["affiliate_admin"],
    muat: () => import("../modules/affiliate/manifest.js").then((m) => m.affiliateManifest),
  },
  {
    kunci: "notifications",
    awalan: ["/notifications"],
    role: [],
    muat: () => import("../modules/notifications/manifest.js").then((m) => m.notificationsManifest),
  },
  {
    kunci: "profile",
    awalan: ["/profile"],
    role: [],
    muat: () => import("../modules/profile/manifest.js").then((m) => m.profileManifest),
  },
];

export function createProjectBApp(options = {}) {
  return new ProjectBApp(options);
}

export class ProjectBApp {
  constructor({ root = "#app", toastRoot = "#toast-root", modalRoot = "#modal-root" } = {}) {
    this.root = typeof root === "string" ? document.querySelector(root) : root;
    this.toastRoot = toastRoot;
    this.modalRoot = modalRoot;
    this.bus = new EventBus();
    this.cache = new CacheManager({ namespace: "projectB:spa:v1" });
    this.releaseManager = new ReleaseManager();
    this.versionManager = new VersionManager({ client: apiClient, store: appStore, bus: this.bus });
    this.preloadManager = new PreloadManager({
      store: appStore,
      cache: this.cache,
      plans: preloadPlans,
      bus: this.bus,
    });
    this.shell = new ShellHost({ store: appStore });
    this.router = new Router({
      outlet: () => this.shell.contentOutlet(),
      store: appStore,
      preloadManager: this.preloadManager,
      bus: this.bus,
      notFound: () => publicManifest.pages.notFound(),
      guard: createRoleGuard({ auth: authStore }),
      resolveMissing: (path) => this.muatManifestUntukPath(path),
    });
    this.cleanup = [];
    this.manifestTermuat = new Set();
  }

  /**
   * Memuat manifest yang memiliki path ini, bila belum termuat.
   * Mengembalikan true kalau ada yang baru didaftarkan, sehingga router tahu
   * perlu mencocokkan ulang.
   */
  async muatManifestUntukPath(path) {
    const jalur = String(path || "");
    const entri = MANIFEST_TERTUNDA.find((m) => m.awalan.some(
      (awalan) => jalur === awalan || jalur.startsWith(`${awalan}/`)
    ));

    if (!entri) {
      return false;
    }

    return this.muatManifest(entri);
  }

  async muatManifest(entri) {
    if (this.manifestTermuat.has(entri.kunci)) {
      return false;
    }

    // Ditandai sebelum await supaya dua navigasi beruntun tidak memuat ganda.
    this.manifestTermuat.add(entri.kunci);

    try {
      const manifest = await entri.muat();
      this.registerFeatures([manifest]);
      return true;
    } catch (error) {
      this.manifestTermuat.delete(entri.kunci);
      console.error(`Gagal memuat manifest ${entri.kunci}.`, error);
      return false;
    }
  }

  /**
   * Memuat manifest milik role yang sedang login, di awal, supaya halaman
   * pertama setelah login tidak menunggu satu putaran tambahan.
   */
  async muatManifestUntukRole(role) {
    const entri = MANIFEST_TERTUNDA.filter(
      (m) => m.role.includes(role) || m.role.length === 0
    );

    await Promise.all(entri.map((m) => this.muatManifest(m)));
  }

  async bootstrap() {
    if (!this.root) {
      throw new Error("SPA root element is missing.");
    }

    this.cleanup.push(bindUniqueControlIds(document.body));
    this.root.replaceChildren(this.shell.render());
    this.cleanup.push(bindToastContainer(this.toastRoot));
    this.cleanup.push(bindModal(this.modalRoot));
    this.cleanup.push(this.bus.on("route:guard-redirect", (payload) => {
      if (payload?.message) {
        showToast(payload.message, { type: "info", key: "route-guard-redirect" });
      }
    }));
    this.cleanup.push(this.bus.on("route:change", (context) => {
      appStore.patchState("app.routeHydrateError", null, "route:hydrate-error-clear");
    }));
    this.cleanup.push(this.bus.on("route:hydrate-error", ({ error, route, context }) => {
      appStore.patchState("app.routeHydrateError", {
        routeName: route?.name ?? null,
        path: context?.path ?? null,
        message: error?.message || "Hydrate route gagal.",
        occurredAt: Date.now(),
      }, "route:hydrate-error");
      showToast(error?.message || "Hydrate route gagal.", {
        type: "error",
        key: "initial-preload-error",
        dedupeMs: 3000,
      });
    }));
    this.cleanup.push(notificationService.bindRealtimeLifecycle(appStore));
    bindDesignStudioPreviewRuntime();
    bindDesignStudioStyleLoader(this.bus);
    // Hanya publik dan auth yang selalu dibutuhkan. Manifest role menyusul
    // sesuai role yang login, atau saat rute miliknya benar-benar dibuka.
    this.registerFeatures([publicManifest, authManifest]);
    publicContextService.restore();

    // Role bawaan di store sudah "public" sebelum autologin dijawab, jadi
    // preload katalog/slider/lokasi publik bisa langsung jalan tanpa menunggu
    // giliran auth selesai -- ini bukan basa-basi, ini permintaan data yang
    // dibutuhkan halaman untuk bisa tampil. Pengunjung anonim (mayoritas yang
    // membuka landing page) diam-diam sudah punya role ini sejak awal, jadi
    // permintaan ini benar sejak baris pertama, bukan tebakan.
    const preloadAwal = this.preloadManager.boot(authStore.role());

    // Rilis dan konteks auth tidak saling bergantung -- dulu berurutan,
    // sekarang jalan bersamaan supaya boot tidak menunggu dua kali round-trip.
    await Promise.all([this.checkReleaseVersion(), this.loadAuthContext()]);
    await this.muatManifestUntukRole(authStore.role());
    await this.bootstrapDesignStudioV2();
    await notificationService.ensureSnapshot({ force: true, store: appStore });

    // Kalau ternyata login (role berubah dari "public"), preload awal tadi
    // sudah memuat plan yang salah -- susulkan plan yang benar. Untuk tamu
    // anonim (kasus paling umum di halaman depan), baris ini tidak melakukan
    // apa-apa karena preloadAwal sudah memuat plan yang tepat sejak awal.
    const roleSetelahAuth = authStore.role();
    await Promise.all([
      preloadAwal,
      roleSetelahAuth === "public" ? null : this.preloadManager.boot(roleSetelahAuth),
    ]);

    this.cleanup.push(this.router.start());
    appStore.patchState("app", { bootstrapped: true, startedAt: Date.now() }, "app:bootstrapped");
    this.bus.emit("app:bootstrapped", appStore.getState().app);
    this.cleanup.push(this.bindReleaseVersionLifecycle());
  }

  /**
   * checkReleaseVersion() di bootstrap() hanya jalan sekali, saat tab
   * pertama dibuka. Tab yang dibiarkan terbuka lama tidak pernah tahu ada
   * rilis baru -- satu-satunya jalan pengguna tahu selama ini adalah
   * refresh manual. Di sini dicek ulang secara berkala selagi tab terlihat,
   * dan langsung dicek lagi begitu pengguna kembali ke tab ini, supaya
   * tombol "Muat Ulang" muncul sendiri tanpa perlu diberi tahu untuk hard
   * refresh.
   */
  bindReleaseVersionLifecycle({ intervalMs = 5 * 60 * 1000 } = {}) {
    let timer = null;

    const stop = () => {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const start = () => {
      if (!timer) {
        timer = window.setInterval(() => this.checkReleaseVersion(), intervalMs);
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stop();
        return;
      }
      this.checkReleaseVersion();
      start();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    start();

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }

  async checkReleaseVersion() {
    try {
      const release = await this.releaseManager.check();
      appStore.patchState("app.release", {
        manifest: release.manifest,
        latestVersion: release.latestVersion,
        appliedVersion: release.appliedVersion,
        updateAvailable: release.updateAvailable,
        checkedAt: Date.now(),
        error: null,
      }, "release:checked");

      if (release.updateAvailable) {
        this.bus.emit("release:update-available", release);
      }

      return release;
    } catch (error) {
      appStore.patchState("app.release", {
        ...appStore.get("app.release", {}),
        checkedAt: Date.now(),
        error: error?.message || "Release manifest gagal dimuat.",
      }, "release:check-error");
      return null;
    }
  }

  registerFeatures(manifests) {
    manifests.forEach((manifest) => {
      appStore.registerModuleState(manifest.stateNamespace, manifest.initialState ?? {});
      manifest.routes.forEach((route) => this.router.add(route));
    });
  }

  async loadAuthContext() {
    try {
      const response = await apiClient.get("/auth/autologin");
      const user = response.data?.user ?? null;
      authStore.setContext({
        user,
        actor: response.data?.actor ?? null,
        impersonation: response.data?.impersonation ?? null,
      });
      if (response.data?.designStudioV2) {
        appStore.patchState("runtime.designStudioV2", {
          enabled: Boolean(response.data.designStudioV2.enabled),
          designMode: Boolean(response.data.designStudioV2.designMode),
        }, "auth:design-studio-flags");
      }
      return user;
    } catch (error) {
      authStore.setContext({ user: null, actor: null, impersonation: null });
      return null;
    }
  }

  async bootstrapDesignStudioV2() {
    const featureFlagAdapter = {
      isEnabled: () => Boolean(appStore.get("runtime.designStudioV2.enabled", false)),
    };
    const designModeAdapter = {
      isEnabled: () => Boolean(appStore.get("runtime.designStudioV2.designMode", false)),
    };
    const currentUserAdapter = {
      getUser: () => authStore.user(),
      getRole: () => authStore.role(),
    };

    const enabled = featureFlagAdapter.isEnabled();
    const designMode = designModeAdapter.isEnabled();
    const currentUser = currentUserAdapter.getUser() || { role: currentUserAdapter.getRole() };

    if (!enabled || !designMode || currentUser?.role !== "super_admin") {
      return false;
    }

    try {
      const designStudio = await import("../modules/designStudioV2/designStudioBootstrap.js");

      const initialized = Boolean(designStudio.initialize?.({
        enabled,
        designMode,
        currentUser,
        appStore,
        authStore,
        router: this.router,
        bus: this.bus,
        documentRef: document,
      }));

      if (initialized && typeof designStudio.destroy === "function") {
        this.cleanup.push(() => designStudio.destroy());
      }

      return initialized;
    } catch (error) {
      console.error("Design Studio V2 bootstrap failed.", error);
      return false;
    }
  }

  dispose() {
    this.router.dispose();
    this.preloadManager.dispose();
    this.shell.dispose();
    this.cleanup.splice(0).forEach((dispose) => dispose());
    this.bus.clear();
  }
}
