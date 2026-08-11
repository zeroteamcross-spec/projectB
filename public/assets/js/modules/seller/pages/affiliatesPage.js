import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { Button } from "../../../ui/primitives/button.js";
import { Card } from "../../../ui/composites/card.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { sellerState } from "../state/sellerState.js";
import { sellerAffiliateService } from "../services/sellerAffiliateService.js";
import { SellerAffiliatesList } from "../components/sellerAffiliatesList.js";
import { SellerAffiliateForm } from "../components/sellerAffiliateForm.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { upsertPreloadCollection, upsertWorkingCollection } from "../../../state/sync/sharedMutationSync.js";

const RUNTIME_KEY = "sellerAffiliates";
const DEFAULT_RUNTIME = {
  saving: false,
  checkingSlug: false,
  copyId: null,
  error: "",
  slugState: null,
};

export function SellerAffiliatesPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  let modalHost = null;

  const rerender = () => render(root, modalHost, currentContext, actions);

  const actions = {
    createNew() {
      currentContext?.router?.navigate("/seller/affiliates?mode=create");
    },
    selectAffiliate(affiliate) {
      runtimeReset();
      currentContext?.router?.navigate(buildPath({ affiliateId: affiliate.id }));
    },
    closeModal() {
      runtimeReset();
      currentContext?.router?.navigate("/seller/affiliates");
    },
    async submit(payload) {
      const selectedId = currentContext?.query?.affiliate_id ?? "";
      const mode = currentMode(currentContext);
      const validationError = validateAffiliatePayload(payload, mode);
      if (validationError) {
        setRuntime({ saving: false, error: validationError });
        rerender();
        return;
      }
      setRuntime({ saving: true, error: "" });
      rerender();

      try {
        const availability = await sellerAffiliateService.checkSlugAvailability(payload.referral_code, {
          ignoreAffiliateId: mode === "edit" ? selectedId : null,
        });

        if (!availability?.is_available) {
          setRuntime({
            saving: false,
            slugState: {
              is_available: false,
              message: `Slug ${availability?.referral_code || sellerAffiliateService.normalizeSlug(payload.referral_code)} sudah dipakai marketing lain.`,
            },
            error: "Slug marketing sudah dipakai.",
          });
          rerender();
          return;
        }

        const affiliate = mode === "edit" && selectedId
          ? await sellerAffiliateService.update(selectedId, payload)
          : await sellerAffiliateService.create(payload);

        syncAffiliateMutation(affiliate);
        setRuntime({
          saving: false,
          error: "",
          slugState: {
            is_available: true,
            message: `Slug ${affiliate?.referral_code} siap dipakai di route publik.`,
          },
        });
        showToast(mode === "edit" ? "Marketing berhasil diperbarui." : "Marketing berhasil dibuat.", { type: "success" });
        currentContext?.router?.navigate(buildPath({ affiliateId: affiliate?.id }));
      } catch (error) {
        setRuntime({
          saving: false,
          error: error?.message ?? "Marketing gagal disimpan.",
        });
        showToast(error?.message ?? "Marketing gagal disimpan.", { type: "error" });
        rerender();
      }
    },
    async checkSlug(slug) {
      const normalized = sellerAffiliateService.normalizeSlug(slug);

      if (!normalized) {
        setRuntime({
          checkingSlug: false,
          slugState: {
            is_available: false,
            message: "Gunakan huruf, angka, underscore, atau dash untuk slug marketing.",
          },
        });
        rerender();
        return;
      }

      setRuntime({ checkingSlug: true, slugState: null, error: "" });
      rerender();

      try {
        const availability = await sellerAffiliateService.checkSlugAvailability(normalized, {
          ignoreAffiliateId: currentMode(currentContext) === "edit" ? currentContext?.query?.affiliate_id ?? null : null,
        });
        setRuntime({
          checkingSlug: false,
          slugState: {
            is_available: Boolean(availability?.is_available),
            message: availability?.is_available
              ? `Slug ${availability.referral_code} tersedia.`
              : `Slug ${availability?.referral_code || normalized} sudah dipakai marketing lain.`,
          },
        });
      } catch (error) {
        setRuntime({
          checkingSlug: false,
          slugState: {
            is_available: false,
            message: error?.message ?? "Slug marketing gagal diperiksa.",
          },
        });
      }

      rerender();
    },
    openLanding(affiliate) {
      const url = sellerAffiliateService.landingUrl(affiliate?.referral_code ?? "");
      if (!url) {
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    },
    async copyLanding(affiliate) {
      const url = sellerAffiliateService.landingUrl(affiliate?.referral_code ?? "");
      if (!url) {
        showToast("Link landing marketing belum tersedia.", { type: "info" });
        return;
      }

      setRuntime({ copyId: affiliate.id });
      rerender();

      try {
        await navigator.clipboard.writeText(url);
        showToast("Link landing marketing berhasil disalin.", { type: "success" });
      } catch (error) {
        showToast("Clipboard tidak tersedia di browser ini.", { type: "error" });
      } finally {
        setRuntime({ copyId: null });
        rerender();
      }
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      ensureRuntime();
      runtimeReset();
    },
    mount(context) {
      currentContext = context;
      ensureRuntime();
      root = document.createElement("div");
      modalHost = document.createElement("div");
      document.body.append(modalHost);
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
        if (shouldRerenderForAction(action)) {
          rerender();
        }
      });
      return () => unsubscribe?.();
    },
    dispose() {
      clearModal(modalHost);
      modalHost?.remove();
      modalHost = null;
      unsubscribe = null;
      appStore.destroyRuntimeState(RUNTIME_KEY);
    },
  });
}

function render(root, modalHost, context, actions) {
  if (!root || !context) {
    return;
  }

  const snapshotPayload = sellerState.snapshot("affiliates", { affiliates: [], meta: {} });
  const workingPayload = sellerState.working("sellerAffiliates", "affiliates", snapshotPayload);
  const listPayload = workingPayload ?? snapshotPayload ?? { affiliates: [], meta: {} };
  const affiliates = listPayload.affiliates ?? [];
  const detail = appStore.get("working.sellerAffiliates.detail.data", null);
  const detailHydratedAt = appStore.get("working.sellerAffiliates.detail.hydratedAt", 0) ?? 0;
  const listHydratedAt = appStore.get("working.sellerAffiliates.affiliates.hydratedAt", 0) ?? 0;
  const runtime = runtimeState();
  const counts = sellerAffiliateService.counts(affiliates);
  const mode = currentMode(context);
  const modalOpen = mode === "edit" || String(context.query.mode ?? "") === "create";
  const selectedAffiliate = sellerAffiliateService.resolveSelectedAffiliate({
    detail,
    affiliates,
    affiliateId: context.query.affiliate_id ?? "",
  });

  const frame = document.createElement("div");
  frame.className = "mx-auto grid w-full max-w-[1180px] gap-6";
  frame.append(
    SectionHeader({
      title: "Marketing Seller",
      description: "Kelola marketing milik seller, siapkan slug publik, dan arahkan CTA landing ke nomor WhatsApp marketing yang tepat.",
      action: Button({ label: "Marketing baru", onClick: () => actions.createNew(), designHook: "shared.button.primary" }),
    }),
    applyDesignHook(summaryCards(counts), "seller.affiliates.summary"),
  );

  const layout = document.createElement("div");
  layout.className = "grid gap-6";

  const listWrap = document.createElement("div");
  listWrap.className = "grid gap-4";

  if (!listHydratedAt && !(snapshotPayload?.affiliates?.length)) {
    listWrap.append(EmptyState({
      title: "Memuat marketing seller",
      description: "Daftar marketing sedang dimuat.",
    }));
  } else {
    listWrap.append(applyDesignHook(SellerAffiliatesList({
      affiliates,
      totalItems: affiliates.length,
      sourceTotal: Number(listPayload?.meta?.total ?? affiliates.length),
      selectedAffiliateId: context.query.affiliate_id ?? "",
      copyingAffiliateId: runtime.copyId,
      onDetail: (affiliate) => actions.selectAffiliate(affiliate),
      onEdit: (affiliate) => actions.selectAffiliate(affiliate),
      onOpenLanding: (affiliate) => actions.openLanding(affiliate),
      onCopyLanding: (affiliate) => actions.copyLanding(affiliate),
      onCreate: () => actions.createNew(),
    }), "seller.affiliates.list"));
  }

  layout.append(listWrap);

  frame.append(layout);

  root.replaceChildren(frame);

  syncModal({
    modalHost,
    context,
    mode,
    modalOpen,
    selectedAffiliate,
    detailHydratedAt,
    runtime,
    actions,
  });
}

function syncModal({ modalHost, context, mode, modalOpen, selectedAffiliate, detailHydratedAt, runtime, actions }) {
  if (!modalHost) {
    return;
  }

  clearModal(modalHost);

  if (!modalOpen) {
    return;
  }

  modalHost.append(renderModal({
    context,
    mode,
    selectedAffiliate,
    detailHydratedAt,
    runtime,
    actions,
  }));
}

function renderModal({ context, mode, selectedAffiliate, detailHydratedAt, runtime, actions }) {
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/55 px-4 py-6 backdrop-blur-sm";

  const panel = document.createElement("div");
  panel.className = "w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-200 bg-white p-5 shadow-2xl max-h-[90vh] sm:p-6";
  panel.addEventListener("click", (event) => event.stopPropagation());

  if (mode === "edit" && context.query.affiliate_id && !detailHydratedAt && !selectedAffiliate) {
    panel.append(EmptyState({
      title: "Memuat detail marketing",
      description: "Detail marketing sedang dimuat.",
    }));
  } else {
    panel.append(applyDesignHook(SellerAffiliateForm({
      affiliate: mode === "edit" ? selectedAffiliate : null,
      mode,
      presentation: "modal",
      saving: runtime.saving,
      checkingSlug: runtime.checkingSlug,
      error: runtime.error,
      slugState: runtime.slugState,
      onSubmit: (payload) => actions.submit(payload),
      onCheckSlug: (slug) => actions.checkSlug(slug),
      onCreateNew: () => actions.createNew(),
      onOpenLanding: (affiliate) => actions.openLanding(affiliate),
      onCopyLanding: (affiliate) => actions.copyLanding(affiliate),
      onClose: () => actions.closeModal(),
    }), "seller.affiliates.form"));
  }

  overlay.append(panel);
  return overlay;
}

function clearModal(modalHost) {
  if (!modalHost) {
    return;
  }

  modalHost.replaceChildren();
}

function summaryCards(counts) {
  const section = document.createElement("section");
  section.className = "grid gap-3 sm:grid-cols-3";

  [
    ["Total marketing", String(counts.total)],
    ["Marketing aktif", String(counts.active)],
    ["Marketing nonaktif", String(counts.inactive)],
  ].forEach(([label, value]) => {
    const card = Card();
    card.classList.add("grid", "gap-1");
    const title = document.createElement("p");
    title.className = "text-sm font-medium text-gray-500";
    title.textContent = label;
    const number = document.createElement("p");
    number.className = "text-2xl font-bold text-gray-950";
    number.textContent = value;
    card.append(title, number);
    section.append(card);
  });

  return section;
}

function syncAffiliateMutation(affiliate) {
  if (!affiliate) {
    return;
  }

  upsertWorkingCollection("working.sellerAffiliates.affiliates", affiliate, {
    collectionKey: "affiliates",
    source: "seller-affiliates:mutation-upsert-working",
  });
  appStore.patchState("working.sellerAffiliates.detail", {
    data: affiliate,
    hydratedAt: Date.now(),
  }, "seller-affiliates:mutation-detail");
  upsertPreloadCollection("seller", "affiliates", affiliate, {
    collectionKey: "affiliates",
    ttl: 120,
    version: "seller-affiliates-v1",
    source: "seller-affiliates:mutation-upsert-snapshot",
  });
}

function validateAffiliatePayload(payload, mode) {
  if (!String(payload.email ?? "").trim()) {
    return "Email login marketing wajib diisi.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email ?? "").trim())) {
    return "Email login marketing tidak valid.";
  }
  const password = String(payload.password ?? "");
  const confirmation = String(payload.password_confirmation ?? "");
  if (mode === "create" && !password) {
    return "Password marketing wajib diisi saat membuat akun.";
  }
  if (password && password.length < 6) {
    return "Password marketing minimal 6 karakter.";
  }
  if ((password || confirmation) && password !== confirmation) {
    return "Konfirmasi password marketing tidak sama.";
  }
  return "";
}

function ensureRuntime() {
  if (!appStore.get(`runtime.${RUNTIME_KEY}`, null)) {
    appStore.patchState(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME, "seller-affiliates:runtime-init");
  }
}

function runtimeState() {
  return appStore.get(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME) ?? DEFAULT_RUNTIME;
}

function setRuntime(patch = {}) {
  appStore.patchState(`runtime.${RUNTIME_KEY}`, {
    ...runtimeState(),
    ...patch,
  }, "seller-affiliates:runtime");
}

function runtimeReset() {
  setRuntime({
    saving: false,
    checkingSlug: false,
    copyId: null,
    error: "",
    slugState: null,
  });
}

function buildPath({ affiliateId = "", mode = "" } = {}) {
  const params = new URLSearchParams();

  if (affiliateId) {
    params.set("affiliate_id", String(affiliateId));
  }

  if (mode) {
    params.set("mode", mode);
  }

  const query = params.toString();
  return query ? `/seller/affiliates?${query}` : "/seller/affiliates";
}

function currentMode(context) {
  return String(context?.query?.mode ?? "") === "create" || !context?.query?.affiliate_id
    ? "create"
    : "edit";
}

function shouldRerenderForAction(action) {
  const value = String(action ?? "");
  return value === "state:init"
    || value === "working:hydrated"
    || value === "snapshot:loaded"
    || value.startsWith("seller-affiliates:")
    || value.startsWith("route:");
}
