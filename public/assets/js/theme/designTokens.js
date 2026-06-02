export const designTokens = {
  colors: {
    brand: {
      soft: "brand-50",
      default: "brand-600",
      strong: "brand-700",
      stronger: "brand-800",
    },
    neutral: {
      page: "gray-50",
      panel: "white",
      panelMuted: "gray-50",
      border: "gray-200",
      borderStrong: "gray-300",
      text: "gray-950",
      textStrong: "gray-800",
      textMuted: "gray-500",
      chrome: "gray-950",
      chromeSoft: "white/15",
      overlay: "gray-950/55",
    },
    status: {
      success: { surface: "green-100", border: "green-200", text: "green-800", solid: "green-700" },
      warning: { surface: "amber-100", border: "amber-200", text: "amber-800", solid: "amber-700" },
      danger: { surface: "red-100", border: "red-200", text: "red-800", solid: "red-700" },
      info: { surface: "sky-100", border: "sky-200", text: "sky-800", solid: "gray-950" },
    },
  },
  spacing: {
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-3",
    lg: "gap-4",
    xl: "gap-6",
    shellX: "px-4 md:px-6",
    shellY: "py-6 md:py-8",
  },
  radius: {
    sm: "rounded",
    md: "rounded-lg",
    lg: "rounded-xl",
    xl: "rounded-2xl",
    pill: "rounded-full",
  },
  shadow: {
    soft: "shadow-sm",
    card: "shadow-card",
    elevated: "shadow-lg",
  },
  typography: {
    appTitle: "text-xl font-bold tracking-normal",
    pageTitle: "text-2xl font-bold tracking-normal md:text-3xl",
    sectionTitle: "text-xl font-bold tracking-normal",
    label: "text-sm font-medium",
    eyebrow: "text-xs font-bold uppercase tracking-normal",
    body: "text-sm leading-6",
    caption: "text-xs font-medium",
  },
};

export function tokenPath(path, fallback = "") {
  return String(path)
    .split(".")
    .reduce((carry, key) => (carry && key in carry ? carry[key] : fallback), designTokens);
}
