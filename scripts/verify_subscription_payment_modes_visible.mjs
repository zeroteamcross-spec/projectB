import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const adminBase = "https://admin.carlynk.id";
const publicBase = "https://carlynk.id";
const credentialsPath = path.resolve(root, "storage/browser-smoke/admin-test-credentials.md");
const evidenceDir = path.resolve(root, "storage/browser-smoke/admin-subscription-payment-modes-20261019");
const timestamp = Date.now();
const showroomEmail = `qa.payment.mode.${timestamp}@carlynk-test.id`;
const showroomPassword = "QaPaymentMode!2026";
const showroomSlug = `qa-payment-mode-showroom-${String(timestamp).slice(-8)}`;
const modes = ["manual", "midtrans", "both"];

const report = {
  task: "admin-subscription-payment-modes",
  status: "RUNNING",
  browser: { engine: "Chromium", headless: false, visible: true, oneBrowser: true, context: "isolated" },
  credentials: { adminEmail: null, showroomEmail },
  data: { showroomName: "QA Payment Mode Showroom", slug: showroomSlug, plan: null },
  steps: [],
  modes: [],
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

const adminCredentials = parseAdminCredentials(await fs.readFile(credentialsPath, "utf8"));
report.credentials.adminEmail = adminCredentials.email;

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();

page.on("console", (message) => {
  if (message.type() === "error") report.consoleErrors.push({ text: message.text(), url: page.url() });
});
page.on("pageerror", (error) => report.pageErrors.push({ message: error.message, url: page.url() }));
page.on("requestfailed", (request) => {
  const failure = request.failure()?.errorText ?? "unknown";
  const url = request.url();
  report.failedRequests.push({
    url,
    method: request.method(),
    failure,
    expected: failure === "net::ERR_ABORTED" && /google-login\/complete/.test(url),
  });
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
  await page.goto(`${adminBase}/login/admin?ui_task=subscription-payment-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  await typeHuman(page.locator("#role_login_admin_email_input"), "email admin", adminCredentials.email);
  await typeHuman(page.locator("#role_login_admin_password_input"), "password admin", adminCredentials.password);
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/login", { timeout: 30000 });
  await clickVisible(page.locator("#role_login_admin_submit_button"), "tombol masuk admin");
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`Login admin HTTP ${response.status()}.`);
  await page.waitForURL((url) => url.pathname === "/admin", { timeout: 30000 });
  await waitApp();
  record("Login admin visible", "PASS", { url: page.url() });
}

async function openDynamicPaymentMenu() {
  await page.goto(`${adminBase}/admin?ui_task=subscription-payment-sidebar-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  const directLink = page.locator('a[href="/admin/master-payment"]');
  if (!(await directLink.count()) || !(await directLink.first().isVisible().catch(() => false))) {
    const parent = page.locator('a[title="Master"]').first();
    await clickVisible(parent, "parent Master dari sidebar dinamis");
  }
  const paymentLink = page.locator('a[href="/admin/master-payment"]');
  const visiblePaymentLink = await visible(paymentLink, "menu Master Pembayaran dari sidebar dinamis");
  if ((await visiblePaymentLink.getAttribute("title")) !== "Master Pembayaran") throw new Error("Label menu Master Pembayaran tidak sesuai.");
  await clickVisible(visiblePaymentLink, "menu Master Pembayaran visible");
  await page.waitForURL((url) => url.pathname === "/admin/master-payment", { timeout: 30000 });
  await waitApp();
  await visible(page.locator("#admstpm_hero_section"), "hero Master Pembayaran");
  await visible(page.locator("#admstpm_payment_mode_section"), "card metode pembayaran");
  await noHorizontalOverflow("Master Pembayaran desktop");
  await screenshot("admin-master-payment-desktop");
  record("Master Pembayaran terbuka melalui submenu Master dinamis", "PASS", { url: page.url(), title: await visiblePaymentLink.getAttribute("title") });
}

async function setPaymentMode(mode) {
  if (!modes.includes(mode)) throw new Error(`Mode tidak valid: ${mode}`);
  await page.goto(`${adminBase}/admin/master-payment?ui_task=subscription-payment-${mode}-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  const select = await visible(page.locator("#admstpm_payment_mode_input"), `select mode ${mode}`, { enabled: true });
  if (await select.locator("option").count() !== 3) throw new Error(`Daftar opsi mode pembayaran tidak lengkap untuk ${mode}.`);
  await select.selectOption(mode);
  if (await select.inputValue() !== mode) throw new Error(`Select mode ${mode} tidak menerima input visible.`);
  const saveResponse = page.waitForResponse((response) => response.request().method() === "PUT" && new URL(response.url()).pathname === "/api/master-data/payments.subscription_destination", { timeout: 60000 });
  await clickVisible(page.locator("#admstpm_payment_mode_save_button"), `Simpan mode ${mode}`);
  const response = await saveResponse;
  if (!response.ok()) throw new Error(`Simpan mode ${mode} HTTP ${response.status()}.`);
  await page.waitForTimeout(900);
  const savedValue = await page.locator("#admstpm_payment_mode_input").inputValue();
  if (savedValue !== mode) throw new Error(`Mode ${mode} tidak bertahan setelah save: ${savedValue}`);
  const hint = await visible(page.locator("#admstpm_payment_mode_hint"), `hint mode ${mode}`);
  const hintText = await hint.innerText();
  const summary = await page.locator("#admstpm_hero_stats_section").innerText();
  const modeResult = { mode, savedValue, hint: hintText, summary };
  report.modes.push(modeResult);
  await screenshot(`admin-mode-${mode}`);
  record(`Master Pembayaran menyimpan mode ${mode} melalui form visible`, "PASS", modeResult);
}

async function logoutCurrent(label) {
  await page.goto(`${publicBase}/profile?ui_task=subscription-payment-logout-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  let logoutButton;
  let pendingApprovalLogout = false;
  try {
    logoutButton = await visible(page.locator('[id$="_role_specific_logout_button"]').first(), `tombol logout ${label}`);
  } catch (error) {
    logoutButton = await visible(page.locator("#pending_approval_logout_button"), `tombol logout pending ${label}`);
    pendingApprovalLogout = true;
  }
  await clickVisible(logoutButton, `tombol logout ${label}`);
  if (!pendingApprovalLogout) {
    await visible(page.locator("#profile_logout_confirm_modal"), "modal konfirmasi logout");
    await clickVisible(page.locator("#profile_logout_confirm_button"), `konfirmasi logout ${label}`);
  }
  await page.waitForTimeout(1000);
  await page.goto(`${publicBase}/login/seller?ui_task=subscription-payment-logout-check-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  await visible(page.locator("#role_login_seller_email_input"), "form login seller setelah logout");
  record(`Logout ${label} diverifikasi sebelum pergantian session`, "PASS", { url: page.url() });
}

async function registerShowroomAndChoosePlan() {
  await page.goto(`${publicBase}/daftar-showroom?ui_task=subscription-payment-register-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  await visible(page.locator("#shr_register_form"), "form daftar showroom");
  await typeHuman(page.locator("#shr_register_name_input"), "nama pemilik QA", "QA Payment Mode Owner");
  await typeHuman(page.locator("#shr_register_showroom_name_input"), "nama showroom QA", "QA Payment Mode Showroom");
  await typeHuman(page.locator("#shr_register_showroom_slug_input"), "slug showroom QA", showroomSlug);
  await typeHuman(page.locator("#shr_register_email_input"), "email showroom QA", showroomEmail);
  await typeHuman(page.locator("#shr_register_password_input"), "password showroom QA", showroomPassword);
  await typeHuman(page.locator("#shr_register_city_input"), "kota showroom QA", "a");
  const cityOption = page.locator("#shr_register_city_input_listbox [data-combobox-option]").first();
  await clickVisible(cityOption, "opsi kota visible dari listbox");
  const registerResponsePromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/register", { timeout: 60000 });
  await clickVisible(page.locator("#shr_register_submit_button"), "daftarkan showroom visible");
  const registerResponse = await registerResponsePromise;
  if (!registerResponse.ok()) throw new Error(`Register showroom HTTP ${registerResponse.status()}.`);
  await visible(page.locator("#shr_register_plans_section"), "pilihan paket setelah register");
  const planCard = page.locator("#shr_register_plan_cards_section button[id^='shr_register_plan_card_']").first();
  await clickVisible(planCard, "paket showroom visible");
  const planName = (await planCard.innerText()).split("\n")[0].trim();
  report.data.plan = planName;
  const updateResponsePromise = page.waitForResponse((response) => response.request().method() === "PATCH" && new URL(response.url()).pathname === "/api/showrooms/me", { timeout: 60000 });
  await clickVisible(page.locator("#shr_register_plan_confirm_button"), "lanjutkan paket showroom");
  const updateResponse = await updateResponsePromise;
  if (!updateResponse.ok()) throw new Error(`Pilih paket showroom HTTP ${updateResponse.status()}.`);
  await visible(page.locator("#shr_register_payment_section"), "panel pembayaran showroom");
  await noHorizontalOverflow("daftar showroom payment panel");
  await screenshot("showroom-payment-manual");
  record("Showroom berhasil daftar, memilih paket, dan mencapai panel pembayaran", "PASS", { showroomEmail, planName });
}

async function verifyRegistrationPaymentMode(mode) {
  await page.goto(`${publicBase}/daftar-showroom?ui_task=subscription-payment-resume-${mode}-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  await visible(page.locator("#shr_register_payment_section"), `panel payment resume ${mode}`);
  const tabs = page.locator("#shr_register_payment_method_tabs");
  await visible(tabs, `metode pembayaran showroom ${mode}`);
  const tabsText = await tabs.innerText();
  const midtransButtons = page.locator("#shr_register_payment_method_tabs [data-payment-method-tab='midtrans']");
  const manualButtons = page.locator("#shr_register_payment_method_tabs [data-payment-method-tab='manual']");
  const hasMidtrans = await midtransButtons.count() > 0;
  const hasManual = await manualButtons.count() > 0;
  if (mode === "manual" && (hasMidtrans || !/Transfer Manual/i.test(tabsText))) throw new Error(`Mode manual masih menampilkan opsi lain: ${tabsText}`);
  if (mode === "midtrans" && (hasManual || !/Virtual Account/i.test(tabsText))) throw new Error(`Mode midtrans masih menampilkan opsi lain: ${tabsText}`);
  if (mode === "both" && (!hasMidtrans || !hasManual)) throw new Error(`Mode both tidak menampilkan dua opsi: ${tabsText}`);
  const midtransPanel = page.locator("#sub_midtrans_panel");
  if (mode === "midtrans" && !(await midtransPanel.isVisible())) throw new Error("Panel Virtual Account tidak tampil pada mode midtrans.");
  if (mode === "manual" && await midtransPanel.count() > 0) throw new Error("Panel Virtual Account tampil pada mode manual.");
  if (mode === "both") {
    await clickVisible(midtransButtons, "tab Virtual Account visible pada mode both");
    await visible(page.locator("#sub_midtrans_panel"), "panel Virtual Account pada mode both");
    await clickVisible(manualButtons, "tab Transfer Manual visible pada mode both");
    await visible(page.locator("#shr_register_proof_file_input"), "form bukti transfer pada mode both");
  }
  await noHorizontalOverflow(`daftar showroom mode ${mode}`);
  await screenshot(`showroom-payment-${mode}`);
  record(`Daftar showroom menampilkan pilihan pembayaran ${mode} sesuai master`, "PASS", { mode, tabsText, hasMidtrans, hasManual });
}

async function loginSeller() {
  await page.goto(`${publicBase}/login/seller?ui_task=subscription-payment-seller-login-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  await typeHuman(page.locator("#role_login_seller_email_input"), "email showroom QA", showroomEmail);
  await typeHuman(page.locator("#role_login_seller_password_input"), "password showroom QA", showroomPassword);
  const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/login", { timeout: 60000 });
  await clickVisible(page.locator("#role_login_seller_submit_button"), "tombol masuk showroom QA");
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`Login showroom QA HTTP ${response.status()}.`);
  await page.waitForURL((url) => url.pathname === "/seller" || url.pathname === "/daftar-showroom", { timeout: 30000 });
  await waitApp();
  record("Login showroom QA visible setelah logout admin", "PASS", { url: page.url() });
}

async function checkTaskBoard() {
  await page.goto(`${publicBase}/tasks?ui_task=subscription-payment-task-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  const card = page.locator("article[id^='admin_task_card_']").filter({ hasText: "Atur metode pembayaran pendaftaran showroom dari Master Admin." }).first();
  await visible(card, "task metode pembayaran pada halaman /tasks");
  const text = await card.innerText();
  if (!/Belum selesai|Beres/.test(text)) throw new Error(`Task metode pembayaran tidak berstatus open: ${text}`);
  await screenshot("task-board");
  record("Task metode pembayaran tampil pada /tasks", "PASS");
}

async function restoreBothIfPossible() {
  try {
    await page.goto(`${adminBase}/login/admin?ui_task=subscription-payment-restore-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitApp();
    const emailInput = page.locator("#role_login_admin_email_input");
    if (!(await emailInput.isVisible().catch(() => false))) return;
    await typeHuman(emailInput, "email admin pemulihan", adminCredentials.email);
    await typeHuman(page.locator("#role_login_admin_password_input"), "password admin pemulihan", adminCredentials.password);
    const responsePromise = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/login", { timeout: 30000 });
    await clickVisible(page.locator("#role_login_admin_submit_button"), "login admin pemulihan");
    const response = await responsePromise;
    if (!response.ok()) return;
    await page.waitForURL((url) => url.pathname === "/admin", { timeout: 30000 });
    await waitApp();
    await setPaymentMode("both");
    record("Mode pembayaran dipulihkan ke both setelah runner", "PASS");
  } catch (error) {
    report.steps.push({ name: "Pemulihan mode both", status: "FAILED", details: { message: error.message }, at: new Date().toISOString() });
    console.error(`[FAILED] Pemulihan mode both: ${error.message}`);
  }
}

try {
  await loginAdmin();
  await openDynamicPaymentMenu();
  await setPaymentMode("manual");
  await logoutCurrent("admin sebelum register");
  await registerShowroomAndChoosePlan();
  await verifyRegistrationPaymentMode("manual");
  await logoutCurrent("showroom setelah mode manual");
  await loginAdmin();
  await setPaymentMode("midtrans");
  await logoutCurrent("admin sebelum resume midtrans");
  await loginSeller();
  await verifyRegistrationPaymentMode("midtrans");
  await logoutCurrent("showroom setelah mode midtrans");
  await loginAdmin();
  await setPaymentMode("both");
  await logoutCurrent("admin sebelum resume both");
  await loginSeller();
  await verifyRegistrationPaymentMode("both");
  await logoutCurrent("showroom setelah mode both");
  await checkTaskBoard();
  const unexpectedFailedRequests = report.failedRequests.filter((item) => !item.expected);
  report.unexpectedFailedRequests = unexpectedFailedRequests;
  report.status = report.pageErrors.length || unexpectedFailedRequests.length ? "FAILED" : "PASS";
  if (report.consoleErrors.length) record("Console error dicatat untuk triage", "WARN", { count: report.consoleErrors.length, expected: "401 auth probe saat halaman publik/login dimuat tanpa session" });
} catch (error) {
  report.status = error.message.startsWith("BLOCKED:") ? "BLOCKED" : "FAILED";
  report.steps.push({ name: "Subscription payment mode runner", status: report.status, details: { message: error.message, url: page.url() }, at: new Date().toISOString() });
  console.error(`[${report.status}] ${error.message}`);
  await page.screenshot({ path: path.join(evidenceDir, "failure.png"), fullPage: false }).catch(() => {});
  await restoreBothIfPossible();
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(evidenceDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ status: report.status, report: path.join(evidenceDir, "report.json"), modes: report.modes.map((item) => item.mode), showroomEmail }, null, 2));
}

if (report.status !== "PASS") process.exitCode = 1;
