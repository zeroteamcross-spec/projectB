import { Card } from "../../../ui/composites/card.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { tw } from "../../../ui/theme/tailwindClasses.js";

export function SellerImageCard({
  image,
  index = 0,
  total = 1,
  busy = false,
  onPreview = null,
  onSetCover = null,
  onDelete = null,
  onMoveUp = null,
  onMoveDown = null,
} = {}) {
  const imageKey = safeId(image.id ?? image.sort_order ?? index + 1);

  const wrap = document.createElement("section");
  wrap.id = `slri_image_card_${imageKey}_section`;
  wrap.className = [
    "group min-w-0 overflow-hidden rounded-[var(--pb-radius-2xl)] border bg-[var(--pb-surface-card)] shadow-[var(--pb-shadow-card)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[var(--pb-shadow-elevated)]",
    image.is_cover
      ? "border-[color-mix(in_srgb,var(--pb-success)_38%,white)] ring-1 ring-[color-mix(in_srgb,var(--pb-success)_18%,white)]"
      : "border-[var(--pb-border)]",
  ].join(" ");

  const media = document.createElement("section");
  media.id = `slri_image_media_${imageKey}_section`;
  media.className = "relative min-w-0 overflow-hidden bg-[var(--pb-surface-muted)]";

  const img = document.createElement("img");
  img.className = "aspect-[4/3] w-full bg-gray-100 object-cover transition duration-200 group-hover:scale-[1.015]";
  img.src = image.file_path;
  img.alt = image.file_name ?? `Gambar ${index + 1}`;
  // Not "lazy": this card is only ever created once the gallery is already
  // expanded (see carsPage.js's showGallery toggle) and the list is small,
  // so there is no offscreen-list benefit — only a chance the browser's
  // lazy-load intersection check misfires and the thumbnail never appears.

  const overlay = document.createElement("div");
  overlay.className = "pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/45 to-transparent p-3";

  const orderPill = document.createElement("span");
  orderPill.className = "inline-flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[10px] font-bold text-[var(--pb-text)] shadow-[var(--pb-shadow-soft)]";
  orderPill.append(createIcon("sort", { className: "h-3 w-3 text-[var(--pb-brand-secondary)]" }), document.createTextNode(`Urutan ${image.sort_order ?? index + 1}`));

  const coverPill = image.is_cover
    ? Badge({ label: "Cover utama", variant: "success" })
    : Badge({ label: "Gallery", variant: "default" });
  overlay.append(orderPill, coverPill);
  media.append(img, overlay);

  const meta = document.createElement("div");
  meta.className = "grid min-w-0 gap-3 p-4";

  const copy = document.createElement("div");
  copy.className = "min-w-0";
  const order = document.createElement("p");
  order.className = "flex items-center gap-2 text-xs font-semibold text-[var(--pb-text)]";
  order.append(createIcon(image.is_cover ? "star" : "image", { className: `h-4 w-4 ${image.is_cover ? "text-[var(--pb-success)]" : "text-[var(--pb-brand-secondary)]"}` }), document.createTextNode(image.is_cover ? "Gambar cover aktif" : "Gambar gallery"));
  const file = document.createElement("p");
  file.className = `mt-1 truncate text-[10px] ${tw.text.muted}`;
  file.title = image.file_name ?? "-";
  file.textContent = image.file_name ?? "-";
  copy.append(order, file);

  const actions = document.createElement("div");
  actions.className = "grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3";

  const preview = Button({ label: "Preview", variant: "secondary", disabled: busy, onClick: () => onPreview?.(image) });
  preview.id = `slri_image_preview_${imageKey}_button`;
  preview.prepend(createIcon("eye", { className: "h-4 w-4" }));

  const cover = Button({ label: image.is_cover ? "Cover aktif" : "Jadikan cover", variant: "secondary", disabled: busy || image.is_cover, onClick: () => onSetCover?.(image) });
  cover.id = `slri_image_cover_${imageKey}_button`;
  cover.prepend(createIcon("star", { className: "h-4 w-4" }));

  const remove = Button({ label: "Hapus", variant: "danger", disabled: busy, onClick: () => onDelete?.(image) });
  remove.id = `slri_image_delete_${imageKey}_button`;
  remove.prepend(createIcon("trash", { className: "h-4 w-4" }));

  const moveUp = Button({ label: "Naik", variant: "secondary", disabled: busy || index <= 0, onClick: () => onMoveUp?.(image) });
  moveUp.id = `slri_image_move_up_${imageKey}_button`;
  moveUp.prepend(createIcon("arrowLeft", { className: "h-4 w-4 rotate-90" }));

  const moveDown = Button({ label: "Turun", variant: "secondary", disabled: busy || index >= total - 1, onClick: () => onMoveDown?.(image) });
  moveDown.id = `slri_image_move_down_${imageKey}_button`;
  moveDown.prepend(createIcon("arrowRight", { className: "h-4 w-4 rotate-90" }));

  actions.append(preview, cover, moveUp, moveDown, remove);
  meta.append(copy, actions);

  wrap.append(media, meta);
  return Card(wrap, { className: "p-0 border-0 bg-transparent shadow-none" });
}

function safeId(value) {
  return String(value ?? "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "item";
}
