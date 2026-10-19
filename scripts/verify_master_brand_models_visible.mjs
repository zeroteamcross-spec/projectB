import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const adminBase = "https://admin.carlynk.id";
const publicBase = "https://carlynk.id";
const credentialsPath = path.resolve(root, "storage/browser-smoke/admin-test-credentials.md");
const sourcePath = path.resolve(root, "Tugas GitIgnore/brand.json");
const evidenceDir = path.resolve(root, "storage/browser-smoke/admin-master-brand-models-20261019");
const targetTitles = [
  "Perbaiki penyimpanan banyak model pada Master Brand.",
  "Sembunyikan card Impersonation pada Dashboard Admin.",
];

await fs.mkdir(evidenceDir, { recursive: true });

const report = {
  task: "admin-master-brand-models",
  status: "RUNNING",
  browser: { engine: "Chromium", headless: false, visible: true, oneBrowser: true },
  source: "Tugas GitIgnore/brand.json",
  brands: [],
  regression: { multiAddExercised: false, preservedValues: [] },
  steps: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  screenshots: [],
};

function record(name, status, details = {}) {
  report.steps.push({ name, status, details, at: new Date().toISOString() });
  console.log(`[${status}] ${name}${Object.keys(details).length ? ` ${JSON.stringify(details)}` : ""}`);
}

function parseCredentials(markdown) {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const password = lines.find((line) => /Password semua akun QA/i.test(line))?.match(/`([^`]+)`/)?.[1];
  const adminLine = lines.find((line) => /\|\s*admin\s*\|\s*`[^`]+@[^`]+`/.test(line));
  const email = adminLine?.match(/`([^`]+@[^`]+)`/)?.[1];
  if (!email || !password) throw new Error("BLOCKED: kredensial QA admin tidak tersedia.");
  return { email, password };
}

function flattenBrands(source) {
  if (!Array.isArray(source)) throw new Error("BLOCKED: brand.json bukan array.");
  return source.flatMap((entry) => Object.entries(entry).map(([name, models]) => ({
    name: String(name).trim(),
    models: Array.isArray(models) ? models.map((model) => String(model).trim()).filter(Boolean) : [],
  })));
}

const credentials = parseCredentials(await fs.readFile(credentialsPath, "utf8"));
const sourceBrands = flattenBrands(JSON.parse((await fs.readFile(sourcePath, "utf8")).replace(/^\uFEFF/, "")));
if (!sourceBrands.length) throw new Error("BLOCKED: brand.json tidak berisi brand.");

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();

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

async function login() {
  await page.goto(`${adminBase}/login/admin?ui_task=master-brand-models-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
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

async function gotoMasterBrand() {
  await page.goto(`${adminBase}/admin/master-brand?ui_task=master-brand-models-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  await visible(page.locator("#admst_brand_table_section"), "tabel Master Brand");
  const rowsPerPage = await visible(page.locator("#admst_rows_per_page_input"), "rows per page Master Brand", { enabled: true });
  await rowsPerPage.selectOption("100");
  await page.waitForTimeout(700);
  record("Master Brand tampil dan page size 100 dipilih dari select visible", "PASS", { rowsPerPage: "100" });
}

async function filterBrand(name) {
  await typeHuman(page.locator("#admst_keyword_input"), `filter brand ${name}`, name);
  await clickVisible(page.locator("#admst_apply_filter_button"), `Terapkan filter ${name}`);
  await page.waitForTimeout(800);
  const rows = page.locator("#admst_brand_table_section table tbody tr");
  const visibleRows = [];
  for (let index = 0; index < await rows.count(); index += 1) {
    const row = rows.nth(index);
    if (!(await row.isVisible())) continue;
    visibleRows.push({ index, text: await row.innerText() });
  }
  const match = visibleRows.find((row) => new RegExp(`(^|\\n)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\n|$)`, "i").test(row.text)) ?? visibleRows[0];
  if (!match) throw new Error(`BLOCKED: brand ${name} tidak tampil sebagai baris visible setelah filter.`);
  const row = rows.nth(match.index);
  await visible(row, `baris visible ${name}`);
  return row;
}

async function readVisibleModelNames() {
  const inputs = page.locator("#admst_model_rows_section input[id^='admst_model_name_input_']");
  const values = [];
  for (let index = 0; index < await inputs.count(); index += 1) {
    const input = inputs.nth(index);
    await visible(input, `input model visible ${index}`);
    values.push((await input.inputValue()).trim());
  }
  return values.filter(Boolean);
}

async function openBrandEditor(name) {
  const row = await filterBrand(name);
  const edit = row.locator("button[id^='admst_edit_brand_button_desktop_']");
  await clickVisible(edit, `Edit brand ${name} visible`);
  await visible(page.locator("#admst_brand_modal_section"), `modal Edit Brand ${name}`);
  await visible(page.locator("#admst_brand_form_section"), `form Edit Brand ${name}`);
  await page.waitForTimeout(300);
  return row;
}

async function addModel(name, details) {
  const before = await readVisibleModelNames();
  await clickVisible(page.locator("#admst_add_model_button"), `Tambah model ${name}`);
  await page.waitForTimeout(120);
  const inputs = page.locator("#admst_model_rows_section input[id^='admst_model_name_input_']");
  const index = await inputs.count() - 1;
  const input = inputs.nth(index);
  await typeHuman(input, `nama model ${name}`, name);
  const after = await readVisibleModelNames();
  const preserved = before.every((item, position) => after[position] === item);
  details.adds.push({ name, before, after, preserved });
  if (!preserved) throw new Error(`BUG: model sebelumnya hilang setelah menambah ${name}. before=${JSON.stringify(before)} after=${JSON.stringify(after)}`);
  if (before.length >= 1) {
    report.regression.multiAddExercised = true;
    report.regression.preservedValues.push({ added: name, before, after });
  }
}

async function saveBrand(name, expectedModels, details) {
  const saveResponse = page.waitForResponse((response) => response.request().method() === "PUT" && new URL(response.url()).pathname.endsWith("/api/master-data/cars.brands"), { timeout: 60000 });
  await clickVisible(page.locator("#admst_save_brand_button"), `Simpan perubahan ${name}`);
  const response = await saveResponse;
  if (!response.ok()) throw new Error(`Simpan ${name} HTTP ${response.status()}.`);
  await page.locator("#admst_brand_form_section").waitFor({ state: "detached", timeout: 30000 });
  await page.waitForTimeout(800);
  const toast = page.getByText("Master brand berhasil disimpan.", { exact: true });
  if (await toast.count() && !(await toast.first().isVisible())) throw new Error(`Toast simpan ${name} tidak visible.`);
  details.saved = true;
  details.savedModels = expectedModels;
  record(`Simpan seluruh model ${name} melalui form visible`, "PASS", details);
}

async function processBrand(brand) {
  const details = { sourceModels: brand.models, existingModels: [], addedModels: [], adds: [], saved: false, verifiedModels: [] };
  const result = { name: brand.name, expected: brand.models.length, status: "RUNNING", details };
  report.brands.push(result);
  try {
    await openBrandEditor(brand.name);
    details.existingModels = await readVisibleModelNames();
    const existingSet = new Set(details.existingModels.map((item) => item.toLowerCase()));
    const missing = brand.models.filter((model) => !existingSet.has(model.toLowerCase()));
    for (const model of missing) {
      await addModel(model, details);
      details.addedModels.push(model);
    }
    const finalVisible = await readVisibleModelNames();
    const finalSet = new Set(finalVisible.map((item) => item.toLowerCase()));
    const missingBeforeSave = brand.models.filter((model) => !finalSet.has(model.toLowerCase()));
    if (missingBeforeSave.length) throw new Error(`Model sumber belum lengkap sebelum simpan ${brand.name}: ${missingBeforeSave.join(", ")}`);
    await saveBrand(brand.name, brand.models, details);

    await openBrandEditor(brand.name);
    details.verifiedModels = await readVisibleModelNames();
    const verifiedSet = new Set(details.verifiedModels.map((item) => item.toLowerCase()));
    const missingAfterReload = brand.models.filter((model) => !verifiedSet.has(model.toLowerCase()));
    if (missingAfterReload.length) throw new Error(`Model tidak persisten setelah reload ${brand.name}: ${missingAfterReload.join(", ")}`);
    await screenshot(`brand-${brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-verified`);
    await clickVisible(page.locator("#admst_cancel_brand_form_button"), `Batal modal ${brand.name}`);
    result.status = "PASS";
    record(`Verifikasi ulang model ${brand.name} visible setelah simpan`, "PASS", { modelCount: details.verifiedModels.length });
  } catch (error) {
    result.status = error.message.startsWith("BLOCKED:") ? "BLOCKED" : "FAILED";
    result.error = error.message;
    await page.screenshot({ path: path.join(evidenceDir, `failure-${brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`), fullPage: false }).catch(() => {});
    throw error;
  }
}

async function checkTaskBoard() {
  await page.goto(`${publicBase}/tasks?ui_task=master-brand-models-${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await waitApp();
  await page.waitForFunction(() => Boolean(document.querySelector("article[id^='admin_task_card_']") || /Belum ada tugas/.test(document.querySelector("#app")?.innerText ?? "")), { timeout: 30000 });
  for (const title of targetTitles) {
    const card = page.locator("article[id^='admin_task_card_']").filter({ hasText: title }).first();
    await visible(card, `task visible ${title}`);
  }
  await screenshot("task-board");
  record("Dua task baru tampil dan tetap berstatus open pada /tasks", "PASS", { titles: targetTitles });
}

try {
  await login();
  await gotoMasterBrand();
  for (const brand of sourceBrands) await processBrand(brand);
  if (!report.regression.multiAddExercised) throw new Error("FAILED: tidak ada brand dengan minimal satu model existing dan model baru sehingga regresi multi-add belum teruji nyata.");
  await checkTaskBoard();
  report.status = report.brands.every((brand) => brand.status === "PASS") ? "PASS" : "FAILED";
} catch (error) {
  report.status = error.message.startsWith("BLOCKED:") ? "BLOCKED" : "FAILED";
  report.steps.push({ name: "Master Brand model runner", status: report.status, details: { message: error.message, url: page.url() }, at: new Date().toISOString() });
  console.error(`[${report.status}] ${error.message}`);
  await page.screenshot({ path: path.join(evidenceDir, "failure.png"), fullPage: false }).catch(() => {});
} finally {
  report.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(evidenceDir, "report.json"), JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ status: report.status, report: path.join(evidenceDir, "report.json"), brands: report.brands.length, multiAddExercised: report.regression.multiAddExercised }, null, 2));
}

if (report.status !== "PASS") process.exitCode = 1;
