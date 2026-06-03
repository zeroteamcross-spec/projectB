import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.GOOGLE_LOGIN_DEFAULT_SMOKE_BASE || "http://127.0.0.1:8035/app.html";

const PROTECTED_REDIRECTS = [
  { route: "#/buyer", expectedHash: "#/google-login/buyer" },
  { route: "#/seller", expectedHash: "#/google-login/seller" },
  { route: "#/admin", expectedHash: "#/google-login/admin" },
  { route: "#/affiliate", expectedHash: "#/google-login/affiliate" },
];

const LEGACY_ROUTES = [
  { route: "#/auth", expectedText: "Masuk ke akun" },
  { route: "#/login/buyer", expectedText: "Login Buyer" },
  { route: "#/login/admin", expectedText: "Login Admin" },
  { route: "#/login/seller", expectedText: "Login Seller" },
  { route: "#/login/affiliate", expectedText: "Login Affiliate" },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const evidence = {
    base: BASE,
    defaultEntry: null,
    chooser: null,
    hiddenLegacy: null,
    protectedRedirects: [],
    legacyManualAccess: [],
  };

  try {
    evidence.defaultEntry = await verifyDefaultEntry(browser);
    evidence.chooser = await verifyChooser(browser);
    evidence.hiddenLegacy = await verifyHiddenLegacy(browser);

    for (const test of PROTECTED_REDIRECTS) {
      evidence.protectedRedirects.push(await verifyRedirect(browser, test));
    }

    for (const test of LEGACY_ROUTES) {
      evidence.legacyManualAccess.push(await verifyLegacyRoute(browser, test));
    }
  } finally {
    await browser.close();
  }

  evidence.result = allPass(evidence) ? "PASS" : "FAIL";
  writeEvidence(evidence);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);

  if (evidence.result !== "PASS") {
    process.exit(1);
  }
}

async function verifyDefaultEntry(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}#/`, { waitUntil: "networkidle" });
    await page.locator("a[aria-label='Akun']").click();
    await page.waitForFunction(() => window.location.hash === "#/google-login", null, { timeout: 8000 });

    return {
      action: "public shell account link",
      expectedHash: "#/google-login",
      actualHash: await page.evaluate(() => window.location.hash),
      result: "PASS",
    };
  } catch (error) {
    return fail("public shell account link", error);
  } finally {
    await context.close();
  }
}

async function verifyChooser(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}#/google-login`, { waitUntil: "networkidle" });
    const buttons = {
      buyer: await routeAfterClick(page, "#google_login_chooser_buyer_button"),
      admin: await routeAfterClick(page, "#google_login_chooser_admin_button"),
      seller: await routeAfterClick(page, "#google_login_chooser_seller_button"),
      affiliate: await routeAfterClick(page, "#google_login_chooser_affiliate_button"),
    };

    const expected = {
      buyer: "#/google-login/buyer",
      admin: "#/google-login/admin",
      seller: "#/google-login/seller",
      affiliate: "#/google-login/affiliate",
    };

    return {
      action: "google chooser role buttons",
      actual: buttons,
      expected,
      result: Object.keys(expected).every((key) => buttons[key] === expected[key]) ? "PASS" : "FAIL",
    };
  } catch (error) {
    return fail("google chooser role buttons", error);
  } finally {
    await context.close();
  }
}

async function routeAfterClick(page, selector) {
  await page.goto(`${BASE}#/google-login`, { waitUntil: "networkidle" });
  await page.locator(selector).click();
  await page.waitForFunction((currentSelector) => window.location.hash.includes("/google-login/"), selector, { timeout: 8000 });
  return await page.evaluate(() => window.location.hash);
}

async function verifyHiddenLegacy(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const legacyHashes = ["#/auth", "#/login/buyer", "#/login/admin", "#/login/seller", "#/login/affiliate"];

  try {
    await page.goto(`${BASE}#/`, { waitUntil: "networkidle" });
    const anchors = await page.locator("a").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") || ""));
    const visibleBody = await page.locator("body").innerText();
    const leakedHref = anchors.filter((href) => legacyHashes.includes(href));
    const leakedVisible = legacyHashes.filter((hash) => visibleBody.includes(hash));

    return {
      action: "public UI hides legacy login links",
      leakedHref,
      leakedVisible,
      result: leakedHref.length === 0 && leakedVisible.length === 0 ? "PASS" : "FAIL",
    };
  } catch (error) {
    return fail("public UI hides legacy login links", error);
  } finally {
    await context.close();
  }
}

async function verifyRedirect(browser, test) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}${test.route}`, { waitUntil: "networkidle" });
    await page.waitForFunction((expectedHash) => window.location.hash.startsWith(expectedHash), test.expectedHash, { timeout: 8000 });

    return {
      route: test.route,
      expectedHash: test.expectedHash,
      actualHash: await page.evaluate(() => window.location.hash),
      result: "PASS",
    };
  } catch (error) {
    return {
      route: test.route,
      expectedHash: test.expectedHash,
      result: "FAIL",
      error: error.message,
    };
  } finally {
    await context.close();
  }
}

async function verifyLegacyRoute(browser, test) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}${test.route}`, { waitUntil: "networkidle" });
    const bodyText = await page.locator("body").innerText({ timeout: 8000 });

    return {
      route: test.route,
      expectedText: test.expectedText,
      result: bodyText.includes(test.expectedText) ? "PASS" : "FAIL",
    };
  } catch (error) {
    return {
      route: test.route,
      expectedText: test.expectedText,
      result: "FAIL",
      error: error.message,
    };
  } finally {
    await context.close();
  }
}

function allPass(evidence) {
  return evidence.defaultEntry?.result === "PASS"
    && evidence.chooser?.result === "PASS"
    && evidence.hiddenLegacy?.result === "PASS"
    && evidence.protectedRedirects.every((item) => item.result === "PASS")
    && evidence.legacyManualAccess.every((item) => item.result === "PASS");
}

function fail(action, error) {
  return {
    action,
    result: "FAIL",
    error: error.message,
  };
}

function writeEvidence(evidence) {
  const dir = path.resolve("storage/browser-smoke");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "google_login_default_smoke.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
