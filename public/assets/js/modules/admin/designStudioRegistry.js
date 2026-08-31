export const DESIGN_STUDIO_PREVIEW_ROUTES = [
  { id: "landing", label: "Landing Page", route: "/", roleContext: "guest", viewportPresets: ["mobile", "tablet", "desktop"] },
  { id: "buyer-dashboard", label: "Buyer Dashboard", route: "/buyer", roleContext: "buyer", viewportPresets: ["mobile", "desktop"] },
  { id: "buyer-transactions", label: "Buyer Transactions", route: "/buyer/transactions", roleContext: "buyer", viewportPresets: ["mobile", "desktop"] },
  { id: "affiliate-dashboard", label: "Marketing Dashboard", route: "/affiliate", roleContext: "affiliate_admin", viewportPresets: ["mobile", "desktop"] },
  { id: "affiliate-ledger", label: "Marketing Ledger", route: "/affiliate/ledger", roleContext: "affiliate_admin", viewportPresets: ["mobile", "desktop"] },
  { id: "affiliate-settlements", label: "Marketing Settlements", route: "/affiliate/settlements", roleContext: "affiliate_admin", viewportPresets: ["mobile", "desktop"] },
  { id: "seller-dashboard", label: "Showroom Dashboard", route: "/seller", roleContext: "seller", viewportPresets: ["mobile", "desktop"] },
  { id: "admin-dashboard", label: "Admin Dashboard", route: "/admin", roleContext: "admin", viewportPresets: ["desktop"] },
];

export const DESIGN_STUDIO_VIEWPORTS = {
  mobileSmall: { id: "mobileSmall", label: "Mobile Small", width: 360, height: 800 },
  mobile: { id: "mobile", label: "Mobile iPhone", width: 390, height: 844 },
  tablet: { id: "tablet", label: "Tablet", width: 768, height: 1024 },
  desktop: { id: "desktop", label: "Desktop", width: 1280, height: 800 },
};

export const DESIGN_STUDIO_REGISTRY = {
  "catalog.search.bar": {
    label: "Catalog Search Bar",
    group: "Landing Page / Catalog",
    description: "Input pencarian katalog mobil di landing page.",
    editable: true,
    allowedStyles: ["fontSize", "paddingX", "paddingY", "borderRadius", "background", "textColor", "placeholderColor"],
    responsive: true,
    previewRoutes: ["/", "/catalog"],
    riskLevel: "low",
    sourceFile: "public/assets/js/modules/public/components/publicSearchFilterBar.js",
  },
  "catalog.filter.toolbar": {
    label: "Catalog Filter Toolbar",
    group: "Landing Page / Catalog",
    description: "Toolbar filter dan sort katalog.",
    editable: true,
    allowedStyles: ["gap", "padding", "background", "borderRadius", "boxShadow"],
    responsive: true,
    previewRoutes: ["/"],
    riskLevel: "medium",
    sourceFile: "public/assets/js/modules/public/components/publicSearchFilterBar.js",
  },
  "buyer.mobile.footer": {
    label: "Buyer Mobile Footer",
    group: "Buyer Layout",
    description: "Footer navigasi mobile untuk buyer.",
    editable: true,
    allowedStyles: ["background", "height", "borderTopRadius", "iconSize", "fontSize", "textColor"],
    responsive: true,
    previewRoutes: ["/buyer", "/buyer/transactions", "/notifications"],
    riskLevel: "medium",
    sourceFile: "public/assets/js/modules/buyer/components/buyerMobileFooterNav.js",
  },
  "affiliate.mobile.footer": {
    label: "Marketing Mobile Footer",
    group: "Marketing Layout",
    description: "Footer navigasi mobile untuk marketing.",
    editable: true,
    allowedStyles: ["background", "height", "borderTopRadius", "iconSize", "fontSize", "textColor"],
    responsive: true,
    previewRoutes: ["/affiliate", "/affiliate/ledger", "/affiliate/settlements"],
    riskLevel: "medium",
    sourceFile: "public/assets/js/modules/affiliate/components/affiliateAccountShell.js",
  },
};

export function registryEntries() {
  return Object.entries(DESIGN_STUDIO_REGISTRY).map(([key, value]) => ({ key, ...value }));
}

export function registryItem(key) {
  return DESIGN_STUDIO_REGISTRY[String(key || "").trim()] ?? null;
}
