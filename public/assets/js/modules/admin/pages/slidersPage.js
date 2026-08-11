import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { markPreloadSnapshotsStale, writePreloadSnapshot } from "../../../state/sync/sharedMutationSync.js";
import { Button } from "../../../ui/primitives/button.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { openModal, closeModal } from "../../../ui/primitives/modal.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { DataTable, DataTablePagination } from "../../../ui/composites/dataTable.js";
import { SliderBanner, sliderAnimationOptions, sliderPositionOptions, sliderTemplateOptions } from "../../../ui/composites/sliderBanner.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { applyDesignHook } from "../../../theme/designStudioHooks.js";
import { slidersResource } from "../../../resources/slidersResource.js";

const DEFAULT_QUERY = Object.freeze({
  keyword: "",
  position: "",
  status: "",
  page: 1,
  pageSize: 10,
});

export function AdminSlidersPage() {
  let root = null;
  let unsubscribe = null;
  let currentContext = null;
  const state = {
    query: { ...DEFAULT_QUERY },
    modal: null,
    saving: false,
    deletingId: null,
    togglingId: null,
    reorderingId: null,
    error: "",
  };

  const rerender = () => render(root, currentContext, state, actions);

  const actions = {
    applyFilters(nextFilters = {}) {
      state.query = { ...state.query, ...nextFilters, page: 1 };
      syncUrl(state.query);
      rerender();
    },
    changePage(page) {
      state.query = { ...state.query, page };
      syncUrl(state.query);
      rerender();
    },
    changePerPage(pageSize) {
      state.query = { ...state.query, page: 1, pageSize };
      syncUrl(state.query);
      rerender();
    },
    openCreate() {
      state.modal = { type: "form", mode: "create", id: null };
      rerender();
    },
    openEdit(slider) {
      state.modal = { type: "form", mode: "edit", id: slider.id };
      rerender();
    },
    openPreview(slider) {
      state.modal = { type: "preview", id: slider.id };
      rerender();
    },
    closeModal() {
      state.modal = null;
      closeModal({ notify: false });
      rerender();
    },
    async uploadImage(file) {
      validateImageFile(file);
      const asset = await slidersResource.uploadImage(file);
      if (!asset?.url && !asset?.path) {
        throw new Error("Upload gambar slider tidak mengembalikan URL.");
      }
      return asset;
    },
    async saveSlider(payload, mode, id = null) {
      if (state.modal) {
        state.modal = { ...state.modal, draft: payload };
      }

      const clientError = validateSliderPayload(payload);
      if (clientError) {
        state.error = clientError;
        showToast(clientError, { type: "warning" });
        rerender();
        return;
      }

      state.saving = true;
      state.error = "";
      rerender();
      try {
        const result = mode === "edit"
          ? await slidersResource.adminUpdateResponse(id, payload)
          : await slidersResource.adminCreateResponse(payload);
        patchAdminSliders(result.slider);
        invalidateSliderSnapshots();
        state.modal = null;
        closeModal({ notify: false });
        showToast(result.message || "Slider berhasil disimpan.", { type: "success" });
      } catch (error) {
        state.error = apiErrorMessage(error, "Gagal menyimpan slider.");
        showToast(state.error, { type: "error" });
      } finally {
        state.saving = false;
        rerender();
      }
    },
    async toggleSlider(slider) {
      state.togglingId = slider.id;
      rerender();
      try {
        const updated = await slidersResource.adminToggle(slider.id);
        patchAdminSliders(updated);
        invalidateSliderSnapshots();
        showToast("Status slider berhasil diperbarui.", { type: "success" });
      } catch (error) {
        showToast(error.message || "Gagal memperbarui status slider.", { type: "error" });
      } finally {
        state.togglingId = null;
        rerender();
      }
    },
    async deleteSlider(slider) {
      state.deletingId = slider.id;
      rerender();
      try {
        await slidersResource.adminDelete(slider.id);
        removeAdminSlider(slider.id);
        invalidateSliderSnapshots();
        showToast("Slider berhasil diarsipkan.", { type: "success" });
      } catch (error) {
        showToast(error.message || "Gagal mengarsipkan slider.", { type: "error" });
      } finally {
        state.deletingId = null;
        rerender();
      }
    },
    async moveSlider(slider, direction, allSliders) {
      const sorted = [...allSliders].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
      const index = sorted.findIndex((item) => Number(item.id) === Number(slider.id));
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) {
        return;
      }
      const next = [...sorted];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      state.reorderingId = slider.id;
      rerender();
      try {
        const result = await slidersResource.adminReorder(next.map((item, itemIndex) => ({
          id: item.id,
          sort_order: (itemIndex + 1) * 10,
        })));
        patchAdminSlidersPayload(result);
        invalidateSliderSnapshots();
        showToast("Urutan slider berhasil diperbarui.", { type: "success" });
      } catch (error) {
        showToast(error.message || "Gagal memperbarui urutan slider.", { type: "error" });
      } finally {
        state.reorderingId = null;
        rerender();
      }
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
      state.query = createQuery(context?.query);
      state.modal = null;
      state.error = "";
    },
    mount(context) {
      currentContext = context;
      root = document.createElement("div");
      rerender();
      return root;
    },
    hydrate(context) {
      currentContext = context;
      state.query = createQuery(context?.query);
      rerender();
    },
    bindEvents(context) {
      currentContext = context;
      unsubscribe = appStore.subscribe(() => rerender());
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
      closeModal({ notify: false });
    },
  });
}

function render(root, context, state, actions) {
  if (!root || !context) return;

  const workingPayload = appStore.get("working.adminSliders.sliders.data", null);
  const snapshotPayload = appStore.get("snapshot.admin.sliders.data", null);
  const payload = workingPayload ?? snapshotPayload ?? { sliders: [], meta: {} };
  const hydratedAt = appStore.get("working.adminSliders.sliders.hydratedAt", 0) ?? 0;
  const hasSource = Boolean(workingPayload || snapshotPayload);
  const sliders = normalizeSliders(payload.sliders ?? []);
  const filtered = filterSliders(sliders, state.query);
  const pagination = paginate(filtered, state.query);

  const page = document.createElement("section");
  page.id = "adsl_page_section";
  page.className = "grid min-w-0 gap-6";
  page.dataset.ds = "admin.sliders.page";

  const createButton = Button({
    label: "Tambah Slider",
    variant: "primary",
    onClick: actions.openCreate,
    designHook: "shared.button.primary",
  });
  createButton.id = "adsl_create_button";
  createButton.prepend(createIcon("plus", { className: "block h-4 w-4 leading-none" }));

  page.append(
    hero({ action: createButton, sliders }),
    filterBar({ query: state.query, sliders, onSubmit: actions.applyFilters }),
  );

  if (state.error) {
    page.append(errorPanel(state.error));
  }

  page.append(sliderTable({
    sliders: pagination.items,
    allSliders: filtered,
    loading: !hydratedAt && !hasSource,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalItems: filtered.length,
    state,
    actions,
  }));

  root.replaceChildren(page);
  syncOpenModal(state, actions, sliders);
}

function hero({ action, sliders }) {
  const section = document.createElement("section");
  section.id = "adsl_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(250,244,237,0.88),rgba(234,244,249,0.76))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-6 lg:p-7";

  const layout = document.createElement("section");
  layout.className = "grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";
  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,var(--pb-brand-secondary),var(--pb-brand-accent))] text-white shadow-[0_16px_40px_rgba(30,129,176,0.24)]";
  icon.append(createIcon("image", { className: "block h-5 w-5 leading-none" }));
  copy.append(
    icon,
    textNode("p", "text-[10px] font-black uppercase tracking-[0.18em] text-[var(--pb-brand-secondary)]", "Admin slider"),
    textNode("h1", "text-2xl font-black leading-tight tracking-normal text-gray-950 sm:text-3xl", "Manajemen Slider"),
    textNode("p", "max-w-2xl text-xs leading-6 text-gray-600", ""),
  );

  const stats = document.createElement("section");
  stats.className = "grid gap-2 sm:grid-cols-3 lg:min-w-[380px]";
  [
    ["Total", sliders.length],
    ["Aktif", sliders.filter((item) => item.is_active).length],
    ["Public", sliders.filter((item) => item.position_key === "public_home" || item.position_key === "landing_hero").length],
  ].forEach(([label, value]) => {
    const card = document.createElement("section");
    card.className = "rounded-[1.25rem] border border-[var(--pb-card-border)] bg-white/78 p-3 shadow-sm";
    card.append(textNode("p", "text-[10px] font-black uppercase tracking-[0.14em] text-gray-500", label), textNode("p", "text-xl font-black text-gray-950", String(value)));
    stats.append(card);
  });
  const side = document.createElement("section");
  side.className = "grid gap-3";
  side.append(stats, action);
  layout.append(copy, side);
  section.append(layout);
  return section;
}

function filterBar({ query, sliders, onSubmit }) {
  const section = document.createElement("section");
  section.id = "adsl_filter_section";
  section.className = "grid gap-4 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(234,244,249,0.72),rgba(250,244,237,0.72))] p-4 shadow-[var(--pb-shadow-card)]";
  section.dataset.ds = "admin.sliders.filters";
  const form = document.createElement("form");
  form.id = "adsl_filter_form";
  form.className = "grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto]";
  const keyword = inputControl("adsl_keyword_input", "keyword", query.keyword, "Cari judul, kode, CTA");
  const position = selectControl("adsl_position_input", "position", query.position, [["", "Semua posisi"], ...sliderPositionOptions().map((item) => [item.value, item.label])]);
  const status = selectControl("adsl_status_input", "status", query.status, [["", "Semua status"], ["active", "Aktif"], ["inactive", "Nonaktif"]]);
  const actions = document.createElement("section");
  actions.className = "grid gap-2 sm:grid-cols-2 lg:grid-cols-1";
  const submit = Button({ label: "Terapkan", variant: "primary" });
  submit.type = "submit";
  submit.prepend(createIcon("search", { className: "block h-4 w-4 leading-none" }));
  const reset = Button({ label: "Reset", variant: "secondary", onClick: () => onSubmit?.({ keyword: "", position: "", status: "" }) });
  reset.type = "button";
  actions.append(submit, reset);
  form.append(labelWrap("Keyword", keyword), labelWrap("Posisi", position), labelWrap("Status", status), actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit?.({ keyword: keyword.value.trim(), position: position.value, status: status.value });
  });
  const chips = document.createElement("section");
  chips.className = "flex flex-wrap gap-2 border-t border-[var(--pb-card-border)] pt-3";
  [`${sliders.length} slider`, `${sliders.filter((item) => item.is_active).length} aktif`, "HTML predefined"].forEach((text) => {
    const chip = document.createElement("span");
    chip.className = "rounded-full border border-[var(--pb-border)] bg-[var(--pb-chip-bg)] px-4 py-2 text-xs font-semibold text-[var(--pb-chip-text)] shadow-sm";
    chip.textContent = text;
    chips.append(chip);
  });
  section.append(form, chips);
  return section;
}

function sliderTable({ sliders, allSliders, loading, page, pageSize, totalItems, state, actions }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return applyDesignHook(DataTable({
    shellId: "adsl_table_section",
    title: "Daftar Slider",
    subtitle: totalItems ? `${totalItems} slider sesuai filter` : "Slider publik dan buyer akan muncul di sini.",
    icon: iconBox("image"),
    loading,
    rows: sliders,
    columns: [
      { label: "Preview", render: previewCell },
      { label: "Judul", render: titleCell },
      { label: "Posisi", render: (slider) => textNode("span", "text-xs font-bold text-gray-800", positionLabel(slider.position_key)) },
      { label: "Status", render: statusCell },
      { label: "Urutan", render: (slider) => textNode("span", "text-xs font-black text-gray-900", String(slider.sort_order ?? 0)) },
      { label: "Jadwal", render: scheduleCell },
      { label: "Animasi", render: (slider) => textNode("span", "text-xs font-semibold text-gray-700", slider.animation_key || "-") },
      { label: "Aksi", render: (slider) => actionCell(slider, allSliders, state, actions) },
    ],
    emptyTitle: "Belum ada slider",
    emptyDescription: "Tambahkan slider pertama untuk public catalog atau buyer dashboard.",
    mobileMode: "stack",
    tableMinWidth: "min-w-[1080px]",
    getRowKey: (slider) => slider.id,
    mobileCardTitle: (slider) => slider.title,
    mobileCardSubtitle: (slider) => `${positionLabel(slider.position_key)} - ${slider.template_key}`,
    mobileCardBadges: (slider) => [statusCell(slider)],
    mobileCardFields: (slider) => [
      { label: "Urutan", value: String(slider.sort_order ?? 0) },
      { label: "Jadwal", value: scheduleLabel(slider) },
      { label: "CTA", value: slider.cta_text || "-" },
    ],
    mobileCardActions: (slider) => actionCell(slider, allSliders, state, actions),
    pagination: DataTablePagination({
      page,
      totalPages,
      totalItems,
      perPage: pageSize,
      itemLabel: "slider",
      onChange: actions.changePage,
      onPerPageChange: actions.changePerPage,
      onJump: actions.changePage,
    }),
  }), "admin.sliders.table");
}

function previewCell(slider) {
  const wrap = document.createElement("section");
  wrap.className = "grid h-16 w-24 place-items-center overflow-hidden rounded-xl border border-[var(--pb-card-border)] bg-gray-50";
  if (slider.image_url) {
    const image = document.createElement("img");
    image.src = normalizeImageUrl(slider.image_url);
    image.alt = slider.image_alt || slider.title || "Preview slider";
    image.className = "h-full w-full object-cover";
    wrap.append(image);
    return wrap;
  }
  wrap.append(createIcon("image", { className: "h-5 w-5 text-[var(--pb-text-muted)]" }));
  return wrap;
}

function titleCell(slider) {
  const wrap = document.createElement("section");
  wrap.className = "grid min-w-0 gap-1";
  wrap.append(
    textNode("p", "break-words text-xs font-black text-gray-950", slider.title || "-"),
    textNode("p", "break-words text-[10px] font-semibold text-gray-500", slider.code || slider.template_key || "-"),
  );
  return wrap;
}

function statusCell(slider) {
  return Badge({ label: slider.is_active ? "Aktif" : "Nonaktif", variant: slider.is_active ? "success" : "default" });
}

function scheduleCell(slider) {
  const wrap = document.createElement("section");
  wrap.className = "grid gap-1 text-[10px] font-semibold text-gray-600";
  wrap.append(textNode("span", "", slider.start_at ? `Mulai ${slider.start_at}` : "Mulai: langsung"), textNode("span", "", slider.end_at ? `Selesai ${slider.end_at}` : "Selesai: terbuka"));
  return wrap;
}

function actionCell(slider, allSliders, state, actions) {
  const wrap = document.createElement("section");
  wrap.className = "flex flex-wrap gap-2";
  const preview = iconButton("Preview", "eye", () => actions.openPreview(slider));
  const edit = iconButton("Edit", "edit", () => actions.openEdit(slider));
  const toggle = iconButton(state.togglingId === slider.id ? "..." : slider.is_active ? "Nonaktif" : "Aktif", slider.is_active ? "eyeSlash" : "eye", () => actions.toggleSlider(slider), state.togglingId === slider.id);
  const up = iconButton("Naik", "arrowLeft", () => actions.moveSlider(slider, "up", allSliders), state.reorderingId === slider.id);
  const down = iconButton("Turun", "arrowRight", () => actions.moveSlider(slider, "down", allSliders), state.reorderingId === slider.id);
  const remove = iconButton(state.deletingId === slider.id ? "..." : "Arsip", "trash", () => actions.deleteSlider(slider), state.deletingId === slider.id);
  wrap.append(preview, edit, toggle, up, down, remove);
  return wrap;
}

function syncOpenModal(state, actions, sliders) {
  const modal = state.modal;
  if (!modal) {
    closeModal({ notify: false });
    return;
  }
  const slider = modal.id ? sliders.find((item) => Number(item.id) === Number(modal.id)) : null;

  if (modal.type === "preview") {
    openModal(previewModal(slider, actions), {
      key: `adsl-preview-${modal.id}`,
      title: "Preview Slider",
      description: "Preview memakai template predefined yang sama dengan halaman publik/buyer.",
      size: "xl",
      footer: null,
      panelId: "adsl_preview_modal",
    panelClassName: "md:min-w-[900px]",
    closeButtonId: "adsl_preview_modal_close_button",
    onClose: actions.closeModal,
    preserveContentOnSameSignature: true,
    contentSignature: `preview|${slider?.id ?? "missing"}|${slider?.updated_at ?? ""}`,
  });
    return;
  }

  openModal(sliderForm({
    slider,
    draftOverride: modal.draft ?? null,
    mode: modal.mode,
    saving: state.saving,
    onUploadImage: actions.uploadImage,
    onSubmit: (payload) => actions.saveSlider(payload, modal.mode, slider?.id),
    onCancel: actions.closeModal,
  }), {
    key: `adsl-form-${modal.mode}-${slider?.id ?? "new"}`,
    title: modal.mode === "edit" ? "Edit Slider" : "Tambah Slider",
    description: "Konten HTML memakai template predefined. Admin hanya mengatur teks, gambar, CTA, jadwal, posisi, dan urutan.",
    size: "xl",
    footer: null,
    panelId: "adsl_form_modal",
    panelClassName: "md:min-w-[900px]",
    closeButtonId: "adsl_form_modal_close_button",
    onClose: actions.closeModal,
    preserveContentOnSameSignature: true,
    contentSignature: [
      modal.mode,
      slider?.id ?? "new",
      state.saving ? "saving" : "idle",
      state.uploading ? "uploading" : "upload-idle",
      state.error ?? "",
      state.uploadError ?? "",
    ].join("|"),
  });
}

function previewModal(slider, actions) {
  const wrap = document.createElement("section");
  wrap.className = "grid gap-4";
  wrap.append(SliderBanner({
    sliders: slider ? [slider] : [],
    idPrefix: "adsl_preview",
    context: slider?.position_key === "buyer_home" ? "buyer" : "public",
    onNavigate: actions.closeModal,
  }) ?? textNode("p", "text-xs text-gray-500", "Slider tidak ditemukan."));
  const close = Button({ label: "Tutup", variant: "secondary", onClick: actions.closeModal });
  close.type = "button";
  wrap.append(close);
  return wrap;
}

function sliderForm({ slider, draftOverride = null, mode, saving, onUploadImage, onSubmit, onCancel }) {
  const baseDraft = {
    code: slider?.code ?? "",
    title: slider?.title ?? "",
    description: slider?.description ?? slider?.body_text ?? "",
    image_url: slider?.image_url ?? "",
    image_alt: slider?.image_alt ?? "",
    template_key: slider?.template_key ?? "elegant_gradient",
    position_key: slider?.position_key ?? "public_home",
    animation_key: slider?.animation_key ?? "fade",
    cta_text: slider?.cta_text ?? "",
    cta_url: slider?.cta_url ?? "",
    start_at: toDateTimeLocal(slider?.start_at),
    end_at: toDateTimeLocal(slider?.end_at),
    is_active: slider?.is_active ?? true,
    sort_order: slider?.sort_order ?? 10,
  };
  const draft = {
    ...baseDraft,
    ...(draftOverride ?? {}),
    start_at: toDateTimeLocal(draftOverride?.start_at ?? baseDraft.start_at),
    end_at: toDateTimeLocal(draftOverride?.end_at ?? baseDraft.end_at),
  };

  const form = document.createElement("form");
  form.id = "adsl_form";
  form.className = "grid gap-5";
  const fields = document.createElement("section");
  fields.className = "grid gap-4 md:grid-cols-2";
  const code = inputControl("adsl_code_input", "code", draft.code, "Auto jika kosong");
  const title = inputControl("adsl_title_input", "title", draft.title, "Judul slider");
  const template = selectControl("adsl_template_input", "template_key", draft.template_key, sliderTemplateOptions().map((item) => [item.value, item.label]));
  const position = selectControl("adsl_position_key_input", "position_key", draft.position_key, sliderPositionOptions().map((item) => [item.value, item.label]));
  const animation = selectControl("adsl_animation_key_input", "animation_key", draft.animation_key, sliderAnimationOptions().map((item) => [item.value, item.label]));
  const sortOrder = inputControl("adsl_sort_order_input", "sort_order", draft.sort_order, "10", "number");
  fields.append(labelWrap("Code", code), labelWrap("Title", title), labelWrap("Template", template), labelWrap("Position", position), labelWrap("Animation", animation), labelWrap("Sort Order", sortOrder));

  const description = textareaControl("adsl_description_input", "description", draft.description, "Deskripsi ringkas slider");
  const imageUrl = inputControl("adsl_image_url_input", "image_url", draft.image_url, "/storage/uploads/sliders/...");
  const imageAlt = inputControl("adsl_image_alt_input", "image_alt", draft.image_alt, "Alt text gambar");
  const ctaText = inputControl("adsl_cta_text_input", "cta_text", draft.cta_text, "Lihat Koleksi");
  const ctaUrl = inputControl("adsl_cta_url_input", "cta_url", draft.cta_url, "#/buyer/cars atau /public");
  const startAt = inputControl("adsl_start_at_input", "start_at", draft.start_at, "", "datetime-local");
  const endAt = inputControl("adsl_end_at_input", "end_at", draft.end_at, "", "datetime-local");
  const active = checkboxControl("adsl_is_active_input", "is_active", draft.is_active, "Aktif");

  const upload = uploadSection({
    initialUrl: draft.image_url,
    onUploaded: (url) => {
      draft.image_url = url;
      imageUrl.value = url;
      renderTemplateLivePreview(templatePreview.live, collectPreviewDraft());
      syncFormValidity();
    },
    onUploadImage,
  });

  const misc = document.createElement("section");
  misc.className = "grid gap-4 md:grid-cols-2";
  misc.append(labelWrap("Image URL", imageUrl), labelWrap("Image Alt", imageAlt), labelWrap("CTA Text", ctaText), labelWrap("CTA URL", ctaUrl), labelWrap("Start At", startAt), labelWrap("End At", endAt), active);

  const collectPayload = () => ({
    id: slider?.id ?? "preview",
    code: code.value.trim(),
    title: title.value.trim(),
    description: description.value.trim(),
    image_url: imageUrl.value.trim(),
    image_alt: imageAlt.value.trim(),
    template_key: template.value,
    position_key: position.value,
    animation_key: animation.value,
    cta_text: ctaText.value.trim() || "Lihat Detail",
    cta_url: ctaUrl.value.trim() || "#/public",
    sort_order: Number(sortOrder.value || 10),
    is_active: active.querySelector("input")?.checked ?? true,
  });

  const collectPreviewDraft = () => {
    const payload = collectPayload();
    return {
      ...payload,
      title: payload.title || "Preview Slider",
      description: payload.description || "Deskripsi slider akan tampil di area ini.",
      cta_text: payload.cta_text || "Lihat Detail",
      cta_url: payload.cta_url || "#/public",
      is_active: true,
    };
  };

  const templatePreview = templatePreviewSection({
    select: template,
    getDraft: collectPreviewDraft,
  });

  [template, title, description, imageUrl, imageAlt, position, animation, ctaText, ctaUrl].forEach((control) => {
    control.addEventListener("input", () => renderTemplateLivePreview(templatePreview.live, collectPreviewDraft()));
    control.addEventListener("change", () => renderTemplateLivePreview(templatePreview.live, collectPreviewDraft()));
  });

  const notice = document.createElement("section");
  notice.className = "rounded-[1.25rem] border border-[color-mix(in_srgb,var(--pb-warning)_26%,white)] bg-[color-mix(in_srgb,var(--pb-warning)_8%,white)] px-4 py-3 text-xs font-semibold leading-6 text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]";
  notice.textContent = "HTML slider dibatasi ke template predefined. Tidak ada input HTML custom, script, onclick, iframe, atau javascript URL.";

  const actions = document.createElement("section");
  actions.className = "flex flex-col-reverse gap-2 border-t border-[var(--pb-card-border)] pt-4 sm:flex-row sm:justify-end";
  const cancel = Button({ label: "Batal", variant: "secondary", disabled: saving, onClick: onCancel });
  cancel.type = "button";
  const submit = Button({ label: saving ? "Menyimpan..." : "Simpan Slider", disabled: saving });
  submit.type = "submit";
  submit.prepend(createIcon("circleCheck", { className: "block h-4 w-4 leading-none" }));
  actions.append(cancel, submit);

  const validationPanel = textNode("p", "hidden rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-warning)_26%,white)] bg-[color-mix(in_srgb,var(--pb-warning)_8%,white)] px-3 py-2 text-xs font-semibold text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]", "");
  const syncFormValidity = () => {
    const message = validateSliderPayload(collectPayload());
    validationPanel.className = message
      ? "rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-warning)_26%,white)] bg-[color-mix(in_srgb,var(--pb-warning)_8%,white)] px-3 py-2 text-xs font-semibold text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]"
      : "hidden rounded-[1rem] border border-[color-mix(in_srgb,var(--pb-warning)_26%,white)] bg-[color-mix(in_srgb,var(--pb-warning)_8%,white)] px-3 py-2 text-xs font-semibold text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]";
    validationPanel.textContent = message;
    submit.disabled = Boolean(saving || message);
  };

  [code, title, description, imageUrl, imageAlt, template, position, animation, ctaText, ctaUrl, startAt, endAt, sortOrder].forEach((control) => {
    control.addEventListener("input", syncFormValidity);
    control.addEventListener("change", syncFormValidity);
  });
  active.querySelector("input")?.addEventListener("change", syncFormValidity);

  form.append(templatePreview.section, notice, fields, labelWrap("Description", description), upload, misc, validationPanel, actions);
  renderTemplateLivePreview(templatePreview.live, collectPreviewDraft());
  syncFormValidity();
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const payload = collectPayload();
    const message = validateSliderPayload(payload);
    if (message) {
      syncFormValidity();
      showToast(message, { type: "warning" });
      return;
    }
    onSubmit?.(payload);
  });
  return form;
}

function templatePreviewSection({ select, getDraft }) {
  const section = document.createElement("section");
  section.id = "adsl_template_preview_section";
  section.className = "grid gap-4 rounded-[1.5rem] border border-[var(--pb-border)] bg-white/82 p-4 shadow-sm";

  section.append(
    textNode("p", "text-xs font-black text-gray-950", "Pilih Template"),
    textNode("p", "text-xs leading-6 text-gray-500", "Template bisa dipilih dari preview visual. Live preview di bawah mengikuti teks, gambar, CTA, dan animasi yang sedang diedit."),
  );

  const grid = document.createElement("section");
  grid.className = "grid gap-3 lg:grid-cols-3";
  const cards = new Map();
  sliderTemplateOptions().forEach((option) => {
    const card = templatePreviewCard(option, select.value === option.value, () => {
      select.value = option.value;
      cards.forEach((node, key) => syncTemplatePreviewCard(node, key === option.value));
      renderTemplateLivePreview(live, getDraft());
    });
    cards.set(option.value, card);
    grid.append(card);
  });

  select.addEventListener("change", () => {
    cards.forEach((node, key) => syncTemplatePreviewCard(node, key === select.value));
  });

  const live = document.createElement("section");
  live.id = "adsl_template_live_preview_section";
  live.className = "grid gap-3";

  section.append(grid, live);
  return { section, live };
}

function templatePreviewCard(option, active, onSelect) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = templatePreviewCardClassName(active);
  button.dataset.templateKey = option.value;
  button.setAttribute("aria-pressed", active ? "true" : "false");
  button.addEventListener("click", onSelect);

  const visual = document.createElement("section");
  visual.className = `h-28 overflow-hidden rounded-[1rem] border border-[var(--pb-card-border)] ${templatePreviewVisualClass(option.value)}`;
  visual.append(templatePreviewMock(option.value));

  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-1 text-left";
  copy.append(
    textNode("span", "text-xs font-black text-gray-950", option.label),
    textNode("span", "text-[10px] font-semibold text-gray-500", templatePreviewDescription(option.value)),
  );

  button.append(visual, copy);
  return button;
}

function syncTemplatePreviewCard(card, active) {
  card.className = templatePreviewCardClassName(active);
  card.setAttribute("aria-pressed", active ? "true" : "false");
}

function templatePreviewCardClassName(active) {
  return active
    ? "grid min-w-0 gap-3 rounded-[1.25rem] border border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-[var(--pb-surface-muted)] p-3 text-left shadow-[0_14px_34px_rgba(30,129,176,0.16)] ring-2 ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)] transition"
    : "grid min-w-0 gap-3 rounded-[1.25rem] border border-[var(--pb-border)] bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] hover:shadow-md";
}

function templatePreviewVisualClass(templateKey) {
  if (templateKey === "glassmorphism") {
    return "bg-[linear-gradient(135deg,#f8fafc,#f5ece1,#e0eff7)]";
  }
  if (templateKey === "minimal_product") {
    return "bg-white";
  }
  if (templateKey === "full_image") {
    return "bg-[linear-gradient(135deg,#111827,#334155)]";
  }
  return "bg-[linear-gradient(135deg,#eab676,#c53030,#111827)]";
}

function templatePreviewMock(templateKey) {
  const mock = document.createElement("section");
  mock.className = "relative h-full w-full p-3";

  const image = document.createElement("span");
  image.className = "absolute bottom-3 right-3 grid h-14 w-20 place-items-center rounded-xl bg-white/28 text-white shadow-sm";
  image.append(createIcon("car", { className: "h-6 w-6" }));

  const lines = document.createElement("section");
  lines.className = "relative z-10 grid max-w-[72%] gap-2";
  const pill = document.createElement("span");
  pill.className = templateKey === "minimal_product" ? "h-4 w-20 rounded-full bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)]" : "h-4 w-20 rounded-full bg-white/30";
  const title = document.createElement("span");
  title.className = templateKey === "minimal_product" ? "h-5 w-28 rounded-full bg-gray-900" : "h-5 w-28 rounded-full bg-white/78";
  const body = document.createElement("span");
  body.className = templateKey === "minimal_product" ? "h-3 w-24 rounded-full bg-gray-200" : "h-3 w-24 rounded-full bg-white/36";
  lines.append(pill, title, body);

  if (templateKey === "glassmorphism") {
    const glass = document.createElement("span");
    glass.className = "absolute inset-x-4 bottom-4 top-4 rounded-xl border border-[var(--pb-card-border)] bg-white/42 backdrop-blur";
    mock.append(glass);
    image.className = "absolute bottom-5 right-5 grid h-12 w-16 place-items-center rounded-xl bg-white/72 text-[var(--pb-brand-secondary)] shadow-sm";
  }

  if (templateKey === "minimal_product") {
    image.className = "absolute inset-y-3 right-3 grid w-[42%] place-items-center rounded-xl bg-[var(--pb-surface-muted)] text-[var(--pb-brand-secondary)] shadow-sm";
  }

  if (templateKey === "full_image") {
    const full = document.createElement("span");
    full.className = "absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#0f172a,#475569)] text-white";
    full.append(createIcon("image", { className: "h-7 w-7 opacity-80" }));
    mock.append(full);
    return mock;
  }

  mock.append(lines, image);
  return mock;
}

function templatePreviewDescription(templateKey) {
  if (templateKey === "glassmorphism") {
    return "Glass card overlay dan floating image.";
  }
  if (templateKey === "minimal_product") {
    return "Split image dan teks produk bersih.";
  }
  if (templateKey === "full_image") {
    return "Area kosong tanpa teks, full gambar.";
  }
  return "Gradient premium dengan CTA glow.";
}

function renderTemplateLivePreview(host, slider) {
  if (!host) return;
  host.replaceChildren(
    textNode("p", "text-xs font-black text-gray-950", "Live Preview"),
    SliderBanner({
      sliders: [slider],
      idPrefix: "adsl_live",
      context: slider.position_key === "buyer_home" ? "buyer" : "public",
      onNavigate: () => {},
    }),
  );
}

function uploadSection({ initialUrl, onUploaded, onUploadImage }) {
  const section = document.createElement("section");
  section.id = "adsl_upload_section";
  section.className = "grid gap-4 rounded-[1.5rem] border border-dashed border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-[var(--pb-surface-muted)] p-4 md:grid-cols-[160px_minmax(0,1fr)] md:items-center";
  const preview = document.createElement("section");
  preview.className = "grid aspect-[16/10] w-full place-items-center overflow-hidden rounded-[1.25rem] border border-white bg-white text-[var(--pb-brand-secondary)] shadow-sm";
  renderUploadPreview(preview, initialUrl);
  const copy = document.createElement("section");
  copy.className = "grid min-w-0 gap-3";
  copy.append(textNode("p", "text-xs font-black text-gray-950", "Upload Image"), textNode("p", "text-xs leading-6 text-gray-500", "Drag & drop atau pilih JPG, PNG, WebP. Maksimal 5MB."));
  const status = textNode("p", "text-xs font-semibold text-gray-600", "");
  const input = document.createElement("input");
  input.id = "adsl_image_file_input";
  input.type = "file";
  input.accept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
  input.className = "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-white px-3 py-2 text-xs font-semibold text-gray-700";
  const uploadFile = async (file) => {
    if (!file) return;
    try {
      validateImageFile(file);
      renderUploadPreview(preview, URL.createObjectURL(file));
      status.textContent = "Mengupload gambar...";
      const asset = await onUploadImage?.(file);
      const url = asset?.url ?? asset?.path ?? "";
      if (url) {
        onUploaded?.(url);
        renderUploadPreview(preview, url);
        status.textContent = "Gambar berhasil diupload.";
      }
    } catch (error) {
      status.textContent = error.message || "Upload gagal.";
    }
  };
  input.addEventListener("change", () => uploadFile(input.files?.[0] ?? null));
  section.addEventListener("dragover", (event) => {
    event.preventDefault();
    section.classList.add("bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)]");
  });
  section.addEventListener("dragleave", () => section.classList.remove("bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)]"));
  section.addEventListener("drop", (event) => {
    event.preventDefault();
    section.classList.remove("bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)]");
    uploadFile(event.dataTransfer?.files?.[0] ?? null);
  });
  copy.append(input, status);
  section.append(preview, copy);
  return section;
}

function renderUploadPreview(preview, url) {
  preview.replaceChildren();
  if (url) {
    const image = document.createElement("img");
    image.src = normalizeImageUrl(url);
    image.alt = "Preview slider";
    image.className = "h-full w-full object-cover";
    preview.append(image);
    return;
  }
  preview.append(createIcon("upload", { className: "h-7 w-7" }));
}

function patchAdminSliders(slider) {
  if (!slider) return;
  const current = currentAdminSliders();
  const exists = current.some((item) => Number(item.id) === Number(slider.id));
  const sliders = (exists ? current.map((item) => Number(item.id) === Number(slider.id) ? slider : item) : [slider, ...current])
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  patchAdminSlidersPayload({ sliders, meta: { total: sliders.length } });
}

function removeAdminSlider(sliderId) {
  const sliders = currentAdminSliders().filter((item) => Number(item.id) !== Number(sliderId));
  patchAdminSlidersPayload({ sliders, meta: { total: sliders.length } });
}

function patchAdminSlidersPayload(payload) {
  const data = { sliders: normalizeSliders(payload?.sliders ?? []), meta: payload?.meta ?? {} };
  appStore.patchState("working.adminSliders.sliders", { data, hydratedAt: Date.now() }, "admin-sliders:working-sync");
  writePreloadSnapshot("admin", "sliders", data, { ttl: 90, version: "admin-sliders-v1", source: "admin-sliders:snapshot-sync" });
}

function currentAdminSliders() {
  const working = appStore.get("working.adminSliders.sliders.data", null);
  const snapshot = appStore.get("snapshot.admin.sliders.data", null);
  return normalizeSliders((working ?? snapshot ?? { sliders: [] }).sliders ?? []);
}

function invalidateSliderSnapshots() {
  markPreloadSnapshotsStale([
    { role: "public", key: "slidersPublicHome" },
    { role: "public", key: "slidersLandingHero" },
    { role: "buyer", key: "slidersLandingPage" },
  ], { source: "admin-sliders:public-buyer-stale" });
}

function filterSliders(sliders, query) {
  const keyword = String(query.keyword ?? "").trim().toLowerCase();
  const position = String(query.position ?? "");
  const status = String(query.status ?? "");
  return sliders.filter((slider) => {
    const haystack = [slider.code, slider.title, slider.description, slider.body_text, slider.cta_text].filter(Boolean).join(" ").toLowerCase();
    if (keyword && !haystack.includes(keyword)) return false;
    if (position && slider.position_key !== position) return false;
    if (status === "active" && !slider.is_active) return false;
    if (status === "inactive" && slider.is_active) return false;
    return true;
  });
}

function normalizeSliders(sliders) {
  return (Array.isArray(sliders) ? sliders : []).filter(Boolean).sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
}

function paginate(items, query) {
  const pageSize = Math.max(1, Number(query.pageSize || 10));
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, Number(query.page || 1)), totalPages);
  return {
    page,
    pageSize,
    items: items.slice((page - 1) * pageSize, page * pageSize),
  };
}

function createQuery(query = {}) {
  return {
    keyword: query.keyword ?? "",
    position: query.position ?? "",
    status: query.status ?? "",
    page: Math.max(1, Number(query.page || 1)),
    pageSize: Math.max(1, Number(query.page_size || query.pageSize || 10)),
  };
}

function syncUrl(query) {
  const params = new URLSearchParams();
  if (query.keyword) params.set("keyword", query.keyword);
  if (query.position) params.set("position", query.position);
  if (query.status) params.set("status", query.status);
  if (Number(query.page) > 1) params.set("page", String(query.page));
  if (Number(query.pageSize) !== 10) params.set("page_size", String(query.pageSize));
  const url = new URL(window.location.href);
  url.hash = params.toString() ? `#/admin/sliders?${params.toString()}` : "#/admin/sliders";
  window.history.replaceState(window.history.state, "", url);
}

function validateImageFile(file) {
  if (!file) throw new Error("File gambar wajib dipilih.");
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const name = String(file.name ?? "").toLowerCase();
  if (!allowedTypes.includes(file.type) || !allowedExtensions.some((ext) => name.endsWith(ext))) {
    throw new Error("Format gambar harus jpg, jpeg, png, atau webp.");
  }
  if (Number(file.size ?? 0) > 5 * 1024 * 1024) {
    throw new Error("Ukuran gambar maksimal 5MB.");
  }
}

function validateSliderPayload(payload) {
  const title = String(payload?.title ?? "").trim();
  const imageUrl = String(payload?.image_url ?? "").trim();
  const templateKey = String(payload?.template_key ?? "");
  const positionKey = String(payload?.position_key ?? "");
  const animationKey = String(payload?.animation_key ?? "");
  const sortOrder = Number(payload?.sort_order ?? 0);
  const ctaUrl = String(payload?.cta_url ?? "").trim();
  const startAt = String(payload?.start_at ?? "").trim();
  const endAt = String(payload?.end_at ?? "").trim();

  if (!title) {
    return "Judul slider wajib diisi sebelum disimpan.";
  }

  if (!imageUrl) {
    return "Gambar slider wajib diisi lewat upload atau Image URL sebelum disimpan.";
  }

  if (!sliderTemplateOptions().some((item) => item.value === templateKey)) {
    return "Pilih template slider yang valid.";
  }

  if (!sliderPositionOptions().some((item) => item.value === positionKey)) {
    return "Pilih posisi slider yang valid.";
  }

  if (!sliderAnimationOptions().some((item) => item.value === animationKey)) {
    return "Pilih animasi slider yang valid.";
  }

  if (!Number.isFinite(sortOrder) || sortOrder < 0) {
    return "Sort order harus berupa angka 0 atau lebih.";
  }

  if (ctaUrl && !isAllowedCtaUrl(ctaUrl)) {
    return "CTA URL harus berupa http(s), hash route #/..., atau path relatif yang aman.";
  }

  if (startAt && endAt && Date.parse(endAt) < Date.parse(startAt)) {
    return "Schedule End tidak boleh lebih awal dari Schedule Start.";
  }

  return "";
}

function isAllowedCtaUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) return true;
  if (/^https?:\/\//i.test(value)) return true;
  if (value.startsWith("#/")) return !/javascript:/i.test(value);
  return /^\/(?!\/)[A-Za-z0-9._~!$&'()*+,;=:@/%-]*$/.test(value) && !/javascript:/i.test(value);
}

function apiErrorMessage(error, fallback) {
  const message = String(error?.message ?? "").trim();
  const errors = error?.errors ?? error?.response?.errors ?? null;
  const detail = firstErrorMessage(errors);

  if (message && detail && detail !== message) {
    return `${message} ${detail}`;
  }

  return message || detail || fallback;
}

function firstErrorMessage(errors) {
  if (!errors) return "";
  if (Array.isArray(errors)) {
    const first = errors.find(Boolean);
    if (typeof first === "string") return first;
    if (first && typeof first === "object") return first.message || Object.values(first).find(Boolean) || "";
    return "";
  }
  if (typeof errors === "object") {
    const value = Object.values(errors).flat().find(Boolean);
    return typeof value === "string" ? value : "";
  }
  return "";
}

function positionLabel(value) {
  return sliderPositionOptions().find((item) => item.value === value)?.label ?? value ?? "-";
}

function scheduleLabel(slider) {
  return `${slider.start_at || "langsung"} - ${slider.end_at || "terbuka"}`;
}

function errorPanel(message) {
  const section = document.createElement("section");
  section.className = "rounded-[1.25rem] border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-xs font-semibold text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
  section.textContent = message;
  return section;
}

function inputControl(id, name, value, placeholder, type = "text") {
  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = type;
  input.value = value ?? "";
  input.placeholder = placeholder;
  input.className = controlClassName();
  return input;
}

function textareaControl(id, name, value, placeholder) {
  const input = document.createElement("textarea");
  input.id = id;
  input.name = name;
  input.value = value ?? "";
  input.placeholder = placeholder;
  input.rows = 4;
  input.className = `${controlClassName()} resize-y`;
  return input;
}

function selectControl(id, name, value, options) {
  const select = document.createElement("select");
  select.id = id;
  select.name = name;
  select.className = controlClassName();
  options.forEach(([optionValue, label]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = label;
    option.selected = optionValue === value;
    select.append(option);
  });
  return select;
}

function checkboxControl(id, name, checked, label) {
  const wrap = document.createElement("label");
  wrap.className = "inline-flex min-h-11 items-center gap-3 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2 text-xs font-bold text-gray-700";
  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = "checkbox";
  input.checked = Boolean(checked);
  input.className = "h-4 w-4";
  wrap.append(input, document.createTextNode(label));
  return wrap;
}

function labelWrap(label, control) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1 text-xs font-semibold text-gray-700";
  wrap.textContent = label;
  wrap.append(control);
  return wrap;
}

function iconButton(label, icon, onClick, disabled = false) {
  const button = Button({ label, variant: "secondary", onClick, disabled });
  button.type = "button";
  button.prepend(createIcon(icon, { className: "block h-4 w-4 leading-none" }));
  return button;
}

function iconBox(icon) {
  const box = document.createElement("span");
  box.className = "grid h-10 w-10 place-items-center rounded-full bg-[var(--pb-brand-primary)] text-white shadow-[var(--pb-shadow-soft)]";
  box.append(createIcon(icon, { className: "block h-4 w-4 leading-none" }));
  return box;
}

function controlClassName() {
  return "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
}

function normalizeImageUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/.test(value) || value.startsWith("/")) return value;
  return `/${value}`;
}

function toDateTimeLocal(value) {
  if (!value) return "";
  return String(value).replace(" ", "T").slice(0, 16);
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
