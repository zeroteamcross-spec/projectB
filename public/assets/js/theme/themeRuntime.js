import { deepClone } from "../utils/deepClone.js";
import { themeStudioDefaults } from "./themeStudioDefaults.js";

export function currentThemeConfig() {
  return deepClone(globalThis.__PROJECTB_GET_THEME__?.() ?? globalThis.__PROJECTB_THEME__ ?? themeStudioDefaults);
}

export function normalizeThemeConfig(input = {}) {
  if (typeof globalThis.__PROJECTB_NORMALIZE_THEME__ === "function") {
    return deepClone(globalThis.__PROJECTB_NORMALIZE_THEME__(input));
  }

  return deepClone(input);
}

export function themeVariableEntries(input = {}) {
  if (typeof globalThis.__PROJECTB_THEME_TO_VARS__ === "function") {
    return globalThis.__PROJECTB_THEME_TO_VARS__(normalizeThemeConfig(input));
  }

  return {};
}

export function applyThemeToTarget(target, input = {}) {
  if (!target?.style) {
    return;
  }

  const variables = themeVariableEntries(input);
  Object.entries(variables).forEach(([key, value]) => target.style.setProperty(key, value));
}

export function applyThemeToDocument(input = {}) {
  if (typeof globalThis.__PROJECTB_APPLY_THEME__ === "function") {
    const next = globalThis.__PROJECTB_APPLY_THEME__(input);
    if (next?.brand?.appName) {
      document.title = next.brand.appName;
    }
    return deepClone(next);
  }

  applyThemeToTarget(document.documentElement, input);
  return normalizeThemeConfig(input);
}
