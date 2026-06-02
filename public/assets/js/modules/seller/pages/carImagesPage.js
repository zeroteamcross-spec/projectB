import { createPageLifecycle } from "../../../core/lifecycle.js";
import { imagesResource } from "../../../resources/imagesResource.js";
import { appStore } from "../../../state/store.js";
import { markPreloadSnapshotsStale } from "../../../state/sync/sharedMutationSync.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { galleryLightboxModalOptions } from "../../../ui/composites/galleryLightbox.js";
import { Button } from "../../../ui/primitives/button.js";
import { confirmDialog } from "../../../ui/primitives/confirmDialog.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { Skeleton } from "../../../ui/primitives/skeleton.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { sellerState } from "../state/sellerState.js";
import { SellerImageGalleryPreviewModal } from "../components/sellerImageGalleryPreviewModal.js";
import { SellerImageUploadPanel } from "../components/sellerImageUploadPanel.js";
import { SellerImageUploadQueueModal } from "../components/sellerImageUploadQueueModal.js";
import { SellerImagesList } from "../components/sellerImagesList.js";

const RUNTIME_KEY = "sellerCarImages";
const DEFAULT_RUNTIME = {
  uploading: false,
  busyImageId: null,
  error: "",
  notice: "",
  queueVersion: 0,
  queueModalOpen: false,
  queueAutoStartVersion: 0,
  showGallery: false,
  previewOpen: false,
  previewIndex: 0,
};

const EDITOR_MODAL_KEY = "seller-image-editor-modal";
const QUEUE_MODAL_KEY = "seller-image-upload-queue-modal";
const PREVIEW_MODAL_KEY = "seller-image-gallery-preview-modal";
const MAX_IMAGE_SIZE = 5242880;
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export function SellerCarImagesPage() {
  let root = null;
  let unsubscribe = null;
  let uploadQueue = [];
  let lastAutoStartVersion = 0;

  const touchQueue = () => setRuntime({ queueVersion: Date.now(), error: "", notice: "" });

  function addFiles(files = []) {
    const nextFiles = Array.from(files).filter(Boolean);
    if (!nextFiles.length) {
      return;
    }
    const accepted = [];

    nextFiles.forEach((file) => {
      const validation = validateImageFile(file);
      if (validation) {
        accepted.push(createQueueItem(file, { status: "invalid", error: validation }));
        return;
      }
      accepted.push(createQueueItem(file));
    });

    uploadQueue = [...uploadQueue, ...accepted];
    const hasInvalid = accepted.some((item) => item.status === "invalid");
    const nextVersion = Date.now();
    setRuntime({
      queueVersion: nextVersion,
      queueModalOpen: true,
      queueAutoStartVersion: hasInvalid ? 0 : nextVersion,
      error: hasInvalid ? "Sebagian file tidak valid. Cek detail pada Queue Upload." : "",
      notice: "",
    });
    if (hasInvalid) {
      showToast("Sebagian file tidak valid.", { type: "error" });
    }
  }

  function removeQueueItem(queueId) {
    const item = uploadQueue.find((entry) => entry.id === queueId);
    revokeQueueItem(item);
    uploadQueue = uploadQueue.filter((entry) => entry.id !== queueId);
    touchQueue();
  }

  function closeQueueModal() {
    if (runtimeState().uploading) {
      return;
    }
    uploadQueue.forEach(revokeQueueItem);
    uploadQueue = [];
    lastAutoStartVersion = 0;
    setRuntime({
      queueModalOpen: false,
      queueVersion: Date.now(),
      queueAutoStartVersion: 0,
      error: "",
      notice: "",
    });
    closeModal({ notify: false });
  }

  return createPageLifecycle({
    mount({ router, params }) {
      ensureRuntime();
      root = document.createElement("div");
      render(root, router, params, {
        getQueue: () => uploadQueue,
        addFiles,
        removeQueueItem,
        closeQueueModal,
        markAutoStarted: (version) => {
          lastAutoStartVersion = version;
        },
        hasAutoStarted: (version) => lastAutoStartVersion === version,
        touchQueue,
      });
      return root;
    },
    hydrate({ router, params }) {
      render(root, router, params, {
        getQueue: () => uploadQueue,
        addFiles,
        removeQueueItem,
        closeQueueModal,
        markAutoStarted: (version) => {
          lastAutoStartVersion = version;
        },
        hasAutoStarted: (version) => lastAutoStartVersion === version,
        touchQueue,
      });
    },
    bindEvents({ router, params }) {
      unsubscribe = appStore.subscribe(() => render(root, router, params, {
        getQueue: () => uploadQueue,
        addFiles,
        removeQueueItem,
        closeQueueModal,
        markAutoStarted: (version) => {
          lastAutoStartVersion = version;
        },
        hasAutoStarted: (version) => lastAutoStartVersion === version,
        touchQueue,
      }));
      return () => unsubscribe?.();
    },
    dispose() {
      closeModal({ notify: false });
      unsubscribe = null;
      uploadQueue.forEach(revokeQueueItem);
      uploadQueue = [];
      appStore.destroyRuntimeState(RUNTIME_KEY);
    },
  });
}

function render(root, router, params, queueApi) {
  if (!root) {
    return;
  }

  const carId = params.id;
  const carNode = appStore.get("working.sellerCarImages.car", null);
  const imagesNode = appStore.get("working.sellerCarImages.images", null);
  const car = carNode?.data ?? sellerState.working("sellerCarImages", "car", null);
  const images = imagesNode?.data ?? sellerState.working("sellerCarImages", "images", []);
  const hasHydrated = Boolean(carNode?.hydratedAt) && Boolean(imagesNode?.hydratedAt);
  const runtime = runtimeState();

  const title = car
    ? [car.brand_name, car.model_name, car.sub_model_name].filter(Boolean).join(" ")
    : "Gambar Mobil";

  const notice = document.createElement("p");
  notice.className = "mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700";
  notice.textContent = runtime.notice;
  notice.hidden = !runtime.notice;

  const backButton = Button({ label: "Kembali ke Mobil Saya", variant: "secondary", onClick: () => router?.navigate("/seller/cars") });
  backButton.id = "slri_back_to_cars_button";
  backButton.prepend(createIcon("arrowLeft", { className: "h-4 w-4" }));

  const header = SectionHeader({
    title,
    description: "Kelola galeri mobil, cover image, dan kesiapan visual listing dari satu tempat.",
    action: backButton,
  });

  if (!hasHydrated) {
    root.replaceChildren(pageShell([header, Skeleton({ lines: 8 })]));
    return;
  }

  if (!car) {
    root.replaceChildren(pageShell([
      header,
      EmptyState({
        title: "Mobil tidak ditemukan",
        description: "Pastikan gambar dibuka dari list mobil seller yang masih tersedia.",
      }),
    ]));
    return;
  }

  root.replaceChildren(pageShell([
    header,
    notice,
    summaryPanel({ images, car }),
    SellerImageUploadPanel({
      uploading: runtime.uploading,
      error: runtime.error,
      onFilesChange: queueApi.addFiles,
    }),
    galleryTogglePanel({
      images,
      showGallery: runtime.showGallery,
      onToggle: () => setRuntime({ showGallery: !runtime.showGallery }),
    }),
    runtime.showGallery
      ? SellerImagesList({
          images,
          busyImageId: runtime.busyImageId,
          onPreview: (image) => openGalleryPreview(image),
          onSetCover: (image) => setCover(carId, image),
          onDelete: (image) => deleteImage(carId, image),
          onMoveUp: (image) => reorderImage(carId, image, -1),
          onMoveDown: (image) => reorderImage(carId, image, 1),
        })
      : document.createDocumentFragment(),
  ]));

  syncQueueModal({ carId, queueApi, runtime });
  syncGalleryPreviewModal(images, runtime);
}

function pageShell(children = []) {
  const section = document.createElement("section");
  section.id = "slri_page_section";
  section.className = "grid min-w-0 gap-5 animate-[pbFadeIn_160ms_ease-out]";
  section.setAttribute("data-ds", "seller.images.page");
  section.append(...children);
  return section;
}

function summaryPanel({ images = [], car = null } = {}) {
  const section = document.createElement("section");
  section.id = "slri_summary_section";
  section.className = "grid gap-3 rounded-[var(--pb-radius-2xl)] border border-[color-mix(in_srgb,var(--pb-brand-primary)_18%,white)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--pb-brand-primary)_10%,white),var(--pb-surface-card),color-mix(in_srgb,var(--pb-brand-accent)_10%,white))] p-4 shadow-[var(--pb-shadow-card)] md:grid-cols-3";
  section.setAttribute("data-ds", "seller.images.summary");

  const total = images.length;
  const cover = images.find((image) => image.is_cover);
  const carName = car ? [car.brand_name, car.model_name].filter(Boolean).join(" ") : "-";

  section.append(
    summaryMetric({
      icon: "image",
      label: "Total gambar",
      value: `${total} foto`,
      tone: "text-[var(--pb-brand-secondary)]",
    }),
    summaryMetric({
      icon: "star",
      label: "Cover listing",
      value: cover ? `Urutan ${cover.sort_order ?? 1}` : "Belum dipilih",
      tone: cover ? "text-[var(--pb-success)]" : "text-[var(--pb-warning)]",
    }),
    summaryMetric({
      icon: "car",
      label: "Unit",
      value: carName || "-",
      tone: "text-[var(--pb-text)]",
    })
  );

  return section;
}

function summaryMetric({ icon, label, value, tone }) {
  const item = document.createElement("div");
  item.className = "flex min-w-0 items-center gap-3 rounded-[var(--pb-radius-xl)] border border-white/70 bg-white/70 p-3 shadow-[var(--pb-shadow-soft)]";

  const iconWrap = document.createElement("span");
  iconWrap.className = `grid h-10 w-10 shrink-0 place-items-center rounded-[var(--pb-radius-xl)] bg-white ${tone}`;
  iconWrap.append(createIcon(icon, { className: "h-4 w-4" }));

  const copy = document.createElement("div");
  copy.className = "min-w-0";
  const title = document.createElement("p");
  title.className = "text-xs font-semibold uppercase text-[var(--pb-text-muted)]";
  title.textContent = label;
  const text = document.createElement("p");
  text.className = "truncate text-sm font-bold text-[var(--pb-text)]";
  text.textContent = value;
  copy.append(title, text);

  item.append(iconWrap, copy);
  return item;
}

function galleryTogglePanel({ images = [], showGallery = false, onToggle = null } = {}) {
  const section = document.createElement("section");
  section.id = "slri_gallery_toggle_section";
  section.className = "flex min-w-0 flex-col gap-3 rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-4 shadow-[var(--pb-shadow-soft)] sm:flex-row sm:items-center sm:justify-between";

  const copy = document.createElement("div");
  copy.className = "min-w-0";
  const title = document.createElement("h2");
  title.className = "text-base font-black text-[var(--pb-text)]";
  title.textContent = "Galeri mobil";
  const helper = document.createElement("p");
  helper.className = "mt-1 text-sm text-[var(--pb-text-muted)]";
  helper.textContent = `${images.length} gambar tersimpan`;
  copy.append(title, helper);

  const button = Button({
    label: showGallery ? "Sembunyikan galeri" : "Tampilkan galeri",
    variant: showGallery ? "secondary" : "primary",
    onClick: () => onToggle?.(),
  });
  button.id = "slri_gallery_toggle_button";
  button.prepend(createIcon(showGallery ? "eyeSlash" : "image", { className: "h-4 w-4" }));

  section.append(copy, button);
  return section;
}

function syncQueueModal({ carId, queueApi, runtime }) {
  if (!runtime.queueModalOpen) {
    return;
  }

  const activeModalKey = appStore.get("ui.modal.key", "");
  if (activeModalKey === EDITOR_MODAL_KEY || activeModalKey === PREVIEW_MODAL_KEY) {
    return;
  }

  openModal(SellerImageUploadQueueModal({
    queue: queueApi.getQueue(),
    uploading: runtime.uploading,
    onStart: () => uploadQueueItems(carId, queueApi.getQueue(), queueApi.touchQueue),
    onRetryFailed: () => uploadQueueItems(carId, queueApi.getQueue(), queueApi.touchQueue),
    onClose: queueApi.closeQueueModal,
    onEdit: (item) => openImageEditor(item, queueApi),
    onRemove: queueApi.removeQueueItem,
    onToggleCover: (item, isCover) => {
      if (isCover) {
        queueApi.getQueue().forEach((entry) => {
          entry.isCover = entry.id === item.id;
        });
        queueApi.touchQueue();
        return;
      }
      item.isCover = isCover;
      queueApi.touchQueue();
    },
  }), {
    key: QUEUE_MODAL_KEY,
    size: "xl",
    footer: null,
    panelId: "slri_queue_modal_panel_section",
    bodyId: "slri_queue_modal_body_section",
    panelClassName: "max-h-[92vh]",
  });

  if (runtime.queueAutoStartVersion && !queueApi.hasAutoStarted(runtime.queueAutoStartVersion) && !runtime.uploading) {
    queueApi.markAutoStarted(runtime.queueAutoStartVersion);
    window.setTimeout(() => uploadQueueItems(carId, queueApi.getQueue(), queueApi.touchQueue), 0);
  }
}

function syncGalleryPreviewModal(images, runtime) {
  if (!runtime.previewOpen) {
    return;
  }

  openModal(SellerImageGalleryPreviewModal({
    images,
    activeIndex: runtime.previewIndex,
    onClose: closeGalleryPreview,
    onNext: () => moveGalleryPreview(1),
    onPrevious: () => moveGalleryPreview(-1),
    onSelect: (index) => setRuntime({ previewIndex: index }),
  }), {
    ...galleryLightboxModalOptions,
    key: PREVIEW_MODAL_KEY,
    panelId: "slri_preview_modal_panel_section",
    bodyId: "slri_preview_modal_body_section",
  });
}

function openGalleryPreview(image) {
  const images = sortedImages(currentImages());
  const index = images.findIndex((item) => String(item.id) === String(image?.id));
  if (index < 0) {
    showToast("Preview gambar belum tersedia.", { type: "error" });
    return;
  }
  setRuntime({ previewOpen: true, previewIndex: index });
}

function closeGalleryPreview() {
  setRuntime({ previewOpen: false, previewIndex: 0 });
  closeModal();
}

function moveGalleryPreview(direction) {
  const images = sortedImages(currentImages());
  if (!images.length) {
    return;
  }
  const runtime = runtimeState();
  const nextIndex = (Number(runtime.previewIndex || 0) + direction + images.length) % images.length;
  setRuntime({ previewIndex: nextIndex });
}

async function uploadQueueItems(carId, queue, touchQueue) {
  const pending = queue.filter((item) => ["queued", "ready", "failed"].includes(item.status));
  if (!pending.length) {
    setRuntime({ error: "Pilih gambar terlebih dahulu.", notice: "" });
    showToast("Pilih gambar terlebih dahulu.", { type: "error" });
    return;
  }

  setRuntime({ uploading: true, error: "", notice: "" });
  let successCount = 0;
  let failedCount = 0;

  for (const item of pending) {
    item.status = "uploading";
    item.error = "";
    item.progress = 0;
    touchQueue();

    try {
      const image = await imagesResource.uploadWithProgress(carId, item.file, {
        isCover: item.isCover,
        onProgress: (progress) => {
          item.progress = progress;
          touchQueue();
        },
      });
      upsertImage(image);
      item.status = "success";
      item.progress = 100;
      successCount += 1;
    } catch (error) {
      item.status = "failed";
      item.error = error?.message ?? "Gambar gagal diupload.";
      item.progress = 0;
      failedCount += 1;
    }
    touchQueue();
  }

  setRuntime({
    uploading: false,
    error: failedCount ? `${failedCount} gambar gagal diupload. Cek status pada queue.` : "",
    notice: successCount ? `${successCount} gambar berhasil diupload.` : "",
  });
  invalidateCarImageSnapshots();
  showToast(successCount ? `${successCount} gambar berhasil diupload.` : "Gambar gagal diupload.", { type: successCount ? "success" : "error" });
}

async function setCover(carId, image) {
  const previous = currentImages();
  setImages(previous.map((item) => ({ ...item, is_cover: item.id === image.id })));
  setRuntime({ busyImageId: image.id, error: "", notice: "" });

  try {
    const updated = await imagesResource.setCover(carId, image.id);
    const images = currentImages().map((item) => ({
      ...item,
      is_cover: item.id === updated.id,
    }));
    setImages(images);
    invalidateCarImageSnapshots();
    setRuntime({ busyImageId: null, notice: "Cover berhasil diperbarui." });
    showToast("Cover berhasil diperbarui.", { type: "success" });
  } catch (error) {
    const message = error?.message ?? "Cover gagal diperbarui.";
    setImages(previous);
    setRuntime({ busyImageId: null, error: message });
    showToast(message, { type: "error" });
  }
}

async function deleteImage(carId, image) {
  const confirmed = await confirmDialog({
    title: "Hapus gambar",
    message: "Yakin mau hapus gambar ini?",
    confirmLabel: "Hapus",
    key: `slri-delete-image-${image.id}`,
  });
  if (!confirmed) {
    return;
  }

  setRuntime({ busyImageId: image.id, error: "", notice: "" });

  try {
    await imagesResource.delete(carId, image.id);
    setImages(currentImages().filter((item) => item.id !== image.id));
    invalidateCarImageSnapshots();
    setRuntime({ busyImageId: null, notice: "Gambar berhasil dihapus." });
    showToast("Gambar berhasil dihapus.", { type: "success" });
  } catch (error) {
    const message = error?.message ?? "Gambar gagal dihapus.";
    setRuntime({ busyImageId: null, error: message });
    showToast(message, { type: "error" });
  }
}

async function reorderImage(carId, image, direction) {
  const previous = sortedImages(currentImages());
  const currentIndex = previous.findIndex((item) => item.id === image.id);
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= previous.length) {
    return;
  }

  const optimistic = previous.map((item) => ({ ...item }));
  const [moved] = optimistic.splice(currentIndex, 1);
  optimistic.splice(targetIndex, 0, moved);
  const normalized = optimistic.map((item, index) => ({ ...item, sort_order: index }));
  setImages(normalized);
  setRuntime({ busyImageId: image.id, error: "", notice: "" });

  try {
    const updated = await imagesResource.reorder(carId, normalized.map((item) => ({
      id: item.id,
      sort_order: item.sort_order,
    })));
    setImages(updated);
    invalidateCarImageSnapshots();
    setRuntime({ busyImageId: null, notice: "Urutan gambar berhasil diperbarui." });
    showToast("Urutan gambar berhasil diperbarui.", { type: "success" });
  } catch (error) {
    const message = error?.message ?? "Urutan gambar gagal diperbarui.";
    setImages(previous);
    setRuntime({ busyImageId: null, error: message });
    showToast(message, { type: "error" });
  }
}

function upsertImage(image) {
  const images = currentImages();
  const next = image.is_cover
    ? images.map((item) => ({ ...item, is_cover: false }))
    : images;
  setImages([image, ...next].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)));
}

function invalidateCarImageSnapshots() {
  markPreloadSnapshotsStale([
    { role: "seller", key: "cars" },
    { role: "public", key: "catalog" },
    { role: "buyer", key: "catalog" },
    { role: "admin", key: "cars" },
  ], { source: "seller:car-images-mutated" });
}

function currentImages() {
  return sellerState.working("sellerCarImages", "images", []) ?? [];
}

function setImages(images) {
  appStore.patchState("working.sellerCarImages.images", {
    data: sortedImages(images),
    hydratedAt: Date.now(),
  }, "seller:car-images");
}

function sortedImages(images = []) {
  return [...images].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || Number(a.id ?? 0) - Number(b.id ?? 0));
}

function ensureRuntime() {
  if (!appStore.get(`runtime.${RUNTIME_KEY}`, null)) {
    appStore.patchState(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME, "seller:images-runtime-init");
  }
}

function runtimeState() {
  return appStore.get(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME) ?? DEFAULT_RUNTIME;
}

function setRuntime(patch = {}) {
  appStore.patchState(`runtime.${RUNTIME_KEY}`, {
    ...runtimeState(),
    ...patch,
  }, "seller:images-runtime");
}

function createQueueItem(file, overrides = {}) {
  return {
    id: `queue_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    originalFile: file,
    file,
    previewUrl: file?.type?.startsWith("image/") ? URL.createObjectURL(file) : "",
    name: file.name,
    size: file.size,
    type: file.type,
    status: "queued",
    progress: 0,
    error: "",
    isCover: false,
    edited: false,
    ...overrides,
  };
}

function revokeQueueItem(item) {
  if (item?.previewUrl) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

function validateImageFile(file) {
  if (!file?.type?.startsWith("image/")) {
    return "File harus berupa gambar.";
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return "Format harus JPG, PNG, atau WebP.";
  }
  const extension = String(file.name || "").split(".").pop().toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return "Ekstensi harus jpg, jpeg, png, atau webp.";
  }
  if (file.size > MAX_IMAGE_SIZE) {
    return "Ukuran maksimal 5 MB.";
  }
  return "";
}

function openImageEditor(item, queueApi) {
  item.status = "editing";
  queueApi.touchQueue();
  const editorState = {
    ratio: "free",
    rotation: 0,
    zoom: 1,
  };
  const content = document.createElement("section");
  content.id = "slri_editor_modal_section";
  content.className = "grid min-w-0 gap-4";

  const canvasWrap = document.createElement("section");
  canvasWrap.id = "slri_editor_canvas_section";
  canvasWrap.className = "grid min-w-0 place-items-center overflow-hidden rounded-[1.25rem] border border-[var(--pb-border)] bg-gray-950 p-3";
  const canvas = document.createElement("canvas");
  canvas.id = "slri_editor_canvas_input";
  canvas.className = "max-h-[58vh] w-full rounded-xl bg-gray-900 object-contain";
  canvasWrap.append(canvas);

  const controls = imageEditorControls(editorState, () => drawEditorPreview(item.file, canvas, editorState));
  const actions = document.createElement("section");
  actions.id = "slri_editor_actions_section";
  actions.className = "flex flex-wrap justify-end gap-2";
  const cancel = Button({ label: "Cancel", variant: "secondary", onClick: () => {
    item.status = item.edited ? "ready" : "queued";
    queueApi.touchQueue();
    closeModal();
  } });
  cancel.id = "slri_editor_cancel_button";
  const save = Button({ label: "Simpan edit", variant: "primary", onClick: async () => {
    try {
      const editedFile = await canvasToEditedFile(item.file, editorState);
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      item.file = editedFile;
      item.previewUrl = URL.createObjectURL(editedFile);
      item.size = editedFile.size;
      item.status = "ready";
      item.edited = true;
      queueApi.touchQueue();
      closeModal();
      showToast("Edit gambar disimpan.", { type: "success" });
    } catch (error) {
      item.status = "failed";
      item.error = error?.message ?? "Edit gambar gagal.";
      queueApi.touchQueue();
      showToast(item.error, { type: "error" });
    }
  } });
  save.id = "slri_editor_save_button";
  actions.append(cancel, save);
  content.append(canvasWrap, controls, actions);

  openModal(content, {
    key: EDITOR_MODAL_KEY,
    title: "Edit gambar",
    description: "Crop sederhana, rotate, dan zoom sebelum upload.",
    size: "xl",
    footer: null,
    panelId: "slri_editor_modal_panel_section",
    headerId: "slri_editor_modal_header_section",
    bodyId: "slri_editor_modal_body_section",
    closeButtonId: "slri_editor_modal_close_button",
    onClose: () => {
      if (item.status === "editing") {
        item.status = item.edited ? "ready" : "queued";
        queueApi.touchQueue();
      }
    },
  });

  drawEditorPreview(item.file, canvas, editorState);
}

function imageEditorControls(editorState, onChange) {
  const section = document.createElement("section");
  section.id = "slri_editor_controls_section";
  section.className = "grid gap-3 rounded-[1.25rem] border border-[var(--pb-border)] bg-white/85 p-3";

  const ratio = document.createElement("select");
  ratio.id = "slri_editor_ratio_input";
  ratio.className = "min-h-10 rounded-xl border border-[var(--pb-form-border)] bg-white px-3 text-sm font-semibold";
  [
    ["free", "Bebas"],
    ["1:1", "1:1"],
    ["4:3", "4:3"],
    ["16:9", "16:9"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    ratio.append(option);
  });
  ratio.addEventListener("change", () => {
    editorState.ratio = ratio.value;
    onChange();
  });

  const zoom = document.createElement("input");
  zoom.id = "slri_editor_zoom_input";
  zoom.type = "range";
  zoom.min = "1";
  zoom.max = "2";
  zoom.step = "0.05";
  zoom.value = "1";
  zoom.addEventListener("input", () => {
    editorState.zoom = Number(zoom.value);
    onChange();
  });

  const buttons = document.createElement("section");
  buttons.id = "slri_editor_button_group_section";
  buttons.className = "flex flex-wrap gap-2";
  const left = Button({ label: "Rotate kiri", variant: "secondary", onClick: () => {
    editorState.rotation = (editorState.rotation + 270) % 360;
    onChange();
  } });
  left.id = "slri_editor_rotate_left_button";
  const right = Button({ label: "Rotate kanan", variant: "secondary", onClick: () => {
    editorState.rotation = (editorState.rotation + 90) % 360;
    onChange();
  } });
  right.id = "slri_editor_rotate_right_button";
  const reset = Button({ label: "Reset", variant: "secondary", onClick: () => {
    editorState.ratio = "free";
    editorState.rotation = 0;
    editorState.zoom = 1;
    ratio.value = "free";
    zoom.value = "1";
    onChange();
  } });
  reset.id = "slri_editor_reset_button";
  buttons.append(left, right, reset);

  section.append(labelWrap("Rasio crop", ratio), labelWrap("Zoom", zoom), buttons);
  return section;
}

async function drawEditorPreview(file, canvas, state) {
  const image = await loadImage(file);
  const { width, height } = editorCanvasSize(image, state);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#111827";
  context.fillRect(0, 0, width, height);
  drawTransformedImage(context, image, width, height, state);
}

async function canvasToEditedFile(file, state) {
  const image = await loadImage(file);
  const { width, height } = editorCanvasSize(image, state, 1600);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  drawTransformedImage(context, image, width, height, state);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) {
    throw new Error("Gagal memproses gambar.");
  }
  return new File([blob], editedFileName(file.name), { type: "image/jpeg", lastModified: Date.now() });
}

function drawTransformedImage(context, image, width, height, state) {
  const rotated = state.rotation === 90 || state.rotation === 270;
  const sourceWidth = rotated ? image.naturalHeight : image.naturalWidth;
  const sourceHeight = rotated ? image.naturalWidth : image.naturalHeight;
  const scale = Math.max(width / sourceWidth, height / sourceHeight) * Number(state.zoom || 1);
  context.save();
  context.translate(width / 2, height / 2);
  context.rotate((Math.PI / 180) * Number(state.rotation || 0));
  context.drawImage(image, -image.naturalWidth * scale / 2, -image.naturalHeight * scale / 2, image.naturalWidth * scale, image.naturalHeight * scale);
  context.restore();
}

function editorCanvasSize(image, state, maxWidth = 900) {
  const rotated = state.rotation === 90 || state.rotation === 270;
  const naturalWidth = rotated ? image.naturalHeight : image.naturalWidth;
  const naturalHeight = rotated ? image.naturalWidth : image.naturalHeight;
  const ratio = ratioValue(state.ratio) || (naturalWidth / naturalHeight);
  const width = Math.min(maxWidth, naturalWidth);
  return {
    width: Math.round(width),
    height: Math.round(width / ratio),
  };
}

function ratioValue(ratio) {
  if (ratio === "1:1") return 1;
  if (ratio === "4:3") return 4 / 3;
  if (ratio === "16:9") return 16 / 9;
  return null;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar tidak bisa dibuka."));
    };
    image.src = url;
  });
}

function editedFileName(name) {
  const base = String(name || "image").replace(/\.[^.]+$/, "");
  return `${base}-edited.jpg`;
}

function labelWrap(label, control) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1 text-sm font-bold text-gray-700";
  wrap.textContent = label;
  wrap.append(control);
  return wrap;
}
