import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.PB_BASE_URL || "http://127.0.0.1:8019";
const PASSWORD = "SmokePass123!";
const CREDS = {
  admin: { email: "admin@projectb.local", password: PASSWORD },
  seller: { email: "seller@projectb.local", password: PASSWORD },
  affiliate_admin: { email: "affiliate@projectb.local", password: PASSWORD },
};

const result = {
  date: new Date().toISOString(),
  baseUrl: BASE_URL,
  targets: {},
  adminUi: {},
  seller: {},
  affiliate: {},
  regression: {},
  issues: [],
};

const browser = await chromium.launch({ headless: true });

try {
  await smokeAdminUi();
  await smokeSellerImpersonation();
  await smokeAffiliateImpersonation();
  await smokeMinimalRegression();
} finally {
  await browser.close();
}

const outDir = path.resolve("storage", "browser-smoke");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "admin_impersonation_smoke.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  status: result.issues.length ? "ISSUES" : "PASS",
  output: outPath,
  issues: result.issues,
}, null, 2));

async function smokeAdminUi() {
  const context = await loggedInContext("admin");
  const page = await context.newPage();
  const sellerTarget = await resolveTargetUser(context, "seller");
  const affiliateTarget = await resolveTargetUser(context, "affiliate_admin");
  result.targets.seller = sellerTarget;
  result.targets.affiliate_admin = affiliateTarget;

  await gotoRoute(page, `/admin/users?role=seller&keyword=${encodeURIComponent(sellerTarget.email)}`);
  const sellerButtonVisible = await tableActionVisible(page, `adusr_impersonate_button_desktop_${sellerTarget.id}`, "Login sebagai Seller");

  await gotoRoute(page, `/admin/users?role=affiliate_admin&keyword=${encodeURIComponent(affiliateTarget.email)}`);
  const affiliateButtonVisible = await tableActionVisible(page, `adusr_impersonate_button_desktop_${affiliateTarget.id}`, "Login sebagai Affiliate");

  result.adminUi = {
    sellerEmail: sellerTarget.email,
    affiliateEmail: affiliateTarget.email,
    sellerButtonVisible,
    affiliateButtonVisible,
  };

  if (!sellerButtonVisible) {
    result.issues.push({ area: "admin-ui", message: "Tombol Login sebagai Seller tidak terlihat." });
  }
  if (!affiliateButtonVisible) {
    result.issues.push({ area: "admin-ui", message: "Tombol Login sebagai Affiliate tidak terlihat." });
  }

  await context.close();
}

async function smokeSellerImpersonation() {
  const context = await loggedInContext("admin");
  const page = await context.newPage();
  const sellerTarget = result.targets.seller ?? await resolveTargetUser(context, "seller");

  await gotoRoute(page, `/admin/users?role=seller&keyword=${encodeURIComponent(sellerTarget.email)}`);
  await clickTableAction(page, `adusr_impersonate_button_desktop_${sellerTarget.id}`);
  const modal = page.locator("#adusr_impersonation_modal");
  await modal.waitFor({ timeout: 10000 });
  const modalStillOpenAfterBackdrop = await verifyModalNotClosedByBackdrop(page, modal);
  await modal.locator("button").filter({ hasText: "Masuk sebagai Seller" }).first().click();
  await waitForHash(page, "#/seller");
  await page.waitForTimeout(1200);

  const authContext = await fetchAuthContext(context);
  const bannerText = await page.locator("text=Anda sedang login sebagai Seller").first().innerText().catch(() => "");
  await gotoRoute(page, "/seller");
  await gotoRoute(page, "/seller/cars");
  await gotoRoute(page, "/seller/transactions");
  await page.locator("#global_impersonation_return_button").click();
  await waitForHash(page, "#/admin");
  await page.waitForTimeout(1200);
  const postStopContext = await fetchAuthContext(context);
  const bannerGone = await page.locator("text=Anda sedang login sebagai").count().then((count) => count === 0).catch(() => false);

  result.seller = {
    targetEmail: sellerTarget.email,
    modalStillOpenAfterBackdrop,
    redirectUrl: page.url(),
    authContext,
    bannerText,
    postStopContext,
    bannerGone,
  };

  assertImpersonation(result.seller, "seller");
  if (!modalStillOpenAfterBackdrop) {
    result.issues.push({ area: "seller", message: "Modal seller impersonation tertutup saat backdrop diklik." });
  }
  if (!bannerText.includes("Seller")) {
    result.issues.push({ area: "seller", message: "Banner seller impersonation tidak tampil dengan label Seller." });
  }
  if (!bannerGone) {
    result.issues.push({ area: "seller", message: "Banner seller impersonation masih terlihat setelah stop." });
  }

  await context.close();
}

async function smokeAffiliateImpersonation() {
  const context = await loggedInContext("admin");
  const page = await context.newPage();
  const affiliateTarget = result.targets.affiliate_admin ?? await resolveTargetUser(context, "affiliate_admin");

  await gotoRoute(page, `/admin/users?role=affiliate_admin&keyword=${encodeURIComponent(affiliateTarget.email)}`);
  await clickTableAction(page, `adusr_impersonate_button_desktop_${affiliateTarget.id}`);
  const modal = page.locator("#adusr_impersonation_modal");
  await modal.waitFor({ timeout: 10000 });
  const modalStillOpenAfterBackdrop = await verifyModalNotClosedByBackdrop(page, modal);
  await modal.locator("button").filter({ hasText: "Masuk sebagai Affiliate" }).first().click();
  await waitForHash(page, "#/affiliate");
  await page.waitForTimeout(1200);

  const authContext = await fetchAuthContext(context);
  const bannerText = await page.locator("text=Anda sedang login sebagai Affiliate").first().innerText().catch(() => "");
  await gotoRoute(page, "/affiliate");
  await gotoRoute(page, "/affiliate/ledger");
  await gotoRoute(page, "/affiliate/settlements");
  await page.locator("#global_impersonation_return_button").click();
  await waitForHash(page, "#/admin");
  await page.waitForTimeout(1200);
  const postStopContext = await fetchAuthContext(context);
  const bannerGone = await page.locator("text=Anda sedang login sebagai").count().then((count) => count === 0).catch(() => false);

  result.affiliate = {
    targetEmail: affiliateTarget.email,
    modalStillOpenAfterBackdrop,
    redirectUrl: page.url(),
    authContext,
    bannerText,
    postStopContext,
    bannerGone,
  };

  assertImpersonation(result.affiliate, "affiliate_admin");
  if (!modalStillOpenAfterBackdrop) {
    result.issues.push({ area: "affiliate", message: "Modal affiliate impersonation tertutup saat backdrop diklik." });
  }
  if (!bannerText.includes("Affiliate")) {
    result.issues.push({ area: "affiliate", message: "Banner affiliate impersonation tidak tampil dengan label Affiliate." });
  }
  if (!bannerGone) {
    result.issues.push({ area: "affiliate", message: "Banner affiliate impersonation masih terlihat setelah stop." });
  }

  await context.close();
}

async function smokeMinimalRegression() {
  result.regression.admin = await canLoginAndOpen("admin", "/admin");
  result.regression.seller = await canLoginAndOpen("seller", "/seller");
  result.regression.affiliate_admin = await canLoginAndOpen("affiliate_admin", "/affiliate");
}

async function canLoginAndOpen(role, route) {
  const context = await loggedInContext(role);
  const page = await context.newPage();
  try {
    await gotoRoute(page, route);
    return {
      email: CREDS[role].email,
      route,
      url: page.url(),
      ok: true,
    };
  } catch (error) {
    result.issues.push({ area: "regression", message: `${role} gagal membuka ${route}: ${error.message}` });
    return {
      email: CREDS[role].email,
      route,
      ok: false,
      error: error.message,
    };
  } finally {
    await context.close();
  }
}

async function loggedInContext(role) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const creds = CREDS[role];
  const response = await context.request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: creds.email, password: creds.password },
  });

  if (!response.ok()) {
    throw new Error(`Login failed for ${role}: ${response.status()} ${await response.text()}`);
  }

  return context;
}

async function resolveTargetUser(context, role) {
  const response = await context.request.get(`${BASE_URL}/api/admin/users?limit=100`);
  const payload = await response.json();
  const users = payload?.data?.users ?? [];
  const target = users.find((user) => user?.role === role && user?.account_status === "active" && Boolean(user?.is_approved));

  if (!target) {
    throw new Error(`No active approved target found for role ${role}.`);
  }

  return {
    id: Number(target.id),
    email: String(target.email ?? ""),
    role: String(target.role ?? ""),
  };
}

async function gotoRoute(page, route) {
  await page.goto(`${BASE_URL}/app.html#${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator("body").waitFor({ timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function tableActionVisible(page, buttonId, expectedText) {
  return page.locator("#adusr_users_table_section").evaluate((node, payload) => {
    const button = node.querySelector(`#${payload.buttonId}`);
    if (!(button instanceof HTMLButtonElement)) {
      return false;
    }

    const text = (button.textContent || "").trim();
    const isVisible = !!(button.offsetWidth || button.offsetHeight || button.getClientRects().length);
    return isVisible && text === payload.expectedText;
  }, { buttonId, expectedText });
}

async function clickTableAction(page, buttonId) {
  const clicked = await page.locator("#adusr_users_table_section").evaluate((node, id) => {
    const button = node.querySelector(`#${id}`);
    if (!(button instanceof HTMLButtonElement)) {
      return false;
    }

    button.click();
    return true;
  }, buttonId);

  if (!clicked) {
    throw new Error(`Table action ${buttonId} not found.`);
  }

  await page.waitForTimeout(300);
}

async function verifyModalNotClosedByBackdrop(page, modal) {
  await page.mouse.click(10, 10);
  await page.waitForTimeout(250);
  return modal.isVisible().catch(() => false);
}

async function waitForHash(page, hash) {
  const startedAt = Date.now();
  while ((Date.now() - startedAt) < 15000) {
    const currentHash = await page.evaluate(() => window.location.hash).catch(() => "");
    if (currentHash === hash) {
      return;
    }
    await page.waitForTimeout(200);
  }

  throw new Error(`Expected hash ${hash} but found ${await page.evaluate(() => window.location.hash).catch(() => "<unavailable>")}.`);
}

async function fetchAuthContext(context) {
  const response = await context.request.get(`${BASE_URL}/api/auth/autologin`);
  const payload = await response.json();
  return payload?.data ?? null;
}

function assertImpersonation(payload, expectedRole) {
  const auth = payload.authContext ?? {};
  if (auth?.user?.role !== expectedRole) {
    result.issues.push({ area: expectedRole, message: `Role user hasil impersonation bukan ${expectedRole}.` });
  }
  if (auth?.actor?.role !== "admin") {
    result.issues.push({ area: expectedRole, message: "Actor hasil impersonation bukan admin." });
  }
  if (!auth?.impersonation?.is_impersonating) {
    result.issues.push({ area: expectedRole, message: "Flag impersonation tidak aktif." });
  }
  if (auth?.impersonation?.impersonated_role !== expectedRole) {
    result.issues.push({ area: expectedRole, message: `impersonated_role bukan ${expectedRole}.` });
  }
  if (payload.postStopContext?.user?.role !== "admin" || payload.postStopContext?.impersonation !== null) {
    result.issues.push({ area: expectedRole, message: "Context admin tidak pulih setelah stop impersonation." });
  }
}
