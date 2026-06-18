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
  let currentIndex = clamp(activeIndex, 0, Math.max(0, items.length - 1));

  // Interactive States
  let zoomLevel = 1;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let isPlaying = false;
  let slideshowTimer = null;

  // Touch Swipe States
  let touchStartX = 0;
  let touchStartY = 0;

  // Outer container
  const section = document.createElement("section");
  section.id = "pb_gallery_lightbox_section";
  section.className = "relative grid h-full min-h-0 min-w-0 grid-rows-[auto_1fr_auto] overflow-hidden bg-black/95 text-white transition-all duration-300 select-none";

  // --- HEADER SECTION ---
  const header = document.createElement("section");
  header.id = "pb_gallery_lightbox_header_section";
  header.className = "z-10 flex min-w-0 items-center justify-between gap-3 border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur-xl sm:px-6";

  const copy = document.createElement("div");
  copy.className = "min-w-0";
  const titleNode = document.createElement("h2");
  titleNode.className = "truncate text-base font-bold tracking-tight text-white sm:text-lg";
  titleNode.textContent = title;
  const counter = document.createElement("p");
  counter.className = "mt-0.5 text-xs font-semibold text-white/60";
  copy.append(titleNode, counter);

  // Toolbar Controls (Play, Zoom In, Zoom Out, Zoom Reset, Fullscreen, Close)
  const toolbar = document.createElement("div");
  toolbar.className = "flex items-center gap-1.5 sm:gap-2 shrink-0";

  // Play/Pause Slideshow Button
  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/15 hover:text-white transition focus:outline-none";
  playBtn.title = "Mulai Slideshow";
  const playIcon = document.createElement("i");
  playIcon.className = "fa-solid fa-play h-4 w-4 flex items-center justify-center";
  playBtn.append(playIcon);

  // Zoom Out Button
  const zoomOutBtn = document.createElement("button");
  zoomOutBtn.type = "button";
  zoomOutBtn.className = "flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/15 hover:text-white transition focus:outline-none";
  zoomOutBtn.title = "Perkecil";
  const zoomOutIcon = document.createElement("i");
  zoomOutIcon.className = "fa-solid fa-magnifying-glass-minus h-4 w-4 flex items-center justify-center";
  zoomOutBtn.append(zoomOutIcon);

  // Zoom In Button
  const zoomInBtn = document.createElement("button");
  zoomInBtn.type = "button";
  zoomInBtn.className = "flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/15 hover:text-white transition focus:outline-none";
  zoomInBtn.title = "Perbesar";
  const zoomInIcon = document.createElement("i");
  zoomInIcon.className = "fa-solid fa-magnifying-glass-plus h-4 w-4 flex items-center justify-center";
  zoomInBtn.append(zoomInIcon);

  // Zoom Reset Button
  const zoomResetBtn = document.createElement("button");
  zoomResetBtn.type = "button";
  zoomResetBtn.className = "flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/15 hover:text-white transition focus:outline-none hidden";
  zoomResetBtn.title = "Reset Zoom";
  const zoomResetIcon = document.createElement("i");
  zoomResetIcon.className = "fa-solid fa-arrow-rotate-left h-4 w-4 flex items-center justify-center";
  zoomResetBtn.append(zoomResetIcon);

  // Fullscreen Toggle Button
  const fullscreenBtn = document.createElement("button");
  fullscreenBtn.type = "button";
  fullscreenBtn.className = "flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/15 hover:text-white transition focus:outline-none";
  fullscreenBtn.title = "Fullscreen";
  const fullscreenIcon = document.createElement("i");
  fullscreenIcon.className = "fa-solid fa-expand h-4 w-4 flex items-center justify-center";
  fullscreenBtn.append(fullscreenIcon);

  // Close Button
  const close = Button({ label: "", variant: "secondary", onClick: () => handleClose() });
  close.id = "pb_gallery_lightbox_close_button";
  close.className = "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-lg transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/45 ml-1";
  close.setAttribute("aria-label", "Tutup preview galeri");
  const closeIcon = document.createElement("i");
  closeIcon.className = "fa-solid fa-xmark text-base";
  close.replaceChildren(closeIcon);

  toolbar.append(playBtn, zoomOutBtn, zoomInBtn, zoomResetBtn, fullscreenBtn, close);
  header.append(copy, toolbar);

  // --- STAGE SECTION ---
  const stage = document.createElement("section");
  stage.id = "pb_gallery_lightbox_stage_section";
  stage.className = "relative grid min-h-0 min-w-0 place-items-center overflow-hidden px-4 py-4 bg-gray-950 cursor-grab active:cursor-grabbing";

  const imgContainer = document.createElement("div");
  imgContainer.className = "relative flex h-full w-full items-center justify-center overflow-hidden pointer-events-none";

  const image = document.createElement("img");
  image.id = "pb_gallery_lightbox_active_image";
  image.className = "max-h-full max-w-full object-contain pointer-events-auto transition-transform duration-200 ease-out select-none shadow-[0_24px_90px_rgba(0,0,0,0.6)]";
  image.style.transformOrigin = "center center";
  image.style.transitionProperty = "transform, opacity";
  image.style.opacity = "1";
  imgContainer.append(image);
  stage.append(imgContainer);

  // Navigation Arrows (Desktop overlay)
  const previous = navButton("pb_gallery_lightbox_previous_button", "arrowLeft", "Sebelumnya", items.length <= 1, () => navigate(-1));
  previous.classList.add("absolute", "left-4", "top-1/2", "-translate-y-1/2", "z-10", "md:flex", "hidden");
  const next = navButton("pb_gallery_lightbox_next_button", "arrowRight", "Berikutnya", items.length <= 1, () => navigate(1));
  next.classList.add("absolute", "right-4", "top-1/2", "-translate-y-1/2", "z-10", "md:flex", "hidden");
  stage.append(previous, next);

  // --- FOOTER SECTION ---
  const footer = document.createElement("section");
  footer.id = "pb_gallery_lightbox_footer_section";
  footer.className = "z-10 grid min-w-0 gap-3 border-t border-white/10 bg-black/60 px-4 py-3 backdrop-blur-xl sm:px-6";

  const info = document.createElement("section");
  info.className = "flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between";
  const captionWrap = document.createElement("div");
  captionWrap.className = "min-w-0";
  const captionTitle = textNode("p", "truncate text-sm font-bold text-white");
  const captionMeta = textNode("p", "text-xs font-semibold text-white/50");
  captionWrap.append(captionTitle, captionMeta);

  const badges = document.createElement("div");
  badges.className = "flex flex-wrap gap-2";
  info.append(captionWrap, badges);

  // Thumbnails Strip
  const thumbs = document.createElement("section");
  thumbs.id = "pb_gallery_lightbox_thumbnails_section";
  thumbs.className = "flex min-w-0 gap-2 overflow-x-auto pb-1 scroll-smooth snap-x scrollbar-thin scrollbar-thumb-white/20";

  const thumbButtons = [];
  items.forEach((item, thumbIndex) => {
    const button = document.createElement("button");
    button.type = "button";
    button.id = `pb_gallery_lightbox_thumb_${safeId(item?.id ?? thumbIndex)}_button`;
    button.className = "h-14 w-20 shrink-0 overflow-hidden rounded-lg border bg-white/5 transition duration-200 hover:brightness-110 focus:outline-none snap-center";
    button.setAttribute("aria-label", `Preview gambar ${thumbIndex + 1}`);
    const imageNode = document.createElement("img");
    imageNode.className = "h-full w-full object-cover";
    imageNode.src = getSrc(item, thumbIndex);
    imageNode.alt = getAlt(item, thumbIndex);
    button.append(imageNode);
    button.addEventListener("click", () => {
      pauseSlideshow();
      goTo(thumbIndex);
    });
    thumbs.append(button);
    thumbButtons.push(button);
  });

  footer.append(info, thumbs);
  section.append(header, stage, footer);

  // --- INTERACTION LOGIC ---

  // Apply visual properties of active item
  function draw() {
    if (!items.length) {
      counter.textContent = "Tidak ada gambar";
      captionTitle.textContent = "-";
      captionMeta.textContent = "";
      image.src = "";
      image.style.display = "none";
      badges.replaceChildren();
      return;
    }

    const active = items[currentIndex];
    const src = getSrc(active, currentIndex);

    counter.textContent = `${currentIndex + 1} / ${items.length}`;
    captionTitle.textContent = getCaption(active, currentIndex) || "-";
    captionMeta.textContent = getMeta(active, currentIndex) || "";

    // Badges update
    badges.replaceChildren();
    const badgeItems = getBadges(active, currentIndex);
    if (badgeItems.length) {
      badgeItems.forEach((badge) => badges.append(Badge({ label: badge.label, variant: badge.variant ?? "default" })));
    }

    // Transition image fade
    image.style.opacity = "0.2";
    image.style.display = "block";
    image.src = src;
    image.alt = getAlt(active, currentIndex);

    image.onload = () => {
      image.style.opacity = "1";
    };

    // Update active thumb classes
    thumbButtons.forEach((btn, idx) => {
      if (idx === currentIndex) {
        btn.className = "h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--pb-brand-primary)] ring-2 ring-[var(--pb-brand-primary)]/40 scale-105 brightness-110 focus:outline-none snap-center transition duration-200";
        // Smooth scroll to active thumb
        btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      } else {
        btn.className = "h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5 opacity-60 hover:opacity-100 hover:scale-102 transition duration-200 focus:outline-none snap-center";
      }
    });

    // Reset Zoom
    resetZoom();
  }

  // Navigation functions
  function goTo(index) {
    currentIndex = clamp(index, 0, items.length - 1);
    draw();
    onSelect?.(currentIndex);
  }

  function navigate(direction) {
    if (!items.length) return;
    const nextIndex = (currentIndex + direction + items.length) % items.length;
    goTo(nextIndex);
  }

  // --- ZOOM & PAN FUNCTIONALITY ---
  function applyZoomTransform() {
    image.style.transform = `scale(${zoomLevel}) translate(${panX}px, ${panY}px)`;
    if (zoomLevel > 1) {
      zoomResetBtn.classList.remove("hidden");
    } else {
      zoomResetBtn.classList.add("hidden");
    }
  }

  function adjustZoom(factor) {
    zoomLevel = clamp(zoomLevel + factor, 1, 4);
    if (zoomLevel === 1) {
      panX = 0;
      panY = 0;
    }
    applyZoomTransform();
  }

  // Mouse Drag / Swipe Panning logic
  stage.addEventListener("mousedown", (e) => {
    if (zoomLevel <= 1) return;
    isDragging = true;
    startX = e.clientX - panX * zoomLevel;
    startY = e.clientY - panY * zoomLevel;
    stage.classList.replace("cursor-grab", "cursor-grabbing");
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    panX = (e.clientX - startX) / zoomLevel;
    panY = (e.clientY - startY) / zoomLevel;
    applyZoomTransform();
  });

  window.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      stage.classList.replace("cursor-grabbing", "cursor-grab");
    }
  });

  // Touch Panning
  stage.addEventListener("touchstart", (e) => {
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;

    if (zoomLevel > 1) {
      isDragging = true;
      startX = touch.clientX - panX * zoomLevel;
      startY = touch.clientY - panY * zoomLevel;
    }
  });

  stage.addEventListener("touchmove", (e) => {
    if (e.touches.length > 1) return; // ignore pinch zoom for simplicity
    const touch = e.touches[0];

    if (isDragging && zoomLevel > 1) {
      panX = (touch.clientX - startX) / zoomLevel;
      panY = (touch.clientY - startY) / zoomLevel;
      applyZoomTransform();
    }
  });

  stage.addEventListener("touchend", (e) => {
    if (isDragging) {
      isDragging = false;
      return;
    }

    // Swipe gesture check
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX;
    const diffY = touch.clientY - touchStartY;

    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 40) {
      pauseSlideshow();
      if (diffX > 0) {
        navigate(-1); // swipe right -> previous
      } else {
        navigate(1); // swipe left -> next
      }
    }
  });

  // Zoom Button listeners
  zoomInBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    adjustZoom(0.3);
  });

  zoomOutBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    adjustZoom(-0.3);
  });

  zoomResetBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    resetZoom();
  });

  // --- FULLSCREEN LOGIC ---
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      section.requestFullscreen?.()
        .then(() => {
          fullscreenBtn.replaceChildren(createCustomIcon("fa-solid fa-compress h-4 w-4 flex items-center justify-center"));
        })
        .catch((err) => {
          console.error("Gagal fullscreen:", err);
        });
    } else {
      document.exitFullscreen?.()
        .then(() => {
          fullscreenBtn.replaceChildren(createCustomIcon("fa-solid fa-expand h-4 w-4 flex items-center justify-center"));
        });
    }
  }

  fullscreenBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFullscreen();
  });

  // Sync fullscreen change state (e.g. if exited via Esc key)
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
      fullscreenBtn.replaceChildren(createCustomIcon("fa-solid fa-expand h-4 w-4 flex items-center justify-center"));
    } else {
      fullscreenBtn.replaceChildren(createCustomIcon("fa-solid fa-compress h-4 w-4 flex items-center justify-center"));
    }
  });

  // --- SLIDESHOW (AUTOPLAY) ---
  function startSlideshow() {
    isPlaying = true;
    playBtn.replaceChildren(createCustomIcon("fa-solid fa-pause h-4 w-4 flex items-center justify-center text-[var(--pb-brand-accent)]"));
    playBtn.title = "Pause Slideshow";
    slideshowTimer = window.setInterval(() => {
      navigate(1);
    }, 3000);
  }

  function pauseSlideshow() {
    isPlaying = false;
    playBtn.replaceChildren(createCustomIcon("fa-solid fa-play h-4 w-4 flex items-center justify-center"));
    playBtn.title = "Mulai Slideshow";
    if (slideshowTimer) {
      window.clearInterval(slideshowTimer);
      slideshowTimer = null;
    }
  }

  playBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isPlaying) {
      pauseSlideshow();
    } else {
      startSlideshow();
    }
  });

  // --- KEYBOARD CONTROLS ---
  function handleKeyDown(e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      pauseSlideshow();
      navigate(-1);
    } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      pauseSlideshow();
      navigate(1);
    } else if (e.key === "Escape") {
      handleClose();
    }
  }

  window.addEventListener("keydown", handleKeyDown);

  // --- CLEANUP ---
  function destroy() {
    pauseSlideshow();
    window.removeEventListener("keydown", handleKeyDown);
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  function handleClose() {
    destroy();
    onClose?.();
  }

  // Draw initial view
  window.setTimeout(draw, 0);

  return section;
}

export const galleryLightboxModalOptions = Object.freeze({
  size: "xl",
  footer: null,
  rootClassName: "!p-0 !bg-black/95 !backdrop-blur-xl",
  panelClassName: "!h-[100dvh] !max-h-[100dvh] !w-screen !max-w-none !rounded-none !border-0 !bg-black !shadow-none",
  bodyClassName: "min-h-0 flex-1 overflow-hidden p-0",
});

function navButton(id, icon, label, disabled, onClick) {
  const button = Button({ label: "", variant: "secondary", disabled, onClick: () => onClick?.() });
  button.id = id;
  button.className = "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur transition hover:bg-black/60 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none";
  button.setAttribute("aria-label", label);
  button.replaceChildren(createIcon(icon, { className: "h-5 w-5" }));
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

function createCustomIcon(classNames) {
  const i = document.createElement("i");
  i.className = classNames;
  return i;
}

function safeId(value) {
  return String(value ?? "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "item";
}
