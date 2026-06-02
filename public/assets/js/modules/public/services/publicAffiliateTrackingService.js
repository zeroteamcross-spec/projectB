import { affiliatesResource } from "../../../resources/affiliatesResource.js";
import { publicContextService } from "./publicContextService.js";

const STORAGE_KEY = "projectB:affiliate-click-log";
const TTL_MS = 5 * 60 * 1000;

export const publicAffiliateTrackingService = {
  async trackCurrentPage() {
    const affiliate = publicContextService.activeAffiliate();
    if (!affiliate?.slug) {
      return null;
    }

    const landingUrl = currentLandingUrl();
    if (!landingUrl || recentlyTracked(affiliate.slug, landingUrl)) {
      return null;
    }

    const click = await affiliatesResource.recordClick({
      referral_code: affiliate.slug,
      landing_url: landingUrl,
    }).catch(() => null);

    remember(affiliate.slug, landingUrl);
    return click;
  },
};

function currentLandingUrl() {
  try {
    return window.location.href;
  } catch (error) {
    return "";
  }
}

function recentlyTracked(slug, landingUrl) {
  const store = readStore();
  const key = `${slug}:${landingUrl}`;
  const timestamp = Number(store[key] ?? 0);

  if (!timestamp) {
    return false;
  }

  return (Date.now() - timestamp) < TTL_MS;
}

function remember(slug, landingUrl) {
  const store = readStore();
  store[`${slug}:${landingUrl}`] = Date.now();
  writeStore(store);
}

function readStore() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeStore(payload) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    // ignore storage errors
  }
}
