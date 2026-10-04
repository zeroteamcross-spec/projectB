import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.PB_BASE_URL || "http://127.0.0.1:8019";
const ACCOUNTS = {
  buyer: { email: "frontend-buyer@projectb.local", password: "DemoPass123!" },
  seller: { email: "metro-auto@projectb.local", password: "DemoPass123!" },
  admin: { email: "frontend-admin@projectb.local", password: "DemoPass123!" },
  affiliate: { email: "affiliate@projectb.local", password: "SmokePass123!" },
};

const result = {
  date: new Date().toISOString(),
  baseUrl: BASE_URL,
  public: {},
  roles: {},
  transactionEntry: {},
  issues: [],
};
let smokeCarId = 19;

const browser = await chromium.launch({ headless: true });

try {
  smokeCarId = await resolvePublicCarId();
  await testPublicPage();
  await testPublicRoutes();
  await testTransactionEntry();
  await testRoleRoutes();
} catch (error) {
  result.issues.push({ area: "runner", message: error.message });
} finally {
  await browser.close();
}

const output = path.resolve("storage", "browser-smoke", "feature_checklist_smoke.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.issues.length ? "ISSUES" : "PASS", output, issues: result.issues }, null, 2));
if (result.issues.length) process.exitCode = 1;

async function testPublicPage() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const telemetry = attachTelemetry(page);
  await goto(page, "/fitur", "#feature-group-public");
  const body = await page.locator("body").innerText();
  assert(/Daftar fitur dan alur bisnis aplikasi/i.test(body), "Judul halaman fitur tidak tampil.");
  assert(/Alur bisnis utama/i.test(body), "Alur bisnis utama tidak tampil.");
  assert(await page.locator("[data-feature-id]").count() >= 30, "Checklist fitur terlalu sedikit.");
  assert(!(await page.locator("#role_login_buyer_panel").count()), "Halaman fitur meminta login buyer.");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), "Halaman fitur overflow horizontal pada desktop.");

  await page.getByRole("button", { name: /Terverifikasi/ }).click();
  assert(await page.locator("[data-feature-id]").count() > 0, "Filter Terverifikasi menghasilkan daftar kosong.");
  assert(!(await page.locator('[data-feature-id]').filter({ hasText: "Belum diuji" }).count()), "Filter Terverifikasi masih menampilkan status Belum diuji.");

  await goto(page, "/features", "#feature-group-public");
  result.public.alias = { url: page.url(), featureCount: await page.locator("[data-feature-id]").count() };
  result.public.page = { url: page.url(), featureCount: result.public.alias.featureCount, telemetry: telemetry.summary() };
  await context.close();
}

async function testPublicRoutes() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  for (const route of ["/", "/tasks", "/daftar-showroom", "/carlynk-landing", "/saas-landing", "/contoh-katalog", `/cars/${smokeCarId}`, `/transactions/new?car_id=${smokeCarId}`, "/metro-auto-jakarta"]) {
    await goto(page, route, "body");
    const text = await page.locator("body").innerText();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    const notFound = /halaman tidak ditemukan|not found/i.test(text);
    result.public[route] = { url: page.url(), notFound, overflow, textSample: text.slice(0, 180) };
    assert(!notFound, `Route publik ${route} jatuh ke halaman tidak ditemukan.`);
    assert(!overflow, `Route publik ${route} overflow horizontal pada mobile.`);
  }
  await context.close();
}

async function testTransactionEntry() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await goto(page, `/transactions/new?car_id=${smokeCarId}`, "body");
  const text = await page.locator("body").innerText();
  result.transactionEntry = {
    url: page.url(),
    hasAccessCard: /Akun akses/i.test(text),
    hasLoginButton: await page.getByRole("button", { name: /^Masuk$/i }).count() > 0,
    hasBuyerRegisterButton: await page.getByRole("button", { name: /Daftar Pembeli/i }).count() > 0,
    hasGoogleButton: await page.getByRole("button", { name: /Login dengan Google/i }).count() > 0,
    overflow: await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1),
  };
  assert(!result.transactionEntry.hasAccessCard, "Card Akun akses masih tampil di guest transaction entry.");
  assert(!result.transactionEntry.hasLoginButton, "Tombol Masuk masih tampil di guest transaction entry.");
  assert(!result.transactionEntry.hasBuyerRegisterButton, "Tombol Daftar Pembeli masih tampil di guest transaction entry.");
  assert(result.transactionEntry.hasGoogleButton, "Tombol Login Google tidak tampil di guest transaction entry.");
  assert(!result.transactionEntry.overflow, "Guest transaction entry overflow horizontal pada mobile.");
  await context.close();
}

async function testRoleRoutes() {
  const roleRoutes = {
    buyer: ["/buyer", "/buyer/portfolio", "/buyer/account", "/buyer/cars", "/buyer/transactions", "/profile", "/notifications"],
    seller: ["/seller", "/seller/showroom", "/seller/staff", "/seller/billing", "/seller/cars", "/seller/inspection", "/seller/affiliates", "/seller/affiliate-commissions", "/seller/transactions", "/profile", "/notifications"],
    admin: ["/admin", "/admin/tasks", "/admin/users", "/admin/approvals", "/admin/pending-users", "/admin/cars", "/admin/transactions", "/admin/affiliate-commissions", "/admin/settlements", "/admin/sliders", "/admin/master-brand", "/admin/master-sidebar", "/admin/master-bank", "/admin/master-location", "/admin/master-pricing", "/admin/subscriptions-due", "/admin/master-inspection", "/admin/web-config", "/admin/landing-page", "/admin/design-studio-v2", "/admin/migrations", "/admin/release-versions", "/profile", "/notifications"],
    affiliate: ["/affiliate", "/affiliate/cars", "/affiliate/activity", "/affiliate/ledger", "/affiliate/settlements", "/profile", "/notifications"],
  };

  for (const [role, routes] of Object.entries(roleRoutes)) {
    const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
    const page = await context.newPage();
    await loginThroughUi(page, role);
    const checks = {};
    for (const route of routes) {
      await goto(page, route, "body");
      const text = await page.locator("body").innerText();
      const notFound = /halaman tidak ditemukan|not found/i.test(text);
      const accessDenied = /tidak dapat membuka area|akses ditolak/i.test(text);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      checks[route] = { notFound, accessDenied, overflow, url: page.url(), textSample: text.slice(0, 160) };
      assert(!notFound, `Route ${role} ${route} jatuh ke halaman tidak ditemukan.`);
      assert(!accessDenied, `Route ${role} ${route} memunculkan akses ditolak.`);
      assert(!overflow, `Route ${role} ${route} overflow horizontal.`);
    }
    result.roles[role] = checks;
    await context.close();
  }
}

async function loginThroughUi(page, role) {
  const slug = role === "affiliate" ? "affiliate" : role;
  const account = ACCOUNTS[role];
  await goto(page, `/login/${slug}`, `#role_login_${slug}_panel`);
  await page.locator(`#role_login_${slug}_email_input`).fill(account.email);
  await page.locator(`#role_login_${slug}_password_input`).fill(account.password);
  await page.locator(`#role_login_${slug}_submit_button`).click();
  const target = role === "buyer" ? "/buyer" : role === "seller" ? "/seller" : role === "admin" ? "/admin" : "/affiliate";
  await page.waitForURL((url) => url.pathname === target, { timeout: 20000 });
  await page.locator("body").waitFor({ state: "visible", timeout: 10000 });
}

async function goto(page, route, selector) {
  const url = `${BASE_URL}${route}${route.includes("?") ? "&" : "?"}gate=${Date.now()}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator(selector).waitFor({ state: "visible", timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(700);
}

function attachTelemetry(page) {
  const errors = [];
  const pageErrors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { summary: () => ({ consoleErrors: errors, pageErrors }) };
}

function assert(condition, message) {
  if (!condition) {
    result.issues.push({ area: "assertion", message });
  }
}

async function resolvePublicCarId() {
  try {
    const response = await fetch(`${BASE_URL}/api/cars?listing_status=published&limit=100`);
    const payload = await response.json();
    const cars = payload?.data?.cars ?? [];
    const available = cars.find((car) => Number(car?.stock ?? 0) > 0 && Number(car?.dp_amount ?? 0) > 0);
    return Number(available?.id ?? 19) || 19;
  } catch {
    return 19;
  }
}
