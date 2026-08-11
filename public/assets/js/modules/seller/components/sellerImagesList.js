import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { SellerImageCard } from "./sellerImageCard.js";

export function SellerImagesList({
  images = [],
  busyImageId = null,
  onPreview = null,
  onSetCover = null,
  onDelete = null,
  onMoveUp = null,
  onMoveDown = null,
} = {}) {
  const section = document.createElement("section");
  section.id = "slri_gallery_section";
  section.className = "grid min-w-0 gap-4 rounded-[var(--pb-radius-2xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-4 shadow-[var(--pb-shadow-card)]";
  section.setAttribute("data-ds", "seller.images.gallery");

  const header = document.createElement("section");
  header.id = "slri_gallery_header_section";
  header.className = "flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between";

  const copy = document.createElement("div");
  copy.className = "min-w-0";
  const title = document.createElement("h2");
  title.className = "flex items-center gap-2 text-base font-bold text-[var(--pb-text)]";
  title.append(createIcon("image", { className: "h-5 w-5 text-[var(--pb-brand-secondary)]" }), document.createTextNode("Galeri mobil"));
  const helper = document.createElement("p");
  helper.className = "mt-1 text-xs text-[var(--pb-text-muted)]";
  helper.textContent = images.length ? "Cover diberi penanda khusus. Gunakan preview untuk mengecek kualitas foto." : "Belum ada gambar untuk mobil ini.";
  copy.append(title, helper);

  const count = document.createElement("span");
  count.className = "w-fit rounded-full border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] px-3 py-1 text-[10px] font-semibold text-[var(--pb-text-strong)]";
  count.textContent = `${images.length} gambar`;
  header.append(copy, count);
  section.append(header);

  if (!images.length) {
    section.append(EmptyState({
      title: "Gambar mobil belum tersedia",
      description: "Upload gambar agar listing terasa lengkap saat dilihat buyer.",
    }));
    return section;
  }

  const grid = document.createElement("section");
  grid.id = "slri_images_grid_section";
  grid.className = "grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3";
  const sortedImages = [...images]
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
  sortedImages
    .forEach((image, index) => {
      grid.append(SellerImageCard({
        image,
        index,
        total: sortedImages.length,
        busy: busyImageId === image.id,
        onPreview,
        onSetCover,
        onDelete,
        onMoveUp,
        onMoveDown,
      }));
    });
  section.append(grid);
  return section;
}
