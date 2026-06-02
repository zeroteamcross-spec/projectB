import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.PB_BASE_URL || "http://127.0.0.1:8017";
const RUN_ID = "uat_aff_fin_20260601_145953";
const PASSWORD = "SmokePass123!";
const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 760 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 900 },
  { name: "desktop-1280", width: 1280, height: 900 },
];

const result = {
  date: new Date().toISOString(),
  baseUrl: BASE_URL,
  runId: RUN_ID,
  admin: {},
  affiliate: {},
  responsive: [],
  staticChecks: {},
  issues: [],
};

const adminUser = `${RUN_ID}_admin@projectb.local`;
const affiliateUser = `${RUN_ID}_affiliate@projectb.local`;

const browser = await chromium.launch({ headless: true });
try {
  await smokeAdmin();
  await smokeAffiliate();
  await runStaticChecks();
} finally {
  await browser.close();
}

const outDir = path.resolve("storage", "browser-smoke");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `affiliate_finance_visual_${RUN_ID}.json`);
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.issues.length ? "ISSUES" : "PASS", output: outPath, issues: result.issues }, null, 2));

async function smokeAdmin() {
  const context = await browser.newContext({ viewport: VIEWPORTS[3] });
  await login(context, adminUser);
  const page = await context.newPage();
  const telemetry = attachTelemetry(page);

  await gotoRoute(page, "/admin/affiliate-commissions", "#adfc_page_section");
  result.admin.affiliateCommissions = await inspectRoute(page, {
    route: "#/admin/affiliate-commissions",
    requiredText: ["Affiliate Commissions", "Affiliate commission ledgers", "Sudah Dibayar"],
    requiredSelectors: ["#adfc_ledgers_table_section", "#adfc_create_settlement_button"],
  });

  const createLedgerButtonId = await firstVisibleId(page, "#adfc_select_ledger_button_3");
  const createAvailable = Boolean(createLedgerButtonId);
  result.admin.createSettlementModal = { available: createAvailable };
  if (createAvailable) {
    const pageNodeStable = await nodeStabilityCheck(page, "#adfc_page_section", async () => {
      await clickFirstVisible(page, `#${createLedgerButtonId}`);
    });
    await page.locator("#adfc_create_settlement_button").click();
    await page.locator("#modal-root:not([hidden])").waitFor({ timeout: 5000 });
    const beforeBackdrop = await isModalOpen(page);
    await page.mouse.click(8, 8);
    await page.waitForTimeout(250);
    const afterBackdrop = await isModalOpen(page);
    const reference = page.locator('#modal-root input[placeholder="Referensi pembayaran"]');
    await reference.fill("browser-smoke-reference");
    await page.locator('#modal-root input[placeholder="Metode pembayaran"]').fill("manual");
    await page.evaluate(() => window.dispatchEvent(new Event("resize")));
    await page.waitForTimeout(250);
    const draftValue = await reference.inputValue();
    result.admin.createSettlementModal = {
      available: true,
      opened: beforeBackdrop,
      stayedOpenAfterBackdropClick: afterBackdrop,
      draftPreservedAfterViewportEvent: draftValue === "browser-smoke-reference",
      selectionRemountedPageSection: !pageNodeStable,
      submitted: false,
    };
    await page.locator('#modal-root [aria-label="Tutup"]').click();
    await page.waitForTimeout(250);
  }

  await gotoRoute(page, "/admin/settlements", "#adst_page_section");
  result.admin.settlements = await inspectRoute(page, {
    route: "#/admin/settlements",
    requiredText: ["Admin Settlements", "Settlement batches", "Sudah Dibayar", "Dibatalkan"],
    requiredSelectors: ["#adst_settlements_table_section"],
  });

  const detailButton = page.locator("#adst_detail_button_desktop_2").first();
  const detailAvailable = await detailButton.isVisible().catch(() => false);
  result.admin.settlementDetail = { available: detailAvailable };
  if (detailAvailable) {
    await detailButton.click();
    await page.locator("#modal-root:not([hidden])").waitFor({ timeout: 7000 });
    const text = await page.locator("#modal-root").innerText();
    result.admin.settlementDetail = {
      available: true,
      opened: true,
      hasItems: /Items ledger|Ledger/.test(text),
      hasHistory: /History status|settled|pending/.test(text),
      hasPaymentMetadata: /referensi|proof url|paid by/i.test(text),
    };
    await page.locator('#modal-root [aria-label="Tutup"]').click({ force: true });
    await page.locator("#modal-root[hidden]").waitFor({ timeout: 5000 }).catch(async () => {
      await gotoRoute(page, "/admin/settlements", "#adst_page_section");
    });
    await page.waitForTimeout(500);
    if (await isModalOpen(page)) {
      await gotoRoute(page, "/admin/settlements", "#adst_page_section");
    }
  }

  result.admin.notifications = await inspectNotifications(page, "/notifications");
  result.admin.telemetry = telemetry.summary();
  await context.close();
}

async function smokeAffiliate() {
  const context = await browser.newContext({ viewport: VIEWPORTS[3] });
  await login(context, affiliateUser);
  const page = await context.newPage();
  const telemetry = attachTelemetry(page);

  await gotoRoute(page, "/affiliate", ".af-account-page");
  result.affiliate.dashboard = await inspectRoute(page, {
    route: "#/affiliate",
    requiredText: ["Dashboard Affiliate", "Buka landing"],
    requiredSelectors: [".af-account-page"],
  });
  result.affiliate.dashboard.noVisibleSidebar = await visibleCount(page, "aside") === 0;

  await gotoRoute(page, "/affiliate/ledger", ".af-account-page");
  result.affiliate.ledger = await inspectRoute(page, {
    route: "#/affiliate/ledger",
    requiredText: ["Affiliate Ledger", "Sudah Dibayar", "Belum Dibayar"],
    requiredSelectors: [".af-account-page"],
  });
  result.affiliate.ledger.noVisibleSidebar = await visibleCount(page, "aside") === 0;

  await gotoRoute(page, "/affiliate/settlements", ".af-account-page");
  result.affiliate.settlements = await inspectRoute(page, {
    route: "#/affiliate/settlements",
    requiredText: ["Affiliate Settlements", "Riwayat settlement", "Sudah Dibayar", "Dibatalkan"],
    requiredSelectors: [".af-account-page"],
  });
  result.affiliate.settlements.noVisibleSidebar = await visibleCount(page, "aside") === 0;

  result.affiliate.notifications = await inspectNotifications(page, "/notifications");

  await gotoRoute(page, "/profile", ".af-account-page");
  result.affiliate.profile = await inspectRoute(page, {
    route: "#/profile",
    requiredText: ["Profil Affiliate"],
    requiredSelectors: [".af-account-page"],
  });

  for (const viewport of VIEWPORTS) {
    for (const route of ["/admin/affiliate-commissions", "/admin/settlements"]) {
      result.responsive.push(await inspectAs(context, page, viewport, route, route.includes("commissions") ? "#adfc_page_section" : "#adst_page_section"));
    }
    for (const route of ["/affiliate/ledger", "/affiliate/settlements"]) {
      result.responsive.push(await inspectAs(context, page, viewport, route, ".af-account-page"));
    }
  }

  result.affiliate.telemetry = telemetry.summary();
  await context.close();
}

async function inspectAs(context, page, viewport, route, selector) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  const userEmail = route.startsWith("/admin") ? adminUser : affiliateUser;
  await login(context, userEmail);
  await gotoRoute(page, route, selector);
  const overflow = await hasHorizontalOverflow(page);
  const modalOverflow = await page.locator("#modal-root:not([hidden])").count().then((count) => count > 0 ? hasHorizontalOverflow(page) : false);
  return { viewport: viewport.name, route: `#${route}`, overflow, modalOverflow };
}

async function inspectNotifications(page, fallbackRoute) {
  const bellId = await firstVisibleId(page, 'button[id$="_ntf_bell_button"]');
  if (!bellId) {
    return { available: false };
  }
  const bell = page.locator(`#${bellId}`);
  const before = await fetchCount(page);
  await bell.click();
  await page.waitForTimeout(350);
  const after = await fetchCount(page);
  const popoverVisible = await page.locator('[id$="_ntf_popover"]').first().isVisible().catch(() => false);
  const text = popoverVisible ? await page.locator('[id$="_ntf_popover"]').first().innerText() : "";
  const allLink = page.getByText("Lihat semua notifikasi").first();
  if (await allLink.isVisible().catch(() => false)) {
    await allLink.click();
  } else {
    await gotoRoute(page, fallbackRoute, "#ntf_page");
  }
  await page.locator("#ntf_page").waitFor({ timeout: 5000 }).catch(() => null);
  return {
    available: true,
    popoverVisible,
    fetchesOnOpen: after - before,
    hasFinanceText: /commission|settlement|komisi|affiliate/i.test(text),
    notificationsRouteOpened: page.url().includes("#/notifications"),
  };
}

async function firstVisibleId(page, selector) {
  return page.locator(selector).evaluateAll((nodes) => {
    const visible = nodes.find((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return node.id && rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    });
    return visible?.id ?? "";
  });
}

async function clickFirstVisible(page, selector) {
  await page.locator(selector).evaluateAll((nodes) => {
    const visible = nodes.find((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    });
    if (!visible) {
      throw new Error(`No visible element for ${selector}`);
    }
    visible.click();
  });
}

async function login(context, email) {
  const response = await context.request.post(`${BASE_URL}/api/auth/login`, {
    data: { email, password: PASSWORD },
  });
  if (!response.ok()) {
    throw new Error(`Login failed for ${email}: ${response.status()} ${await response.text()}`);
  }
}

async function gotoRoute(page, route, selector) {
  await page.goto(`${BASE_URL}/app.html?smoke=${Date.now()}#${route}`, { waitUntil: "domcontentloaded" });
  await page.locator(selector).waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
}

async function inspectRoute(page, { route, requiredText = [], requiredSelectors = [] }) {
  const text = await page.locator("body").innerText();
  return {
    route,
    requiredText: Object.fromEntries(requiredText.map((item) => [item, text.includes(item)])),
    requiredSelectors: Object.fromEntries(await Promise.all(requiredSelectors.map(async (selector) => [selector, await page.locator(selector).isVisible().catch(() => false)]))),
    overflow: await hasHorizontalOverflow(page),
    url: page.url(),
  };
}

async function nodeStabilityCheck(page, selector, action) {
  return page.evaluateHandle((sel) => document.querySelector(sel), selector)
    .then(async (before) => {
      await action();
      await page.waitForTimeout(250);
      const same = await page.evaluate(([sel, node]) => document.querySelector(sel) === node, [selector, before]);
      await before.dispose();
      return same;
    });
}

async function isModalOpen(page) {
  return page.locator("#modal-root:not([hidden])").isVisible().catch(() => false);
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return Math.max(doc.scrollWidth, body.scrollWidth) > window.innerWidth + 2;
  });
}

async function visibleCount(page, selector) {
  return page.locator(selector).evaluateAll((nodes) => nodes.filter((node) => {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  }).length);
}

function attachTelemetry(page) {
  const consoleErrors = [];
  const pageErrors = [];
  let fetches = 0;
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType())) {
      fetches += 1;
    }
  });
  page.__fetchCount = () => fetches;
  return {
    summary: () => ({ consoleErrors, pageErrors, fetches }),
  };
}

async function fetchCount(page) {
  return page.__fetchCount?.() ?? 0;
}

async function runStaticChecks() {
  const files = [
    "public/assets/js/modules/admin/pages/affiliateCommissionsPage.js",
    "public/assets/js/modules/admin/components/adminAffiliateLedgerList.js",
    "public/assets/js/modules/admin/pages/settlementsPage.js",
    "public/assets/js/modules/admin/components/adminSettlementList.js",
    "public/assets/js/modules/affiliate/pages/ledgerPage.js",
    "public/assets/js/modules/affiliate/pages/settlementsPage.js",
  ];
  const checks = {};
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    checks[file] = {
      directFetch: /(^|[^\w.])fetch\s*\(/.test(source),
      locationReload: /location\.reload\s*\(/.test(source),
    };
  }
  result.staticChecks = checks;
}
