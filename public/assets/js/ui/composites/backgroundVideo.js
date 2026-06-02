const STYLE_ID = "pb-background-video-style";
const DEFAULT_SRC = "assets/images/bg-vid.mp4";

export function createBackgroundVideoLayer({
  src = DEFAULT_SRC,
  id = "",
  className = "",
  fallbackClassName = "bg-[var(--pb-page-bg)]",
  overlayClassName = "",
  preload = "metadata",
} = {}) {
  ensureBackgroundVideoStyles();

  const root = document.createElement("section");
  if (id) {
    root.id = id;
  }
  root.className = ["pb-background-video", className].filter(Boolean).join(" ");
  root.setAttribute("aria-hidden", "true");

  const fallback = document.createElement("span");
  fallback.className = ["pb-background-video__fallback", fallbackClassName].filter(Boolean).join(" ");
  root.append(fallback);

  const video = document.createElement("video");
  video.className = "pb-background-video__media";
  video.autoplay = true;
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;
  video.playsInline = true;
  video.preload = preload;
  video.tabIndex = -1;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  video.setAttribute("aria-hidden", "true");

  const overlay = document.createElement("span");
  overlay.className = ["pb-background-video__overlay", overlayClassName].filter(Boolean).join(" ");

  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  let disposed = false;
  let idleHandle = null;
  let timeoutHandle = null;

  const markReady = () => {
    if (!disposed) {
      root.classList.add("is-ready");
      video.play?.().catch(() => {});
    }
  };

  const markError = () => {
    if (!disposed) {
      root.classList.add("is-error");
      console.warn?.("Background video failed to load; fallback background remains active.");
    }
  };

  const attachSource = () => {
    if (disposed || prefersReducedMotion) {
      return;
    }
    if (!video.querySelector("source")) {
      const source = document.createElement("source");
      source.src = src;
      source.type = "video/mp4";
      video.append(source);
    }
    video.load();
  };

  video.addEventListener("loadeddata", markReady);
  video.addEventListener("canplay", markReady);
  video.addEventListener("error", markError);

  root.append(video, overlay);

  if (prefersReducedMotion) {
    root.classList.add("is-reduced-motion");
  } else if (typeof window.requestIdleCallback === "function") {
    idleHandle = window.requestIdleCallback(attachSource, { timeout: 1200 });
  } else {
    timeoutHandle = window.setTimeout(attachSource, 0);
  }

  root.dispose = () => {
    disposed = true;
    if (idleHandle && typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(idleHandle);
    }
    if (timeoutHandle) {
      window.clearTimeout(timeoutHandle);
    }
    video.pause?.();
    video.removeAttribute("src");
    video.replaceChildren();
    video.load?.();
  };
  root.setEnabled = (enabled) => {
    if (disposed) {
      return;
    }
    if (!enabled) {
      video.pause?.();
      return;
    }
    if (root.classList.contains("is-ready")) {
      video.play?.().catch(() => {});
    }
  };

  return root;
}

export function backgroundVideoSrc() {
  return DEFAULT_SRC;
}

function ensureBackgroundVideoStyles() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .pb-background-video {
      position: fixed;
      inset: 0;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
      user-select: none;
    }

    .pb-background-video__fallback,
    .pb-background-video__media,
    .pb-background-video__overlay {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .pb-background-video__fallback {
      z-index: 0;
    }

    .pb-background-video__media {
      z-index: 1;
      object-fit: cover;
      opacity: 0;
      transition: opacity 420ms ease;
    }

    .pb-background-video__overlay {
      z-index: 2;
    }

    .pb-background-video.is-ready .pb-background-video__media {
      opacity: 1;
    }

    .pb-background-video.is-error .pb-background-video__media,
    .pb-background-video.is-reduced-motion .pb-background-video__media {
      opacity: 0;
    }

    .pb-bgv-buyer-content {
      --pb-text: #ffffff;
      --pb-text-strong: #ffffff;
      --pb-text-muted: rgba(255, 255, 255, 0.78);
      --pb-page-bg: transparent;
    }

    .pb-bgv-buyer-content [class*="bg-[var(--pb-surface-card)]"],
    .pb-bgv-buyer-content [class*="bg-[var(--pb-surface-muted)]"],
    .pb-bgv-buyer-content [class*="bg-[var(--pb-surface-inset)]"],
    .pb-bgv-buyer-content [class*="bg-[var(--pb-form-search-bg)]"],
    .pb-bgv-buyer-content [class*="var(--pb-surface-card)"],
    .pb-bgv-buyer-content [class*="var(--pb-surface-muted)"],
    .pb-bgv-buyer-content [class*="var(--pb-surface-inset)"],
    .pb-bgv-buyer-content [class*="var(--pb-form-search-bg)"],
    .pb-bgv-buyer-content [class*="bg-[color-mix(in_srgb,var(--pb-surface-card)"],
    .pb-bgv-buyer-content [class*="bg-white"],
    .pb-bgv-buyer-content [class*="bg-gray-"],
    .pb-bgv-buyer-content [class*="bg-orange-"],
    .pb-bgv-buyer-content [class*="bg-green-"],
    .pb-bgv-buyer-content [class*="bg-amber-"],
    .pb-bgv-buyer-content [class*="bg-red-"] {
      --pb-text: #111827;
      --pb-text-strong: #374151;
      --pb-text-muted: #6b7280;
    }
  `;
  document.head.append(style);
}
