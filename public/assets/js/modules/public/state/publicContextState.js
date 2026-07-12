import { appStore } from "../../../state/store.js";

const BASE = "modules.public.context";

const DEFAULT_CONTEXT = {
  mode: "default",
  affiliate: null,
  showroom: null,
  invalidSlug: "",
  hydratedAt: 0,
};

export const publicContextState = {
  get() {
    return appStore.get(BASE, { ...DEFAULT_CONTEXT });
  },

  current() {
    return this.get();
  },

  activeAffiliate() {
    return appStore.get(`${BASE}.affiliate`, null);
  },

  activeShowroom() {
    return appStore.get(`${BASE}.showroom`, null);
  },

  isAffiliateActive() {
    return appStore.get(`${BASE}.mode`, "default") === "affiliate" && Boolean(this.activeAffiliate());
  },

  isShowroomActive() {
    return appStore.get(`${BASE}.mode`, "default") === "showroom" && Boolean(this.activeShowroom());
  },

  invalidSlug() {
    return appStore.get(`${BASE}.invalidSlug`, "");
  },

  setAffiliate(affiliate) {
    appStore.patchState(BASE, {
      mode: "affiliate",
      affiliate,
      showroom: null,
      invalidSlug: "",
      hydratedAt: Date.now(),
    }, "public-context:affiliate");
  },

  setShowroom(showroom) {
    appStore.patchState(BASE, {
      mode: "showroom",
      affiliate: null,
      showroom,
      invalidSlug: "",
      hydratedAt: Date.now(),
    }, "public-context:showroom");
  },

  setDefault() {
    appStore.patchState(BASE, { ...DEFAULT_CONTEXT, hydratedAt: Date.now() }, "public-context:default");
  },

  setInvalidSlug(slug) {
    appStore.patchState(BASE, {
      mode: "default",
      affiliate: null,
      showroom: null,
      invalidSlug: String(slug ?? ""),
      hydratedAt: Date.now(),
    }, "public-context:invalid");
  },
};
