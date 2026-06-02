import { GalleryLightbox } from "../../../ui/composites/galleryLightbox.js";

export function SellerImageGalleryPreviewModal({
  images = [],
  activeIndex = 0,
  onClose = null,
  onNext = null,
  onPrevious = null,
  onSelect = null,
} = {}) {
  const sorted = [...images].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

  return GalleryLightbox({
    title: "Preview Galeri Mobil",
    items: sorted,
    activeIndex,
    getSrc: (image) => image?.file_path ?? "",
    getAlt: (image, index) => image?.file_name ?? `Gambar ${index + 1}`,
    getCaption: (image) => image?.file_name ?? "-",
    getMeta: (image, index) => `Urutan ${image?.sort_order ?? index + 1}`,
    getBadges: (image) => [
      image?.is_cover
        ? { label: "Cover utama", variant: "success" }
        : { label: "Gallery", variant: "default" },
    ],
    onClose,
    onNext,
    onPrevious,
    onSelect,
  });
}
