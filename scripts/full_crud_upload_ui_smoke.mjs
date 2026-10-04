import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8019";
const RUN_ID = `crud_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
const QA_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../storage/browser-smoke/tiny-gate.png");
const VALID_IMAGE_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../storage/browser-smoke/master-debug.png");
const OUTPUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../storage/browser-smoke/full_crud_upload_ui_smoke.json");
const PASSWORD = "SmokePass123!";

const accounts = {
  admin: { role: "admin", email: "admin@projectb.local", password: PASSWORD },
  seller: { role: "seller", email: "seller@projectb.local", password: PASSWORD },
  buyer: { role: "buyer", email: "buyer@projectb.local", password: PASSWORD },
};

const report = {
  runId: RUN_ID,
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  steps: [],
  issues: [],
  pageErrors: [],
  mutationHttpErrors: [],
};
let sellerCarId = 2;
let commissionCarId = null;

function record(name, status, details = {}) {
  const item = { name, ...details, status };
  report.steps.push(item);
  if (status === "FAIL") report.issues.push(item);
  console.log(`[${status}] ${name}${details.note ? ` — ${details.note}` : ""}`);
}

async function runStep(name, fn) {
  try {
    const details = await fn();
    record(name, "PASS", details ?? {});
    return details ?? {};
  } catch (error) {
    record(name, "FAIL", { note: error?.message || String(error) });
    return null;
  }
}

async function waitForApp(page) {
  await page.locator("#app").waitFor({ state: "attached", timeout: 15000 });
  await page.waitForTimeout(650);
}

async function goto(page, route) {
  const separator = route.includes("?") ? "&" : "?";
  await page.goto(`${BASE_URL}${route}${separator}crud_gate=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await waitForApp(page);
}

async function body(page) {
  return page.locator("body").innerText();
}

async function login(page, account) {
  await goto(page, `/login/${account.role}`);
  await page.locator(`#role_login_${account.role}_email_input`).fill(account.email);
  await page.locator(`#role_login_${account.role}_password_input`).fill(account.password);
  await page.locator(`#role_login_${account.role}_submit_button`).click();
  await page.waitForTimeout(1000);
  const text = await body(page);
  if (/Maaf,|gagal login|tidak valid|ROLE_MISMATCH/i.test(text)) {
    throw new Error(`Login ${account.role} gagal: ${text.slice(-500)}`);
  }
}

async function resetSession(page) {
  await page.context().clearCookies();
  await page.goto(`${BASE_URL}/?crud_reset=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 });
  await waitForApp(page);
}

async function fill(page, id, value) {
  const locator = page.locator(`#${id}`);
  await locator.waitFor({ state: "visible", timeout: 10000 });
  await locator.fill(String(value));
}

async function selectFirstOption(page, id) {
  const select = page.locator(`#${id}`);
  const value = await select.locator("option").evaluateAll((options) => options.map((option) => option.value).find(Boolean));
  if (!value) throw new Error(`Select #${id} tidak memiliki option aktif.`);
  await select.selectOption(value);
  return value;
}

async function createSellerCarForCommission(page) {
  await goto(page, "/seller/cars");
  await page.locator("#slrc_add_car_button").click();
  const plate = `QA-${RUN_ID}`.slice(0, 12);
  await fill(page, "slrc_license_plate_number_input", plate);
  await selectFirstOption(page, "slrc_brand_name_input");
  await page.locator("#slrc_model_name_input option[value]:not([value=''])").first().waitFor({ state: "attached", timeout: 12000 });
  await selectFirstOption(page, "slrc_model_name_input");
  await fill(page, "slrc_primary_color_input", "Hitam QA");
  await page.locator("#slrc_car_form_next_button").click();
  await fill(page, "slrc_registration_date_input", "2024-01-15");
  await page.locator("#slrc_car_form_next_button").click();
  await fill(page, "slrc_price_cash_input", "145000000");
  await fill(page, "slrc_dp_amount_input", "3000000");
  await page.locator("#slrc_car_form_submit_button").click();
  await page.getByText("Mobil berhasil ditambahkan.", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(900);
  const row = page.locator("#slrc_cars_table_section table tbody tr").filter({ hasText: plate }).first();
  await row.waitFor({ state: "visible", timeout: 12000 });
  const id = Number(await row.getAttribute("data-row-key") ?? 0);
  if (!id) throw new Error("Listing baru berhasil dibuat tetapi ID mobil tidak terbaca.");
  return { id, plate };
}

async function confirmModal(page) {
  const confirm = page.locator("#pb_confirm_submit_button");
  await confirm.waitFor({ state: "visible", timeout: 10000 });
  await confirm.click();
  await page.waitForTimeout(700);
}

async function filterTable(page, inputId, applyId, tableId, keyword) {
  await fill(page, inputId, keyword);
  await page.locator(`#${applyId}`).click();
  const row = page.locator(`#${tableId} table tr`).filter({ hasText: keyword }).first();
  await row.waitFor({ state: "visible", timeout: 12000 });
  return row;
}

async function ensureNotError(page, label) {
  const text = await body(page);
  if (/fatal error|uncaught exception|route not found|page not found/i.test(text)) {
    throw new Error(`${label}: halaman menampilkan error fatal.`);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("pageerror", (error) => report.pageErrors.push({ url: page.url(), message: error.message }));
  page.on("response", (response) => {
    const request = response.request();
    if (request.url().includes("/api/") && request.method() !== "GET" && response.status() >= 400) {
      report.mutationHttpErrors.push({ method: request.method(), url: request.url(), status: response.status() });
    }
  });

  try {
    await runStep("Admin login untuk gate CRUD", () => login(page, accounts.admin));

    await runStep("Public transaction guard dan tombol Google", async () => {
      await resetSession(page);
      await goto(page, "/transactions/new?car_id=36");
      const text = await body(page);
      const hasAccessCard = /Akun akses|Daftar Pembeli/i.test(text);
      const googleButton = page.getByRole("button", { name: /Google/i }).first();
      const hasGoogle = await googleButton.count() > 0 && await googleButton.isVisible().catch(() => false);
      if (hasAccessCard) throw new Error("Card Akun akses/Daftar Pembeli masih tampil pada transaksi publik.");
      if (!hasGoogle) throw new Error("Tombol login Google tidak tampil pada transaksi publik.");
      return { hiddenAccessCard: true, googleButtonVisible: true };
    });

    await runStep("Admin login ulang setelah public gate", () => login(page, accounts.admin));

    await runStep("CRUD master brand dan model", async () => {
      await goto(page, "/admin/master-brand");
      const brandName = `QA CRUD Brand ${RUN_ID}`;
      const updatedBrand = `${brandName} Updated`;
      const modelName = `QA CRUD Model ${RUN_ID}`;
      await page.locator("#admst_create_brand_button").click();
      await fill(page, "admst_brand_name_input", brandName);
      await fill(page, "admst_brand_description_input", "Brand CRUD browser UI.");
      await page.locator("#admst_add_model_button").click();
      await fill(page, "admst_model_name_input_0", modelName);
      await page.locator("#admst_save_brand_button").click();
      await page.waitForTimeout(900);
      const createdRow = await filterTable(page, "admst_keyword_input", "admst_apply_filter_button", "admst_brand_table_section", brandName);
      await createdRow.locator('button[id^="admst_edit_brand_button_"]').first().click();
      await fill(page, "admst_brand_name_input", updatedBrand);
      await page.locator("#admst_save_brand_button").click();
      const updatedRow = await filterTable(page, "admst_keyword_input", "admst_apply_filter_button", "admst_brand_table_section", updatedBrand);
      await updatedRow.locator('button[id^="admst_delete_brand_button_"]').first().click();
      await confirmModal(page);
      await page.waitForTimeout(500);
      if ((await body(page)).includes(updatedBrand)) throw new Error("Brand tidak terhapus dari daftar setelah konfirmasi.");
      return { created: brandName, updated: updatedBrand, deleted: true, model: modelName };
    });

    await runStep("CRUD master lokasi", async () => {
      await goto(page, "/admin/master-location");
      const city = `QA City ${RUN_ID}`;
      const updated = `${city} Updated`;
      await page.locator("#admstloc_create_city_button").click();
      await fill(page, "admstloc_city_name_input", city);
      await fill(page, "admstloc_province_name_input", "QA Province");
      await page.locator("#admstloc_save_city_button").click();
      await page.waitForTimeout(900);
      const row = await filterTable(page, "admstloc_keyword_input", "admstloc_apply_filter_button", "admstloc_location_table_section", city);
      await row.locator('button[id^="admstloc_edit_city_button_"]').first().click();
      await fill(page, "admstloc_city_name_input", updated);
      await page.locator("#admstloc_save_city_button").click();
      const updatedRow = await filterTable(page, "admstloc_keyword_input", "admstloc_apply_filter_button", "admstloc_location_table_section", updated);
      await updatedRow.locator('button[id^="admstloc_delete_city_button_"]').first().click();
      await confirmModal(page);
      if ((await body(page)).includes(updated)) throw new Error("Lokasi tidak terhapus dari daftar setelah konfirmasi.");
      return { created: city, updated, deleted: true };
    });

    await runStep("CRUD master bank plus upload icon", async () => {
      await goto(page, "/admin/master-bank");
      const bank = `QA Bank ${RUN_ID}`;
      const updated = `${bank} Updated`;
      await page.locator("#admstbk_create_bank_button").click();
      await fill(page, "admstbk_bank_name_input", bank);
      await fill(page, "admstbk_bank_code_input", `Q${RUN_ID.slice(-3)}`);
      await page.locator("#admstbk_icon_file_input").setInputFiles(VALID_IMAGE_FILE);
      await page.locator("#admstbk_icon_preview_image").waitFor({ state: "visible", timeout: 12000 });
      await page.locator("#admstbk_save_bank_button").click();
      await page.waitForTimeout(900);
      const row = await filterTable(page, "admstbk_keyword_input", "admstbk_apply_filter_button", "admstbk_bank_table_section", bank);
      await row.locator('button[id^="admstbk_edit_bank_button_"]').first().click();
      await fill(page, "admstbk_bank_name_input", updated);
      await page.locator("#admstbk_save_bank_button").click();
      const updatedRow = await filterTable(page, "admstbk_keyword_input", "admstbk_apply_filter_button", "admstbk_bank_table_section", updated);
      await updatedRow.locator('button[id^="admstbk_delete_bank_button_"]').first().click();
      await confirmModal(page);
      if ((await body(page)).includes(updated)) throw new Error("Bank tidak terhapus dari daftar setelah konfirmasi.");
      return { created: bank, updated, deleted: true, upload: "master-debug.png" };
    });

    await runStep("CRUD master pricing", async () => {
      await goto(page, "/admin/master-pricing");
      const destination = {
        bankName: "BCA QA",
        accountNumber: `900${RUN_ID.slice(-8)}`,
        accountHolder: "Carlynk QA",
      };
      await fill(page, "admstpr_destination_bank_name_input", destination.bankName);
      await fill(page, "admstpr_destination_account_number_input", destination.accountNumber);
      await fill(page, "admstpr_destination_account_holder_input", destination.accountHolder);
      await page.locator("#admstpr_destination_save_button").click();
      await page.getByText("Rekening tujuan pembayaran berhasil disimpan.", { exact: true }).waitFor({ state: "visible", timeout: 12000 });
      const plan = `QA CRUD Plan ${RUN_ID}`;
      const updated = `${plan} Updated`;
      await page.locator("#admstpr_create_plan_button").click();
      await fill(page, "admstpr_plan_name_input", plan);
      await fill(page, "admstpr_plan_price_input", "12345");
      await fill(page, "admstpr_plan_billing_period_input", "/bulan");
      await fill(page, "admstpr_plan_listing_limit_input", "3");
      await fill(page, "admstpr_plan_staff_limit_input", "1");
      await fill(page, "admstpr_plan_features_input", "CRUD browser\nUpload browser");
      await page.locator("#admstpr_save_plan_button").click();
      await page.waitForTimeout(900);
      const row = await filterTable(page, "admstpr_keyword_input", "admstpr_apply_filter_button", "admstpr_pricing_table_section", plan);
      await row.locator('button[id^="admstpr_edit_plan_button_"]').first().click();
      await fill(page, "admstpr_plan_name_input", updated);
      await page.locator("#admstpr_save_plan_button").click();
      const updatedRow = await filterTable(page, "admstpr_keyword_input", "admstpr_apply_filter_button", "admstpr_pricing_table_section", updated);
      await updatedRow.locator('button[id^="admstpr_delete_plan_button_"]').first().click();
      await confirmModal(page);
      if ((await body(page)).includes(updated)) throw new Error("Paket harga tidak terhapus dari daftar setelah konfirmasi.");
      return { destinationSaved: destination, created: plan, updated, deleted: true };
    });

    await runStep("CRUD master sidebar", async () => {
      await goto(page, "/admin/master-sidebar");
      const label = `QA Menu ${RUN_ID}`;
      const updated = `${label} Updated`;
      await page.locator("#admst_create_sidebar_button").click();
      await page.locator("#admst_sidebar_form_role_input").selectOption("admin");
      await fill(page, "admst_sidebar_form_label_input", label);
      await fill(page, "admst_sidebar_form_route_input", `/qa-crud-${RUN_ID}`);
      await fill(page, "admst_sidebar_form_order_input", "999");
      await page.locator("#admst_save_sidebar_button").click();
      await page.waitForTimeout(900);
      const row = await filterTable(page, "admst_sidebar_keyword_input", "admst_sidebar_apply_filter_button", "admst_sidebar_table_section", label);
      await row.locator('button[id^="admst_edit_sidebar_button_"]').first().click();
      await fill(page, "admst_sidebar_form_label_input", updated);
      await page.locator("#admst_save_sidebar_button").click();
      const updatedRow = await filterTable(page, "admst_sidebar_keyword_input", "admst_sidebar_apply_filter_button", "admst_sidebar_table_section", updated);
      await updatedRow.locator('button[id^="admst_delete_sidebar_button_"]').first().click();
      await confirmModal(page);
      if ((await body(page)).includes(updated)) throw new Error("Menu sidebar tidak terhapus dari daftar setelah konfirmasi.");
      return { created: label, updated, deleted: true };
    });

    await runStep("CRUD master inspection dan nonaktifkan item", async () => {
      await goto(page, "/admin/master-inspection");
      const item = `QA Inspection ${RUN_ID}`;
      const updated = `${item} Updated`;
      await page.locator("#admstinsp_create_button").click();
      await fill(page, "admstinsp_editor_item_name_input", item);
      await fill(page, "admstinsp_editor_description_input", "Inspection CRUD browser UI.");
      await page.locator("#admstinsp_save_template_button").click();
      await page.waitForTimeout(800);
      await fill(page, "admstinsp_keyword_input", item);
      await page.locator("#admstinsp_apply_filter_button").click();
      const itemRow = page.locator("#admstinsp_item_table_section table tbody tr").filter({ hasText: item }).first();
      await itemRow.waitFor({ state: "visible", timeout: 12000 });
      const detailButton = itemRow.getByRole("button", { name: "Detail", exact: true });
      await detailButton.waitFor({ state: "visible", timeout: 12000 });
      await detailButton.click();
      const detailModal = page.locator("#admstinsp_detail_modal_section");
      await detailModal.waitFor({ state: "visible", timeout: 10000 });
      await detailModal.getByText(item, { exact: true }).waitFor({ state: "visible", timeout: 10000 });
      await page.locator('button[id^="admstinsp_detail_edit_button_"]').click();
      await fill(page, "admstinsp_editor_item_name_input", updated);
      await page.locator("#admstinsp_editor_active_input").uncheck();
      await page.locator("#admstinsp_save_template_button").click();
      await page.locator("#admstinsp_item_table_section table tbody tr").filter({ hasText: updated }).waitFor({ state: "visible", timeout: 12000 });
      return { created: item, updated, inspectionStatus: "inactive", note: "UI menyediakan create/update/status, tidak menyediakan delete master inspection." };
    });

    await runStep("CRUD slider plus upload image dan arsip", async () => {
      await goto(page, "/admin/sliders");
      const title = `QA Slider ${RUN_ID}`;
      const updated = `${title} Updated`;
      await page.locator("#adsl_create_button").click();
      await fill(page, "adsl_title_input", title);
      await fill(page, "adsl_description_input", "Slider CRUD browser UI.");
      await fill(page, "adsl_image_alt_input", "QA slider image");
      await fill(page, "adsl_cta_text_input", "Lihat QA");
      await fill(page, "adsl_cta_url_input", "/public");
      await page.locator("#adsl_image_file_input").setInputFiles(VALID_IMAGE_FILE);
      await page.getByText("Gambar berhasil diupload.", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
      await page.getByRole("button", { name: "Simpan Slider", exact: true }).click();
      const row = page.locator("#adsl_table_section table tr").filter({ hasText: title }).first();
      await row.waitFor({ state: "visible", timeout: 12000 });
      await row.getByRole("button", { name: "Edit", exact: true }).click();
      await fill(page, "adsl_title_input", updated);
      await page.getByRole("button", { name: "Simpan Slider", exact: true }).click();
      const updatedRow = page.locator("#adsl_table_section table tr").filter({ hasText: updated }).first();
      await updatedRow.waitFor({ state: "visible", timeout: 12000 });
      await updatedRow.getByRole("button", { name: "Arsip", exact: true }).click();
      await page.waitForTimeout(900);
      if ((await body(page)).includes(updated)) throw new Error("Slider masih tampil aktif setelah diarsipkan.");
      return { created: title, updated, archived: true, upload: "master-debug.png" };
    });

    await runStep("Admin page selesai tanpa pageerror", async () => {
      await ensureNotError(page, "Admin CRUD");
      return { pageErrorsAtPoint: report.pageErrors.length, mutationHttpErrorsAtPoint: report.mutationHttpErrors.length };
    });

    await runStep("Seller update listing melalui form", async () => {
      await resetSession(page);
      await login(page, accounts.seller);
      await goto(page, "/seller/cars");
      const row = page.locator("#slrc_cars_table_section table tbody tr").first();
      await row.waitFor({ state: "visible", timeout: 12000 });
      const edit = row.getByRole("button", { name: "Edit", exact: true });
      await edit.waitFor({ state: "visible", timeout: 12000 });
      sellerCarId = Number(await row.getAttribute("data-row-key") ?? 0);
      if (!sellerCarId) throw new Error("ID mobil seller tidak terbaca dari tombol edit.");
      await edit.click();
      const originalColor = await page.locator("#slrc_primary_color_input").inputValue();
      await fill(page, "slrc_primary_color_input", `QA Updated ${RUN_ID}`);
      await page.locator("#slrc_car_form_next_button").click();
      await page.locator("#slrc_car_form_next_button").click();
      await page.locator("#slrc_car_form_submit_button").click();
      await page.getByText("Mobil berhasil diperbarui.", { exact: true }).waitFor({ state: "visible", timeout: 12000 });
      await page.locator(`#slrc_cars_table_section table tbody tr[data-row-key="${sellerCarId}"]`).getByRole("button", { name: "Edit", exact: true }).click();
      const savedColor = await page.locator("#slrc_primary_color_input").inputValue();
      if (savedColor !== `QA Updated ${RUN_ID}`) throw new Error(`Update listing tidak tersimpan: ${savedColor}`);
      await fill(page, "slrc_primary_color_input", originalColor);
      await page.locator("#slrc_car_form_next_button").click();
      await page.locator("#slrc_car_form_next_button").click();
      await page.locator("#slrc_car_form_submit_button").click();
      return { carId: sellerCarId, updatedAndRestored: true };
    });

    await runStep("Seller upload, cover, reorder, dan hapus gambar", async () => {
      await goto(page, `/seller/cars/${sellerCarId}/images`);
      await page.locator("#slri_upload_image_input").setInputFiles(VALID_IMAGE_FILE);
      await page.locator("#slri_queue_modal_section").waitFor({ state: "visible", timeout: 12000 });
      await page.locator("#slri_queue_modal_item_", { hasText: "tiny-gate.png" }).first().waitFor({ state: "visible", timeout: 12000 }).catch(() => null);
      await page.locator("#slri_queue_done_button").waitFor({ state: "visible", timeout: 20000 });
      await page.locator("#slri_queue_done_button").click();
      await page.locator('section[id^="slri_image_card_"]').last().waitFor({ state: "visible", timeout: 15000 });
      const imageCard = page.locator('section[id^="slri_image_card_"]').last();
      const imageCardId = await imageCard.getAttribute("id");
      const cover = imageCard.locator('button[id^="slri_image_cover_"]');
      if (await cover.count() && !await cover.isDisabled()) {
        await cover.click();
        await page.waitForTimeout(700);
      }
      const remove = imageCard.locator('button[id^="slri_image_delete_"]');
      await remove.click();
      await confirmModal(page);
      await page.waitForTimeout(700);
      if (await page.locator(`#${imageCardId}`).count()) throw new Error("Gambar tidak hilang dari galeri setelah hapus.");
      return { carId: sellerCarId, upload: "master-debug.png", coverTested: true, deleted: true };
    });

    await runStep("Seller CRUD staf", async () => {
      await goto(page, "/seller/staff");
      const add = page.getByRole("button", { name: "Tambah Staf", exact: true });
      if (await add.isDisabled()) return { skipped: true, note: "Paket akun seller smoke tidak memiliki kuota staf." };
      const email = `${RUN_ID}.staff@projectb.local`;
      await add.click();
      await fill(page, "slstf_name_input", "QA CRUD Staff");
      await fill(page, "slstf_email_input", email);
      await fill(page, "slstf_phone_input", "081234567891");
      await fill(page, "slstf_password_input", "DemoPass123!");
      await fill(page, "slstf_password_confirmation_input", "DemoPass123!");
      await page.locator("#slstf_submit_button").click();
      const card = page.locator("section").filter({ hasText: email }).last();
      await card.waitFor({ state: "visible", timeout: 12000 });
      await card.getByRole("button", { name: "Edit", exact: true }).click();
      await fill(page, "slstf_name_input", "QA CRUD Staff Updated");
      await page.locator("#slstf_submit_button").click();
      const updatedCard = page.locator("section").filter({ hasText: email }).last();
      await updatedCard.getByRole("button", { name: "Nonaktifkan", exact: true }).click();
      await page.waitForTimeout(800);
      const inactiveCard = page.locator("section").filter({ hasText: email }).last();
      await inactiveCard.getByRole("button", { name: "Aktifkan", exact: true }).click();
      return { email, updated: true, toggledInactiveAndActive: true };
    });

    await runStep("Seller CRUD partner marketing", async () => {
      await goto(page, "/seller/affiliates?mode=create");
      const email = `${RUN_ID}.marketing@projectb.local`;
      const code = `QA-${RUN_ID}`;
      await fill(page, "slraf_affiliate_name_input", "QA CRUD Marketing");
      await fill(page, "slraf_affiliate_email_input", email);
      await fill(page, "slraf_affiliate_referral_code_input", code);
      await fill(page, "slraf_affiliate_phone_number_input", "081234567892");
      await fill(page, "slraf_affiliate_password_input", "DemoPass123!");
      await fill(page, "slraf_affiliate_password_confirmation_input", "DemoPass123!");
      await page.waitForTimeout(1000);
      await page.locator("#slraf_affiliate_submit_button").click();
      await page.waitForTimeout(800);
      await goto(page, "/seller/affiliates");
      const row = page.locator("#slraf_affiliates_table table tbody tr").filter({ hasText: email }).first();
      await row.waitFor({ state: "visible", timeout: 12000 });
      await row.getByRole("button", { name: "Edit", exact: true }).click();
      await fill(page, "slraf_affiliate_name_input", "QA CRUD Marketing Updated");
      await page.locator("#slraf_affiliate_submit_button").click();
      await page.waitForTimeout(800);
      await goto(page, "/seller/affiliates");
      const updated = page.locator("#slraf_affiliates_table table tbody tr").filter({ hasText: email }).first();
      await updated.getByRole("button", { name: "Nonaktifkan", exact: true }).click();
      await page.waitForTimeout(800);
      await updated.getByRole("button", { name: "Aktifkan", exact: true }).click();
      return { email, referralCode: code, updated: true, toggledInactiveAndActive: true };
    });

    await runStep("Seller CRUD komisi global dan override", async () => {
      await goto(page, "/seller/affiliate-commissions?mode=global");
      await page.locator("#slrafc_global_submit_button").waitFor({ state: "visible", timeout: 12000 });
      await page.locator("#slrafc_global_commission_type_input").selectOption("percent");
      await fill(page, "slrafc_global_commission_value_input", "6");
      await page.locator("#slrafc_global_status_input").selectOption("active");
      await page.locator("#slrafc_global_submit_button").click();
      await page.waitForTimeout(800);
      await goto(page, "/seller/affiliate-commissions?mode=create");
      const form = page.locator("#slrafc_create_modal_content_section");
      await form.waitFor({ state: "visible", timeout: 12000 });
      const carSelect = form.locator('select[name="car_id"]');
      const eligibleValues = await carSelect.locator("option").evaluateAll((options) => options.map((option) => option.value).filter(Boolean));
      if (!eligibleValues.includes(String(sellerCarId))) {
        const created = await createSellerCarForCommission(page);
        commissionCarId = created.id;
        await goto(page, "/seller/affiliate-commissions?mode=create");
        await page.locator("#slrafc_create_modal_content_section").waitFor({ state: "visible", timeout: 12000 });
      }
      const refreshedCarSelect = page.locator("#slrafc_create_modal_content_section").locator('select[name="car_id"]');
      await refreshedCarSelect.locator(`option[value="${commissionCarId ?? sellerCarId}"]`).waitFor({ state: "attached", timeout: 12000 });
      await refreshedCarSelect.selectOption(String(commissionCarId ?? sellerCarId));
      await form.locator('select[name="commission_type"]').selectOption("percent");
      await form.locator('input[name="commission_value"]').fill("9");
      await form.locator('select[name="status"]').selectOption("active");
      await form.getByRole("button", { name: "Buat aturan", exact: true }).click();
      await page.waitForTimeout(1000);
      await goto(page, "/seller/affiliate-commissions");
      const row = page.locator("#slrafc_commissions_table table tbody tr").last();
      await row.waitFor({ state: "visible", timeout: 12000 });
      await row.getByRole("button", { name: "Edit", exact: true }).click();
      const editForm = page.locator("#slrafc_edit_modal_content_section");
      await editForm.locator('input[name="commission_value"]').fill("8");
      await editForm.getByRole("button", { name: "Simpan aturan", exact: true }).click();
      return { globalPercent: 6, overrideCarId: commissionCarId ?? sellerCarId, overrideCreated: true, overrideUpdated: 8, createdFreshCar: Boolean(commissionCarId) };
    });

    await runStep("Buyer login dan form akun", async () => {
      await resetSession(page);
      await login(page, accounts.buyer);
      await goto(page, "/buyer/account");
      const editButton = page.locator("#byrac_edit_profile_button");
      const passwordButton = page.locator("#byrac_change_password_button");
      if (!await editButton.count() || !await passwordButton.count()) throw new Error("Aksi edit profil/password buyer tidak tampil.");
      await editButton.click();
      await page.locator("#byrac_profile_form").waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("button", { name: /Batal/i }).last().click();
      await passwordButton.click();
      await page.locator("#byrac_password_form").waitFor({ state: "visible", timeout: 10000 });
      await page.getByRole("button", { name: /Batal/i }).last().click();
      return { profileEditForm: true, passwordForm: true };
    });

    await runStep("Final mutation/pageerror gate", async () => {
      await ensureNotError(page, "Final CRUD gate");
      if (report.pageErrors.length) throw new Error(`Ditemukan ${report.pageErrors.length} pageerror.`);
      if (report.mutationHttpErrors.length) throw new Error(`Ditemukan ${report.mutationHttpErrors.length} HTTP error pada mutation.`);
      return { pageErrors: 0, mutationHttpErrors: 0 };
    });
  } finally {
    await context.close();
    await browser.close();
  }

  report.finishedAt = new Date().toISOString();
  report.status = report.issues.length ? "FAIL" : "PASS";
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ status: report.status, output: OUTPUT, steps: report.steps.length, issues: report.issues }, null, 2));
  if (report.issues.length) process.exitCode = 1;
}

main().catch(async (error) => {
  report.status = "FAIL";
  report.issues.push({ name: "runner", status: "FAIL", note: error?.stack || String(error) });
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(report, null, 2), "utf8");
  console.error(error);
  process.exitCode = 1;
});
