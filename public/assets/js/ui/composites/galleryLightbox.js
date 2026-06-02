import { Badge } from "../primitives/badge.js";
import { Button } from "../primitives/button.js";
import { createIcon } from "../../theme/iconRegistry.js";

export function GalleryLightbox({
  title = "Preview Galeri",
  items = [],
  activeIndex = 0,
  getSrc = (item) => item?.src ?? item?.file_path ?? "",
  getAlt = (item, index) => item?.alt ?? item?.file_name ?? `Gambar ${index + 1}`,
  getCaption = (item) => item?.caption ?? item?.file_name ?? "",
  getMeta = (item, index) => item?.meta ?? `Urutan ${item?.sort_order ?? index + 1}`,
  getBadges = (item) => item?.badges ?? [],
  onClose = null,
  onNext = null,
  onPrevious = null,
  onSelect = null,
} = {}) {
  const index = clamp(activeIndex, 0, Math.max(0, items.length - 1));
  const active = items[index] ?? null;
  const src = getSrc(active, index);

  const section = document.createElement("section");
  section.id = "pb_gallery_lightbox_section";
  section.className = "relative grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-gray-950 text-white";

  const header = document.createElement("section");
  header.id = "pb_gallery_lightbox_header_section";
  header.className = "z-10 flex min-w-0 items-center justify-between gap-3 border-b border-white/10 bg-black/45 px-4 py-3 backdrop-blur-xl sm:px-6";

  const copy = document.createElement("div");
  copy.className = "min-w-0";
  const titleNode = document.createElement("h2");
  titleNode.className = "truncate text-base font-black text-white sm:text-lg";
  titleNode.textContent = title;
  const counter = document.createElement("p");
  counter.className = "mt-0.5 text-xs font-semibold text-white/65";
  counter.textContent = items.length ? `${index + 1} / ${items.length}` : "Tidak ada gambar";
  copy.append(titleNode, counter);

  const close = Button({ label: "", variant: "secondary", onClick: () => onClose?.() });
  close.id = "pb_gallery_lightbox_close_button";
  close.className = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg transition hover:bg-white/18 focus:outline-none focus:ring-2 focus:ring-white/45";
  close.setAttribute("aria-label", "Tutup preview galeri");
  close.append(createIcon("circleXmark", { className: "h-5 w-5" }));
  header.append(copy, close);

  const stage = document.createElement("section");
  stage.id = "pb_gallery_lightbox_stage_section";
  stage.className = "relative grid min-h-0 min-w-0 place-items-center overflow-hidden px-3 py-3 sm:px-6";

  if (src) {
    const image = document.createElement("img");
    image.id = "pb_gallery_lightbox_active_image";
    image.className = "max-h-full max-w-full object-contain shadow-[0_24px_90px_rgba(0,0,0,0.45)]";
    image.src = src;
    image.alt = getAlt(active, index);
    stage.append(image);
  } else {
    const empty = document.createElement("div");
    empty.className = "grid gap-2 text-center text-white/75";
    empty.append(createIcon("image", { className: "mx-auto h-10 w-10" }), document.createTextNode("Preview gambar belum tersedia."));
    stage.append(empty);
  }

  const previous = navButton("pb_gallery_lightbox_previous_button", "arrowLeft", "Sebelumnya", items.length <= 1, onPrevious);
  previous.classList.add("absolute", "left-3", "top-1/2", "-translate-y-1/2", "sm:left-6");
  const next = navButton("pb_gallery_lightbox_next_button", "arrowRight", "Berikutnya", items.length <= 1, onNext);
  next.classList.add("absolute", "right-3", "top-1/2", "-translate-y-1/2", "sm:right-6");
  stage.append(previous, next);

  const footer = document.createElement("section");
  footer.id = "pb_gallery_lightbox_footer_section";
  footer.className = "z-10 grid min-w-0 gap-3 border-t border-white/10 bg-black/55 px-4 py-3 backdrop-blur-xl sm:px-6";

  const info = document.createElement("section");
  info.className = "flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between";
  const captionWrap = document.createElement("div");
  captionWrap.className = "min-w-0";
  captionWrap.append(
    textNode("p", "truncate text-sm font-black text-white", getCaption(active, index) || "-"),
    textNode("p", "text-xs font-semibold text-white/60", getMeta(active, index) || "")
  );
  const badges = document.createElement("div");
  badges.className = "flex flex-wrap gap-2";
  const badgeItems = getBadges(active, index);
  if (badgeItems.length) {
    badgeItems.forEach((badge) => badges.append(Badge({ label: badge.label, variant: badge.variant ?? "default" })));
  }
  info.append(captionWrap, badges);

  const thumbs = document.createElement("section");
  thumbs.id = "pb_gallery_lightbox_thumbnails_section";
  thumbs.className = "flex min-w-0 gap-2 overflow-x-auto pb-1";
  items.forEach((item, thumbIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.id = `pb_gallery_lightbox_thumb_${safeId(item?.id ?? thumbIndex)}_button`;
    button.className = [
      "h-16 w-24 shrink-0 overflow-hidden rounded-lg border bg-white/8 transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-white/45",
      thumbIndex === index ? "border-white ring-2 ring-white/35" : "border-white/15",
    ].join(" ");
    button.setAttribute("aria-label", `Preview gambar ${thumbIndex + 1}`);
    const imageNode = document.createElement("img");
    imageNode.className = "h-full w-full object-cover";
    imageNode.src = getSrc(item, thumbIndex);
    imageNode.alt = getAlt(item, thumbIndex);
    button.append(imageNode);
    button.addEventListener("click", () => onSelect?.(thumbIndex));
    thumbs.append(button);
  });

  footer.append(info, thumbs);
  section.append(header, stage, footer);
  return section;
}

export const galleryLightboxModalOptions = Object.freeze({
  size: "xl",
  footer: null,
  rootClassName: "!p-0 !bg-black/90 !backdrop-blur-md",
  panelClassName: "!h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !rounded-none !border-0 !bg-gray-950 !shadow-none",
  bodyClassName: "min-h-0 flex-1 overflow-hidden p-0",
});

function navButton(id, icon, label, disabled, onClick) {
  const button = Button({ label: "", variant: "secondary", disabled, onClick: () => onClick?.() });
  button.id = id;
  button.className = "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white shadow-lg backdrop-blur transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-35 focus:outline-none focus:ring-2 focus:ring-white/45";
  button.setAttribute("aria-label", label);
  button.append(createIcon(icon, { className: "h-4 w-4" }));
  return button;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
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
