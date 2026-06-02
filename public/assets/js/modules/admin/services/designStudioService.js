import { deepClone } from "../../../utils/deepClone.js";
import { getByPath, setByPath } from "../../../utils/objectPath.js";
import { currentThemeConfig, normalizeThemeConfig, themeVariableEntries } from "../../../theme/themeRuntime.js";
import { themeStudioDefaults } from "../../../theme/themeStudioDefaults.js";
import { designStudioHooks, designStudioHooksBySection, findDesignStudioHook } from "../../../theme/designStudioHooks.js";

export const designStudioService = {
  masterKey: "design_studio.theme_config",

  defaults() {
    return deepClone(themeStudioDefaults);
  },

  current() {
    return deepClone(currentThemeConfig());
  },

  normalize(input = {}) {
    return normalizeThemeConfig(input);
  },

  initialDraft(master = null) {
    return this.normalize(master?.data ?? this.current());
  },

  updateDraft(draft, path, value) {
    const next = deepClone(draft ?? this.defaults());
    setByPath(next, path, value);
    return this.normalize(next);
  },

  importJson(raw) {
    return this.normalize(JSON.parse(String(raw || "{}")));
  },

  exportJson(config) {
    return JSON.stringify(this.normalize(config), null, 2);
  },

  previewVariables(config) {
    return themeVariableEntries(this.normalize(config));
  },

  fieldValue(config, path, fallback = "") {
    return getByPath(config, path, fallback);
  },

  sections() {
    return [
      {
        id: "brand",
        title: "Brand Settings",
        description: "Nama aplikasi, tagline, short mark, dan logo icon shell.",
        fields: [
          textField("brand.appName", "App Name"),
          textField("brand.tagline", "Tagline"),
          textField("brand.shortMark", "Short Mark"),
          selectField("brand.logoIcon", "Logo Icon", [
            { value: "brandMark", label: "Brand Mark" },
            { value: "car", label: "Car" },
            { value: "dashboard", label: "Dashboard" },
            { value: "sparkles", label: "Sparkles" },
          ]),
          textField("brand.logoMarkAsset", "Logo Asset Reference"),
          textField("contact.whatsapp", "Default WhatsApp"),
        ],
      },
      {
        id: "colors",
        title: "Color Settings",
        description: "Tone brand, background, surface, dan status.",
        fields: [
          colorField("colors.primary", "Primary"),
          colorField("colors.secondary", "Secondary"),
          colorField("colors.accent", "Accent"),
          colorField("colors.pageBg", "Background"),
          colorField("colors.surface", "Surface Default"),
          colorField("colors.surfaceMuted", "Muted Surface"),
          colorField("colors.inset", "Inset Surface"),
          colorField("colors.text", "Text Utama"),
          colorField("colors.textStrong", "Text Sekunder Kuat"),
          colorField("colors.textMuted", "Text Muted"),
          colorField("colors.border", "Border Default"),
          colorField("colors.borderStrong", "Border Strong"),
          textField("colors.overlay", "Overlay RGBA"),
          colorField("colors.success", "Success"),
          colorField("colors.warning", "Warning"),
          colorField("colors.danger", "Danger"),
          colorField("colors.info", "Info"),
        ],
      },
      {
        id: "shell",
        title: "Shell Settings",
        description: "Header public, app header, sidebar, dan nav active.",
        fields: [
          textField("shell.publicHeaderBg", "Public Header"),
          textField("shell.appHeaderBg", "App Header"),
          colorField("shell.sidebarStart", "Sidebar Start"),
          colorField("shell.sidebarEnd", "Sidebar End"),
          textField("shell.navActiveBg", "Active Nav"),
          colorField("shell.navText", "Sidebar Text"),
          colorField("colors.publicCanvasStart", "Public Canvas Start"),
          colorField("colors.publicCanvasMid", "Public Canvas Mid"),
          colorField("colors.publicCanvasEnd", "Public Canvas End"),
        ],
      },
      {
        id: "surface",
        title: "Button & Surface",
        description: "Tombol, panel, card, dan shadow tone utama.",
        fields: [
          colorField("button.primaryFrom", "Primary From"),
          colorField("button.primaryTo", "Primary To"),
          colorField("button.secondaryBg", "Secondary Bg"),
          colorField("button.secondaryText", "Secondary Text"),
          colorField("button.ghostText", "Ghost Text"),
          colorField("surface.cardBg", "Card Background"),
          colorField("surface.cardBorder", "Card Border"),
          colorField("surface.panelBg", "Panel Background"),
          colorField("surface.insetBg", "Inset Background"),
        ],
      },
      {
        id: "form",
        title: "Form & Search",
        description: "Search bar, input, focus, dan chip tone.",
        fields: [
          colorField("form.searchBg", "Search Background"),
          colorField("form.inputBg", "Input Background"),
          colorField("form.controlBorder", "Input Border"),
          colorField("form.focus", "Focus Tone"),
          colorField("form.chipBg", "Chip Background"),
          colorField("form.chipText", "Chip Text"),
          colorField("form.chipActiveFrom", "Chip Active From"),
          colorField("form.chipActiveTo", "Chip Active To"),
        ],
      },
      {
        id: "layout",
        title: "Layout & State",
        description: "Spacing scale, radius scale, shadow depth, empty/error tone.",
        fields: [
          rangeField("layout.spacingScale", "Spacing Scale", 0.8, 1.4, 0.05),
          rangeField("layout.radiusScale", "Radius Scale", 0.8, 1.4, 0.05),
          rangeField("layout.shadowDepth", "Shadow Depth", 0.7, 1.4, 0.05),
          colorField("state.emptyBg", "Empty Background"),
          colorField("state.errorBg", "Error Background"),
          colorField("state.errorBorder", "Error Border"),
          colorField("state.badgeNeutralBg", "Neutral Badge Background"),
        ],
      },
    ];
  },

  hooks() {
    return designStudioHooks();
  },

  hooksForSection(sectionId) {
    return designStudioHooksBySection(sectionId);
  },

  hookById(hookId) {
    return findDesignStudioHook(hookId);
  },
};

function textField(path, label) {
  return { type: "text", path, label };
}

function colorField(path, label) {
  return { type: "color", path, label };
}

function selectField(path, label, options) {
  return { type: "select", path, label, options };
}

function rangeField(path, label, min, max, step) {
  return { type: "range", path, label, min, max, step };
}
