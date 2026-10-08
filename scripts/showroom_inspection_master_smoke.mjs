import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.PB_BASE_URL || process.env.BASE_URL || "http://127.0.0.1:8019";
const SELLER_EMAIL = process.env.PB_SELLER_EMAIL || "metro-auto@projectb.local";
const SELLER_PASSWORD = process.env.PB_SELLER_PASSWORD || "DemoPass123!";
const SELLER2_EMAIL = process.env.PB_SELLER2_EMAIL || "parahyangan-cars@projectb.local";
const SELLER2_PASSWORD = process.env.PB_SELLER2_PASSWORD || "DemoPass123!";
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || "frontend-admin@projectb.local";
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || "DemoPass123!";
const STAFF_EMAIL = process.env.PB_STAFF_EMAIL || readStaffEmail();
const STAFF_PASSWORD = process.env.PB_STAFF_PASSWORD || "DemoPass123!";
const ALLOW_INSPECTION_MUTATION = process.env.PB_ALLOW_INSPECTION_MUTATION === "1";

const result = {
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  owner: {},
  inspectionFlow: {},
  isolation: {},
  staff: {},
  admin: {},
  branches: [],
  issues: [],
};

const browser = await chromium.launch({ headless: true });

try {
  const owner = await runOwnerFlow();
  result.owner = owner.summary;
  result.branches = owner.branches;
  result.inspectionFlow = await runInspectionFlow(owner);
  result.isolation = await runIsolationCheck(owner.activeShowroomId);
  result.admin = await runAdminSidebarCheck();
  if (STAFF_EMAIL) {
    result.staff = await runStaffGuardCheck();
  } else {
    result.staff = { status: "SKIP", note: "Akun staff tidak tersedia pada fixture." };
  }
} catch (error) {
  result.issues.push({ area: "runner", message: error.message, stack: error.stack });
} finally {
  await browser.close();
}

result.finishedAt = new Date().toISOString();
const output = path.resolve("storage", "browser-smoke", "showroom_inspection_master_smoke.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.issues.length ? "ISSUES" : "PASS", output, result }, null, 2));
if (result.issues.length) process.exitCode = 1;

async function runOwnerFlow() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const telemetry = attachTelemetry(page);
  await loginThroughUi(page, SELLER_EMAIL, SELLER_PASSWORD, "/seller");
  await goto(page, "/seller/master-inspection", "#slrminsp_page_section");

  const sidebarVisible = await page.locator('a[href="/seller/master-inspection"]').count() > 0;
  const branches = await page.locator("#slrminsp_active_branch_input option").evaluateAll((options) => options.map((option) => ({
    id: Number(option.value),
    name: option.textContent?.trim() ?? "",
  })));
  const activeShowroomId = Number(await page.locator("#slrminsp_active_branch_input").inputValue());
  const copyButtonDisabled = await page.locator("#slrminsp_copy_button").isDisabled();
  const initialOverflow = await hasHorizontalOverflow(page);
  check(sidebarVisible, "Owner tidak melihat menu Master Inspeksi.");
  check(activeShowroomId > 0, "Cabang aktif owner tidak tersedia.");
  check(!initialOverflow, "Halaman Master Inspeksi overflow horizontal pada desktop.");

  const itemName = `Playwright Master ${Date.now()}`;
  const description = "Item dibuat melalui input browser headless.";
  await page.locator("#slrminsp_create_button").click();
  await page.locator("#slrminsp_editor_form").waitFor({ state: "visible", timeout: 10000 });
  await page.locator("#slrminsp_editor_section_input").selectOption("exterior");
  await humanType(page.locator("#slrminsp_editor_item_name_input"), itemName);
  await humanType(page.locator("#slrminsp_editor_description_input"), description);
  await humanType(page.locator("#slrminsp_editor_sort_order_input"), "77");
  const createResponse = page.waitForResponse((response) => response.request().method() === "POST"
    && new URL(response.url()).pathname.endsWith("/inspection-templates")
    && response.status() < 500);
  await page.locator("#slrminsp_editor_modal_submit_button").click();
  const created = await createResponse;
  check(created.status() === 201, `Create master mengembalikan HTTP ${created.status()}.`);
  const row = page.locator("#slrminsp_list_section tbody tr").filter({ hasText: itemName });
  await row.waitFor({ state: "visible", timeout: 20000 });
  const itemId = Number(await row.getAttribute("data-row-key"));
  check(itemId > 0, "ID item master hasil create tidak ditemukan di tabel.");

  await row.getByRole("button", { name: "Detail", exact: true }).click();
  await page.locator("#slrminsp_detail_modal_section").waitFor({ state: "visible", timeout: 5000 });
  check((await page.locator("#slrminsp_detail_modal_section").innerText()).includes(itemName), "Detail master tidak menampilkan item yang dibuat.");
  await page.locator('#modal-root [aria-label="Tutup"]').click();

  await page.locator("#slrminsp_list_section tbody tr").filter({ hasText: itemName }).getByRole("button", { name: "Edit", exact: true }).click();
  await page.locator("#slrminsp_editor_form").waitFor({ state: "visible", timeout: 5000 });
  await humanType(page.locator("#slrminsp_editor_description_input"), "Item diperbarui dan dinonaktifkan melalui browser.");
  await page.locator("#slrminsp_editor_active_input").uncheck();
  const deactivateResponse = page.waitForResponse((response) => response.request().method() === "PATCH"
    && new URL(response.url()).pathname.includes(`/inspection-templates/${itemId}`));
  await page.locator("#slrminsp_editor_modal_submit_button").click();
  const deactivated = await deactivateResponse;
  check(deactivated.status() === 200, `Update/nonaktif master mengembalikan HTTP ${deactivated.status()}.`);
  const inactiveRow = page.locator("#slrminsp_list_section tbody tr").filter({ hasText: itemName });
  await inactiveRow.waitFor({ state: "visible", timeout: 20000 });
  await inactiveRow.getByText("Nonaktif", { exact: true }).waitFor({ state: "visible", timeout: 10000 }).catch(() => null);
  check(await inactiveRow.getByText("Nonaktif", { exact: true }).count() > 0, "Status item tidak berubah menjadi Nonaktif.");

  await inactiveRow.getByRole("button", { name: "Edit", exact: true }).click();
  await page.locator("#slrminsp_editor_form").waitFor({ state: "visible", timeout: 5000 });
  await page.locator("#slrminsp_editor_active_input").check();
  const activateResponse = page.waitForResponse((response) => response.request().method() === "PATCH"
    && new URL(response.url()).pathname.includes(`/inspection-templates/${itemId}`));
  await page.locator("#slrminsp_editor_modal_submit_button").click();
  const activated = await activateResponse;
  check(activated.status() === 200, `Update/aktif master mengembalikan HTTP ${activated.status()}.`);
  const activeRow = page.locator("#slrminsp_list_section tbody tr").filter({ hasText: itemName });
  await activeRow.waitFor({ state: "visible", timeout: 20000 });
  await activeRow.getByText("Aktif", { exact: true }).waitFor({ state: "visible", timeout: 10000 }).catch(() => null);
  check(await activeRow.getByText("Aktif", { exact: true }).count() > 0, "Status item tidak kembali menjadi Aktif.");

  await humanType(page.locator("#slrminsp_keyword_input"), itemName);
  await page.locator("#slrminsp_apply_filter_button").click();
  await page.waitForTimeout(250);
  check(await page.locator("#slrminsp_list_section tbody tr").count() === 1, "Filter keyword tidak menyisakan item yang dicari.");
  await page.locator("#slrminsp_reset_filter_button").click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  check(!await hasHorizontalOverflow(page), "Halaman Master Inspeksi overflow horizontal pada mobile.");

  let copy = { status: "SKIP", note: "Owner hanya memiliki satu cabang pada fixture ini." };
  if (branches.length >= 2) {
    const source = branches.find((branch) => branch.id !== activeShowroomId);
    await page.locator("#slrminsp_copy_source_input").selectOption(String(source.id));
    const copyResponse = page.waitForResponse((response) => response.request().method() === "POST"
      && new URL(response.url()).pathname.endsWith("/inspection-templates/copy"));
    await page.locator("#slrminsp_copy_button").click();
    const copied = await copyResponse;
    check(copied.status() === 200, `Copy merge mengembalikan HTTP ${copied.status()}.`);
    copy = { status: "PASS", sourceShowroomId: source.id, targetShowroomId: activeShowroomId };
  } else {
    check(copyButtonDisabled, "Tombol copy tidak dinonaktifkan saat owner hanya memiliki satu cabang.");
  }

  const apiResponse = await context.request.get(`${BASE_URL}/api/showrooms/${activeShowroomId}/mine/inspection-templates`);
  check(apiResponse.status() === 200, `Endpoint master showroom owner mengembalikan HTTP ${apiResponse.status()}.`);
  const apiPayload = await apiResponse.json();
  check((apiPayload?.data?.templates ?? []).some((template) => Number(template.id) === itemId), "Item hasil UI tidak muncul di endpoint master showroom.");

  const summary = {
    status: "PASS",
    activeShowroomId,
    itemId,
    itemName,
    branchCount: branches.length,
    copy,
    telemetry: telemetry.summary(),
  };
  await context.close();
  return { summary, branches, activeShowroomId, itemId, itemName };
}

async function runInspectionFlow(owner) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  const telemetry = attachTelemetry(page);
  await loginThroughUi(page, SELLER_EMAIL, SELLER_PASSWORD, "/seller");

  const response = await context.request.get(`${BASE_URL}/api/seller/cars?limit=100`);
  const payload = await response.json();
  const cars = payload?.data?.cars ?? [];
  const car = cars.find((candidate) => Number(candidate.showroom_id) === owner.activeShowroomId) ?? cars[0] ?? null;
  if (!car?.id) {
    await context.close();
    return { status: "SKIP", note: "Mobil showroom tidak tersedia pada fixture.", telemetry: telemetry.summary() };
  }

  await goto(page, `/seller/cars/${car.id}/inspection`, "body");
  await page.locator("#slrinsp_items_section, #slrinsp_master_blocked_section").first().waitFor({ state: "visible", timeout: 25000 });
  const blocked = await page.locator("#slrinsp_master_blocked_section").count() > 0;
  const loadedItem = await page.getByText(owner.itemName, { exact: true }).count() > 0;
  check(!blocked, "Inspection flow terblokir padahal master cabang sudah dibuat.");
  check(loadedItem, "Inspection flow tidak memakai item dari master showroom cabang.");

  let mutation = { status: "SKIP", note: "Mutation inspection dinonaktifkan; aktifkan PB_ALLOW_INSPECTION_MUTATION=1 untuk membuat report dummy." };
  if (ALLOW_INSPECTION_MUTATION && loadedItem) {
    const goodButtons = page.locator('button[id^="slrinsp_condition_"][id$="_good_button"]:visible');
    const count = await goodButtons.count();
    for (let index = 0; index < count; index += 1) {
      await page.locator('button[id^="slrinsp_condition_"][id$="_good_button"]:visible').nth(index).click();
    }
    const saveButton = page.locator('button:visible').filter({ hasText: "Simpan Inspeksi" }).last();
    const saveResponse = page.waitForResponse((candidate) => ["POST", "PATCH"].includes(candidate.request().method())
      && candidate.url().includes("/api/"));
    await saveButton.click();
    const saved = await saveResponse;
    check(saved.status() < 300, `Penyimpanan inspection mengembalikan HTTP ${saved.status()}.`);
    mutation = { status: "PASS", carId: car.id, goodButtons: count };
  }

  const summary = {
    status: "PASS",
    carId: car.id,
    blocked,
    loadedItem,
    mutation,
    telemetry: telemetry.summary(),
  };
  await context.close();
  return summary;
}

async function runIsolationCheck(showroomId) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const page = await context.newPage();
  await loginThroughUi(page, SELLER2_EMAIL, SELLER2_PASSWORD, "/seller");
  const response = await context.request.get(`${BASE_URL}/api/showrooms/${showroomId}/mine/inspection-templates`);
  const status = response.status();
  check(status === 403, `Seller lain dapat membaca master showroom tenant berbeda (HTTP ${status}).`);
  await context.close();
  return { status: status === 403 ? "PASS" : "FAIL", attemptedShowroomId: showroomId, httpStatus: status };
}

async function runAdminSidebarCheck() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD, "/admin", "admin");
  const sidebarCount = await page.locator('a[href="/admin/master-inspection"]').count();
  check(sidebarCount === 0, "Menu Master Inspeksi admin masih tampil di sidebar.");
  await goto(page, "/admin/master-inspection", "#admstinsp_page_section");
  check(await page.getByText("Master Inspection", { exact: true }).count() > 0, "Fungsi halaman master inspeksi admin tidak lagi dapat dibuka langsung.");
  await context.close();
  return { status: sidebarCount === 0 ? "PASS" : "FAIL", sidebarCount };
}

async function runStaffGuardCheck() {
  const context = await browser.newContext({ viewport: { width: 1024, height: 900 } });
  const page = await context.newPage();
  try {
    await loginThroughUi(page, STAFF_EMAIL, STAFF_PASSWORD, "/seller");
  } catch (error) {
    await context.close();
    return { status: "SKIP", note: `Login staff fixture gagal: ${error.message}` };
  }

  const sidebarCount = await page.locator('a[href="/seller/master-inspection"]').count();
  await goto(page, "/seller/master-inspection", "body");
  const pageVisible = await page.locator("#slrminsp_page_section").count() > 0;
  check(sidebarCount === 0, "Staff masih melihat menu Master Inspeksi owner.");
  check(!pageVisible, "Staff masih dapat membuka halaman Master Inspeksi owner secara langsung.");
  await context.close();
  return { status: sidebarCount === 0 && !pageVisible ? "PASS" : "FAIL", sidebarCount, pageVisible };
}

async function loginThroughUi(page, email, password, expectedPath, loginRole = "seller") {
  await page.goto(`${BASE_URL}/login/${loginRole}?gate=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.locator(`#role_login_${loginRole}_email_input`).waitFor({ state: "visible", timeout: 15000 });
  await humanType(page.locator(`#role_login_${loginRole}_email_input`), email);
  await humanType(page.locator(`#role_login_${loginRole}_password_input`), password);
  await page.locator(`#role_login_${loginRole}_submit_button`).click();
  await page.waitForURL((url) => url.pathname === expectedPath, { timeout: 25000 });
}

async function goto(page, route, selector) {
  await page.goto(`${BASE_URL}${route}${route.includes("?") ? "&" : "?"}gate=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.locator(selector).waitFor({ state: "visible", timeout: 25000 });
  await page.waitForTimeout(500);
}

async function humanType(locator, value) {
  await locator.click();
  await locator.fill("");
  await locator.pressSequentially(String(value), { delay: 4 });
}

async function hasHorizontalOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
}

function attachTelemetry(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !/401 \(Unauthorized\)/i.test(message.text())) consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { summary: () => ({ consoleErrors, pageErrors }) };
}

function check(condition, message) {
  if (!condition) result.issues.push({ area: "assertion", message });
}

function readStaffEmail() {
  try {
    const report = JSON.parse(fs.readFileSync(path.resolve("storage", "browser-smoke", "business_flow_ui_smoke.json"), "utf8"));
    return report.steps?.find((step) => step.name === "Showroom memakai fitur staf sesuai paket")?.email ?? "";
  } catch {
    return "";
  }
}
