import { createIcon } from "../../../theme/iconRegistry.js";
import { tw } from "../../../theme/tailwindClasses.js";

export function PublicCarGallery({ car, images = [] } = {}) {
  const galleryImages = normalizeImages(car, images);
  const root = document.createElement("section");
  root.className = "grid gap-4";

  const main = document.createElement("div");
  main.className = "relative aspect-[4/3] overflow-hidden rounded-[28px] bg-[var(--pb-surface-muted)] shadow-[var(--pb-shadow-card)] lg:aspect-[16/10]";

  const mainImage = document.createElement("img");
  mainImage.className = "block h-full w-full object-cover";
  mainImage.alt = carTitle(car);
  mainImage.src = galleryImages[0] || fallbackCarImageUrl();
  mainImage.addEventListener("error", () => {
    mainImage.src = fallbackCarImageUrl();
  }, { once: true });

  const topFade = document.createElement("div");
  topFade.className = "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/40 via-slate-900/10 to-transparent";

  const bottomFade = document.createElement("div");
  bottomFade.className = "pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/55 via-slate-900/15 to-transparent";

  const floating = galleryCaption(car, galleryImages.length);

  main.append(mainImage, topFade, bottomFade, floating);
  root.append(main);

  if (galleryImages.length > 1) {
    const thumbs = document.createElement("div");
    thumbs.className = "flex gap-3 overflow-x-auto pb-1";

    galleryImages.forEach((url, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = tw.interactive.thumbButton;
      button.setAttribute("aria-label", `Lihat foto ${index + 1}`);
      button.addEventListener("click", () => {
        mainImage.src = url;
      });

      const thumb = document.createElement("img");
      thumb.src = url;
      thumb.alt = "";
      thumb.loading = "lazy";
      thumb.className = "block h-full w-full object-cover";
      thumb.addEventListener("error", () => {
        thumb.src = fallbackCarImageUrl();
      }, { once: true });
      button.append(thumb);
      thumbs.append(button);
    });

    root.append(thumbs);
  }

  return root;
}

function galleryCaption(car, count) {
  const floating = document.createElement("div");
  floating.className = "absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-4";

  const titleChip = document.createElement("div");
  // Kedua chip melayang di atas foto yang warnanya tidak bisa ditebak, dan di
  // atas placeholder terang kalau mobilnya belum berfoto. Scrim gelap pekat
  // dipasang supaya tulisan putihnya selalu terbaca, bukan menghilang.
  titleChip.className = "hidden min-w-0 max-w-full rounded-2xl border border-white/15 bg-[rgba(28,25,23,0.62)] px-3 py-2 text-white/95 backdrop-blur sm:max-w-[75%]";

  const title = document.createElement("p");
  title.className = "break-words text-sm font-semibold";
  title.textContent = carTitle(car);

  const meta = document.createElement("p");
  meta.className = "truncate text-xs text-white/70";
  meta.textContent = [car?.location_name, car?.primary_color].filter(Boolean).join(" | ") || "Listing showroom";
  titleChip.append(title, meta);

  const countChip = document.createElement("div");
  countChip.className = "inline-flex items-center gap-2 rounded-full border border-white/15 bg-[rgba(28,25,23,0.62)] px-3 py-1.5 text-xs font-semibold text-white backdrop-blur";
  countChip.append(createIcon("image", { className: "block h-3.5 w-3.5 leading-none" }), document.createTextNode(`${Math.max(count, 1)} foto`));

  floating.append(titleChip, countChip);
  return floating;
}

function normalizeImages(car, images) {
  const source = [
    car?.cover_image,
    car?.cover_image_url,
    car?.image_url,
    car?.primary_image_url,
    car?.thumbnail_url,
    car?.photo_url,
    ...(Array.isArray(images) && images.length ? images : []),
    ...(Array.isArray(car?.images) ? car.images : []),
    ...(Array.isArray(car?.gallery) ? car.gallery : []),
    ...(Array.isArray(car?.photos) ? car.photos : []),
    ...(Array.isArray(car?.media) ? car.media : []),
  ];

  return [...new Set(source.map(imageUrl).filter(Boolean))];
}

function imageUrl(image) {
  const url = typeof image === "string"
    ? image
    : image?.url
      ?? image?.public_url
      ?? image?.file_url
      ?? image?.file_path
      ?? image?.thumbnail_url
      ?? image?.path
      ?? "";

  const value = String(url ?? "").trim();
  if (!value) {
    return "";
  }

  if (/^(https?:|data:image\/)/.test(value) || value.startsWith("/")) {
    return value;
  }

  return `/${value}`;
}

function fallbackCarImageUrl() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 620">
      <rect width="960" height="620" rx="48" fill="#faf4ed"/>
      <path d="M188 420h584c22 0 40 18 40 40v28H148v-28c0-22 18-40 40-40Z" fill="#eab676"/>
      <path d="M318 315h288c38 0 74 18 96 49l40 56H248l70-105Z" fill="#eab676"/>
      <path d="M354 336h226c28 0 54 13 70 36l15 21H302l52-57Z" fill="#faf4ed"/>
      <circle cx="312" cy="488" r="54" fill="#111827"/>
      <circle cx="312" cy="488" r="24" fill="#f9fafb"/>
      <circle cx="660" cy="488" r="54" fill="#111827"/>
      <circle cx="660" cy="488" r="24" fill="#f9fafb"/>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function carTitle(car) {
  return [car?.brand_name, car?.model_name, car?.sub_model_name].filter(Boolean).join(" ") || "Detail mobil";
}
