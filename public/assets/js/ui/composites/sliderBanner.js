import { Button } from "../primitives/button.js";
import { createIcon } from "../../theme/iconRegistry.js";

const TEMPLATE_LABELS = {
  elegant_gradient: "Elegant Gradient Hero",
  glassmorphism: "Glassmorphism Banner",
  minimal_product: "Minimal Product Highlight",
  full_image: "Full Image Banner",
};

let styleInjected = false;

export function SliderBanner({
  sliders = [],
  fallback = null,
  idPrefix = "sld",
  context = "public",
  onNavigate = null,
  resolveCtaUrl = null,
} = {}) {
  const items = normalizeSliders(sliders);

  if (!items.length) {
    return typeof fallback === "function" ? fallback() : fallback;
  }

  injectSliderStyles();
  const slider = items[0];
  const templateKey = templateKeyFor(slider);
  const usesSidePeek = ["public", "buyer"].includes(context) && items.length > 1;
  const sliderId = `${idPrefix}_slider_banner`;
  const section = document.createElement("section");
  section.id = sliderId;
  section.className = [
    "pb-slider-banner",
    usesSidePeek ? "pb-slider-side-peek" : "",
    usesSidePeek ? "pb-slider-layout-pending" : "",
    `pb-slider-${templateKey}`,
    `pb-slider-anim-${animationKeyFor(slider)}`,
    context === "buyer" ? "pb-slider-context-buyer" : "pb-slider-context-public",
  ].join(" ");
  section.dataset.ds = `${context}.slider.banner`;
  section.dataset.template = templateKey;

  const track = document.createElement("section");
  track.className = "pb-slider-track";
  const renderedItems = usesSidePeek
    ? [items[items.length - 1], ...items, items[0]]
    : items;
  const slideNodes = renderedItems.map((item, renderedIndex) => {
    const slide = document.createElement("section");
    slide.className = "pb-slider-item";
    slide.dataset.sliderItemIndex = String(usesSidePeek ? wrapIndex(renderedIndex - 1, items.length) : renderedIndex);
    slide.append(slideTemplate(item, {
      idPrefix,
      onNavigate,
      resolveCtaUrl,
      count: items.length,
    }));
    return slide;
  });
  track.append(...slideNodes);

  const dotsWrap = carouselDots(items.length, 0);
  let activeIndex = 0;
  let renderedIndex = usesSidePeek ? 1 : 0;
  let timerId = null;
  let resizeTimerId = null;
  const handleResize = () => {
    window.clearTimeout(resizeTimerId);
    resizeTimerId = window.setTimeout(() => applyTrackPosition(0, false), 80);
  };

  const applyTrackPosition = (dragOffset = 0, animated = true) => {
    const activeSlide = slideNodes[renderedIndex];
    if (!activeSlide) return;
    const sidePeekOffset = usesSidePeek
      ? (section.clientWidth - activeSlide.offsetWidth) / 2
      : 0;
    track.style.transition = animated ? "" : "none";
    track.style.transform = `translate3d(${dragOffset + sidePeekOffset - activeSlide.offsetLeft}px,0,0)`;
  };

  const renderActiveSlide = (nextIndex, direction = "initial", animated = true, targetRenderedIndex = null) => {
    activeIndex = wrapIndex(nextIndex, items.length);
    renderedIndex = targetRenderedIndex ?? (usesSidePeek ? activeIndex + 1 : activeIndex);
    const activeSlider = items[activeIndex];
    const activeTemplateKey = templateKeyFor(activeSlider);
    const directionClass = direction === "prev"
      ? "pb-slider-direction-prev"
      : direction === "next"
        ? "pb-slider-direction-next"
        : "";
    section.dataset.template = activeTemplateKey;
    section.className = [
      "pb-slider-banner",
      usesSidePeek ? "pb-slider-side-peek" : "",
      usesSidePeek && section.classList.contains("pb-slider-layout-pending") ? "pb-slider-layout-pending" : "",
      `pb-slider-${activeTemplateKey}`,
      `pb-slider-anim-${animationKeyFor(activeSlider)}`,
      directionClass,
      context === "buyer" ? "pb-slider-context-buyer" : "pb-slider-context-public",
    ].filter(Boolean).join(" ");
    slideNodes.forEach((slide, index) => {
      const isActive = index === renderedIndex;
      const isBeforeActive = usesSidePeek && index === renderedIndex - 1;
      const isAfterActive = usesSidePeek && index === renderedIndex + 1;
      slide.classList.toggle("pb-slider-item-active", isActive);
      slide.classList.toggle("pb-slider-item-before-active", isBeforeActive);
      slide.classList.toggle("pb-slider-item-after-active", isAfterActive);
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
    applyTrackPosition(0, animated);
    syncCarouselDots(dotsWrap, activeIndex);
  };

  const snapInfiniteEdge = () => {
    if (!usesSidePeek) return;
    if (renderedIndex === 0) {
      renderActiveSlide(items.length - 1, "initial", false, items.length);
      return;
    }
    if (renderedIndex === items.length + 1) {
      renderActiveSlide(0, "initial", false, 1);
    }
  };

  const next = () => {
    const nextRenderedIndex = usesSidePeek ? renderedIndex + 1 : activeIndex + 1;
    renderActiveSlide(activeIndex + 1, "next", true, nextRenderedIndex);
  };
  const previous = () => {
    const nextRenderedIndex = usesSidePeek ? renderedIndex - 1 : activeIndex - 1;
    renderActiveSlide(activeIndex - 1, "prev", true, nextRenderedIndex);
  };
  const goNextFromInteraction = () => {
    next();
    scheduleNext();
  };
  const goPreviousFromInteraction = () => {
    previous();
    scheduleNext();
  };
  const scheduleNext = () => {
    clearTimer();
    if (items.length <= 1) return;
    timerId = window.setTimeout(() => {
      next();
      scheduleNext();
    }, 5200);
  };
  const clearTimer = () => {
    if (!timerId) return;
    window.clearTimeout(timerId);
    timerId = null;
  };

  dotsWrap.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-slider-index]");
    if (!button) return;
    const nextIndex = Number(button.dataset.sliderIndex);
    renderActiveSlide(nextIndex, nextIndex < activeIndex ? "prev" : "next", true, usesSidePeek ? nextIndex + 1 : nextIndex);
    scheduleNext();
  });

  bindSliderDrag(section, track, {
    enabled: items.length > 1,
    slideCount: items.length,
    getActiveIndex: () => activeIndex,
    onDrag: (offset) => applyTrackPosition(offset, false),
    onSnapBack: () => applyTrackPosition(0, true),
    onNext: goNextFromInteraction,
    onPrevious: goPreviousFromInteraction,
  });

  section.dispose = () => {
    clearTimer();
    window.clearTimeout(resizeTimerId);
    window.removeEventListener("resize", handleResize);
  };
  section.addEventListener("pb-slider:pause", clearTimer);
  section.addEventListener("pb-slider:resume", scheduleNext);
  window.addEventListener("resize", handleResize);
  track.addEventListener("transitionend", (event) => {
    if (event.target !== track || event.propertyName !== "transform") return;
    snapInfiniteEdge();
  });
  section.append(track, dotsWrap);
  renderActiveSlide(0, "initial", false);
  if (usesSidePeek) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applyTrackPosition(0, false);
        section.classList.remove("pb-slider-layout-pending");
      });
    });
  }
  scheduleNext();

  return section;
}

export function sliderTemplateOptions() {
  return Object.entries(TEMPLATE_LABELS).map(([value, label]) => ({ value, label }));
}

export function sliderPositionOptions() {
  return [
    { value: "landing_hero", label: "Landing Hero" },
    { value: "buyer_home", label: "Buyer Home" },
    { value: "public_home", label: "Public Home" },
  ];
}

export function sliderAnimationOptions() {
  return [
    { value: "fade", label: "Fade" },
    { value: "slide", label: "Slide" },
    { value: "zoom", label: "Zoom" },
    { value: "rise", label: "Rise" },
    { value: "none", label: "None" },
  ];
}

function elegantGradientTemplate(slider, { idPrefix, onNavigate, resolveCtaUrl, count }) {
  const wrap = document.createElement("section");
  wrap.className = "pb-slider-inner pb-slider-gradient-inner";

  const copy = document.createElement("section");
  copy.className = "pb-slider-copy";
  copy.append(
    pill("Promo utama", "sparkles"),
    textNode("h1", "pb-slider-title", slider.title || "Promo pilihan"),
    textNode("p", "pb-slider-description", slider.description || slider.body_text || "Konten promo terbaru tersedia untuk katalog pilihan."),
    ctaButton(slider, { idPrefix, onNavigate, resolveCtaUrl }),
  );

  const media = imagePanel(slider, "pb-slider-image-panel");
  wrap.append(copy, media);
  return wrap;
}

function glassmorphismTemplate(slider, { idPrefix, onNavigate, resolveCtaUrl, count }) {
  const wrap = document.createElement("section");
  wrap.className = "pb-slider-inner pb-slider-glass-inner";

  const media = imagePanel(slider, "pb-slider-image-panel pb-slider-floating-media");
  const card = document.createElement("section");
  card.className = "pb-slider-glass-card";
  card.append(
    pill("Buyer banner", "crown"),
    textNode("h1", "pb-slider-title", slider.title || "Rekomendasi premium"),
    textNode("p", "pb-slider-description", slider.description || slider.body_text || "Banner personal untuk highlight terbaru."),
    ctaButton(slider, { idPrefix, onNavigate, resolveCtaUrl }),
  );

  wrap.append(media, card);
  return wrap;
}

function minimalProductTemplate(slider, { idPrefix, onNavigate, resolveCtaUrl, count }) {
  const wrap = document.createElement("section");
  wrap.className = "pb-slider-inner pb-slider-minimal-inner";
  wrap.append(
    imagePanel(slider, "pb-slider-image-panel pb-slider-product-media"),
    productCopy(slider, { idPrefix, onNavigate, resolveCtaUrl }),
  );
  return wrap;
}

function slideTemplate(slider, options) {
  const templateKey = templateKeyFor(slider);
  if (templateKey === "full_image") {
    return fullImageTemplate(slider);
  }
  if (templateKey === "glassmorphism") {
    return glassmorphismTemplate(slider, options);
  }
  if (templateKey === "minimal_product") {
    return minimalProductTemplate(slider, options);
  }
  return elegantGradientTemplate(slider, options);
}

function fullImageTemplate(slider) {
  const wrap = document.createElement("section");
  wrap.className = "pb-slider-inner pb-slider-full-image-inner";
  wrap.append(imagePanel(slider, "pb-slider-full-image-panel"));
  return wrap;
}

function productCopy(slider, { idPrefix, onNavigate, resolveCtaUrl }) {
  const copy = document.createElement("section");
  copy.className = "pb-slider-copy pb-slider-product-copy";
  copy.append(
    pill("Featured collection", "tag"),
    textNode("h1", "pb-slider-title", slider.title || "Pilihan unggulan"),
    textNode("p", "pb-slider-description", slider.description || slider.body_text || "Highlight produk terbaru dengan tampilan bersih."),
    ctaButton(slider, { idPrefix, onNavigate, resolveCtaUrl }),
  );
  return copy;
}

function imagePanel(slider, className) {
  const media = document.createElement("section");
  media.className = className;
  const imageUrl = normalizeImageUrl(slider.image_url);

  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = slider.image_alt || slider.title || "Slider image";
    image.loading = "eager";
    image.className = "pb-slider-image";
    media.append(image);
  } else {
    media.append(createIcon("car", { className: "pb-slider-placeholder-icon" }));
  }

  return media;
}

function ctaButton(slider, { idPrefix, onNavigate, resolveCtaUrl }) {
  const text = slider.cta_text || "Lihat Detail";
  const url = typeof resolveCtaUrl === "function"
    ? String(resolveCtaUrl(slider.cta_url || "", slider) || "").trim()
    : String(slider.cta_url || "").trim();
  const button = Button({
    label: text,
    variant: "primary",
    onClick: () => {
      if (!url) return;
      if (url.startsWith("#/")) {
        onNavigate?.(url.slice(1));
        if (!onNavigate) window.location.hash = url;
        return;
      }
      window.location.href = url;
    },
    designHook: "shared.button.primary",
  });
  button.id = `${idPrefix}_slider_cta_button`;
  button.classList.add("pb-slider-cta");
  button.append(createIcon("arrowRight", { className: "block h-4 w-4 leading-none" }));
  return button;
}

function pill(label, icon) {
  const node = document.createElement("span");
  node.className = "pb-slider-pill";
  node.append(createIcon(icon, { className: "block h-3.5 w-3.5 leading-none" }), document.createTextNode(label));
  return node;
}

function carouselDots(count, activeIndex = 0) {
  const wrap = document.createElement("section");
  wrap.className = "pb-slider-dots";
  Array.from({ length: Math.max(1, Math.min(Number(count || 1), 5)) }).forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = index === activeIndex ? "pb-slider-dot pb-slider-dot-active" : "pb-slider-dot";
    dot.dataset.sliderIndex = String(index);
    dot.setAttribute("aria-label", `Tampilkan slider ${index + 1}`);
    dot.setAttribute("aria-current", index === activeIndex ? "true" : "false");
    wrap.append(dot);
  });
  return wrap;
}

function bindSliderDrag(section, track, {
  enabled,
  slideCount,
  getActiveIndex,
  onDrag,
  onSnapBack,
  onNext,
  onPrevious,
}) {
  if (!enabled) {
    return;
  }

  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let tracking = false;
  let dragging = false;
  let activeTouchId = null;
  const minSwipeDistance = 48;
  const maxVerticalDrift = 64;

  section.classList.add("pb-slider-swipeable");

  const isInteractiveTarget = (target) => target?.closest?.("button,a,input,select,textarea");

  const beginDrag = (clientX, clientY, target) => {
    if (isInteractiveTarget(target)) {
      return;
    }
    tracking = true;
    dragging = false;
    startX = clientX;
    startY = clientY;
    lastX = clientX;
    section.dispatchEvent(new CustomEvent("pb-slider:pause"));
  };

  const moveDrag = (clientX, clientY) => {
    if (!tracking) {
      return false;
    }

    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    lastX = clientX;

    if (!dragging && Math.abs(deltaY) > maxVerticalDrift && Math.abs(deltaY) > Math.abs(deltaX)) {
      tracking = false;
      onSnapBack();
      section.dispatchEvent(new CustomEvent("pb-slider:resume"));
      return false;
    }

    if (Math.abs(deltaX) < 8) {
      return false;
    }

    dragging = true;
    track.classList.add("pb-slider-track-dragging");
    onDrag(resistanceOffset(deltaX, getActiveIndex(), slideCount));
    return true;
  };

  const endDrag = (clientY) => {
    if (!tracking) {
      return;
    }
    tracking = false;
    track.classList.remove("pb-slider-track-dragging");
    const deltaX = lastX - startX;
    const deltaY = clientY - startY;

    if (Math.abs(deltaX) < minSwipeDistance || Math.abs(deltaY) > maxVerticalDrift) {
      onSnapBack();
      section.dispatchEvent(new CustomEvent("pb-slider:resume"));
      return;
    }

    if (deltaX < 0) {
      onNext();
      return;
    }
    onPrevious();
  };

  const cancelDrag = () => {
    tracking = false;
    dragging = false;
    track.classList.remove("pb-slider-track-dragging");
    onSnapBack();
    section.dispatchEvent(new CustomEvent("pb-slider:resume"));
  };

  section.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    beginDrag(event.clientX, event.clientY, event.target);
    if (tracking && section.setPointerCapture) {
      section.setPointerCapture(event.pointerId);
    }
  });

  section.addEventListener("pointermove", (event) => {
    if (moveDrag(event.clientX, event.clientY)) {
      event.preventDefault();
    }
  });

  section.addEventListener("pointerup", (event) => {
    endDrag(event.clientY);
    if (section.hasPointerCapture?.(event.pointerId)) {
      section.releasePointerCapture(event.pointerId);
    }
  });

  section.addEventListener("pointercancel", (event) => {
    cancelDrag();
    if (section.hasPointerCapture?.(event.pointerId)) {
      section.releasePointerCapture(event.pointerId);
    }
  });

  section.addEventListener("touchstart", (event) => {
    if (activeTouchId !== null || !event.changedTouches.length) {
      return;
    }
    const touch = event.changedTouches[0];
    activeTouchId = touch.identifier;
    beginDrag(touch.clientX, touch.clientY, event.target);
  }, { passive: true });

  section.addEventListener("touchmove", (event) => {
    if (activeTouchId === null) {
      return;
    }
    const touch = findTouch(event.changedTouches, activeTouchId);
    if (!touch) {
      return;
    }
    if (moveDrag(touch.clientX, touch.clientY)) {
      event.preventDefault();
    }
  }, { passive: false });

  section.addEventListener("touchend", (event) => {
    if (activeTouchId === null) {
      return;
    }
    const touch = findTouch(event.changedTouches, activeTouchId);
    if (!touch) {
      return;
    }
    activeTouchId = null;
    endDrag(touch.clientY);
  }, { passive: true });

  section.addEventListener("touchcancel", () => {
    activeTouchId = null;
    cancelDrag();
  }, { passive: true });
}

function findTouch(touches, identifier) {
  return Array.from(touches).find((touch) => touch.identifier === identifier) ?? null;
}

function resistanceOffset(deltaX, activeIndex, slideCount) {
  const atFirstSlide = activeIndex <= 0;
  const atLastSlide = activeIndex >= slideCount - 1;
  if ((atFirstSlide && deltaX > 0) || (atLastSlide && deltaX < 0)) {
    return deltaX * 0.32;
  }
  return deltaX;
}

function syncCarouselDots(wrap, activeIndex) {
  wrap.querySelectorAll("[data-slider-index]").forEach((dot) => {
    const active = Number(dot.dataset.sliderIndex) === Number(activeIndex);
    dot.className = active ? "pb-slider-dot pb-slider-dot-active" : "pb-slider-dot";
    dot.setAttribute("aria-current", active ? "true" : "false");
  });
}

function normalizeSliders(sliders) {
  return (Array.isArray(sliders) ? sliders : [])
    .filter(Boolean)
    .filter((slider) => slider.is_active !== false)
    .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
    .slice(0, 5);
}

function wrapIndex(index, total) {
  if (total <= 0) return 0;
  return ((Number(index) % total) + total) % total;
}

function templateKeyFor(slider) {
  return Object.prototype.hasOwnProperty.call(TEMPLATE_LABELS, slider?.template_key)
    ? slider.template_key
    : "elegant_gradient";
}

function animationKeyFor(slider) {
  const key = String(slider?.animation_key || "fade");
  return ["fade", "slide", "zoom", "rise", "none"].includes(key) ? key : "fade";
}

function normalizeImageUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) return "";
  if (/^(https?:|data:|blob:)/.test(value) || value.startsWith("/")) return value;
  return `/${value}`;
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}

function injectSliderStyles() {
  if (styleInjected || typeof document === "undefined") {
    return;
  }
  styleInjected = true;
  const style = document.createElement("style");
  style.id = "pb-slider-banner-styles";
  style.textContent = `
    .pb-slider-banner{position:relative;overflow:hidden;aspect-ratio:16/5;border-radius:24px;box-shadow:0 22px 58px rgba(15,23,42,.11)}
    .pb-slider-side-peek{border-radius:0;box-shadow:none}
    .pb-slider-layout-pending{visibility:hidden}
    .pb-slider-swipeable{touch-action:pan-y;cursor:grab}
    .pb-slider-swipeable:active{cursor:grabbing}
    .pb-slider-track{position:absolute;inset:0;display:flex;gap:16px;overflow:visible;will-change:transform;transition:transform .46s cubic-bezier(.2,.8,.2,1)}
    .pb-slider-track-dragging{transition:none}
    .pb-slider-item{position:relative;flex:0 0 78%;height:100%;overflow:hidden;border-radius:14px;transform:scale(1);opacity:1;transition:opacity .24s ease,transform .24s ease}
    .pb-slider-item-before-active{border-radius:0 14px 14px 0}
    .pb-slider-item-after-active{border-radius:14px 0 0 14px}
    .pb-slider-item-active{border-radius:14px;box-shadow:0 22px 58px rgba(15,23,42,.11);transform:scale(1);opacity:1}
    .pb-slider-inner{position:absolute;inset:0;padding:24px;display:grid;grid-template-columns:minmax(0,58%) minmax(112px,42%);align-items:center;gap:18px;isolation:isolate}
    #pubcat_slider_banner .pb-slider-inner{padding-top:18px;padding-bottom:18px}
    .pb-slider-gradient-inner{background:linear-gradient(135deg,#eab676 0%,#c53030 48%,#111827 100%);color:#fff}
    .pb-slider-glass-inner{grid-template-columns:minmax(112px,42%) minmax(0,58%);background:linear-gradient(135deg,#f8fafc 0%,#f5ece1 54%,#e0eff7 100%);color:#111827}
    .pb-slider-minimal-inner{background:#fff;color:#111827;border:1px solid rgba(226,232,240,.9)}
    .pb-slider-full-image-inner{display:block;padding:0;background:#111827}
    .pb-slider-copy{position:relative;z-index:2;display:grid;align-content:center;justify-items:start;gap:10px;min-width:0;max-width:560px}
    .pb-slider-title{font-size:30px;line-height:1.08;font-weight:900;letter-spacing:0;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .pb-slider-description{max-width:32rem;font-size:14px;line-height:1.5;font-weight:650;color:currentColor;opacity:.82;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .pb-slider-pill{display:inline-flex;align-items:center;gap:7px;max-width:100%;border-radius:999px;background:rgba(255,255,255,.16);padding:7px 11px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0;color:currentColor;white-space:nowrap}
    .pb-slider-image-panel{position:relative;z-index:1;display:grid;place-items:center;height:100%;min-height:0;border-radius:24px;background:rgba(255,255,255,.15);overflow:hidden}
    .pb-slider-image{display:block;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 24px 28px rgba(15,23,42,.22))}
    .pb-slider-full-image-panel{position:absolute;inset:0;display:block;border-radius:inherit;background:#111827;overflow:hidden}
    .pb-slider-full-image-panel .pb-slider-image{width:100%;height:100%;object-fit:cover;filter:none}
    .pb-slider-full-image-panel .pb-slider-placeholder-icon{position:absolute;inset:0;display:grid;place-items:center;color:#fff}
    .pb-slider-placeholder-icon{font-size:72px;opacity:.24}
    .pb-slider-glass-card{position:relative;z-index:2;display:grid;align-content:center;justify-items:start;gap:10px;min-width:0;border:1px solid rgba(255,255,255,.72);background:rgba(255,255,255,.58);border-radius:22px;padding:18px;box-shadow:0 18px 48px rgba(15,23,42,.10);backdrop-filter:blur(18px)}
    .pb-slider-product-copy{padding:0}
    .pb-slider-product-media{order:2}
    .pb-slider-product-copy{order:1}
    .pb-slider-cta{box-shadow:0 0 0 rgba(30,129,176,0);transition:transform .18s ease,box-shadow .18s ease,filter .18s ease}
    .pb-slider-cta:hover{transform:translateY(-1px);box-shadow:0 14px 34px rgba(30,129,176,.28);filter:brightness(1.02)}
    .pb-slider-dots{position:absolute;left:0;right:0;bottom:18px;z-index:3;display:flex;justify-content:center;gap:8px}
    .pb-slider-dot{width:9px;height:9px;border:0;border-radius:999px;background:rgba(255,255,255,.56);padding:0;cursor:pointer;transition:width .22s ease,background .22s ease,transform .22s ease}
    .pb-slider-dot:hover{transform:translateY(-1px);background:rgba(255,255,255,.78)}
    .pb-slider-dot-active{width:24px;background:#1e81b0}
    .pb-slider-minimal-inner .pb-slider-dot{background:#cbd5e1}.pb-slider-minimal-inner .pb-slider-dot-active{background:#1e81b0}
    .pb-slider-anim-fade .pb-slider-copy,.pb-slider-anim-fade .pb-slider-glass-card{animation:pbSliderFade .45s ease both}
    .pb-slider-anim-slide .pb-slider-copy,.pb-slider-anim-slide .pb-slider-glass-card{animation:pbSliderSlide .48s ease both}
    .pb-slider-anim-zoom .pb-slider-image{animation:pbSliderZoom .62s ease both}
    .pb-slider-anim-rise .pb-slider-copy,.pb-slider-anim-rise .pb-slider-glass-card{animation:pbSliderRise .48s ease both}
    .pb-slider-floating-media{animation:pbSliderFloat 4.8s ease-in-out infinite}
    .pb-slider-direction-next .pb-slider-item-active .pb-slider-inner{animation:pbSliderCarouselNext .58s cubic-bezier(.2,.8,.2,1) both}
    .pb-slider-direction-prev .pb-slider-item-active .pb-slider-inner{animation:pbSliderCarouselPrev .58s cubic-bezier(.2,.8,.2,1) both}
    @keyframes pbSliderFade{from{opacity:0}to{opacity:1}}
    @keyframes pbSliderSlide{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:translateX(0)}}
    @keyframes pbSliderZoom{from{opacity:.82;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
    @keyframes pbSliderRise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pbSliderFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
    @keyframes pbSliderCarouselNext{0%{opacity:0;transform:translateX(24px) scale(.985);filter:blur(4px)}100%{opacity:1;transform:translateX(0) scale(1);filter:blur(0)}}
    @keyframes pbSliderCarouselPrev{0%{opacity:0;transform:translateX(-24px) scale(.985);filter:blur(4px)}100%{opacity:1;transform:translateX(0) scale(1);filter:blur(0)}}
    @media (max-width:640px){.pb-slider-banner{aspect-ratio:16/6.4;border-radius:16px}.pb-slider-side-peek{border-radius:0}.pb-slider-item{flex-basis:78%;border-radius:12px}.pb-slider-item-before-active{border-radius:0 12px 12px 0}.pb-slider-item-after-active{border-radius:12px 0 0 12px}.pb-slider-item-active{border-radius:12px}.pb-slider-track{gap:10px}.pb-slider-context-buyer:not(.pb-slider-side-peek){aspect-ratio:auto;min-height:250px}.pb-slider-inner{grid-template-columns:minmax(0,58%) minmax(86px,42%);gap:9px;padding:12px}#pubcat_slider_banner .pb-slider-inner,#byr_slider_banner .pb-slider-inner{padding-top:9px;padding-bottom:9px}.pb-slider-context-buyer:not(.pb-slider-side-peek) .pb-slider-inner{grid-template-columns:1fr;grid-template-rows:minmax(78px,42%) minmax(0,1fr);align-content:start;gap:7px;padding:11px 12px 28px}.pb-slider-context-buyer:not(.pb-slider-side-peek) .pb-slider-glass-inner,.pb-slider-context-buyer:not(.pb-slider-side-peek) .pb-slider-minimal-inner{grid-template-columns:1fr;grid-template-rows:minmax(78px,42%) minmax(0,1fr)}.pb-slider-context-buyer:not(.pb-slider-side-peek) .pb-slider-image-panel,.pb-slider-context-buyer:not(.pb-slider-side-peek) .pb-slider-product-media{order:1;min-height:0;aspect-ratio:16/7;width:100%;height:auto}.pb-slider-context-buyer:not(.pb-slider-side-peek) .pb-slider-copy,.pb-slider-context-buyer:not(.pb-slider-side-peek) .pb-slider-glass-card,.pb-slider-context-buyer:not(.pb-slider-side-peek) .pb-slider-product-copy{order:2}.pb-slider-full-image-inner{padding:0}.pb-slider-glass-inner{grid-template-columns:minmax(86px,42%) minmax(0,58%)}.pb-slider-copy,.pb-slider-glass-card{gap:6px}.pb-slider-context-buyer .pb-slider-copy,.pb-slider-context-buyer .pb-slider-glass-card{gap:4px;max-width:100%}.pb-slider-title{font-size:16px;line-height:1.08}.pb-slider-context-buyer .pb-slider-title{font-size:14px;line-height:1.08;-webkit-line-clamp:2}.pb-slider-description{font-size:10px;line-height:1.32}.pb-slider-context-buyer .pb-slider-description{font-size:9px;line-height:1.25;-webkit-line-clamp:1}.pb-slider-pill{padding:4px 7px;font-size:8px}.pb-slider-context-buyer .pb-slider-pill{padding:3px 6px;font-size:7px}.pb-slider-glass-card{border-radius:14px;padding:10px}.pb-slider-context-buyer .pb-slider-glass-card{padding:8px}.pb-slider-image-panel{border-radius:14px}.pb-slider-full-image-panel{border-radius:inherit}.pb-slider-cta{min-height:30px!important;padding:5px 9px!important;font-size:10px!important}.pb-slider-context-buyer .pb-slider-cta{min-height:26px!important;padding:4px 8px!important;font-size:9px!important}.pb-slider-dots{bottom:8px}.pb-slider-dot{width:6px;height:6px}.pb-slider-dot-active{width:16px}}
    @media (min-width:641px) and (max-width:1023px){.pb-slider-banner{aspect-ratio:16/7.2}.pb-slider-item{flex-basis:78%;border-radius:14px}.pb-slider-item-before-active{border-radius:0 14px 14px 0}.pb-slider-item-after-active{border-radius:14px 0 0 14px}.pb-slider-item-active{border-radius:14px}.pb-slider-track{gap:14px}.pb-slider-inner{padding:20px;gap:14px}#pubcat_slider_banner .pb-slider-inner{padding-top:15px;padding-bottom:15px}.pb-slider-title{font-size:24px}.pb-slider-description{font-size:13px}.pb-slider-glass-card{padding:15px}}
    @media (prefers-reduced-motion:reduce){.pb-slider-banner *{animation:none!important;transition:none!important}}
  `;
  document.head.append(style);
}
