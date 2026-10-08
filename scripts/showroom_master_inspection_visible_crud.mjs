import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.PB_BASE_URL || "https://showroom.carlynk.id";
const SELLER_EMAIL = process.env.PB_SELLER_EMAIL || "";
const SELLER_PASSWORD = process.env.PB_SELLER_PASSWORD || "";
const REPORT_DIR = path.resolve("storage", "browser-smoke");
const REPORT_PATH = path.join(REPORT_DIR, "master-inspection-visible-crud.json");
const FINAL_SCREENSHOT = path.join(REPORT_DIR, "master-inspection-visible-crud-final.png");
const DETAIL_SCREENSHOT = path.join(REPORT_DIR, "master-inspection-visible-crud-detail.png");
const FAILURE_SCREENSHOT = path.join(REPORT_DIR, "master-inspection-visible-crud-failure.png");

fs.mkdirSync(REPORT_DIR, { recursive: true });

const report = {
  status: "RUNNING",
  browser: {
    engine: "Chromium",
    headless: false,
    taskCount: 1,
    browserCount: 1,
    contextCount: 1,
  },
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  steps: [],
  consoleErrors: [],
  failedRequests: [],
  screenshots: [],
  data: {},
};

let browser = null;
let context = null;
let page = null;

function now() {
  return new Date().toISOString();
}

function recordScreenshot(file, reason) {
  report.screenshots.push({ file: path.relative(process.cwd(), file), reason });
}

async function saveScreenshot(file, reason) {
  if (!page) {
    return;
  }

  try {
    await page.screenshot({ path: file, fullPage: true });
    recordScreenshot(file, reason);
  } catch (error) {
    report.consoleErrors.push(`Screenshot gagal: ${error.message}`);
  }
}

async function visible(locator, label, { enabled = false } = {}) {
  if (await locator.count() < 1) {
    throw new Error(`BLOCKED: elemen ${label} tidak ditemukan.`);
  }

  const target = locator.first();
  await target.scrollIntoViewIfNeeded();

  if (!(await target.isVisible())) {
    throw new Error(`BLOCKED: elemen ${label} tidak visible.`);
  }

  const box = await target.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport || box.bottom <= 0 || box.right <= 0 || box.top >= viewport.height || box.left >= viewport.width) {
    throw new Error(`BLOCKED: elemen ${label} berada di luar viewport.`);
  }

  const covered = await target.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + Math.min(Math.max(rect.width / 2, 1), Math.max(rect.width - 1, 1));
    const centerY = rect.top + Math.min(Math.max(rect.height / 2, 1), Math.max(rect.height - 1, 1));
    const top = document.elementFromPoint(centerX, centerY);
    return Boolean(top && top !== element && !element.contains(top));
  });
  if (covered) {
    throw new Error(`BLOCKED: elemen ${label} tertutup elemen lain.`);
  }

  if (enabled && !(await target.isEnabled())) {
    throw new Error(`BLOCKED: elemen ${label} disabled.`);
  }

  return target;
}

async function clickVisible(locator, label) {
  const target = await visible(locator, label, { enabled: true });
  await target.click();
  return target;
}

async function typeVisible(locator, label, value) {
  const target = await visible(locator, label, { enabled: true });
  await target.click();
  await target.fill("");
  await target.pressSequentially(String(value), { delay: 18 });
  const actual = await target.inputValue();
  if (actual !== String(value)) {
    throw new Error(`Input ${label} tidak tersimpan sesuai yang diketik.`);
  }
  return target;
}

async function chooseVisibleSelectByKeyboard(locator, label, keySequence, expectedValue) {
  const target = await visible(locator, label, { enabled: true });
  await target.click();
  for (const key of keySequence) {
    await target.press(key);
  }
  await target.press("Enter");
  const actual = await target.inputValue();
  if (expectedValue && actual !== expectedValue) {
    throw new Error(`Pilihan ${label} tidak sesuai. Expected=${expectedValue}, actual=${actual}.`);
  }
  return target;
}

async function waitForVisible(locator, label, timeout = 20000) {
  await locator.waitFor({ state: "visible", timeout });
  return visible(locator, label);
}

async function runStep(name, action) {
  const startedAt = now();
  try {
    const details = await action();
    const step = { name, status: "PASS", startedAt, finishedAt: now(), details: details ?? {} };
    report.steps.push(step);
    console.log(`[PASS] ${name}`);
    return step;
  } catch (error) {
    const step = { name, status: "FAILED", startedAt, finishedAt: now(), error: error.message };
    report.steps.push(step);
    console.log(`[FAILED] ${name}: ${error.message}`);
    await saveScreenshot(FAILURE_SCREENSHOT, `failure: ${name}`);
    return step;
  }
}

function stepPassed(name) {
  return report.steps.find((step) => step.name === name)?.status === "PASS";
}

async function login() {
  if (!SELLER_EMAIL || !SELLER_PASSWORD) {
    throw new Error("BLOCKED: PB_SELLER_EMAIL dan PB_SELLER_PASSWORD wajib tersedia.");
  }

  await page.goto(`${BASE_URL}/login/seller?visible_crud=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await waitForVisible(page.locator("#role_login_seller_email_input"), "email login seller");
  await typeVisible(page.locator("#role_login_seller_email_input"), "email login seller", SELLER_EMAIL);
  await typeVisible(page.locator("#role_login_seller_password_input"), "password login seller", SELLER_PASSWORD);
  await clickVisible(page.locator("#role_login_seller_submit_button"), "tombol Masuk seller");
  await page.waitForURL((url) => url.pathname === "/seller", { timeout: 25000 });
  await waitForVisible(page.locator('a[href="/seller/master-inspection"]').first(), "menu Master Inspeksi owner");
  return { url: page.url(), identityVisible: await page.getByText("LEVEL USER: SHOWROOM", { exact: true }).isVisible().catch(() => false) };
}

async function openMasterPage() {
  await page.goto(`${BASE_URL}/seller/master-inspection?visible_crud=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await waitForVisible(page.locator("#slrminsp_page_section"), "halaman Master Inspeksi");
  await waitForVisible(page.locator("#slrminsp_create_button"), "tombol Buat Item Master");
  await waitForVisible(page.locator("#slrminsp_list_section"), "daftar master inspeksi");
  const branch = await waitForVisible(page.locator("#slrminsp_active_branch_input"), "dropdown cabang aktif");
  const branchName = await branch.locator("option:checked").innerText();
  if (!branchName.trim()) {
    throw new Error("Cabang aktif tidak terlihat pada dropdown.");
  }
  report.data.activeBranch = { id: await branch.inputValue(), name: branchName.trim() };
  return { url: page.url(), activeBranch: report.data.activeBranch };
}

async function findAvailableBusinessName() {
  const candidates = [
    "Pemeriksaan Keseragaman Warna Bodi",
    "Pemeriksaan Panel Eksterior",
    "Pemeriksaan Kondisi Cat dan Pernis",
  ];

  for (const candidate of candidates) {
    const row = page.locator("#slrminsp_list_section tr").filter({ hasText: candidate }).first();
    if (!(await row.isVisible().catch(() => false))) {
      return candidate;
    }
  }

  throw new Error("BLOCKED: tidak ada nama item inspeksi yang tersedia tanpa membuat data ngawur/duplikat.");
}

async function createItem() {
  const itemName = await findAvailableBusinessName();
  const description = "Periksa keseragaman warna, panel belang, bekas perbaikan bodi, dan lapisan pernis.";
  const createResponse = page.waitForResponse((response) => response.request().method() === "POST"
    && new URL(response.url()).pathname.endsWith("/inspection-templates")
    && response.status() < 500, { timeout: 25000 });

  await clickVisible(page.locator("#slrminsp_create_button"), "tombol Buat Item Master");
  await waitForVisible(page.locator("#slrminsp_editor_form"), "form Buat master inspeksi");
  await chooseVisibleSelectByKeyboard(page.locator("#slrminsp_editor_section_input"), "section master inspeksi", ["Home", "ArrowDown"], "exterior");
  await typeVisible(page.locator("#slrminsp_editor_item_name_input"), "nama item master inspeksi", itemName);
  await typeVisible(page.locator("#slrminsp_editor_description_input"), "keterangan item master inspeksi", description);
  await typeVisible(page.locator("#slrminsp_editor_sort_order_input"), "urutan item master inspeksi", "15");
  const active = await visible(page.locator("#slrminsp_editor_active_input"), "checkbox item aktif", { enabled: true });
  if (!(await active.isChecked())) {
    await active.click();
  }
  await clickVisible(page.locator("#slrminsp_editor_modal_submit_button"), "tombol Simpan Master create");
  const response = await createResponse;
  if (response.status() !== 201) {
    throw new Error(`Create mengembalikan HTTP ${response.status()}.`);
  }

  const row = page.locator("#slrminsp_list_section tr").filter({ hasText: itemName }).first();
  await waitForVisible(row, "baris item hasil create", 25000);
  const itemId = await row.getAttribute("data-row-key");
  if (!itemId) {
    throw new Error("ID item hasil create tidak terlihat pada baris tabel.");
  }
  report.data.itemId = Number(itemId);
  report.data.itemName = itemName;
  report.data.description = description;
  return { httpStatus: response.status(), itemId: Number(itemId), itemName, rowText: await row.innerText() };
}

async function readDetail() {
  const itemName = report.data.itemName;
  const row = await visible(page.locator("#slrminsp_list_section tr").filter({ hasText: itemName }).first(), "baris item untuk read");
  if (!(await row.innerText()).includes(itemName)) {
    throw new Error("Data hasil create tidak terlihat pada tabel read.");
  }
  const detailButton = row.getByRole("button", { name: "Detail", exact: true });
  await clickVisible(detailButton, "tombol Detail item master");
  const detail = await waitForVisible(page.locator("#slrminsp_detail_modal_section"), "modal Detail item master");
  const detailText = await detail.innerText();
  if (!detailText.includes(itemName) || !detailText.includes(report.data.description)) {
    throw new Error("Detail modal tidak menampilkan data item yang dibuat.");
  }
  await saveScreenshot(DETAIL_SCREENSHOT, "detail item master terlihat");
  await clickVisible(page.getByRole("button", { name: "Tutup", exact: true }), "tombol Tutup detail");
  await page.locator("#slrminsp_detail_modal_section").waitFor({ state: "detached", timeout: 10000 }).catch(() => null);
  return { itemId: report.data.itemId, detailVisible: true, detailText };
}

async function updateItemToInactive() {
  const itemName = report.data.itemName;
  const updatedName = `${itemName} dan Detail Panel`;
  const updatedDescription = "Periksa keseragaman warna, panel belang, bekas perbaikan bodi, pernis, dan celah antar-panel.";
  const row = await visible(page.locator("#slrminsp_list_section tr").filter({ hasText: itemName }).first(), "baris item untuk update");
  await clickVisible(row.getByRole("button", { name: "Edit", exact: true }), "tombol Edit item master");
  await waitForVisible(page.locator("#slrminsp_editor_form"), "form Edit master inspeksi");
  const editorName = await visible(page.locator("#slrminsp_editor_item_name_input"), "nama item saat edit");
  if ((await editorName.inputValue()) !== itemName) {
    throw new Error("Form edit tidak memuat nama item hasil create.");
  }
  await typeVisible(editorName, "nama item edit", updatedName);
  await typeVisible(page.locator("#slrminsp_editor_description_input"), "keterangan item edit", updatedDescription);
  await typeVisible(page.locator("#slrminsp_editor_sort_order_input"), "urutan item edit", "16");
  const active = await visible(page.locator("#slrminsp_editor_active_input"), "checkbox item aktif saat edit", { enabled: true });
  if (await active.isChecked()) {
    await active.click();
  }
  const updateResponse = page.waitForResponse((response) => response.request().method() === "PATCH"
    && new URL(response.url()).pathname.includes(`/inspection-templates/${report.data.itemId}`)
    && response.status() < 500, { timeout: 25000 });
  await clickVisible(page.locator("#slrminsp_editor_modal_submit_button"), "tombol Simpan Master update nonaktif");
  const response = await updateResponse;
  if (response.status() !== 200) {
    throw new Error(`Update nonaktif mengembalikan HTTP ${response.status()}.`);
  }
  await page.locator("#slrminsp_editor_form").waitFor({ state: "detached", timeout: 20000 });
  const updatedRow = await waitForVisible(page.locator("#slrminsp_list_section tr").filter({ hasText: updatedName }).first(), "baris item setelah update nonaktif", 25000);
  const updatedText = await updatedRow.innerText();
  if (await updatedRow.getByText("Nonaktif", { exact: true }).count() < 1) {
    throw new Error("Status Nonaktif tidak terlihat setelah update.");
  }
  report.data.updatedName = updatedName;
  report.data.updatedDescription = updatedDescription;
  return { httpStatus: response.status(), itemId: report.data.itemId, updatedName, statusVisible: "Nonaktif" };
}

async function filterItem() {
  await typeVisible(page.locator("#slrminsp_keyword_input"), "filter nama item", report.data.updatedName);
  await clickVisible(page.locator("#slrminsp_apply_filter_button"), "tombol Terapkan filter");
  const row = await waitForVisible(page.locator("#slrminsp_list_section tr").filter({ hasText: report.data.updatedName }).first(), "hasil filter item master", 25000);
  return { filteredNameVisible: (await row.innerText()).includes(report.data.updatedName) };
}

async function reactivateItem() {
  await clickVisible(page.locator("#slrminsp_reset_filter_button"), "tombol Reset filter");
  const row = await waitForVisible(page.locator("#slrminsp_list_section tr").filter({ hasText: report.data.updatedName }).first(), "baris item untuk reaktivasi", 25000);
  await clickVisible(row.getByRole("button", { name: "Edit", exact: true }), "tombol Edit reaktivasi item");
  await waitForVisible(page.locator("#slrminsp_editor_form"), "form reaktivasi item master");
  const active = await visible(page.locator("#slrminsp_editor_active_input"), "checkbox reaktivasi item", { enabled: true });
  if (!(await active.isChecked())) {
    await active.click();
  }
  const updateResponse = page.waitForResponse((response) => response.request().method() === "PATCH"
    && new URL(response.url()).pathname.includes(`/inspection-templates/${report.data.itemId}`)
    && response.status() < 500, { timeout: 25000 });
  await clickVisible(page.locator("#slrminsp_editor_modal_submit_button"), "tombol Simpan Master reaktivasi");
  const response = await updateResponse;
  if (response.status() !== 200) {
    throw new Error(`Reaktivasi mengembalikan HTTP ${response.status()}.`);
  }
  await page.locator("#slrminsp_editor_form").waitFor({ state: "detached", timeout: 20000 });
  const finalRow = await waitForVisible(page.locator("#slrminsp_list_section tr").filter({ hasText: report.data.updatedName }).first(), "baris item aktif final", 25000);
  const finalText = await finalRow.innerText();
  if (await finalRow.getByText("Aktif", { exact: true }).count() < 1) {
    throw new Error("Status Aktif tidak terlihat setelah reaktivasi.");
  }
  const actionLabels = await finalRow.getByRole("button").evaluateAll((buttons) => buttons
    .filter((button) => Boolean(button.offsetWidth || button.offsetHeight || button.getClientRects().length))
    .map((button) => button.innerText.trim()));
  return { httpStatus: response.status(), finalStatus: "Aktif", visibleActions: actionLabels, hardDeleteButtonVisible: actionLabels.some((label) => /hapus|delete/i.test(label)) };
}

async function responsiveCheck() {
  await page.setViewportSize({ width: 390, height: 844 });
  await waitForVisible(page.locator("#slrminsp_page_section"), "halaman Master Inspeksi responsive mobile");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (overflow) {
    throw new Error("Horizontal overflow terlihat pada viewport mobile.");
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await waitForVisible(page.locator("#slrminsp_list_section tr").filter({ hasText: report.data.updatedName }).first(), "data final tetap terlihat setelah responsive check");
  await saveScreenshot(FINAL_SCREENSHOT, "hasil CRUD final dengan data aktif terlihat");
  return { mobileViewport: "390x844", desktopViewport: "1280x900", horizontalOverflow: false };
}

async function main() {
  try {
    browser = await chromium.launch({ headless: false, slowMo: 80 });
    context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") {
        report.consoleErrors.push({ type: "console", text: message.text(), url: page.url() });
      }
    });
    page.on("requestfailed", (request) => {
      report.failedRequests.push({ url: request.url(), method: request.method(), failure: request.failure()?.errorText ?? "unknown" });
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        report.failedRequests.push({ url: response.url(), method: response.request().method(), status: response.status() });
      }
    });

    await runStep("Login seller owner melalui browser visible", login);
    if (!stepPassed("Login seller owner melalui browser visible")) {
      throw new Error("BLOCKED: login owner tidak berhasil, langkah berikutnya tidak sah.");
    }
    await runStep("Buka halaman Master Inspeksi dan validasi cabang aktif", openMasterPage);
    await runStep("Create item inspeksi bisnis yang relevan", createItem);
    await runStep("Read item dan buka detail melalui UI visible", readDetail);
    await runStep("Update item dan nonaktifkan melalui UI visible", updateItemToInactive);
    await runStep("Filter item hasil update melalui UI visible", filterItem);
    await runStep("Aktifkan kembali item dan validasi aksi yang terlihat", reactivateItem);
    await runStep("Validasi responsive dan sisakan data aktif di layar", responsiveCheck);

    report.status = report.steps.some((step) => step.status === "FAILED") ? "FAILED" : "PASSED";
  } catch (error) {
    report.status = error.message.startsWith("BLOCKED:") ? "BLOCKED" : "FAILED";
    report.fatalError = error.message;
    console.log(`[${report.status}] ${error.message}`);
    await saveScreenshot(FAILURE_SCREENSHOT, "fatal test error");
  } finally {
    report.finishedAt = now();
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      status: report.status,
      report: REPORT_PATH,
      screenshots: report.screenshots,
      steps: report.steps.map(({ name, status, error }) => ({ name, status, error })),
      consoleErrors: report.consoleErrors,
      failedRequests: report.failedRequests,
      browserLifecycle: "Browser/context/page sengaja tetap terbuka sesuai instruksi.",
    }, null, 2));
  }

  // Jangan menutup browser, context, atau page. Browser terlihat dan dibiarkan
  // terbuka agar hasil terakhir dapat diperiksa langsung oleh pengguna.
  await new Promise(() => {});
}

await main();
