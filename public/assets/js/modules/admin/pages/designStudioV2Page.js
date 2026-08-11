import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { isDesignStudioV2Allowed } from "../../designStudioV2/accessGuard.js";

export function AdminDesignStudioV2Page() {
  let root = null;
  let unsubscribe = null;
  let status = {
    initialized: false,
    error: "",
    state: null,
  };

  return createPageLifecycle({
    async mount(context) {
      root = document.createElement("div");
      root.className = "grid gap-5";
      render(root, context, status);

      if (isDesignStudioV2Allowed({ store: appStore })) {
        await activateDesignStudioV2(context);
        render(root, context, status);
      }

      return root;
    },
    hydrate(context) {
      render(root, context, status);
    },
    bindEvents(context) {
      unsubscribe = appStore.subscribe(() => render(root, context, status));
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
    },
  });

  async function activateDesignStudioV2(context) {
    try {
      const designStudio = await import("../../designStudioV2/designStudioBootstrap.js");
      const currentUser = appStore.get("auth.user", null) || { role: appStore.get("auth.role", "public") };
      const initialized = Boolean(designStudio.initialize?.({
        enabled: true,
        designMode: true,
        currentUser,
        appStore,
        router: context.router,
        bus: context.bus,
        documentRef: document,
      }));

      status = {
        initialized,
        error: "",
        state: typeof designStudio.runtimeState === "function" ? designStudio.runtimeState() : null,
      };
    } catch (error) {
      status = {
        initialized: false,
        error: error?.message || "Design Studio V2 gagal diaktifkan.",
        state: null,
      };
    }
  }
}

function render(root, context, status) {
  if (!root) {
    return;
  }

  const allowed = isDesignStudioV2Allowed({ store: appStore });
  const header = document.createElement("section");
  header.className = "grid gap-2";

  const title = document.createElement("h1");
  title.className = "text-xl font-semibold text-[var(--pb-text-strong)]";
  title.textContent = "Design Studio V2";

  const description = document.createElement("p");
  description.className = "max-w-3xl text-xs leading-6 text-[var(--pb-text-muted)]";
  description.textContent = "Runtime shell Design Studio V2 untuk super admin. Draft, publish, rollback, dan registry write belum diaktifkan dari menu ini.";

  header.append(title, description);

  if (!allowed) {
    root.replaceChildren(
      header,
      EmptyState({
        title: "Design Studio V2 belum aktif",
        description: "Menu ini membutuhkan role super_admin, feature flag Design Studio V2, dan design mode.",
      }),
    );
    return;
  }

  const action = Button({
    label: "Refresh status",
    variant: "secondary",
    onClick: () => context.router?.navigate("/admin/design-studio-v2"),
  });

  const state = document.createElement("pre");
  state.className = "overflow-auto rounded-[var(--pb-radius-lg)] border border-[var(--pb-border)] bg-white p-4 text-[10px] leading-5 text-[var(--pb-text)] shadow-[var(--pb-shadow-soft)]";
  state.textContent = JSON.stringify({
    initialized: status.initialized,
    error: status.error,
    runtimeState: status.state,
  }, null, 2);

  root.replaceChildren(
    header,
    EmptyState({
      title: status.initialized ? "Design Studio V2 aktif" : "Design Studio V2 siap diaktifkan",
      description: status.initialized
        ? "Shell V2 sudah diinisialisasi untuk sesi ini."
        : status.error || "Runtime akan diaktifkan saat halaman ini dibuka oleh super admin.",
      action,
    }),
    state,
  );
}
