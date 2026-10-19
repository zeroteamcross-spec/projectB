import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const adminBase = "https://admin.carlynk.id";
const publicBase = "https://carlynk.id";
const credentialsPath = path.resolve(root, "storage/browser-smoke/admin-test-credentials.md");
const evidenceDir = path.resolve(root, "storage/browser-smoke/admin-master-payment-labels-20261019");

const report = {
  task: "admin-master-payment-labels",
  status: "RUNNING",
  browser: { engine: "Chromium", headless: false, visible: true, oneBrowser: true, context: "isolated" },
  steps: [],
  labels: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  unexpectedFailedRequests: [],
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

page.on("console", (message) => {
  if (message.type() === "error") {
    report.consoleErrors.push({ text: message.text(), url: page.url(), expected: /401|unauthorized/i.test(message.text()) });
  }
});
page.on("pageerror", (error) => report.pageErrors.push({ message: error.message, url: page.url() }));
page.on("requestfailed", (request) => {
  const failure = request.failure()?.errorText ?? "unknown";
  const url = request.url();
  report.failedRequests.push({ url, method: request.method(), failure, expected: failure === "net::ERR_ABORTED" });
});

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

async function noHorizontalOverflow(label) {
  const sizes = await page.evaluate(() => ({ documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth }));
  if (sizes.documentWidth > sizes.viewportWidth + 2) throw new Error(`${label} memiliki horizontal overflow: ${JSON.stringify(sizes)}`);
  return sizes;
}

async function loginAdmin() {
  await page.goto(`${adminBase}/login/admin?ui_task=master-payment-labels-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  await typeHuman(page.locator("#role_login_admin_email_input"), "email admin", credentials.email);
  await typeHuman(page.locator("#role_login_admin_password_input"), "password admin", credentials.password);
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/login", { timeout: 30000 });
  await clickVisible(page.locator("#role_login_admin_submit_button"), "tombol masuk admin");
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`Login admin HTTP ${response.status()}.`);
  await page.waitForURL((url) => url.pathname === "/admin", { timeout: 30000 });
  await waitApp();
  record("Login admin visible", "PASS", { url: page.url() });
}

async function readVisibleOption(select, value) {
  const target = await visible(select, `select opsi ${value}`, { enabled: true });
  const option = target.locator(`option[value="${value}"]`);
  if (await option.count() !== 1) throw new Error(`Opsi ${value} tidak tersedia pada select visible.`);
  const optionState = await option.evaluate((element) => ({
    disabled: element.disabled,
    hidden: element.hidden,
    display: getComputedStyle(element).display,
    visibility: getComputedStyle(element).visibility,
  }));
  if (optionState.disabled || optionState.hidden || optionState.display === "none" || optionState.visibility === "hidden") {
    throw new Error(`Opsi ${value} tidak visible/selectable: ${JSON.stringify(optionState)}`);
  }
  await target.selectOption(value);
  const selectedValue = await target.inputValue();
  const selectedText = await target.locator("option:checked").textContent();
  if (selectedValue !== value) throw new Error(`Opsi ${value} tidak terpilih melalui keyboard visible: ${selectedValue}`);
  const normalized = (selectedText ?? "").trim();
  report.labels.push({ value, text: normalized, visibleSelect: await target.isVisible() });
  return normalized;
}

async function checkMasterPaymentLabels() {
  await page.goto(`${adminBase}/admin/master-payment?ui_task=master-payment-labels-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  await visible(page.locator("#admstpm_hero_section"), "hero Master Pembayaran");
  await visible(page.locator("#admstpm_payment_mode_section"), "card metode pembayaran");
  const select = page.locator("#admstpm_payment_mode_input");
  if (await (await visible(select, "select metode pembayaran", { enabled: true })).locator("option").count() !== 3) {
    throw new Error("Master Pembayaran tidak menampilkan tepat tiga opsi.");
  }
  const currentValue = await select.inputValue();
  const expected = [
    ["manual", "Transfer Manual"],
    ["midtrans", "Virtual Account otomatis"],
    ["both", "Keduanya"],
  ];
  for (const [value, expectedText] of expected) {
    const actual = await readVisibleOption(select, value);
    if (actual !== expectedText) throw new Error(`Label ${value} tidak sesuai: ${actual}`);
    if (/saja/i.test(actual)) throw new Error(`Label ${value} masih mengandung kata saja.`);
  }
  await select.selectOption(currentValue);
  if (await select.inputValue() !== currentValue) throw new Error(`Nilai mode awal berubah tanpa penyimpanan: ${currentValue}`);
  await noHorizontalOverflow("Master Pembayaran desktop");
  await screenshot("admin-master-payment-labels-desktop");
  record("Label opsi Master Pembayaran tervalidasi melalui select visible", "PASS", { labels: report.labels, restoredValue: currentValue });
}

async function checkMobile() {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${adminBase}/admin/master-payment?ui_task=master-payment-labels-mobile-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  await visible(page.locator("#admstpm_hero_section"), "hero Master Pembayaran mobile");
  await visible(page.locator("#admstpm_payment_mode_section"), "card metode pembayaran mobile");
  await visible(page.locator("#admstpm_payment_mode_input"), "select metode pembayaran mobile", { enabled: true });
  await visible(page.locator("#admstpm_payment_mode_save_button"), "tombol simpan metode mobile", { enabled: true });
  const sizes = await noHorizontalOverflow("Master Pembayaran mobile");
  await screenshot("admin-master-payment-labels-mobile");
  record("Master Pembayaran mobile rapi dan tanpa horizontal overflow", "PASS", sizes);
}

async function checkTaskBoard() {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`${publicBase}/tasks?ui_task=master-payment-labels-task-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  const card = page.locator("article[id^='admin_task_card_']").filter({ hasText: "Hapus kata saja dari opsi Master Pembayaran." }).first();
  await visible(card, "task label Master Pembayaran pada /tasks");
  const text = await card.innerText();
  if (!/Belum selesai|Beres/.test(text)) throw new Error(`Task label Master Pembayaran tidak berstatus open: ${text}`);
  await screenshot("task-board");
  record("Task label Master Pembayaran tampil pada /tasks", "PASS");
}

try {
  await loginAdmin();
  await checkMasterPaymentLabels();
  await checkMobile();
  await checkTaskBoard();
  report.unexpectedFailedRequests = report.failedRequests.filter((item) => !item.expected);
  report.status = report.pageErrors.length || report.unexpectedFailedRequests.length ? "FAILED" : "PASS";
  if (report.consoleErrors.length) record("Console error dicatat untuk triage", "WARN", { count: report.consoleErrors.length, expected: "401 auth probe jika ada" });
} catch (error) {
  report.status = error.message.startsWith("BLOCKED:") ? "BLOCKED" : "FAILED";
  report.steps.push({ name: "Master payment label runner", status: report.status, details: { message: error.message, url: page.url() }, at: new Date().toISOString() });
  console.error(`[${report.status}] ${error.message}`);
  await page.screenshot({ path: path.join(evidenceDir, "failure.png"), fullPage: false }).catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(evidenceDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ status: report.status, report: path.join(evidenceDir, "report.json") }, null, 2));
}

if (report.status !== "PASS") process.exitCode = 1;
