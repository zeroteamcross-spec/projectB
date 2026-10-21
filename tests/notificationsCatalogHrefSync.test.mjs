import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const PUBLIC_ROOT = resolve(fileURLToPath(new URL("../public/", import.meta.url)));

test("desktop and mobile catalog hrefs track auth changes while native anchors remain mounted", async () => {
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
    if (pathname === "/") {
      response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      response.end("<!doctype html><html><body></body></html>");
      return;
    }

    const filePath = resolve(PUBLIC_ROOT, `.${pathname}`);
    if (filePath !== PUBLIC_ROOT && !filePath.startsWith(`${PUBLIC_ROOT}${sep}`)) {
      response.writeHead(403);
      response.end();
      return;
    }

    try {
      const content = await readFile(filePath);
      response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });

  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${address.port}/`);

    const result = await page.evaluate(async () => {
      const [{ authStore }, { subscribeNotificationsBuyerCatalogHrefSync }] = await Promise.all([
        import("/assets/js/state/authStore.js"),
        import("/assets/js/modules/notifications/pages/notificationsPage.js"),
      ]);

      const root = document.createElement("section");
      const desktopLink = document.createElement("a");
      desktopLink.id = "byr_notifications_nav_desktop_catalog";
      const mobileLink = document.createElement("a");
      mobileLink.id = "byr_nav_mobile_catalog";
      root.append(desktopLink, mobileLink);
      document.body.append(root);

      window.localStorage.setItem("projectB:buyer:showroom-icon-slug", "showroom-lama");
      authStore.setContext({ user: { id: 101, role: "buyer", home_showroom_slug: "showroom-lama" } });
      const unsubscribe = subscribeNotificationsBuyerCatalogHrefSync(root);
      const initialHrefs = [desktopLink.getAttribute("href"), mobileLink.getAttribute("href")];

      window.localStorage.setItem("projectB:buyer:showroom-icon-slug", "showroom-baru");
      authStore.setContext({ user: { id: 202, role: "buyer", home_showroom_slug: "showroom-baru" } });
      const updated = {
        hrefs: [desktopLink.getAttribute("href"), mobileLink.getAttribute("href")],
        sameAnchors: root.querySelector("#byr_notifications_nav_desktop_catalog") === desktopLink
          && root.querySelector("#byr_nav_mobile_catalog") === mobileLink,
        mounted: root.isConnected,
        enabled: !desktopLink.hasAttribute("aria-disabled") && !mobileLink.hasAttribute("aria-disabled"),
      };

      authStore.setContext({ user: null });
      const cleared = {
        hrefs: [desktopLink.getAttribute("href"), mobileLink.getAttribute("href")],
        disabled: desktopLink.getAttribute("aria-disabled") === "true"
          && mobileLink.getAttribute("aria-disabled") === "true",
      };
      unsubscribe();

      return { initialHrefs, updated, cleared };
    });

    assert.deepEqual(result, {
      initialHrefs: ["/showroom-lama", "/showroom-lama"],
      updated: {
        hrefs: ["/showroom-baru", "/showroom-baru"],
        sameAnchors: true,
        mounted: true,
        enabled: true,
      },
      cleared: {
        hrefs: [null, null],
        disabled: true,
      },
    });
  } finally {
    await browser?.close();
    await new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose());
    });
  }
});
