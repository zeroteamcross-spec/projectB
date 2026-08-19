const STORAGE_KEY = "projectB:public:last-viewed-context";
const SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * A visitor -- logged in or not -- can wander off a showroom's or a
 * marketing (affiliate) landing page to a plain page (landing site, generic
 * buyer login) where that context has already been cleared. Remembering
 * whichever one they actually viewed last -- and which KIND it was, since
 * "Kembali ke Katalog" means a different URL for a showroom than for a
 * marketing link -- lets a login page like #/google-login/buyer still offer
 * a way back to it even without a slug of its own in the URL.
 *
 * Single key, single most-recent value: browsing a showroom and then later
 * a marketing link (or vice versa) should offer a way back to whichever one
 * was actually visited last, not two stale, independently-tracked slugs.
 */
function persist(type, slug) {
  const value = String(slug ?? "").trim().toLowerCase();
  if (!value || !SLUG_PATTERN.test(value) || typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ type, slug: value }));
  } catch (error) {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

export function persistLastViewedShowroom(slug) {
  persist("showroom", slug);
}

export function persistLastViewedAffiliate(slug) {
  persist("affiliate", slug);
}

export function getLastViewedPublicContextPath() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    if (!raw) {
      return "";
    }

    const parsed = JSON.parse(raw);
    const slug = String(parsed?.slug ?? "");
    if (!SLUG_PATTERN.test(slug)) {
      return "";
    }

    if (parsed?.type === "affiliate") {
      return `/af/${slug}`;
    }

    if (parsed?.type === "showroom") {
      return `/s/${slug}`;
    }

    return "";
  } catch (error) {
    return "";
  }
}

/**
 * The guard that sends an unauthenticated visitor to a login page always
 * appends `?from=<the path they were actually trying to reach>` (see
 * roleGuard.js's unauthenticatedRedirect/authLandingPath) -- so whenever
 * someone lands on #/google-login/buyer by being bounced off a
 * showroom-scoped OR marketing-scoped page (not just its bare root, but any
 * page under it: car detail, checkout, a buyer-only route), that path is
 * sitting right there in the URL, no lookup needed. This is the reliable
 * source; the localStorage-based getLastViewedPublicContextPath() above
 * only covers the remaining case where `from` itself isn't scoped to
 * either (e.g. bounced off a plain buyer page reached from the landing
 * site).
 */
export function publicContextPathFromRedirect(fromPath) {
  const path = String(fromPath ?? "");

  const showroomMatch = path.match(/^\/(?:showrooms|s)\/([^/]+)/);
  if (showroomMatch) {
    return `/s/${showroomMatch[1]}`;
  }

  const affiliateMatch = path.match(/^\/(?:af|a)\/([^/]+)/);
  if (affiliateMatch) {
    return `/af/${affiliateMatch[1]}`;
  }

  return "";
}
