const STORAGE_KEY = "projectB:public:last-viewed-showroom-slug";
const SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * A visitor -- logged in or not -- can wander off a showroom's catalog to a
 * plain page (landing, generic buyer login) where the showroom context has
 * already been cleared. Remembering the slug here separately, keyed purely
 * to "last showroom actually viewed", lets a login page like
 * #/google-login/buyer still offer a way back to it even without a slug in
 * its own URL.
 */
export function persistLastViewedShowroom(slug) {
  const value = String(slug ?? "").trim().toLowerCase();
  if (!value || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage?.setItem(STORAGE_KEY, value);
  } catch (error) {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

export function getLastViewedShowroomPath() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const value = String(window.localStorage?.getItem(STORAGE_KEY) ?? "").trim();
    return SLUG_PATTERN.test(value) ? `/s/${value}` : "";
  } catch (error) {
    return "";
  }
}

/**
 * The guard that sends an unauthenticated visitor to a login page always
 * appends `?from=<the path they were actually trying to reach>` (see
 * roleGuard.js's unauthenticatedRedirect/authLandingPath) -- so whenever
 * someone lands on #/google-login/buyer by being bounced off a
 * showroom-scoped page (not just its bare catalog root, but any page under
 * it: car detail, checkout, a buyer-only route), that path is sitting right
 * there in the URL, no lookup needed. This is the reliable source; the
 * localStorage-based getLastViewedShowroomPath() above only covers the
 * remaining case where `from` itself isn't showroom-scoped (e.g. bounced
 * off a plain buyer page reached from the landing site).
 */
export function showroomPathFromRedirect(fromPath) {
  const match = String(fromPath ?? "").match(/^\/(?:showrooms|s)\/([^/]+)/);
  return match ? `/s/${match[1]}` : "";
}
