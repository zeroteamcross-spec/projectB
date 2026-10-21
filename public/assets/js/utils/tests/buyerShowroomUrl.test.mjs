import assert from "node:assert/strict";
import test from "node:test";
import { appStore } from "../../state/store.js";
import {
  BUYER_SHOWROOM_URL_STORAGE_KEY,
  getBuyerShowroomCatalogUrl,
} from "../buyerShowroomUrl.js";
import { notificationsBuyerCatalogTarget } from "../../modules/notifications/pages/notificationsPage.js";

function withBrowserStorage(run, { customDomainSlug = "" } = {}) {
  const previousWindow = globalThis.window;
  const values = new Map();
  globalThis.window = {
    __PROJECTB_CUSTOM_DOMAIN_SHOWROOM_SLUG__: customDomainSlug,
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  };

  try {
    return run(globalThis.window.localStorage);
  } finally {
    if (previousWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = previousWindow;
    }
  }
}

function setCurrentUser(user) {
  appStore.patchState("auth.user", user);
  appStore.patchState("auth.role", user?.role ?? "public");
  appStore.patchState("auth.isAuthenticated", Boolean(user));
  appStore.patchState("auth.actor", null);
  appStore.patchState("auth.impersonation", null);
  appStore.patchState("app.activeRole", user?.role ?? "public");
}

function withAuthUser(user, run) {
  const previousState = appStore.getState();
  const previousEmit = appStore.emit;
  appStore.emit = () => {};
  try {
    setCurrentUser(user);
    return run();
  } finally {
    appStore.state = previousState;
    appStore.emit = previousEmit;
  }
}

test("buyer showroom destination never falls back to a stored slug when current account has none", () => {
  withBrowserStorage((storage) => {
    withAuthUser({ id: 11, role: "buyer", home_showroom_slug: null }, () => {
      storage.setItem(BUYER_SHOWROOM_URL_STORAGE_KEY, "/showroom-lama");
      assert.equal(getBuyerShowroomCatalogUrl(), "");
      assert.equal(notificationsBuyerCatalogTarget(), "");
    });
  }, { customDomainSlug: "showroom-domain" });
});

test("a changed buyer session resolves only to the new account showroom", () => {
  withBrowserStorage((storage) => {
    withAuthUser({ id: 11, role: "buyer", home_showroom_slug: "showroom-lama" }, () => {
      storage.setItem(BUYER_SHOWROOM_URL_STORAGE_KEY, "/showroom-lama");
      setCurrentUser({ id: 12, role: "buyer", home_showroom_slug: "showroom-baru" });
      // Simulasi nilai usang yang masih tersisa pada browser dari versi lama.
      storage.setItem(BUYER_SHOWROOM_URL_STORAGE_KEY, "/showroom-lama");
      assert.equal(getBuyerShowroomCatalogUrl(), "/showroom-baru");
      assert.equal(notificationsBuyerCatalogTarget(), "/showroom-baru");
    });
  });
});

test("the current buyer showroom slug is the catalog destination", () => {
  withBrowserStorage(() => {
    withAuthUser({ id: 13, role: "buyer", home_showroom_slug: "showroom-saat-ini" }, () => {
      assert.equal(getBuyerShowroomCatalogUrl(), "/showroom-saat-ini");
    });
  });
});

test("notifications catalog destination stays on the matching custom-domain showroom", () => {
  withBrowserStorage(() => {
    withAuthUser({ id: 14, role: "buyer", home_showroom_slug: "showroom-domain" }, () => {
      assert.equal(notificationsBuyerCatalogTarget(), "/");
    });
  }, { customDomainSlug: "showroom-domain" });
});
