import { apiClient } from "./apiClient.js";
import { EventBus } from "./eventBus.js";
import { Router } from "./router.js";
import { VersionManager } from "./versionManager.js";
import { appStore } from "../state/store.js";
import { authStore } from "../state/authStore.js";
import { uiStore } from "../state/uiStore.js";
import { CacheManager } from "../preload/cacheManager.js";
import { PreloadManager } from "../preload/preloadManager.js";
import { preloadPlans } from "../preload/preloadPlans.js";
import { ShellHost } from "../layout/shellHost.js";
import { buyerManifest } from "../modules/buyer/manifest.js";
import { adminManifest } from "../modules/admin/manifest.js";
import { affiliateManifest } from "../modules/affiliate/manifest.js";
import { authManifest } from "../modules/auth/manifest.js";
import { publicManifest } from "../modules/public/manifest.js";
import { publicContextService } from "../modules/public/services/publicContextService.js";
import { sellerManifest } from "../modules/seller/manifest.js";
import { notificationsManifest } from "../modules/notifications/manifest.js";
import { profileManifest } from "../modules/profile/manifest.js";
import { notificationService } from "../modules/notifications/services/notificationService.js";
import { bindModal } from "../ui/primitives/modal.js";
import { bindToastContainer } from "../ui/primitives/toast.js";
import { showToast } from "../ui/primitives/toast.js";
import { createRoleGuard } from "./roleGuard.js";
import { bindDesignStudioPreviewRuntime } from "../theme/designStudioPreviewRuntime.js";
import { bindDesignStudioStyleLoader } from "../theme/designStudioStyleLoader.js";

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
    });
    this.cleanup = [];
  }

  async bootstrap() {
    if (!this.root) {
      throw new Error("SPA root element is missing.");
    }

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
    this.registerFeatures([publicManifest, authManifest, profileManifest, buyerManifest, sellerManifest, adminManifest, affiliateManifest, notificationsManifest]);
    publicContextService.restore();

    await this.loadAuthContext();
    await this.bootstrapDesignStudioV2();
    await notificationService.ensureSnapshot({ force: true, store: appStore });
    await this.preloadManager.boot(authStore.role());

    this.cleanup.push(this.router.start());
    appStore.patchState("app", { bootstrapped: true, startedAt: Date.now() }, "app:bootstrapped");
    this.bus.emit("app:bootstrapped", appStore.getState().app);
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
