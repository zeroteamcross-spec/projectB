import { EmptyState } from "../primitives/emptyState.js";
import { tw } from "../theme/tailwindClasses.js";

export function ImageGallery({ images = [] } = {}) {
  if (!images.length) {
    return EmptyState({ title: "Gambar belum tersedia" });
  }

  const grid = document.createElement("div");
  grid.className = tw.surface.responsiveGrid;
  images.forEach((image) => {
    const img = document.createElement("img");
    img.className = "aspect-[4/3] w-full rounded-lg object-cover";
    img.src = image.url ?? image.file_path;
    img.alt = image.file_name ?? "Gambar mobil";
    img.loading = "lazy";
    grid.append(img);
  });
  return grid;
}
