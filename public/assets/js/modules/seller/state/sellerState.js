import { appStore } from "../../../state/store.js";

export const sellerState = {
  snapshot(key, fallback = null) {
    return appStore.get(`snapshot.seller.${key}.data`, fallback);
  },

  working(pageKey, key, fallback = null) {
    return appStore.get(`working.${pageKey}.${key}.data`, fallback);
  },
};
