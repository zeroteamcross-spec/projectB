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
  return String(path)
    .split(".")
    .reduce((carry, key) => (carry && key in carry ? carry[key] : fallback), assetRegistry);
}
