import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.PB_BASE_URL || "http://127.0.0.1:8019";
const PASSWORD = "SmokePass123!";
const AFFILIATE_RUN_ID = "uat_aff_fin_20260601_145953";
const VIEWPORTS = [
  { name: "360", width: 360, height: 760 },
  { name: "390", width: 390, height: 844 },
  { name: "768", width: 768, height: 900 },
  { name: "1024", width: 1024, height: 900 },
  { name: "1280", width: 1280, height: 900 },
];

const CREDENTIALS = {
  buyer: { email: "buyer@projectb.local", password: PASSWORD },
  seller: { email: "seller@projectb.local", password: PASSWORD },
  admin: { email: "admin@projectb.local", password: PASSWORD },
  affiliate_admin: { email: `${AFFILIATE_RUN_ID}_affiliate@projectb.local`, password: PASSWORD },
};

const result = {
  date: new Date().toISOString(),
  baseUrl: BASE_URL,
  testData: {
    smokeUsers: Object.fromEntries(Object.entries(CREDENTIALS).map(([role, item]) => [role, item.email])),
    affiliateFinanceRunId: AFFILIATE_RUN_ID,
  },
  public: {},
  buyer: {},
  seller: {},
  admin: {},
  affiliate: {},
  notifications: {},
  finance: {},
  images: {},
  inspection: {},
  backgroundVideo: {},
  responsive: [],
  spaStability: {},
  staticChecks: {},
  issues: [],
};

const browser = await chromium.launch({ headless: true });

try {
  const publicData = await discoverPublicData();
  result.testData.publicCarId = publicData.carId;
  result.testData.affiliateSlug = publicData.affiliateSlug;

  await smokePublic(publicData);
  await smokeBuyer(publicData);
  await smokeSeller();
  await smokeAdmin();
  await smokeAffiliate();
  await smokeNotifications();
  await smokeResponsive(publicData);
  await runStaticChecks();
} finally {
  await browser.close();
}

finalizeIssues();

const outDir = path.resolve("storage", "browser-smoke");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "projectb_final_full_regression_gate.json");
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.issues.length ? "ISSUES" : "PASS", output: outPath, issues: result.issues }, null, 2));

async function discoverPublicData() {
  const context = await browser.newContext();
  const response = await context.request.get(`${BASE_URL}/api/cars`);
  const payload = await response.json();
  const car = payload?.data?.cars?.find((item) => item?.listing_status === "published") ?? payload?.data?.cars?.[0];
  await context.close();
  return {
    carId: Number(car?.id ?? 2),
    affiliateSlug: "smoke-seller",
  };
}

async function smokePublic({ carId, affiliateSlug }) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const telemetry = attachTelemetry(page);
  const routes = [
    { key: "landing", route: "/", wait: "body" },
    { key: "carDetail", route: `/cars/${carId}`, wait: "body" },
    { key: "transactionEntry", route: `/transactions/new?car_id=${carId}`, wait: "body" },
    { key: "affiliateLanding", route: `/af/${affiliateSlug}`, wait: "body" },
    { key: "affiliateCarDetail", route: `/af/${affiliateSlug}/cars/${carId}`, wait: "body" },
    { key: "affiliateTransactionEntry", route: `/af/${affiliateSlug}/transactions/new?car_id=${carId}`, wait: "body" },
  ];

  for (const item of routes) {
    await gotoRoute(page, item.route, item.wait);
    result.public[item.key] = await inspectPage(page, { route: item.route });
  }

  await gotoRoute(page, "/", "body");
  result.public.landing.maxCardsPerRow = await maxCardsPerRow(page);
  result.public.guestNotificationBellCount = await visibleCount(page, 'button[id$="_ntf_bell_button"]');
  result.public.telemetry = telemetry.summary();
  result.public.unexpectedMutations = telemetry.mutations();
  result.backgroundVideo.publicLanding = await inspectBackgroundVideo(page);
  await context.close();
}

async function smokeBuyer({ carId }) {
  const context = await loggedInContext("buyer", { width: 1280, height: 900 });
  const page = await context.newPage();
  const telemetry = attachTelemetry(page);

  for (const route of ["/buyer", "/buyer/cars", "/buyer/transactions", "/profile", "/notifications"]) {
    await gotoRoute(page, route, "body");
    result.buyer[route] = await inspectPage(page, { route });
  }

  result.buyer.shell = await inspectAccountShell(page, "buyer");
  result.buyer.notifications = await inspectNotificationsForPage(page);
  result.buyer.profileSync = await verifyBuyerProfileSync(page);
  await gotoRoute(page, "/notifications", "#ntf_page");
  result.buyer.notificationsFilterStability = await verifyFilterStability(page, "#byr_notifications_filter");
  result.buyer.logoutModal = await verifyLogoutModal(page);
  result.backgroundVideo.buyer = await inspectBackgroundVideo(page);
  result.buyer.telemetry = telemetry.summary();
  await context.close();
}

async function smokeSeller() {
  const context = await loggedInContext("seller", { width: 1280, height: 900 });
  const page = await context.newPage();
  const telemetry = attachTelemetry(page);

  await gotoRoute(page, "/seller/cars", "body");
  const sellerCarId = await firstCarIdFromSellerCars(page);
  result.testData.sellerCarId = sellerCarId;

  const routes = [
    "/seller",
    "/seller/cars",
    `/seller/cars/${sellerCarId}/images`,
    `/seller/cars/${sellerCarId}/inspection`,
    "/seller/inspection",
    "/seller/affiliates",
    "/seller/affiliate-commissions",
    "/seller/transactions",
    "/notifications",
    "/profile",
  ];
  for (const route of routes) {
    await gotoRoute(page, route, "body");
    result.seller[route] = await inspectPage(page, { route });
  }

  await gotoRoute(page, "/seller/cars", "body");
  result.seller.cars = await inspectSellerCars(page);
  await gotoRoute(page, `/seller/cars/${sellerCarId}/images`, "body");
  result.images.sellerImages = await inspectSellerImages(page);
  await gotoRoute(page, `/seller/cars/${sellerCarId}/inspection`, "body");
  result.inspection.sellerInspection = await inspectSellerInspection(page);
  await gotoRoute(page, "/seller/affiliates?mode=create", "body");
  result.seller.affiliatesModal = await inspectSellerAffiliateDraft(page);
  await gotoRoute(page, "/seller/transactions", "body");
  result.seller.notifications = await inspectNotificationsForPage(page);
  result.seller.telemetry = telemetry.summary();
  await context.close();
}

async function smokeAdmin() {
  const context = await loggedInContext("admin", { width: 1280, height: 900 });
  const page = await context.newPage();
  const telemetry = attachTelemetry(page);
  const routes = [
    "/admin",
    "/admin/users",
    "/admin/pending-users",
    "/admin/cars",
    "/admin/transactions",
    "/admin/settlements",
    "/admin/affiliate-commissions",
    "/admin/sliders",
    "/notifications",
    "/profile",
  ];

  for (const route of routes) {
    await gotoRoute(page, route, "body");
    result.admin[route] = await inspectPage(page, { route });
  }

  await gotoRoute(page, "/admin/affiliate-commissions", "body");
  result.finance.adminAffiliateCommissions = await inspectFinancePage(page, ["Sudah Dibayar", "Belum Dibayar"]);
  await gotoRoute(page, "/admin/settlements", "body");
  result.finance.adminSettlements = await inspectFinancePage(page, ["Sudah Dibayar", "Dibatalkan"]);
  result.finance.adminSettlementDetail = await inspectSettlementDetail(page);
  result.admin.notifications = await inspectNotificationsForPage(page);
  result.admin.telemetry = telemetry.summary();
  await context.close();
}

async function smokeAffiliate() {
  const context = await loggedInContext("affiliate_admin", { width: 1280, height: 900 });
  const page = await context.newPage();
  const telemetry = attachTelemetry(page);
  const routes = ["/affiliate", "/affiliate/ledger", "/affiliate/settlements", "/profile", "/notifications"];

  for (const route of routes) {
    await gotoRoute(page, route, "body");
    result.affiliate[route] = await inspectPage(page, { route });
  }

  result.affiliate.shell = await inspectAccountShell(page, "affiliate");
  await gotoRoute(page, "/affiliate/ledger", "body");
  result.finance.affiliateLedger = await inspectFinancePage(page, ["Sudah Dibayar", "Belum Dibayar"]);
  await gotoRoute(page, "/affiliate/settlements", "body");
  result.finance.affiliateSettlements = await inspectFinancePage(page, ["Sudah Dibayar", "Dibatalkan"]);
  result.affiliate.notifications = await inspectNotificationsForPage(page);
  result.backgroundVideo.affiliate = await inspectBackgroundVideo(page);
  result.affiliate.publicRouteStillPublic = await inspectAffiliatePublicRouteShell(page);
  result.affiliate.telemetry = telemetry.summary();
  await context.close();
}

async function smokeNotifications() {
  for (const role of ["buyer", "seller", "admin", "affiliate_admin"]) {
    const context = await loggedInContext(role, { width: 1024, height: 900 });
    const page = await context.newPage();
    await gotoRoute(page, role === "buyer" ? "/buyer" : role === "affiliate_admin" ? "/affiliate/ledger" : `/${role}`, "body");
    result.notifications[role] = await inspectNotificationsForPage(page);
    await gotoRoute(page, "/notifications", "#ntf_page");
    result.notifications[`${role}_pageFilterStability`] = await verifyFilterStability(page, role === "buyer" ? "#byr_notifications_filter" : "#ntf_filter_tabs");
    await context.close();
  }

  const guest = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const page = await guest.newPage();
  await gotoRoute(page, "/", "body");
  result.notifications.guestBellCount = await visibleCount(page, 'button[id$="_ntf_bell_button"]');
  await guest.close();
}

async function smokeResponsive({ carId }) {
  const samples = [
    { role: "public", route: "/" },
    { role: "public", route: `/cars/${carId}` },
    { role: "buyer", route: "/buyer" },
    { role: "buyer", route: "/notifications" },
    { role: "seller", route: "/seller/cars" },
    { role: "seller", route: `/seller/cars/${result.testData.sellerCarId || 2}/images` },
    { role: "admin", route: "/admin/affiliate-commissions" },
    { role: "affiliate_admin", route: "/affiliate/ledger" },
    { role: "affiliate_admin", route: "/affiliate/settlements" },
  ];

  for (const viewport of VIEWPORTS) {
    for (const sample of samples) {
      const context = sample.role === "public"
        ? await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } })
        : await loggedInContext(sample.role, { width: viewport.width, height: viewport.height });
      const page = await context.newPage();
      await gotoRoute(page, sample.route, "body");
      result.responsive.push({
        viewport: viewport.name,
        role: sample.role,
        route: sample.route,
        overflow: await hasHorizontalOverflow(page),
        visibleBellCount: await visibleCount(page, 'button[id$="_ntf_bell_button"]'),
      });
      await context.close();
    }
  }
}

async function loggedInContext(role, viewport) {
  const context = await browser.newContext({ viewport });
  const creds = CREDENTIALS[role];
  const response = await context.request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: creds.email, password: creds.password },
  });
  if (!response.ok()) {
    throw new Error(`Login failed for ${role} ${creds.email}: ${response.status()} ${await response.text()}`);
  }
  return context;
}

async function gotoRoute(page, route, waitSelector) {
  try {
    await page.goto(`${BASE_URL}/app.html?gate=${Date.now()}#${route}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.locator(waitSelector).waitFor({ timeout: 15000 }).catch(() => null);
    await page.waitForTimeout(900);
    return true;
  } catch (error) {
    result.issues.push({ area: "route-timeout", message: `${route} failed to load: ${error.message}` });
    return false;
  }
}

function attachTelemetry(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const requests = [];
  const mutations = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (["fetch", "xhr"].includes(request.resourceType())) {
      const method = request.method();
      const url = request.url();
      requests.push({ method, url });
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        mutations.push({ method, url });
      }
    }
  });
  page.__requestCount = () => requests.length;
  page.__mutations = () => mutations;
  return {
    summary: () => ({ consoleErrors, pageErrors, requestCount: requests.length, mutationCount: mutations.length }),
    mutations: () => mutations,
  };
}

async function inspectPage(page, { route }) {
  const text = await page.locator("body").innerText().catch(() => "");
  return {
    route,
    url: page.url(),
    title: await page.title(),
    textSample: text.slice(0, 240),
    hasNotFound: /not found|halaman tidak ditemukan/i.test(text),
    overflow: await hasHorizontalOverflow(page),
    visibleModal: await isModalOpen(page),
    visibleBellCount: await visibleCount(page, 'button[id$="_ntf_bell_button"]'),
  };
}

async function inspectNotificationsForPage(page) {
  const bellId = await firstVisibleId(page, 'button[id$="_ntf_bell_button"]');
  if (!bellId) {
    return { available: false };
  }
  const before = page.__requestCount?.() ?? 0;
  await page.locator(`#${bellId}`).click();
  await page.waitForTimeout(350);
  const after = page.__requestCount?.() ?? 0;
  const popover = page.locator('[id$="_ntf_popover"]').first();
  const backdrop = page.locator('[id$="_ntf_backdrop"]').first();
  const popoverVisible = await popover.isVisible().catch(() => false);
  const popText = popoverVisible ? await popover.innerText().catch(() => "") : "";
  const insideClickStayedOpen = await clickInsidePopover(page, popover);
  const closedByBackdrop = await closeByBackdrop(page, backdrop);
  return {
    available: true,
    bellId,
    popoverVisible,
    fetchesOnOpen: after - before,
    backdropVisible: await backdrop.isVisible().catch(() => false),
    insideClickStayedOpen,
    closedByBackdrop,
    hasViewAll: /Lihat semua notifikasi/i.test(popText),
    hasFinanceLinks: /affiliate\/ledger|affiliate\/settlements|komisi|settlement|commission/i.test(popText),
  };
}

async function clickInsidePopover(page, popover) {
  if (!await popover.isVisible().catch(() => false)) {
    return false;
  }
  const box = await popover.boundingBox();
  if (!box) return false;
  await page.mouse.click(box.x + Math.min(30, box.width / 2), box.y + Math.min(30, box.height / 2));
  await page.waitForTimeout(150);
  return popover.isVisible().catch(() => false);
}

async function closeByBackdrop(page, backdrop) {
  if (await backdrop.isVisible().catch(() => false)) {
    await backdrop.click({ position: { x: 5, y: 5 } }).catch(() => page.mouse.click(5, 5));
  } else {
    await page.mouse.click(5, 5);
  }
  await page.waitForTimeout(250);
  return !(await page.locator('[id$="_ntf_popover"]').first().isVisible().catch(() => false));
}

async function verifyFilterStability(page, filterSelector) {
  const beforeHandle = await page.evaluateHandle((selector) => document.querySelector(selector), filterSelector);
  const beforeExists = await beforeHandle.evaluate((node) => Boolean(node)).catch(() => false);
  const firstButton = page.locator(`${filterSelector} button`).nth(1);
  if (await firstButton.isVisible().catch(() => false)) {
    await firstButton.click();
    await page.waitForTimeout(650);
  }
  const stable = beforeExists
    ? await page.evaluate(([selector, node]) => document.querySelector(selector) === node, [filterSelector, beforeHandle]).catch(() => false)
    : false;
  await beforeHandle.dispose();
  return { filterSelector, beforeExists, stable, overflow: await hasHorizontalOverflow(page) };
}

async function verifyBuyerProfileSync(page) {
  await gotoRoute(page, "/profile", "body");
  const edit = page.getByRole("button", { name: /edit|ubah/i }).first();
  if (!await edit.isVisible().catch(() => false)) {
    return { attempted: false, reason: "edit button not visible" };
  }
  await edit.click();
  await page.locator("#modal-root:not([hidden])").waitFor({ timeout: 5000 }).catch(() => null);
  const nameInput = page.locator('#modal-root input[name="name"], #modal-root input[name="full_name"]').first();
  if (!await nameInput.isVisible().catch(() => false)) {
    return { attempted: false, reason: "name input not visible" };
  }
  const newName = `Smoke Buyer ${Date.now()}`;
  await nameInput.fill(newName);
  const save = page.locator('#modal-root button[type="submit"], #modal-root button').filter({ hasText: /simpan|save/i }).first();
  await save.click();
  await page.waitForTimeout(1200);
  await gotoRoute(page, "/buyer", "body");
  const body = await page.locator("body").innerText();
  return { attempted: true, newName, reflectedOnBuyer: body.includes(newName), url: page.url() };
}

async function verifyLogoutModal(page) {
  const button = page.getByRole("button", { name: /logout|keluar/i }).first();
  if (!await button.isVisible().catch(() => false)) {
    return { attempted: false, reason: "logout button not visible" };
  }
  page.once("dialog", async (dialog) => {
    result.issues.push({ area: "logout", message: `Native dialog opened: ${dialog.message()}` });
    await dialog.dismiss();
  });
  await button.click();
  await page.waitForTimeout(400);
  const modalOpen = await isModalOpen(page);
  if (modalOpen) {
    await page.locator('#modal-root [aria-label="Tutup"], #modal-root button').first().click().catch(() => null);
  }
  return { attempted: true, modalOpen };
}

async function inspectSellerCars(page) {
  return {
    hasDataTable: await visibleCount(page, "table, [role='table'], #slrcars_table_section") > 0,
    createButtonVisible: await page.getByRole("button", { name: /tambah|create|mobil/i }).first().isVisible().catch(() => false),
    overflow: await hasHorizontalOverflow(page),
  };
}

async function inspectSellerImages(page) {
  const fileInput = page.locator('input[type="file"]').first();
  return {
    hasGallery: await visibleCount(page, "img, [data-image-id], #slrimg_gallery_section") > 0,
    fileInputAvailable: await fileInput.count() > 0,
    uploadQueueOpened: null,
    modalStayedAfterBackdrop: null,
    uploadMutationSkipped: true,
    previewLinksDirectNavigation: await directImageAnchorCount(page),
    overflow: await hasHorizontalOverflow(page),
  };
}

async function inspectSellerInspection(page) {
  const payload = await page.evaluate(() => {
    const state = window.ProjectBApp?.store?.get?.("working.sellerCarInspection.report")
      ?? window.ProjectBApp?.store?.get?.("working.sellerInspection.overview")
      ?? null;
    return state;
  }).catch(() => null);
  const body = await page.locator("body").innerText();
  const reportItems = Array.isArray(payload?.items) ? payload.items : [];
  const firstItem = reportItems[0] ?? null;
  return {
    hasInspectionText: /inspection|inspeksi|checklist/i.test(body),
    firstItemContract: firstItem ? {
      template_id: Object.prototype.hasOwnProperty.call(firstItem, "template_id"),
      item_name: Object.prototype.hasOwnProperty.call(firstItem, "item_name"),
      item_name_snapshot: Object.prototype.hasOwnProperty.call(firstItem, "item_name_snapshot"),
      template: Object.prototype.hasOwnProperty.call(firstItem, "template"),
    } : null,
    overflow: await hasHorizontalOverflow(page),
  };
}

async function inspectSellerAffiliateDraft(page) {
  await page.locator("#modal-root:not([hidden])").waitFor({ timeout: 5000 }).catch(() => null);
  const email = page.locator('#modal-root input[name="email"]').first();
  if (!await email.isVisible().catch(() => false)) {
    return { attempted: false, reason: "create affiliate email input not visible" };
  }
  await email.fill("draft-only@example.local");
  await page.evaluate(() => window.dispatchEvent(new Event("resize")));
  await page.waitForTimeout(250);
  const preserved = await email.inputValue() === "draft-only@example.local";
  await page.locator('#modal-root [aria-label="Tutup"], #modal-root button').first().click().catch(() => null);
  return { attempted: true, draftPreservedAfterViewportEvent: preserved };
}

async function inspectFinancePage(page, expectedText) {
  const text = await page.locator("body").innerText();
  return {
    expectedText: Object.fromEntries(expectedText.map((item) => [item, text.includes(item)])),
    noDuplicateLedgerHint: !/duplicate ledger/i.test(text),
    overflow: await hasHorizontalOverflow(page),
  };
}

async function inspectSettlementDetail(page) {
  const detailButton = page.locator('button[id*="detail"], button').filter({ hasText: /detail|lihat/i }).first();
  if (!await detailButton.isVisible().catch(() => false)) {
    return { attempted: false, reason: "detail button not visible" };
  }
  await detailButton.click();
  await page.locator("#modal-root:not([hidden])").waitFor({ timeout: 7000 }).catch(() => null);
  const text = await page.locator("#modal-root").innerText().catch(() => "");
  const opened = await isModalOpen(page);
  if (opened) {
    await page.locator('#modal-root [aria-label="Tutup"], #modal-root button').first().click().catch(() => null);
  }
  return {
    attempted: true,
    opened,
    hasItems: /item|ledger/i.test(text),
    hasHistory: /history|riwayat|settled|cancelled|pending/i.test(text),
    hasPaymentMetadata: /reference|referensi|payment|proof|metode|note/i.test(text),
  };
}

async function inspectAccountShell(page, kind) {
  const body = await page.locator("body").innerText();
  return {
    kind,
    visibleAsideCount: await visibleCount(page, "aside"),
    visibleFooterCount: await visibleCount(page, "footer, .account-mobile-footer, [class*='mobile-footer']"),
    visibleTopNavCount: await visibleCount(page, "nav"),
    hasWhiteOutsideCardTextHint: /Dashboard|Beranda|Affiliate|Buyer|Transaksi|Profil/i.test(body),
    overflow: await hasHorizontalOverflow(page),
  };
}

async function inspectAffiliatePublicRouteShell(page) {
  await gotoRoute(page, "/af/smoke-seller", "body");
  return {
    accountShellVisible: await visibleCount(page, ".af-account-page") > 0,
    publicContentVisible: await page.locator("body").innerText().then((text) => /affiliate|katalog|mobil/i.test(text)).catch(() => false),
  };
}

async function inspectBackgroundVideo(page) {
  return page.evaluate(() => {
    const videos = Array.from(document.querySelectorAll("video"));
    return {
      count: videos.length,
      visibleCount: videos.filter((video) => {
        const rect = video.getBoundingClientRect();
        const style = window.getComputedStyle(video);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      }).length,
      nonBlocking: document.body.innerText.trim().length > 0,
    };
  });
}

async function runStaticChecks() {
  const files = [
    "public/assets/js/modules/seller/pages/carsPage.js",
    "public/assets/js/modules/seller/pages/carImagesPage.js",
    "public/assets/js/modules/seller/pages/carInspectionPage.js",
    "public/assets/js/modules/seller/pages/inspectionPage.js",
    "public/assets/js/modules/seller/pages/affiliatesModalPage.js",
    "public/assets/js/modules/seller/pages/transactionsPage.js",
    "public/assets/js/modules/admin/pages/affiliateCommissionsPage.js",
    "public/assets/js/modules/admin/pages/settlementsPage.js",
    "public/assets/js/modules/notifications/pages/notificationsPage.js",
    "public/assets/js/modules/notifications/components/notificationBell.js",
    "public/assets/js/modules/affiliate/pages/ledgerPage.js",
    "public/assets/js/modules/affiliate/pages/settlementsPage.js",
  ];
  result.staticChecks = {};
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    result.staticChecks[file] = {
      directFetch: /(^|[^\w.])fetch\s*\(/.test(source),
      locationReload: /(?:window\.)?location\.reload\s*\(/.test(source),
      routerHandleChange: /router\.handleChange\s*\(/.test(source),
    };
  }
  result.spaStability.locationReloadMatches = grepFiles("public/assets/js", /(?:window\.)?location\.reload\s*\(/);
  result.spaStability.routerHandleChangeMatches = grepFiles("public/assets/js", /router\.handleChange\s*\(/);
}

function grepFiles(dir, pattern) {
  const matches = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      matches.push(...grepFiles(full, pattern));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      const source = fs.readFileSync(full, "utf8");
      if (pattern.test(source)) {
        matches.push(full.replaceAll("\\", "/"));
      }
    }
  }
  return matches;
}

function finalizeIssues() {
  if (result.public.guestNotificationBellCount !== 0) {
    result.issues.push({ area: "public", message: "Guest notification bell is visible." });
  }
  if (result.public.landing?.maxCardsPerRow > 3) {
    result.issues.push({ area: "public", message: `Landing cards per row exceeded 3: ${result.public.landing.maxCardsPerRow}` });
  }
  for (const [key, page] of Object.entries({ ...result.public, ...result.buyer, ...result.seller, ...result.admin, ...result.affiliate })) {
    if (page && typeof page === "object" && page.hasNotFound) {
      result.issues.push({ area: "route", message: `${key} rendered not found.` });
    }
    if (page && typeof page === "object" && page.overflow) {
      result.issues.push({ area: "layout", message: `${key} has horizontal overflow.` });
    }
  }
  for (const entry of result.responsive) {
    if (entry.overflow) {
      result.issues.push({ area: "responsive", message: `${entry.viewport} ${entry.role} ${entry.route} has horizontal overflow.` });
    }
  }
  for (const [file, checks] of Object.entries(result.staticChecks)) {
    if (checks.locationReload || checks.directFetch) {
      result.issues.push({ area: "static", message: `${file} has direct fetch or location.reload in checked source.` });
    }
  }
}

async function maxCardsPerRow(page) {
  return page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll("article, [class*='car-card'], a[href*='#/cars/']")).filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 120 && rect.height > 120;
    });
    const rows = new Map();
    for (const card of cards.slice(0, 20)) {
      const top = Math.round(card.getBoundingClientRect().top / 10) * 10;
      rows.set(top, (rows.get(top) ?? 0) + 1);
    }
    return rows.size ? Math.max(...rows.values()) : 0;
  });
}

async function firstCarIdFromSellerCars(page) {
  const href = await page.locator('a[href*="/seller/cars/"][href*="/images"], button[id*="images"]').first().getAttribute("href").catch(() => null);
  const match = String(href ?? "").match(/seller\/cars\/(\d+)/);
  if (match) return Number(match[1]);
  const stateId = await page.evaluate(() => {
    const cars = window.ProjectBApp?.store?.get?.("working.sellerCars.cars")
      ?? window.ProjectBApp?.store?.get?.("snapshot.seller.cars.data.cars")
      ?? window.ProjectBApp?.store?.get?.("snapshot.seller.cars.cars")
      ?? [];
    return Number(cars?.[0]?.id ?? 2);
  }).catch(() => 2);
  return Number(stateId || 2);
}

async function firstVisibleId(page, selector) {
  return page.locator(selector).evaluateAll((nodes) => {
    const visible = nodes.find((node) => {
      const rect = node.getBoundingClientRect();
      const style = window.getComputedStyle(node);
      return node.id && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    return visible?.id ?? "";
  }).catch(() => "");
}

async function visibleCount(page, selector) {
  return page.locator(selector).evaluateAll((nodes) => nodes.filter((node) => {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  }).length).catch(() => 0);
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) > window.innerWidth + 2).catch(() => false);
}

async function isModalOpen(page) {
  return page.locator("#modal-root:not([hidden])").isVisible().catch(() => false);
}

async function directImageAnchorCount(page) {
  return page.evaluate(() => Array.from(document.querySelectorAll("a[href]")).filter((anchor) => /\.(jpe?g|png|webp)(\?|#|$)/i.test(anchor.getAttribute("href") ?? "")).length);
}
