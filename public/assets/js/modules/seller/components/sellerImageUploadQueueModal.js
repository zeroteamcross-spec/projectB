import { Button } from "../../../ui/primitives/button.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function SellerImageUploadQueueModal({
  queue = [],
  uploading = false,
  onStart = null,
  onRetryFailed = null,
  onClose = null,
  onEdit = null,
  onRemove = null,
  onToggleCover = null,
} = {}) {
  const section = document.createElement("section");
  section.id = "slri_queue_modal_section";
  section.className = "grid min-w-0 gap-4";

  const titleRow = document.createElement("section");
  titleRow.id = "slri_queue_modal_title_section";
  titleRow.className = "flex min-w-0 items-start justify-between gap-3 border-b border-[var(--pb-border)] pb-4";

  const copy = document.createElement("div");
  copy.className = "min-w-0";
  const title = document.createElement("h2");
  title.className = "text-lg font-black text-[var(--pb-text)] sm:text-xl";
  title.textContent = "Queue Upload";
  const helper = document.createElement("p");
  helper.className = "mt-1 text-sm leading-6 text-[var(--pb-text-muted)]";
  helper.textContent = "Upload berjalan berurutan per file dengan progress nyata dari browser.";
  copy.append(title, helper);

  const close = Button({
    label: "",
    variant: "secondary",
    disabled: uploading,
    onClick: (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      onClose?.();
    },
  });
  close.id = "slri_queue_modal_close_button";
  close.className = "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--pb-border)] bg-[var(--pb-btn-secondary-bg)] text-[var(--pb-btn-secondary-text)] shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-55";
  close.setAttribute("aria-label", uploading ? "Tunggu upload selesai" : "Tutup queue upload");
  close.append(createIcon("circleXmark", { className: "h-4 w-4" }));
  titleRow.append(copy, close);

  const summary = queueSummary(queue);
  const totalProgress = calculateTotalProgress(queue);
  const summaryGrid = document.createElement("section");
  summaryGrid.id = "slri_queue_summary_section";
  summaryGrid.className = "grid gap-3 sm:grid-cols-4";
  summaryGrid.append(
    summaryMetric("Total file", queue.length),
    summaryMetric("Selesai", summary.success),
    summaryMetric("Gagal", summary.failed + summary.invalid),
    summaryMetric("Upload", summary.uploading)
  );

  const total = document.createElement("section");
  total.id = "slri_queue_total_progress_section";
  total.className = "grid gap-2 rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-white/85 p-3";
  total.append(progressHeader("Progress total", `${totalProgress}%`), progressBar(totalProgress, uploading));

  const list = document.createElement("section");
  list.id = "slri_queue_list_section";
  list.className = "grid max-h-[48vh] min-w-0 gap-3 overflow-y-auto pr-1";
  if (queue.length) {
    queue.forEach((item) => {
      list.append(queueItem(item, { uploading, onEdit, onRemove, onToggleCover }));
    });
  } else {
    const empty = document.createElement("section");
    empty.className = "grid min-h-36 place-items-center rounded-[var(--pb-radius-xl)] border border-dashed border-[var(--pb-border)] bg-[var(--pb-surface-muted)] px-4 text-center text-sm text-[var(--pb-text-muted)]";
    empty.textContent = "Belum ada file di queue.";
    list.append(empty);
  }

  const actions = document.createElement("section");
  actions.id = "slri_queue_actions_section";
  actions.className = "flex flex-wrap justify-end gap-2 border-t border-[var(--pb-border)] pt-4";
  const hasQueued = queue.some((item) => canUpload(item));
  const hasFailed = queue.some((item) => item.status === "failed");
  const start = Button({
    label: uploading ? "Mengupload..." : "Mulai Upload",
    disabled: uploading || !hasQueued,
    onClick: () => onStart?.(),
  });
  start.id = "slri_queue_start_upload_button";
  start.prepend(createIcon(uploading ? "clock" : "upload", { className: "h-4 w-4" }));
  const retry = Button({
    label: "Upload Ulang yang gagal",
    variant: "secondary",
    disabled: uploading || !hasFailed,
    onClick: () => onRetryFailed?.(),
  });
  retry.id = "slri_queue_retry_failed_button";
  retry.prepend(createIcon("history", { className: "h-4 w-4" }));
  const done = Button({
    label: summary.inProgress ? "Tunggu proses selesai" : "Tutup",
    variant: "secondary",
    disabled: summary.inProgress,
    onClick: (event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      onClose?.();
    },
  });
  done.id = "slri_queue_done_button";
  done.prepend(createIcon("circleCheck", { className: "h-4 w-4" }));
  actions.append(retry, start, done);

  section.append(titleRow, summaryGrid, total, list, actions);
  return section;
}

function queueItem(item, { uploading, onEdit, onRemove, onToggleCover }) {
  const card = document.createElement("section");
  card.id = `slri_queue_modal_item_${safeId(item.id)}_section`;
  card.className = "grid min-w-0 gap-3 rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-white p-3 shadow-sm sm:grid-cols-[96px_minmax(0,1fr)]";

  const preview = document.createElement("section");
  preview.className = "grid aspect-[4/3] min-w-0 place-items-center overflow-hidden rounded-lg bg-[var(--pb-surface-muted)]";
  if (item.previewUrl) {
    const image = document.createElement("img");
    image.className = "h-full w-full object-cover";
    image.src = item.previewUrl;
    image.alt = item.name;
    preview.append(image);
  } else {
    preview.append(createIcon("image", { className: "h-7 w-7 text-[var(--pb-text-muted)]" }));
  }

  const body = document.createElement("section");
  body.className = "grid min-w-0 gap-2";
  const meta = document.createElement("section");
  meta.className = "flex min-w-0 flex-wrap items-start justify-between gap-2";
  const copy = document.createElement("div");
  copy.className = "min-w-0";
  copy.append(textNode("p", "truncate text-sm font-black text-[var(--pb-text)]", item.name), textNode("p", "text-xs font-semibold text-[var(--pb-text-muted)]", formatSize(item.size)));
  meta.append(copy, statusPill(item));

  const progress = Number(item.progress ?? 0);
  body.append(meta, progressBar(progress, item.status === "uploading"));
  if (item.error) {
    body.append(textNode("p", "text-xs font-semibold text-red-600", item.error));
  }

  const actions = document.createElement("section");
  actions.className = "flex flex-wrap items-center gap-2";
  const cover = document.createElement("label");
  cover.className = "inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] px-3 text-xs font-bold text-[var(--pb-text-strong)]";
  const coverInput = document.createElement("input");
  coverInput.type = "checkbox";
  coverInput.checked = Boolean(item.isCover);
  coverInput.disabled = uploading || ["uploading", "success", "invalid"].includes(item.status);
  coverInput.addEventListener("change", () => onToggleCover?.(item, coverInput.checked));
  cover.append(coverInput, document.createTextNode("Cover"));

  const edit = Button({
    label: "Edit",
    variant: "secondary",
    disabled: uploading || ["uploading", "success", "invalid"].includes(item.status),
    onClick: () => onEdit?.(item),
  });
  edit.id = `slri_queue_edit_${safeId(item.id)}_button`;
  edit.prepend(createIcon("edit", { className: "h-4 w-4" }));
  const remove = Button({
    label: "Hapus",
    variant: "danger",
    disabled: uploading || item.status === "uploading",
    onClick: () => onRemove?.(item.id),
  });
  remove.id = `slri_queue_remove_${safeId(item.id)}_button`;
  remove.prepend(createIcon("trash", { className: "h-4 w-4" }));
  actions.append(cover, edit, remove);
  body.append(actions);

  card.append(preview, body);
  return card;
}

function queueSummary(queue) {
  const summary = {
    success: 0,
    failed: 0,
    invalid: 0,
    uploading: 0,
    inProgress: false,
  };
  queue.forEach((item) => {
    if (item.status === "success") summary.success += 1;
    if (item.status === "failed") summary.failed += 1;
    if (item.status === "invalid") summary.invalid += 1;
    if (item.status === "uploading") summary.uploading += 1;
  });
  summary.inProgress = summary.uploading > 0;
  return summary;
}

function calculateTotalProgress(queue) {
  if (!queue.length) {
    return 0;
  }
  const total = queue.reduce((sum, item) => sum + Number(item.progress ?? 0), 0);
  return Math.round(total / queue.length);
}

function canUpload(item) {
  return ["queued", "ready", "failed"].includes(item.status);
}

function summaryMetric(label, value) {
  const item = document.createElement("section");
  item.className = "rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-white/85 p-3";
  item.append(textNode("p", "text-xs font-bold uppercase text-[var(--pb-text-muted)]", label), textNode("p", "mt-1 text-lg font-black text-[var(--pb-text)]", String(value)));
  return item;
}

function progressHeader(label, value) {
  const row = document.createElement("section");
  row.className = "flex items-center justify-between gap-2 text-xs font-bold text-[var(--pb-text-strong)]";
  row.append(document.createTextNode(label), textNode("span", "text-[var(--pb-brand-secondary)]", value));
  return row;
}

function progressBar(value, active = false) {
  const wrap = document.createElement("div");
  wrap.className = "h-2 overflow-hidden rounded-full bg-[var(--pb-surface-muted)]";
  const bar = document.createElement("div");
  bar.className = [
    "h-full rounded-full bg-[var(--pb-brand-secondary)] transition-all duration-200",
    active ? "animate-pulse" : "",
  ].filter(Boolean).join(" ");
  bar.style.width = `${Math.max(0, Math.min(100, Number(value || 0)))}%`;
  wrap.append(bar);
  return wrap;
}

function statusPill(item) {
  const tone = {
    queued: "border-gray-200 bg-gray-50 text-gray-600",
    editing: "border-amber-200 bg-amber-50 text-amber-700",
    ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
    uploading: "border-blue-200 bg-blue-50 text-blue-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    failed: "border-red-200 bg-red-50 text-red-700",
    invalid: "border-red-200 bg-red-50 text-red-700",
  }[item.status] ?? "border-gray-200 bg-gray-50 text-gray-600";
  const pill = document.createElement("span");
  pill.className = `inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${tone}`;
  pill.textContent = item.status;
  return pill;
}

function formatSize(size) {
  const value = Number(size || 0);
  if (value >= 1048576) {
    return `${(value / 1048576).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}

function safeId(value) {
  return String(value ?? "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "item";
}
