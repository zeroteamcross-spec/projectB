import { registryItem } from "../modules/admin/designStudioRegistry.js";

const STYLE_NODE_ID = "pb-design-studio-preview-runtime";
let activeTarget = "";
let activeStyles = {};

export function bindDesignStudioPreviewRuntime() {
  window.addEventListener("message", handleDesignStudioMessage);
}

function handleDesignStudioMessage(event) {
  if (event.origin !== window.location.origin) {
    return;
  }

  const type = event.data?.type;
  const payload = event.data?.payload ?? {};

  if (type === "DESIGN_STUDIO_SCAN_DATA_DS") {
    postToParent("DESIGN_STUDIO_DATA_DS_LIST", { items: scanDataDs() });
    return;
  }

  if (type === "DESIGN_STUDIO_HIGHLIGHT") {
    highlight(payload.target);
    return;
  }

  if (type === "DESIGN_STUDIO_APPLY_OVERRIDE") {
    applyOverride(payload.target, payload.styles);
    return;
  }

  if (type === "DESIGN_STUDIO_RESET_OVERRIDE") {
    resetOverride();
  }
}

function scanDataDs() {
  return Array.from(document.querySelectorAll("[data-ds]")).map((node) => {
    const rect = node.getBoundingClientRect();
    const key = node.getAttribute("data-ds") || "";
    const registered = registryItem(key);
    return {
      key,
      tagName: node.tagName.toLowerCase(),
      visible: rect.width > 0 && rect.height > 0,
      registered: Boolean(registered),
      editable: Boolean(registered?.editable),
    };
  });
}

function highlight(target) {
  activeTarget = String(target || "").trim();
  renderStyle();
  const node = document.querySelector(`[data-ds="${cssEscape(activeTarget)}"]`);
  node?.scrollIntoView?.({ block: "center", inline: "center", behavior: "smooth" });
}

function applyOverride(target, styles = {}) {
  activeTarget = String(target || "").trim();
  activeStyles = sanitizeStyles(activeTarget, styles);
  renderStyle();
}

function resetOverride() {
  activeStyles = {};
  activeTarget = "";
  const node = document.getElementById(STYLE_NODE_ID);
  node?.remove();
}

function sanitizeStyles(target, styles) {
  const entry = registryItem(target);
  if (!entry?.editable) {
    return {};
  }
  const allowed = new Set(entry.allowedStyles || []);
  return Object.fromEntries(
    Object.entries(styles || {})
      .filter(([key, value]) => allowed.has(key) && safeValue(value))
      .map(([key, value]) => [key, String(value).trim()])
  );
}

function safeValue(value) {
  const next = String(value ?? "").trim();
  return next && next.length <= 80 && !/[;{}<>]/.test(next) && !/url\s*\(|expression\s*\(/i.test(next);
}

function renderStyle() {
  let node = document.getElementById(STYLE_NODE_ID);
  if (!node) {
    node = document.createElement("style");
    node.id = STYLE_NODE_ID;
    document.head.append(node);
  }

  const selector = activeTarget ? `[data-ds="${cssEscape(activeTarget)}"]` : "";
  const css = selector ? [
    `${selector}{${styleDeclarations(activeStyles)}}`,
    `${selector}{outline:2px dashed #2563eb!important;outline-offset:4px!important;}`,
    `${selector}::after{content:attr(data-ds);position:absolute;z-index:2147483640;display:inline-block;background:#2563eb;color:#fff;font:700 11px/1.2 system-ui;padding:4px 6px;border-radius:6px;}`,
  ].join("\n") : "";
  node.textContent = css;
}

function styleDeclarations(styles) {
  const map = {
    fontSize: "font-size",
    fontWeight: "font-weight",
    textColor: "color",
    background: "background",
    borderColor: "border-color",
    borderRadius: "border-radius",
    borderTopRadius: "border-radius",
    padding: "padding",
    paddingX: ["padding-left", "padding-right"],
    paddingY: ["padding-top", "padding-bottom"],
    gap: "gap",
    height: "height",
    iconSize: "--ds-icon-size",
    boxShadow: "box-shadow",
    opacity: "opacity",
    placeholderColor: "--ds-placeholder-color",
  };
  return Object.entries(styles).flatMap(([key, value]) => {
    const prop = map[key];
    if (Array.isArray(prop)) {
      return prop.map((name) => `${name}:${value}!important`);
    }
    return prop ? [`${prop}:${value}!important`] : [];
  }).join(";");
}

function postToParent(type, payload) {
  window.parent?.postMessage({ type, payload }, window.location.origin);
}

function cssEscape(value) {
  if (window.CSS?.escape) {
    return window.CSS.escape(value);
  }
  return String(value).replace(/["\\]/g, "\\$&");
}
