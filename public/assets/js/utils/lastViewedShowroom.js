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
