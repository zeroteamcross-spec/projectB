import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8019";
const PASSWORD = "SmokePass123!";
const CAR_ID = 36;
const SELLER_CAR_ID = 2;
const report = {
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  public: [],
  roles: {},
  issues: [],
};

let sellerStaffEmail = "ui_20261004142547.staff@projectb.local";
try {
  const businessReport = JSON.parse(await fs.readFile("storage/browser-smoke/business_flow_ui_smoke.json", "utf8"));
  const staffStep = businessReport.steps?.find((step) => step.name === "Showroom memakai fitur staf sesuai paket");
  if (staffStep?.email) sellerStaffEmail = staffStep.email;
} catch {
  // The dedicated business-flow smoke creates the canonical staff fixture.
}

const credentials = {
  buyer: { email: "buyer@projectb.local", password: PASSWORD, loginRole: "buyer" },
  seller: { email: "seller@projectb.local", password: PASSWORD, loginRole: "seller" },
  seller_staff: { email: sellerStaffEmail, password: "DemoPass123!", loginRole: "seller" },
  admin: { email: "admin@projectb.local", password: PASSWORD, loginRole: "admin" },
  super_admin: { email: "superadmin@projectb.local", password: PASSWORD, loginRole: "admin" },
  affiliate_admin: { email: "uat_aff_fin_20260601_145953_affiliate@projectb.local", password: PASSWORD, loginRole: "affiliate" },
};

const publicRoutes = [
  "/",
  "/tasks",
  "/fitur",
  "/features",
  "/daftar-showroom",
  "/carlynk-landing",
  "/saas-landing",
  "/contoh-katalog",
  "/public",
  `/cars/${CAR_ID}`,
  `/transactions/new?car_id=${CAR_ID}`,
  "/metro-auto-jakarta",
  `/metro-auto-jakarta/cars/${CAR_ID}`,
  `/metro-auto-jakarta/transactions/new?car_id=${CAR_ID}`,
  "/showrooms/metro-auto-jakarta",
  `/showrooms/metro-auto-jakarta/cars/${CAR_ID}`,
  `/showrooms/metro-auto-jakarta/transactions/new?car_id=${CAR_ID}`,
  "/s/metro-auto-jakarta",
  `/s/metro-auto-jakarta/cars/${CAR_ID}`,
  `/s/metro-auto-jakarta/transactions/new?car_id=${CAR_ID}`,
  "/af/smoke-seller",
  `/af/smoke-seller/cars/${CAR_ID}`,
  `/af/smoke-seller/transactions/new?car_id=${CAR_ID}`,
  "/a/smoke-seller",
  `/a/smoke-seller/cars/${CAR_ID}`,
  `/a/smoke-seller/transactions/new?car_id=${CAR_ID}`,
  "/login/buyer",
  "/login/seller",
  "/login/admin",
  "/login/affiliate",
  "/google-login/buyer",
  "/google-login/seller",
  "/google-login/admin",
  "/google-login/affiliate",
];

const roleRoutes = {
  buyer: [
    "/buyer",
    "/buyer/portfolio",
    "/buyer/cars",
    "/buyer/transactions",
    "/buyer/account",
    "/profile",
    "/notifications",
  ],
  seller: [
    "/seller",
    "/seller/showroom",
    "/seller/cars",
    `/seller/cars/${SELLER_CAR_ID}/images`,
    `/seller/cars/${SELLER_CAR_ID}/inspection`,
    "/seller/inspection",
    "/seller/staff",
    "/seller/affiliates",
    "/seller/affiliate-commissions",
    "/seller/transactions",
    "/seller/billing",
    "/profile",
    "/notifications",
  ],
  seller_staff: [
    "/seller",
    "/seller/showroom",
    "/seller/cars",
    `/seller/cars/${SELLER_CAR_ID}/images`,
    `/seller/cars/${SELLER_CAR_ID}/inspection`,
    "/seller/inspection",
    "/seller/transactions",
    "/profile",
    "/notifications",
  ],
  affiliate_admin: [
    "/affiliate",
    "/affiliate/cars",
    "/affiliate/activity",
    "/affiliate/ledger",
    "/affiliate/settlements",
    "/profile",
    "/notifications",
  ],
  admin: [
    "/admin",
    "/admin/tasks",
    "/admin/approvals",
    "/admin/pending-users",
    "/admin/users",
    "/admin/cars",
    `/admin/cars/${CAR_ID}/images`,
    `/admin/cars/${CAR_ID}/inspection`,
    "/admin/transactions",
    "/admin/affiliate-commissions",
    "/admin/settlements",
    "/admin/sliders",
    "/admin/master-brand",
    "/admin/master-sidebar",
    "/admin/master-bank",
    "/admin/master-location",
    "/admin/master-pricing",
    "/admin/subscriptions-due",
    "/admin/master-inspection",
    "/admin/web-config",
    "/admin/landing-page",
    "/admin/design-studio-v2",
    "/admin/migrations",
    "/admin/release-versions",
    "/profile",
    "/notifications",
  ],
  super_admin: [
    "/super-admin",
    "/super-admin/accounts",
    "/admin",
    "/admin/landing-page",
    "/admin/design-studio-v2",
    "/admin/migrations",
    "/admin/release-versions",
    "/profile",
    "/notifications",
  ],
};

function record(scope, route, status, details = {}) {
  const item = { scope, route, status, ...details };
  if (scope === "public") report.public.push(item);
  else (report.roles[scope] ??= []).push(item);
  if (status === "FAIL") report.issues.push(item);
}

async function waitForApp(page) {
  await page.locator("#app").waitFor({ state: "attached", timeout: 15000 });
  await page.waitForTimeout(700);
}

async function visit(page, scope, route) {
  const pageErrors = [];
  const consoleErrors = [];
  const responseErrors = [];
  const onPageError = (error) => pageErrors.push(error.message);
  const onConsole = (message) => {
    if (message.type() === "error" && !/401 \(Unauthorized\)/i.test(message.text())) consoleErrors.push(message.text());
  };
  const onResponse = (response) => {
    if (response.status() >= 400) responseErrors.push({ status: response.status(), method: response.request().method(), url: response.url() });
  };
  page.on("pageerror", onPageError);
  page.on("console", onConsole);
  page.on("response", onResponse);
  try {
    const separator = route.includes("?") ? "&" : "?";
    await page.goto(`${BASE_URL}${route}${separator}menu_gate=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await waitForApp(page);
    const body = await page.locator("body").innerText();
    const missing = /page not found|route not found|fatal error|uncaught/i.test(body);
    const redirectedToLogin = /^\/login\//.test(new URL(page.url()).pathname) && !route.startsWith("/login/") && !route.startsWith("/google-login/");
    // Console 401/403/404 responses can be intentional background probes
    // (optional master data, image fallbacks, or role-scoped resources).
    // A route is failed only when its page throws, is missing, or is guarded
    // to the wrong login page. The raw console errors remain in the report.
    const status = missing || redirectedToLogin || pageErrors.length ? "FAIL" : "PASS";
    record(scope, route, status, {
      finalUrl: page.url(),
      bodySample: body.replace(/\s+/g, " ").slice(0, 180),
      pageErrors,
      consoleErrors,
      responseErrors,
    });
  } catch (error) {
    record(scope, route, "FAIL", { note: error.message, finalUrl: page.url() });
  } finally {
    page.off("pageerror", onPageError);
    page.off("console", onConsole);
    page.off("response", onResponse);
  }
}

async function login(page, role) {
  const account = credentials[role];
  await page.goto(`${BASE_URL}/login/${account.loginRole}?login_gate=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await waitForApp(page);
  await page.locator(`#role_login_${account.loginRole}_email_input`).fill(account.email);
  await page.locator(`#role_login_${account.loginRole}_password_input`).fill(account.password);
  await page.locator(`#role_login_${account.loginRole}_submit_button`).click();
  await page.waitForTimeout(1200);
  const body = await page.locator("body").innerText();
  if (/Maaf,|gagal login|tidak valid|ROLE_MISMATCH/i.test(body)) throw new Error(`Login ${role} gagal: ${body.slice(-300)}`);
}

const browser = await chromium.launch({ headless: true });
try {
  const publicContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const publicPage = await publicContext.newPage();
  for (const route of publicRoutes) await visit(publicPage, "public", route);
  await publicContext.close();

  for (const role of Object.keys(roleRoutes)) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    try {
      await login(page, role);
      for (const route of roleRoutes[role]) {
        await visit(page, role, route);
        if (role === "buyer" && route === "/buyer/transactions") {
          const detailButton = page.locator('button[id^="byrtx_transaction_"][id$="_detail_button"]').first();
          const id = (await detailButton.getAttribute("id").catch(() => ""))?.match(/^byrtx_transaction_(\d+)_detail_button$/)?.[1];
          if (id) await visit(page, role, `/buyer/transactions/${id}`);
        }
        if (role === "seller" && route === "/seller/transactions") {
          const id = await page.evaluate(() => {
            const state = window.ProjectBApp?.store?.get?.("working.sellerTransactions.transactions");
            const rows = state?.data?.transactions ?? state?.data ?? [];
            return Array.isArray(rows) && rows[0]?.id ? String(rows[0].id) : "";
          });
          if (id) await visit(page, role, `/seller/transactions/${id}`);
        }
      }
    } catch (error) {
      record(role, "LOGIN", "FAIL", { note: error.message });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

report.finishedAt = new Date().toISOString();
report.status = report.issues.length ? "FAIL" : "PASS";
const output = path.resolve("storage", "browser-smoke", "all_role_menu_ui_smoke.json");
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ status: report.status, output, publicRoutes: report.public.length, roleRoutes: Object.fromEntries(Object.entries(report.roles).map(([role, rows]) => [role, rows.length])), issues: report.issues }, null, 2));
process.exitCode = report.issues.length ? 1 : 0;
