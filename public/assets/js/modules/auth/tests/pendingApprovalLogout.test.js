import test from "node:test";
import assert from "node:assert/strict";
import { appStore } from "../../../state/store.js";
import { authStore } from "../../../state/authStore.js";

test("pending seller logout clears a null auth context", () => {
  const previousState = appStore.getState();
  const previousEmit = appStore.emit;
  appStore.emit = () => {};

  try {
    authStore.setContext({
      user: { id: 47, role: "seller", is_approved: false },
      actor: { id: 12 },
      impersonation: { id: 13 },
    });
    assert.equal(authStore.isAuthenticated(), true);

    // The pending-approval button calls setContext(null) after /auth/logout.
    authStore.setContext(null);

    assert.deepEqual(appStore.get("auth"), {
      user: null,
      actor: null,
      impersonation: null,
      isAuthenticated: false,
      role: "public",
    });
    assert.equal(appStore.get("app.activeRole"), "public");
  } finally {
    appStore.state = previousState;
    appStore.emit = previousEmit;
  }
});
