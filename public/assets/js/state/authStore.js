import { appStore } from "./store.js";
import { persistBuyerShowroomUrl } from "../utils/buyerShowroomUrl.js";
import { persistBuyerShowroomIcon } from "../utils/buyerShowroomIcon.js";

export const authStore = {
  setContext({ user = null, actor = null, impersonation = null } = {}) {
    appStore.patchState("auth", {
      user,
      actor,
      impersonation,
      isAuthenticated: Boolean(user),
      role: user?.role ?? "public",
    }, "auth:set-context");
    appStore.patchState("app.activeRole", user?.role ?? "public", "auth:set-role");
    persistBuyerShowroomUrl(user);
    persistBuyerShowroomIcon(user);
  },

  setUser(user) {
    this.setContext({ user, actor: null, impersonation: null });
  },

  patchUser(partialUser = {}) {
    const current = this.user();
    if (!partialUser || typeof partialUser !== "object" || Array.isArray(partialUser)) {
      return current;
    }

    if (!current) {
      if (Object.keys(partialUser).length) {
        this.setContext({
          user: partialUser,
          actor: this.actor(),
          impersonation: this.impersonation(),
        });
        return partialUser;
      }
      return current;
    }

    const user = {
      ...current,
      ...partialUser,
    };

    this.setContext({
      user,
      actor: this.actor(),
      impersonation: this.impersonation(),
    });

    return user;
  },

  user() {
    return appStore.get("auth.user", null);
  },

  actor() {
    return appStore.get("auth.actor", null);
  },

  impersonation() {
    return appStore.get("auth.impersonation", null);
  },

  role() {
    return appStore.get("auth.role", "public");
  },

  isAuthenticated() {
    return appStore.get("auth.isAuthenticated", false);
  },
};
