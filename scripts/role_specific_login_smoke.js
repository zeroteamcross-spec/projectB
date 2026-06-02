import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.ROLE_LOGIN_SMOKE_BASE || "http://127.0.0.1:8033/app.html";
const PASSWORD = "SmokePass123!";
const CREDS = {
  buyer: { email: "buyer@projectb.local", password: PASSWORD },
  admin: { email: "admin@projectb.local", password: PASSWORD },
  seller: { email: "seller@projectb.local", password: PASSWORD },
  affiliate_admin: { email: "affiliate@projectb.local", password: PASSWORD },
};

const POSITIVE = [
  { route: "#/login/buyer", expectedRole: "buyer", credentialRole: "buyer", expectedHash: "#/buyer" },
  { route: "#/login/admin", expectedRole: "admin", credentialRole: "admin", expectedHash: "#/admin" },
  { route: "#/login/seller", expectedRole: "seller", credentialRole: "seller", expectedHash: "#/seller" },
  { route: "#/login/affiliate", expectedRole: "affiliate_admin", credentialRole: "affiliate_admin", expectedHash: "#/affiliate" },
];

const NEGATIVE = [
  { route: "#/login/buyer", expectedRole: "buyer", credentialRole: "seller", error: "Akun ini bukan akun Buyer." },
  { route: "#/login/admin", expectedRole: "admin", credentialRole: "affiliate_admin", error: "Akun ini bukan akun Admin." },
  { route: "#/login/seller", expectedRole: "seller", credentialRole: "buyer", error: "Akun ini bukan akun Seller." },
  { route: "#/login/affiliate", expectedRole: "affiliate_admin", credentialRole: "admin", error: "Akun ini bukan akun Affiliate." },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const evidence = {
    base: BASE,
    positive: [],
    negative: [],
    existingLogin: null,
  };

  try {
    for (const test of POSITIVE) {
      evidence.positive.push(await runPositive(browser, test));
    }

    for (const test of NEGATIVE) {
      evidence.negative.push(await runNegative(browser, test));
    }

    evidence.existingLogin = await runExistingLogin(browser);
  } finally {
    await browser.close();
  }

  evidence.result = hasFailures(evidence) ? "FAIL" : "PASS";
  writeEvidence(evidence);

  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);

  if (evidence.result !== "PASS") {
    process.exit(1);
  }
}

async function runPositive(browser, test) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}${test.route}`, { waitUntil: "networkidle" });
    await submitLogin(page, CREDS[test.credentialRole]);
    await page.waitForFunction((expectedHash) => window.location.hash === expectedHash, test.expectedHash, { timeout: 8000 });
    const autologin = await authSnapshot(page);
    await logoutViaApi(page);

    return {
      route: test.route,
      roleAccountUsed: test.credentialRole,
      expectedResult: test.expectedHash,
      actualResult: page.url(),
      autologinRole: autologin?.role ?? null,
      result: autologin?.role === test.expectedRole ? "PASS" : "FAIL",
    };
  } catch (error) {
    return failureEvidence(test, error);
  } finally {
    await context.close();
  }
}

async function runNegative(browser, test) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}${test.route}`, { waitUntil: "networkidle" });
    await submitLogin(page, CREDS[test.credentialRole]);
    const slug = test.route.split("/").pop();
    await page.locator(`#role_login_${slug}_error`).waitFor({ state: "visible", timeout: 8000 });
    const errorText = await page.locator(`#role_login_${slug}_error`).innerText();
    const autologin = await authSnapshot(page);

    return {
      route: test.route,
      roleAccountUsed: test.credentialRole,
      expectedResult: "ditolak dan tetap tidak login",
      actualResult: {
        hash: await page.evaluate(() => window.location.hash),
        errorText,
        autologinRole: autologin?.role ?? null,
      },
      result: autologin === null && errorText.includes(test.error) ? "PASS" : "FAIL",
    };
  } catch (error) {
    return failureEvidence(test, error);
  } finally {
    await context.close();
  }
}

async function runExistingLogin(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}#/auth?role=buyer`, { waitUntil: "networkidle" });
    await submitLogin(page, CREDS.buyer);
    await page.waitForFunction(() => window.location.hash === "#/buyer", { timeout: 8000 });
    const autologin = await authSnapshot(page);
    await logoutViaApi(page);

    return {
      route: "#/auth?role=buyer",
      roleAccountUsed: "buyer",
      expectedResult: "#/buyer",
      actualResult: page.url(),
      autologinRole: autologin?.role ?? null,
      result: autologin?.role === "buyer" ? "PASS" : "FAIL",
    };
  } catch (error) {
    return failureEvidence({ route: "#/auth?role=buyer", credentialRole: "buyer" }, error);
  } finally {
    await context.close();
  }
}

async function submitLogin(page, creds) {
  await page.locator('input[name="email"]').first().fill(creds.email);
  await page.locator('input[name="password"]').first().fill(creds.password);
  await page.locator('button[type="submit"]').first().click();
}

async function authSnapshot(page) {
  return page.evaluate(async () => {
    const response = await fetch("/api/auth/autologin", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    return payload?.data?.user ?? null;
  });
}

async function logoutViaApi(page) {
  await page.evaluate(async () => {
    await fetch("/api/profile/logout", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: "{}",
    }).catch(() => null);
  });
}

function failureEvidence(test, error) {
  return {
    route: test.route,
    roleAccountUsed: test.credentialRole,
    expectedResult: test.expectedHash ?? "ditolak dan tetap tidak login",
    actualResult: error?.message ?? String(error),
    result: "FAIL",
  };
}

function hasFailures(evidence) {
  return [
    ...evidence.positive,
    ...evidence.negative,
    evidence.existingLogin,
  ].some((item) => item?.result !== "PASS");
}

function writeEvidence(evidence) {
  const outputDir = path.resolve("storage/browser-smoke");
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, "role_specific_login_smoke.json"), JSON.stringify(evidence, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
