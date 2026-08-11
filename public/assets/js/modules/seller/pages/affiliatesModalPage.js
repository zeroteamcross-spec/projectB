import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { DataTablePagination } from "../../../ui/composites/dataTable.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { sellerState } from "../state/sellerState.js";
import { sellerAffiliateService } from "../services/sellerAffiliateService.js";
import { SellerAffiliatesList } from "../components/sellerAffiliatesList.js";
import { SellerAffiliateForm } from "../components/sellerAffiliateForm.js";
import { SellerAffiliateStatusBadge } from "../components/sellerAffiliateStatusBadge.js";

const RUNTIME_KEY = "sellerAffiliates";
const MODAL_KEY = "slraf-affiliate-modal";
const affiliateFormDraft = {
  key: "",
  draft: null,
  dirty: false,
};
const DEFAULT_RUNTIME = {
  saving: false,
  checkingSlug: false,
  copyId: null,
  togglingId: null,
  error: "",
  slugState: null,
  query: {
    keyword: "",
    status: "",
    page: 1,
    pageSize: 10,
  },
};

export function SellerAffiliatesModalPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;

  const rerender = () => render(root, currentContext, actions);

  const actions = {
    createNew() {
      runtimeReset();
      clearAffiliateFormDraft();
      currentContext?.router?.navigate("/seller/affiliates?mode=create");
    },
    showDetail(affiliate) {
      runtimeReset();
      clearAffiliateFormDraft();
      currentContext?.router?.navigate(buildPath({ affiliateId: affiliate.id, mode: "detail" }));
    },
    editAffiliate(affiliate) {
      runtimeReset();
      clearAffiliateFormDraft();
      currentContext?.router?.navigate(buildPath({ affiliateId: affiliate.id, mode: "edit" }));
    },
    closeModal() {
      runtimeReset();
      clearAffiliateFormDraft();
      currentContext?.router?.navigate("/seller/affiliates");
    },
    applyFilters(nextFilters) {
      setRuntime({
        query: {
          ...runtimeState().query,
          ...nextFilters,
          page: 1,
        },
      });
    },
    changePage(nextPage) {
      setRuntime({
        query: {
          ...runtimeState().query,
          page: nextPage,
        },
      });
    },
    changePerPage(nextPageSize) {
      setRuntime({
        query: {
          ...runtimeState().query,
          page: 1,
          pageSize: nextPageSize,
        },
      });
    },
    async submit(payload) {
      const selectedId = currentContext?.query?.affiliate_id ?? "";
      const mode = currentMode(currentContext);
      setRuntime({ saving: true, error: "" });

      try {
        const validationError = validateAffiliatePayload(payload, mode);
        if (validationError) {
          setRuntime({ saving: false, error: validationError });
          showToast(validationError, { type: "error" });
          return;
        }

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
          return;
        }

        const normalizedPayload = sellerAffiliateService.normalizePayload(payload);
        const affiliate = mode === "edit" && selectedId
          ? await sellerAffiliateService.update(selectedId, normalizedPayload)
          : await sellerAffiliateService.create(normalizedPayload);

        upsertAffiliate({
          ...normalizedPayload,
          ...affiliate,
          referral_code: affiliate?.referral_code || normalizedPayload.referral_code,
          phone_number: affiliate?.phone_number || normalizedPayload.phone_number,
          status: affiliate?.status || normalizedPayload.status,
        });
        syncAffiliateSnapshot();
        setRuntime({
          saving: false,
          error: "",
          slugState: {
            is_available: true,
            message: `Slug ${affiliate?.referral_code || normalizedPayload.referral_code} siap dipakai di route publik.`,
          },
        });
        showToast(mode === "edit" ? "Marketing berhasil diperbarui." : "Marketing berhasil dibuat.", { type: "success" });
        clearAffiliateFormDraft();
        currentContext?.router?.navigate(buildPath({ affiliateId: affiliate?.id, mode: "detail" }));
      } catch (error) {
        setRuntime({
          saving: false,
          error: error?.message ?? "Marketing gagal disimpan.",
        });
        showToast(error?.message ?? "Marketing gagal disimpan.", { type: "error" });
      }
    },
    async toggleStatus(affiliate) {
      const nextStatus = affiliate.status === "active" ? "inactive" : "active";
      setRuntime({ togglingId: affiliate.id, error: "" });

      try {
        const updated = await sellerAffiliateService.update(affiliate.id, {
          name: affiliate.user?.name || affiliate.name || "",
          email: affiliate.user?.email || affiliate.email || "",
          referral_code: affiliate.referral_code || "",
          phone_number: affiliate.phone_number || affiliate.user?.phone_number || "",
          status: nextStatus,
        });
        upsertAffiliate(updated);
        syncAffiliateSnapshot();
        showToast(nextStatus === "active" ? "Affiliate diaktifkan." : "Affiliate dinonaktifkan.", { type: "success" });
      } catch (error) {
        setRuntime({ error: error?.message ?? "Status marketing gagal diperbarui." });
        showToast(error?.message ?? "Status marketing gagal diperbarui.", { type: "error" });
      } finally {
        setRuntime({ togglingId: null });
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
        return;
      }

      setRuntime({ checkingSlug: true, slugState: null, error: "" });

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
    },
    openLanding(affiliate) {
      const url = sellerAffiliateService.landingUrl(affiliate?.referral_code ?? "");
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    },
    async copyLanding(affiliate) {
      const url = sellerAffiliateService.landingUrl(affiliate?.referral_code ?? "");
      if (!url) {
        showToast("Link landing marketing belum tersedia.", { type: "info" });
        return;
      }

      setRuntime({ copyId: affiliate.id });

      try {
        await navigator.clipboard.writeText(url);
        showToast("Link landing marketing berhasil disalin.", { type: "success" });
      } catch (error) {
        showToast("Clipboard tidak tersedia di browser ini.", { type: "error" });
      } finally {
        setRuntime({ copyId: null });
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
      render(root, context, actions);
      return root;
    },
    hydrate(context) {
      currentContext = context;
      render(root, context, actions);
    },
    bindEvents(context) {
      currentContext = context;
      unsubscribe = appStore.subscribe(() => render(root, currentContext, actions));
      return () => unsubscribe?.();
    },
    dispose() {
      closeAffiliateModal();
      clearAffiliateFormDraft();
      unsubscribe = null;
      appStore.destroyRuntimeState(RUNTIME_KEY);
    },
  });
}

function render(root, context, actions) {
  if (!root || !context) {
    return;
  }

  const snapshotPayload = sellerState.snapshot("affiliates", { affiliates: [], meta: {} });
  const workingPayload = sellerState.working("sellerAffiliates", "affiliates", snapshotPayload);
  const listPayload = workingPayload ?? snapshotPayload ?? { affiliates: [], meta: {} };
  const affiliates = listPayload.affiliates ?? [];
  const listHydratedAt = appStore.get("working.sellerAffiliates.affiliates.hydratedAt", 0) ?? 0;
  const runtime = runtimeState();
  const query = runtime.query ?? DEFAULT_RUNTIME.query;
  const counts = sellerAffiliateService.counts(affiliates);
  const filteredAffiliates = filterAffiliates(affiliates, query);
  const pageSize = Math.max(1, Number(query.pageSize || 10));
  const totalPages = Math.max(1, Math.ceil(filteredAffiliates.length / pageSize));
  const safePage = Math.min(Math.max(1, Number(query.page || 1)), totalPages);
  const pagedAffiliates = filteredAffiliates.slice((safePage - 1) * pageSize, safePage * pageSize);
  const selectedAffiliate = sellerAffiliateService.resolveSelectedAffiliate({
    affiliates,
    affiliateId: context.query.affiliate_id ?? "",
  });
  const mode = currentMode(context);
  const modalOpen = mode === "create" || (Boolean(context.query.affiliate_id) && ["detail", "edit"].includes(mode));
  const loading = !listHydratedAt && !(snapshotPayload?.affiliates?.length);

  const layout = document.createElement("section");
  layout.id = "slraf_page";
  layout.className = "grid min-w-0 gap-5";
  layout.dataset.ds = "seller.affiliates.page";

  layout.append(
    affiliatesHero({ counts, action: createButton(actions.createNew) }),
    applyDesignHook(summaryCards({ affiliates, counts }), "seller.affiliates.summary"),
    filterBar({ query, counts, onChange: actions.applyFilters }),
  );

  if (runtime.error && !modalOpen) {
    const error = document.createElement("p");
    error.id = "slraf_error_section";
    error.className = "rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-sm font-semibold text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    error.textContent = runtime.error;
    layout.append(error);
  }

  layout.append(applyDesignHook(SellerAffiliatesList({
    affiliates: pagedAffiliates,
    totalItems: filteredAffiliates.length,
    sourceTotal: affiliates.length,
    loading,
    copyingAffiliateId: runtime.copyId,
    togglingAffiliateId: runtime.togglingId,
    onCreate: () => actions.createNew(),
    onDetail: (affiliate) => actions.showDetail(affiliate),
    onEdit: (affiliate) => actions.editAffiliate(affiliate),
    onToggleStatus: (affiliate) => actions.toggleStatus(affiliate),
    onOpenLanding: (affiliate) => actions.openLanding(affiliate),
    onCopyLanding: (affiliate) => actions.copyLanding(affiliate),
    pagination: filteredAffiliates.length > pageSize
      ? DataTablePagination({
        page: safePage,
        totalPages,
        totalItems: filteredAffiliates.length,
        perPage: pageSize,
        itemLabel: "marketing",
        onChange: (nextPage) => actions.changePage(nextPage),
        onPerPageChange: (nextPageSize) => actions.changePerPage(nextPageSize),
        onJump: (nextPage) => actions.changePage(nextPage),
        buttonIds: {
          previous: "slraf_pagination_previous_button",
          next: "slraf_pagination_next_button",
          jump: "slraf_pagination_jump_button",
          page: (page) => `slraf_pagination_page_${page}_button`,
        },
        inputIds: {
          perPage: "slraf_pagination_page_size_input",
          jump: "slraf_pagination_jump_input",
        },
      })
      : null,
  }), "seller.affiliates.list"));

  root.replaceChildren(layout);

  if (modalOpen) {
    openAffiliateModal({ mode, selectedAffiliate, runtime, actions });
  } else {
    closeAffiliateModal();
  }
}

function openAffiliateModal({ mode, selectedAffiliate, runtime, actions }) {
  const isCreate = mode === "create";
  const isEdit = mode === "edit";
  const content = document.createElement("section");
  content.id = isCreate ? "slraf_create_modal_content_section" : isEdit ? "slraf_edit_modal_content_section" : "slraf_detail_modal_content_section";
  content.className = "grid min-w-0 gap-4";

  if (mode === "detail") {
    content.append(affiliateDetailPanel({ affiliate: selectedAffiliate }));
  } else {
    const formDraft = ensureAffiliateFormDraft({
      mode,
      affiliate: isEdit ? selectedAffiliate : null,
    });
    content.append(applyDesignHook(SellerAffiliateForm({
      affiliate: isEdit ? selectedAffiliate : null,
      draftOverride: formDraft,
      mode,
      presentation: "modal",
      saving: runtime.saving,
      checkingSlug: runtime.checkingSlug,
      error: runtime.error,
      slugState: runtime.slugState,
      onSubmit: (payload) => actions.submit(payload),
      onDraftChange: (draft) => updateAffiliateFormDraft(draft),
      onCreateNew: () => actions.createNew(),
      onOpenLanding: (affiliate) => actions.openLanding(affiliate),
      onCopyLanding: (affiliate) => actions.copyLanding(affiliate),
      onClose: () => actions.closeModal(),
    }), "seller.affiliates.form"));
  }

  openModal(content, {
    key: MODAL_KEY,
    title: isCreate ? "Tambah Marketing" : isEdit ? "Edit Marketing" : "Detail Marketing",
    description: isCreate
      ? "Tambahkan partner marketing dan slug referral dari modal ini."
      : isEdit
        ? "Perbarui data marketing tanpa mengambil detail baru dari server."
        : "Ringkasan marketing.",
    size: isEdit || isCreate ? "lg" : "xl",
    footer: null,
    panelId: isCreate ? "slraf_create_modal" : isEdit ? "slraf_edit_modal" : "slraf_detail_modal",
    headerId: "slraf_modal_header_section",
    bodyId: "slraf_modal_body_section",
    closeButtonId: "slraf_modal_close_button",
    // Detail mode replaces the corner close button with Edit/Copy Link/Buka
    // Landing, since those are the only actions this read-only view offers.
    headerActions: mode === "detail"
      ? () => affiliateDetailHeaderActions({
        disabled: !selectedAffiliate,
        onEdit: () => selectedAffiliate ? actions.editAffiliate(selectedAffiliate) : null,
        onCopyLanding: () => selectedAffiliate ? actions.copyLanding(selectedAffiliate) : null,
        onOpenLanding: () => selectedAffiliate ? actions.openLanding(selectedAffiliate) : null,
      })
      : undefined,
    onClose: () => actions.closeModal(),
    preserveContentOnSameSignature: true,
    contentSignature: affiliateModalSignature({ mode, selectedAffiliate, runtime }),
  });
}

function closeAffiliateModal() {
  const modal = appStore.get("ui.modal", null);
  if (modal?.key === MODAL_KEY) {
    closeModal({ notify: false });
  }
}

function affiliateModalSignature({ mode, selectedAffiliate, runtime }) {
  const id = mode === "create" ? "new" : String(selectedAffiliate?.id ?? "missing");
  const detailVersion = mode === "detail"
    ? `${selectedAffiliate?.updated_at ?? ""}:${selectedAffiliate?.status ?? ""}`
    : "";

  return [
    mode,
    id,
    detailVersion,
    runtime.saving ? "saving" : "idle",
    runtime.checkingSlug ? "checking" : "slug-idle",
    runtime.error ?? "",
    runtime.slugState?.is_available === true ? "slug-ok" : runtime.slugState?.is_available === false ? "slug-fail" : "slug-none",
    runtime.slugState?.message ?? "",
  ].join("|");
}

function ensureAffiliateFormDraft({ mode, affiliate = null }) {
  const key = affiliateDraftKey(mode, affiliate);
  if (affiliateFormDraft.key !== key || !affiliateFormDraft.draft) {
    affiliateFormDraft.key = key;
    affiliateFormDraft.draft = seedAffiliateDraft(mode, affiliate);
    affiliateFormDraft.dirty = false;
  }

  return affiliateFormDraft.draft;
}

function updateAffiliateFormDraft(draft = {}) {
  if (!affiliateFormDraft.key) {
    return;
  }

  affiliateFormDraft.draft = {
    ...sellerAffiliateService.emptyDraft(),
    ...(affiliateFormDraft.draft ?? {}),
    ...draft,
  };
  affiliateFormDraft.dirty = true;
}

function clearAffiliateFormDraft() {
  affiliateFormDraft.key = "";
  affiliateFormDraft.draft = null;
  affiliateFormDraft.dirty = false;
}

function affiliateDraftKey(mode, affiliate) {
  return `${mode}:${mode === "create" ? "new" : affiliate?.id ?? "missing"}`;
}

function seedAffiliateDraft(mode, affiliate) {
  if (mode === "edit" && affiliate) {
    return {
      name: affiliate.user?.name ?? affiliate.name ?? "",
      email: affiliate.user?.email ?? affiliate.email ?? "",
      referral_code: affiliate.referral_code ?? "",
      phone_number: affiliate.phone_number ?? affiliate.user?.phone_number ?? "",
      status: affiliate.status ?? "active",
      password: "",
      password_confirmation: "",
    };
  }

  return {
    ...sellerAffiliateService.emptyDraft(),
    password: "",
    password_confirmation: "",
  };
}

function affiliatesHero({ counts, action }) {
  const section = document.createElement("section");
  section.id = "slraf_header";
  section.className = "relative overflow-hidden rounded-[2rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,244,237,0.84),rgba(234,244,249,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 lg:p-7";
  section.dataset.ds = "seller.affiliates.hero";

  const layout = document.createElement("section");
  layout.className = "grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_16px_40px_rgba(30,129,176,0.22)]";
  icon.append(createIcon("affiliate", { className: "h-5 w-5" }));
  copy.append(
    icon,
    textNode("p", "text-xs font-black uppercase tracking-[0.18em] text-[var(--pb-brand-secondary)]", "Seller marketing desk"),
    textNode("h1", "max-w-3xl text-3xl font-black leading-tight tracking-normal text-gray-950 sm:text-4xl", "Marketing"),
    textNode("p", "max-w-2xl text-sm leading-6 text-gray-600", "Kelola partner marketing, link referral, dan status performa."),
  );

  const stats = document.createElement("section");
  stats.className = "grid gap-2 sm:grid-cols-3 lg:min-w-[420px]";
  [
    ["Total", counts.total],
    ["Aktif", counts.active],
    ["Nonaktif", counts.inactive],
  ].forEach(([label, value], index) => {
    const stat = document.createElement("section");
    stat.className = "rounded-[1.25rem] border border-white/80 bg-white/78 p-3 shadow-sm";
    stat.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textNode("p", "text-2xl font-black text-gray-950", String(value)),
    );
    stats.append(stat);
  });

  layout.append(copy, action);
  section.append(layout, stats);
  return section;
}

function createButton(onClick) {
  const button = Button({ label: "Tambah Marketing", onClick, designHook: "shared.button.primary" });
  button.id = "slraf_create_button";
  button.prepend(createIcon("plus", { className: "h-4 w-4" }));
  return button;
}

function summaryCards({ affiliates, counts }) {
  const section = document.createElement("section");
  section.id = "slraf_summary_section";
  section.className = "grid gap-3 sm:grid-cols-2 xl:grid-cols-4";

  const totals = summarizeMetrics(affiliates);
  [
    ["Total marketing", counts.total],
    ["Marketing aktif", counts.active],
    ["Total klik / prospek", `${totals.clicks.toLocaleString("id-ID")} / ${totals.leads.toLocaleString("id-ID")}`],
    ["Komisi / settlement", totals.commission],
  ].forEach(([label, value], index) => {
    const card = document.createElement("section");
    card.className = [
      "rounded-[1.5rem] border p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl",
      summaryCardClass(index),
    ].join(" ");
    card.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textNode("p", "mt-2 text-2xl font-black text-gray-950", String(value)),
    );
    section.append(card);
  });

  return section;
}

function filterBar({ query, counts, onChange }) {
  const section = document.createElement("section");
  section.id = "slraf_filter_section";
  section.className = "grid gap-3 rounded-[1.5rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_190px] md:items-end";
  section.dataset.ds = "seller.affiliates.filters";

  const searchWrap = document.createElement("label");
  searchWrap.className = "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700";
  searchWrap.textContent = "Cari marketing";
  const search = document.createElement("input");
  search.id = "slraf_search_input";
  search.value = query.keyword ?? "";
  search.placeholder = "Nama, email, phone, slug";
  search.className = controlClassName();
  search.addEventListener("input", () => onChange?.({ keyword: search.value }));
  searchWrap.append(search);

  const statusWrap = document.createElement("label");
  statusWrap.className = "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700";
  statusWrap.textContent = "Status";
  const status = document.createElement("select");
  status.id = "slraf_status_filter";
  status.className = controlClassName();
  [
    ["", `Semua (${counts.total})`],
    ["active", `Aktif (${counts.active})`],
    ["inactive", `Nonaktif (${counts.inactive})`],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = String(query.status ?? "") === value;
    status.append(option);
  });
  status.addEventListener("change", () => onChange?.({ status: status.value }));
  statusWrap.append(status);

  section.append(searchWrap, statusWrap);
  return section;
}

function summaryCardClass(index) {
  return [
    "border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(250,244,237,0.96),rgba(255,255,255,0.88))]",
    "border-[color-mix(in_srgb,var(--pb-success)_14%,white)] bg-[linear-gradient(135deg,rgba(236,246,239,0.96),rgba(255,255,255,0.88))]",
    "border-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)] bg-[linear-gradient(135deg,rgba(234,244,249,0.96),rgba(255,255,255,0.88))]",
    "border-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)] bg-[linear-gradient(135deg,rgba(234,244,249,0.96),rgba(255,255,255,0.88))]",
  ][index % 4];
}

function affiliateDetailPanel({ affiliate }) {
  const section = document.createElement("section");
  section.id = "slraf_detail_panel_section";
  section.className = "grid min-w-0 gap-4";

  if (!affiliate) {
    section.append(textNode("p", "rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-warning)_26%,white)] bg-[color-mix(in_srgb,var(--pb-warning)_8%,white)] px-4 py-3 text-sm font-semibold text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]", "Marketing tidak ditemukan."));
    return section;
  }

  const header = document.createElement("section");
  header.className = "grid gap-3 rounded-[1.5rem] border border-white/80 bg-[var(--pb-surface-inset)] p-4";
  header.append(
    textNode("p", "text-2xl font-black text-gray-950", affiliate.user?.name || affiliate.name || `Marketing #${affiliate.id}`),
    textNode("p", "break-words text-sm font-semibold text-gray-600", [affiliate.user?.email || affiliate.email, affiliate.phone_number || affiliate.user?.phone_number].filter(Boolean).join(" | ") || "Kontak belum lengkap"),
    SellerAffiliateStatusBadge(affiliate.status),
  );

  const facts = document.createElement("section");
  facts.className = "grid gap-3 sm:grid-cols-2";
  [
    ["Slug", affiliate.referral_code || "-"],
    ["Link", sellerAffiliateService.landingUrl(affiliate.referral_code) || "-"],
    ["Showroom", affiliate.showroom?.name || "-"],
    ["Seller", affiliate.seller?.name || "-"],
    ["Dibuat", affiliate.created_at || "-"],
    ["Diupdate", affiliate.updated_at || "-"],
  ].forEach(([label, value]) => {
    const card = document.createElement("section");
    card.className = "grid gap-1 rounded-[1.25rem] border border-[var(--pb-border)] bg-white/82 p-3";
    card.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textNode("p", "break-words text-sm font-semibold text-gray-900", value),
    );
    facts.append(card);
  });

  // Edit/Copy Link/Buka Landing now live in the modal header (see
  // openAffiliateModal), not here.
  section.append(header, facts);
  return section;
}

function affiliateDetailHeaderActions({ disabled, onEdit, onCopyLanding, onOpenLanding }) {
  const wrap = document.createElement("div");
  wrap.className = "flex shrink-0 flex-wrap items-center justify-end gap-2";

  const edit = Button({ label: "Edit", variant: "primary", disabled, onClick: onEdit });
  edit.id = "slraf_detail_edit_button";
  edit.prepend(createIcon("edit", { className: "h-4 w-4" }));
  const copy = Button({ label: "Copy Link", variant: "secondary", disabled, onClick: onCopyLanding });
  copy.id = "slraf_detail_copy_link_button";
  copy.prepend(createIcon("link", { className: "h-4 w-4" }));
  const open = Button({ label: "Buka Landing", variant: "secondary", disabled, onClick: onOpenLanding });
  open.id = "slraf_detail_open_landing_button";
  open.prepend(createIcon("globe", { className: "h-4 w-4" }));

  wrap.append(edit, copy, open);
  return wrap;
}

function filterAffiliates(affiliates, query) {
  const keyword = String(query.keyword ?? "").trim().toLowerCase();
  const status = String(query.status ?? "");
  return affiliates.filter((affiliate) => {
    const statusMatch = !status || affiliate.status === status;
    const haystack = [
      affiliate.user?.name,
      affiliate.name,
      affiliate.user?.email,
      affiliate.email,
      affiliate.phone_number,
      affiliate.user?.phone_number,
      affiliate.referral_code,
    ].filter(Boolean).join(" ").toLowerCase();
    const keywordMatch = !keyword || haystack.includes(keyword);
    return statusMatch && keywordMatch;
  });
}

function upsertAffiliate(affiliate) {
  if (!affiliate?.id) {
    return;
  }

  const current = appStore.get("working.sellerAffiliates.affiliates.data", null) ?? { affiliates: [], meta: {} };
  const affiliates = Array.isArray(current.affiliates) ? [...current.affiliates] : [];
  const index = affiliates.findIndex((item) => Number(item.id) === Number(affiliate.id));
  if (index >= 0) {
    affiliates[index] = { ...affiliates[index], ...affiliate };
  } else {
    affiliates.unshift(affiliate);
  }

  appStore.patchState("working.sellerAffiliates.affiliates", {
    data: {
      ...current,
      affiliates,
      meta: {
        ...(current.meta ?? {}),
        total: affiliates.length,
      },
    },
    hydratedAt: Date.now(),
  }, "seller-affiliates:local-upsert");
}

function syncAffiliateSnapshot() {
  const workingPayload = appStore.get("working.sellerAffiliates.affiliates.data", { affiliates: [], meta: {} }) ?? { affiliates: [], meta: {} };
  appStore.patchState("snapshot.seller.affiliates", {
    data: workingPayload,
    fetchedAt: Date.now(),
    ttl: 120,
    version: "seller-affiliates-v1",
    stale: false,
  }, "seller-affiliates:snapshot-sync");
}

function summarizeMetrics(affiliates) {
  const totals = affiliates.reduce((carry, affiliate) => ({
    clicks: carry.clicks + numberValue(affiliate.click_count ?? affiliate.total_clicks ?? affiliate.clicks_count),
    leads: carry.leads + numberValue(affiliate.lead_count ?? affiliate.total_leads ?? affiliate.prospect_count ?? affiliate.prospects_count),
    commission: carry.commission + numberValue(affiliate.total_commission ?? affiliate.commission_total ?? affiliate.settlement_total ?? affiliate.total_settlement),
  }), { clicks: 0, leads: 0, commission: 0 });

  return {
    ...totals,
    commission: new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(totals.commission),
  };
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
    togglingId: null,
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
  const mode = String(context?.query?.mode ?? "");
  if (mode === "create" || mode === "edit" || mode === "detail") {
    return mode;
  }

  return context?.query?.affiliate_id ? "detail" : "list";
}

function validateAffiliatePayload(payload, mode) {
  if (!String(payload.name ?? "").trim()) {
    return "Nama marketing wajib diisi.";
  }
  if (!String(payload.email ?? "").trim()) {
    return "Username/email login marketing wajib diisi.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(payload.email ?? "").trim())) {
    return "Username login marketing harus berupa email yang valid.";
  }
  if (!String(payload.referral_code ?? "").trim()) {
    return "Slug marketing wajib diisi.";
  }
  if (!String(payload.phone_number ?? "").trim()) {
    return "Nomor WhatsApp marketing wajib diisi.";
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

function numberValue(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function controlClassName() {
  return "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--pb-text)] outline-none transition duration-150 placeholder:text-[var(--pb-text-muted)] focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
