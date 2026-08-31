export const DESIGN_STUDIO_V2_ROUTE = "/admin/design-studio-v2";

export function isDesignStudioV2Allowed({ store = null, currentUser = null } = {}) {
  const user = currentUser ?? store?.get?.("auth.user", null) ?? null;
  const role = user?.role ?? store?.get?.("auth.role", "public") ?? "public";
  const enabled = Boolean(store?.get?.("runtime.designStudioV2.enabled", false));
  const designMode = Boolean(store?.get?.("runtime.designStudioV2.designMode", false));

  return enabled && designMode && role === "super_admin";
}

export function designStudioV2MenuItem() {
  return {
    href: DESIGN_STUDIO_V2_ROUTE,
    label: "Design Studio V2",
    icon: "sparkles",
  };
}
