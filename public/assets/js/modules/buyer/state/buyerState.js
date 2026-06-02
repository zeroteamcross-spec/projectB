import { appStore } from "../../../state/store.js";

export const buyerState = {
  snapshot(key, fallback = null) {
    return appStore.get(`snapshot.buyer.${key}.data`, fallback);
  },

  working(pageKey, key, fallback = null) {
    return appStore.get(`working.${pageKey}.${key}.data`, fallback);
  },

  setSelectedCar(carId) {
    appStore.patchState("modules.buyer.selectedCarId", carId, "buyer:selected-car");
  },
};
