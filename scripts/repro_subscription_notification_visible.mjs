import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const adminBase = "https://admin.carlynk.id";
const credentialsPath = path.resolve(root, "storage/browser-smoke/admin-test-credentials.md");
const evidenceDir = path.resolve(root, "storage/browser-smoke/admin-notification-subscription-payment-20261019");
const report = {
  task: "repro-admin-subscription-payment-notification",
  status: "RUNNING",
  browser: { engine: "Chromium", headless: false, visible: true, oneBrowser: true, context: "isolated" },
  steps: [],
  notification: null,
  dueCards: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  screenshots: [],
};

await fs.mkdir(evidenceDir, { recursive: true });

function record(name, status, details = {}) {
  report.steps.push({ name, status, details, at: new Date().toISOString() });
  console.log(`[${status}] ${name}${Object.keys(details).length ? ` ${JSON.stringify(details)}` : ""}`);
}

function parseAdminCredentials(markdown) {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const password = lines.find((line) => /Password semua akun QA/i.test(line))?.match(/`([^`]+)`/)?.[1];
  const adminLine = lines.find((line) => /\|\s*admin\s*\|\s*`[^`]+@[^`]+`/.test(line));
  const email = adminLine?.match(/`([^`]+@[^`]+)`/)?.[1];
  if (!email || !password) throw new Error("BLOCKED: kredensial QA admin tidak tersedia.");
  return { email, password };
}

const credentials = parseAdminCredentials(await fs.readFile(credentialsPath, "utf8"));
const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
let notificationSnapshot = null;

page.on("response", async (response) => {
  if (!/\/api\/notifications\/snapshot(?:\?|$)/.test(response.url()) || !response.ok()) return;
  try {
    notificationSnapshot = await response.json();
  } catch {
    // The UI remains the source of truth for the click; malformed telemetry is recorded below.
  }
});
page.on("console", (message) => {
  if (message.type() === "error") report.consoleErrors.push({ text: message.text(), url: page.url() });
});
page.on("pageerror", (error) => report.pageErrors.push({ message: error.message, url: page.url() }));
page.on("requestfailed", (request) => report.failedRequests.push({
  url: request.url(),
  method: request.method(),
  failure: request.failure()?.errorText ?? "unknown",
}));

async function screenshot(name) {
  const target = path.join(evidenceDir, `${name}.png`);
  await page.screenshot({ path: target, fullPage: false });
  report.screenshots.push(path.relative(root, target).replaceAll("\\", "/"));
}

async function visible(locator, label, { enabled = false } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      if (await locator.count() < 1) throw new Error(`BLOCKED: ${label} tidak ditemukan.`);
      const target = locator.first();
      await target.waitFor({ state: "visible", timeout: 5000 });
      await target.scrollIntoViewIfNeeded({ timeout: 5000 });
      if (!(await target.isVisible())) throw new Error(`BLOCKED: ${label} tidak visible.`);
      const box = await target.boundingBox();
      const viewport = page.viewportSize();
      if (!box || !viewport || box.bottom <= 0 || box.right <= 0 || box.top >= viewport.height || box.left >= viewport.width) {
        throw new Error(`BLOCKED: ${label} tidak berada di viewport.`);
      }
      const covered = await target.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const x = rect.left + Math.max(1, Math.min(rect.width / 2, rect.width - 1));
        const y = rect.top + Math.max(1, Math.min(rect.height / 2, rect.height - 1));
        const top = document.elementFromPoint(x, y);
        return Boolean(top && top !== element && !element.contains(top));
      });
      if (covered) throw new Error(`BLOCKED: ${label} tertutup elemen lain.`);
      if (enabled && !(await target.isEnabled())) throw new Error(`BLOCKED: ${label} disabled.`);
      return target;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(350);
    }
  }
  throw lastError ?? new Error(`BLOCKED: ${label} gagal divalidasi.`);
}

async function clickVisible(locator, label) {
  const target = await visible(locator, label, { enabled: true });
  await target.click();
}

async function typeHuman(locator, label, value) {
  const target = await visible(locator, label, { enabled: true });
  await target.click();
  await target.fill("");
  await target.pressSequentially(String(value), { delay: 3 });
  if (await target.inputValue() !== String(value)) throw new Error(`${label} tidak sesuai dengan input yang diketik.`);
}

async function waitApp() {
  await page.locator("#app").waitFor({ state: "attached", timeout: 30000 });
  await page.waitForFunction(() => (document.querySelector("#app")?.innerText ?? "").trim().length > 20, { timeout: 30000 });
  await page.waitForTimeout(900);
}

try {
  await page.goto(`${adminBase}/login/admin?ui_task=notification-payment-repro-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  await typeHuman(page.locator("#role_login_admin_email_input"), "email admin", credentials.email);
  await typeHuman(page.locator("#role_login_admin_password_input"), "password admin", credentials.password);
  const loginResponsePromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/login", { timeout: 30000 });
  await clickVisible(page.locator("#role_login_admin_submit_button"), "tombol masuk admin");
  const loginResponse = await loginResponsePromise;
  if (!loginResponse.ok()) throw new Error(`Login admin HTTP ${loginResponse.status()}.`);
  await page.waitForURL((url) => url.pathname === "/admin", { timeout: 30000 });
  await waitApp();
  record("Login admin visible", "PASS", { url: page.url() });

  const bell = await visible(page.locator("#global_ntf_bell_button"), "bell notifikasi admin", { enabled: true });
  await bell.click();
  const popover = await visible(page.locator("#global_ntf_popover"), "popover notifikasi admin");
  await screenshot("notification-popover-before-click");
  const item = popover.locator("article").filter({ hasText: "Bukti Pembayaran Paket Masuk" }).first();
  await visible(item, "notifikasi Bukti Pembayaran Paket Masuk");
  const itemText = await item.innerText();
  const snapshotItem = notificationSnapshot?.data?.notifications?.find((entry) => entry.title === "Bukti Pembayaran Paket Masuk")
    ?? notificationSnapshot?.data?.items?.find((entry) => entry.title === "Bukti Pembayaran Paket Masuk")
    ?? null;
  report.notification = {
    title: snapshotItem?.title ?? "Bukti Pembayaran Paket Masuk",
    body: snapshotItem?.body ?? itemText,
    linkUrl: snapshotItem?.link_url ?? snapshotItem?.linkUrl ?? null,
    data: snapshotItem?.data ?? null,
  };
  record("Notifikasi pembayaran paket terlihat", "PASS", { text: itemText, linkUrl: report.notification.linkUrl, data: report.notification.data });

  await clickVisible(item.locator("button"), "klik notifikasi pembayaran paket visible");
  await page.waitForURL((url) => url.pathname === "/admin/subscriptions-due", { timeout: 30000 });
  await waitApp();
  const cards = page.locator("[id^='admdue_card_']");
  const cardCount = await cards.count();
  for (let index = 0; index < cardCount; index += 1) report.dueCards.push(await cards.nth(index).innerText());
  await screenshot("subscriptions-due-after-notification-click");
  const matched = report.notification.data?.showroom_id
    ? page.locator(`#admdue_card_${report.notification.data.showroom_id}`)
    : page.locator("[id^='admdue_card_']").filter({ hasText: report.notification.body.split(" mengunggah")[0] }).first();
  const matchedCount = await matched.count();
  const matchedVisible = matchedCount > 0 && await matched.first().isVisible().catch(() => false);
  report.status = matchedVisible ? "PASS" : "FAILED";
  record("Data pembayaran dirujuk tampil setelah klik notifikasi", matchedVisible ? "PASS" : "FAILED", {
    url: page.url(),
    cardCount,
    showroomId: report.notification.data?.showroom_id ?? null,
    matchedVisible,
  });
} catch (error) {
  report.status = error.message.startsWith("BLOCKED:") ? "BLOCKED" : "FAILED";
  report.steps.push({ name: "Subscription notification reproduction", status: report.status, details: { message: error.message, url: page.url() }, at: new Date().toISOString() });
  console.error(`[${report.status}] ${error.message}`);
  await page.screenshot({ path: path.join(evidenceDir, "failure.png"), fullPage: false }).catch(() => {});
} finally {
  report.unexpectedFailedRequests = report.failedRequests;
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(evidenceDir, "reproduction-report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ status: report.status, report: path.join(evidenceDir, "reproduction-report.json") }, null, 2));
}

if (report.status !== "PASS") process.exitCode = 1;
