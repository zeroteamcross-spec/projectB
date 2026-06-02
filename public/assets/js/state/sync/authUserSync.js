import { CacheManager } from "../../preload/cacheManager.js";
import { appStore } from "../store.js";
import { authStore } from "../authStore.js";

const PRELOAD_CACHE = new CacheManager({ namespace: "projectB:spa:v1" });
const BUYER_PROFILE_CACHE_KEY = "buyer.profile";
const BUYER_PROFILE_TTL = 120;
const BUYER_PROFILE_VERSION = "buyer-profile-v1";

export function syncAuthUserPatch(userPatch = {}, { source = "auth-user-sync" } = {}) {
  const patch = normalizeUserPatch(userPatch);
  if (!patch) {
    return authStore.user();
  }

  const updatedUser = authStore.patchUser(patch) ?? patch;
  patchProfileWorkingState(updatedUser, source);
  patchBuyerProfileState(updatedUser, source);
  patchBuyerProfileCache(updatedUser);

  return updatedUser;
}

export function mergeActiveUserIdentity(profilePayload = null, authUser = authStore.user()) {
  const profile = normalizeProfilePayload(profilePayload);
  if (!authUser || typeof authUser !== "object") {
    return profile ?? {};
  }

  return {
    ...(profile ?? {}),
    ...authUser,
  };
}

function patchProfileWorkingState(updatedUser, source) {
  appStore.patchState("working.profilePage.profile", {
    data: mergeProfilePayload(appStore.get("working.profilePage.profile.data", null), updatedUser),
    hydratedAt: Date.now(),
  }, `${source}:working-profile`);
}

function patchBuyerProfileState(updatedUser, source) {
  const role = updatedUser?.role ?? authStore.role();
  const snapshotNode = appStore.get("snapshot.buyer.profile", null);

  if (role !== "buyer") {
    return;
  }

  appStore.patchState("working.buyerAccount.profile", {
    data: mergeProfilePayload(appStore.get("working.buyerAccount.profile.data", null), updatedUser),
    hydratedAt: Date.now(),
  }, `${source}:buyer-working-profile`);

  appStore.patchState("snapshot.buyer.profile", {
    ...(snapshotNode ?? {}),
    data: mergeProfilePayload(snapshotNode?.data, updatedUser),
    fetchedAt: Date.now(),
    ttl: snapshotNode?.ttl ?? BUYER_PROFILE_TTL,
    version: snapshotNode?.version ?? BUYER_PROFILE_VERSION,
    stale: false,
  }, `${source}:buyer-profile-snapshot`);
}

function patchBuyerProfileCache(updatedUser) {
  const role = updatedUser?.role ?? authStore.role();
  if (role !== "buyer") {
    return;
  }

  const cached = PRELOAD_CACHE.read(BUYER_PROFILE_CACHE_KEY);
  PRELOAD_CACHE.write(
    BUYER_PROFILE_CACHE_KEY,
    mergeProfilePayload(cached?.data, updatedUser),
    {
      ttl: cached?.ttl ?? BUYER_PROFILE_TTL,
      version: cached?.version ?? BUYER_PROFILE_VERSION,
    },
  );
}

function mergeProfilePayload(currentPayload, updatedUser) {
  if (!currentPayload || typeof currentPayload !== "object" || Array.isArray(currentPayload)) {
    return { ...updatedUser };
  }

  if (currentPayload.user && typeof currentPayload.user === "object") {
    return {
      ...currentPayload,
      user: {
        ...currentPayload.user,
        ...updatedUser,
      },
    };
  }

  if (currentPayload.profile && typeof currentPayload.profile === "object") {
    return {
      ...currentPayload,
      profile: {
        ...currentPayload.profile,
        ...updatedUser,
      },
    };
  }

  return {
    ...currentPayload,
    ...updatedUser,
  };
}

function normalizeUserPatch(userPatch) {
  if (!userPatch || typeof userPatch !== "object" || Array.isArray(userPatch)) {
    return null;
  }

  if (userPatch.user && typeof userPatch.user === "object") {
    return userPatch.user;
  }

  if (userPatch.profile && typeof userPatch.profile === "object") {
    return userPatch.profile;
  }

  return userPatch;
}

function normalizeProfilePayload(profilePayload) {
  if (!profilePayload || typeof profilePayload !== "object" || Array.isArray(profilePayload)) {
    return null;
  }

  if (profilePayload.user && typeof profilePayload.user === "object") {
    return profilePayload.user;
  }

  if (profilePayload.profile && typeof profilePayload.profile === "object") {
    return profilePayload.profile;
  }

  return profilePayload;
}
