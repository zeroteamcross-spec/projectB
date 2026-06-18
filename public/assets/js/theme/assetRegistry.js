export const assetRegistry = {
  brand: {
    logoMark: "",
    logoWordmark: "",
  },
  placeholders: {
    carCard: "",
    showroom: "",
  },
  illustrations: {
    emptyState: "",
  },
};

export function getAsset(path, fallback = "") {
  const value = String(path ?? "").trim();
  if (/^(https?:|data:|blob:)/.test(value) || value.startsWith("/")) {
    return value;
  }

  return value
    .split(".")
    .reduce((carry, key) => (carry && key in carry ? carry[key] : fallback), assetRegistry);
}
