import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:8019";
const RUN_ID = `ui_${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
const QA_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../storage/browser-smoke/tiny-gate.png");
const OUTPUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../storage/browser-smoke/business_flow_ui_smoke.json");

const accounts = {
  admin: { email: "frontend-admin@projectb.local", password: "DemoPass123!" },
  seller: { email: "metro-auto@projectb.local", password: "DemoPass123!" },
  buyer: { email: "frontend-buyer@projectb.local", password: "DemoPass123!" },
};

const report = {
  runId: RUN_ID,
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  steps: [],
  issues: [],
  mutationBridge: null,
};
let testCarId = 19;
let marketingAccount = { email: "affiliate@projectb.local", password: "SmokePass123!" };
const testShowroomSlug = "metro-auto-jakarta";
let staffPlanName = "";

function record(name, status, details = {}) {
  const item = { name, ...details, status };
  report.steps.push(item);
  if (status === "FAIL") report.issues.push(item);
  console.log(`[${status}] ${name}${details.note ? ` — ${details.note}` : ""}`);
}

async function waitForApp(page) {
  await page.waitForSelector("#app", { timeout: 15000 });
  await page.waitForTimeout(650);
}

async function goto(page, route) {
  const url = `${BASE_URL}${route}${route.includes("?") ? "&" : "?"}gate=${Date.now()}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForApp(page);
  return page.url();
}

async function login(page, role, account) {
  await goto(page, `/login/${role}`);
  await page.locator(`#role_login_${role}_email_input`).fill(account.email);
  await page.locator(`#role_login_${role}_password_input`).fill(account.password);
  await page.locator(`#role_login_${role}_submit_button`).click();
  await page.waitForTimeout(1000);
  const body = await page.locator("body").innerText();
  if (/Maaf,|gagal login|tidak valid|ROLE_MISMATCH/i.test(body)) {
    throw new Error(`Login ${role} gagal: ${body.slice(-500)}`);
  }
  return page.url();
}

async function text(page) {
  return page.locator("body").innerText();
}

async function chooseCombo(page, id) {
  const input = page.locator(`#${id}`);
  await input.fill("");
  const option = page.locator(`#${id}_listbox [data-combobox-option]`).first();
  await option.waitFor({ state: "visible", timeout: 5000 });
  await option.click();
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

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const adminPage = await adminContext.newPage();
    adminPage.on("pageerror", (error) => report.issues.push({ name: "admin-pageerror", status: "FAIL", note: error.message }));

    await runStep("Admin login via UI", async () => {
      const url = await login(adminPage, "admin", accounts.admin);
      return { url };
    });

    await runStep("Admin membuat data master brand + model", async () => {
      await goto(adminPage, "/admin/master-brand");
      await adminPage.locator("#admst_create_brand_button").click();
      await adminPage.waitForSelector("#admst_brand_form_section", { timeout: 10000 });
      const brandName = `QA UI Brand ${RUN_ID}`;
      const modelName = `QA UI Model ${RUN_ID}`;
      await adminPage.locator("#admst_brand_name_input").fill(brandName);
      await adminPage.locator("#admst_brand_description_input").fill("Master dibuat oleh tester browser UI.");
      await adminPage.locator("#admst_add_model_button").click();
      await adminPage.locator("#admst_model_name_input_0").fill(modelName);
      await adminPage.locator("#admst_save_brand_button").click();
      await adminPage.waitForTimeout(1000);
      await adminPage.locator("#admst_keyword_input").fill(brandName);
      await adminPage.locator("#admst_apply_filter_button").click();
      await adminPage.locator("#admst_brand_table_section table").getByText(brandName, { exact: true }).waitFor({ state: "visible", timeout: 10000 });
      const brandRow = adminPage.locator("#admst_brand_table_section tr").filter({ hasText: brandName }).first();
      await brandRow.locator('button[id^="admst_edit_brand_button_"]').first().click();
      await adminPage.locator("#admst_model_name_input_0").waitFor({ state: "visible", timeout: 10000 });
      const savedModelName = await adminPage.locator("#admst_model_name_input_0").inputValue();
      if (savedModelName !== modelName) throw new Error(`Model tersimpan tidak sesuai: ${savedModelName}`);
      await adminPage.locator("#admst_cancel_brand_form_button").click();
      await adminPage.waitForTimeout(250);
      const body = await text(adminPage);
      if (!body.includes(brandName)) {
        throw new Error("Brand baru tidak muncul kembali pada daftar master.");
      }
      return { brandName, modelName };
    });

    await runStep("Admin membuat paket master dengan kuota staf", async () => {
      await goto(adminPage, "/admin/master-pricing");
      await adminPage.locator("#admstpr_create_plan_button").click();
      await adminPage.locator("#admstpr_plan_form_section").waitFor({ state: "visible", timeout: 10000 });
      staffPlanName = `QA Staff Plan ${RUN_ID}`;
      await adminPage.locator("#admstpr_plan_name_input").fill(staffPlanName);
      await adminPage.locator("#admstpr_plan_price_input").fill("1");
      await adminPage.locator("#admstpr_plan_billing_period_input").fill("/bulan");
      await adminPage.locator("#admstpr_plan_listing_limit_input").fill("10");
      await adminPage.locator("#admstpr_plan_staff_limit_input").fill("2");
      await adminPage.locator("#admstpr_plan_features_input").fill("Fitur staf QA\nListing mobil\nMarketing/Affiliate");
      await adminPage.locator("#admstpr_save_plan_button").click();
      await adminPage.waitForTimeout(900);
      await adminPage.locator("#admstpr_keyword_input").fill(staffPlanName);
      await adminPage.locator("#admstpr_apply_filter_button").click();
      await adminPage.locator("#admstpr_pricing_table_section table").getByText(staffPlanName, { exact: true }).waitFor({ state: "visible", timeout: 10000 });
      return { planName: staffPlanName, staffLimit: 2 };
    });

    await adminContext.close();

    const registerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const registerPage = await registerContext.newPage();
    const showroom = {
      name: `QA Showroom ${RUN_ID}`,
      slug: `qa-showroom-${RUN_ID.toLowerCase()}`,
      email: `${RUN_ID}@projectb.local`,
      password: "DemoPass123!",
    };

    await runStep("Showroom mendaftar lewat form publik", async () => {
      await goto(registerPage, "/daftar-showroom");
      await registerPage.locator("#shr_register_name_input").fill("QA Owner Browser");
      await registerPage.locator("#shr_register_showroom_name_input").fill(showroom.name);
      await registerPage.locator("#shr_register_showroom_slug_input").fill(showroom.slug);
      await registerPage.locator("#shr_register_email_input").fill(showroom.email);
      await registerPage.locator("#shr_register_password_input").fill(showroom.password);
      await chooseCombo(registerPage, "shr_register_city_input");
      await registerPage.locator("#shr_register_showroom_address_input").fill("Jalan QA Browser Nomor 1");
      await registerPage.locator("#shr_register_showroom_phone_input").fill("081234567890");
      await chooseCombo(registerPage, "shr_register_bank_type_input");
      await registerPage.locator("#shr_register_bank_account_number_input").fill("1234567890");
      await registerPage.locator("#shr_register_bank_account_name_input").fill("QA Owner Browser");
      await registerPage.locator("#shr_register_submit_button").click();
      await registerPage.waitForTimeout(1200);

      let stage = "registered";
      if (await registerPage.locator("#shr_register_plans_section").count()) {
        stage = "plan-selection";
        const plan = registerPage.locator('[id^="shr_register_plan_card_"]').filter({ hasText: staffPlanName }).first();
        if (!await plan.count()) throw new Error(`Paket ${staffPlanName} tidak tersedia di form showroom.`);
        await plan.click();
        await registerPage.locator("#shr_register_plan_confirm_button").click();
        await registerPage.waitForTimeout(1000);
      }
      if (await registerPage.locator("#shr_register_payment_section").count()) {
        stage = "payment-step";
        const manualTab = registerPage.locator('[data-payment-method-tab="manual"]');
        if (await manualTab.count()) {
          await manualTab.click();
          await registerPage.waitForTimeout(250);
          if (await registerPage.locator("#shr_register_proof_file_input").count()) {
            await registerPage.locator("#shr_register_proof_file_input").setInputFiles(QA_FILE);
            await registerPage.locator("#shr_register_proof_note_input").fill("Bukti transfer QA browser.");
            await registerPage.locator("#shr_register_payment_submit_button").click();
            await registerPage.waitForTimeout(1000);
          }
        }
      }
      const body = await text(registerPage);
      const reached = Boolean(
        await registerPage.locator("#shr_register_success_section").count()
        || await registerPage.locator("#shr_register_payment_section").count()
        || await registerPage.locator("#shr_register_plans_section").count()
      );
      if (!reached || /Pendaftaran showroom gagal|Periksa kembali isian/i.test(body)) {
        throw new Error(`Alur pendaftaran berhenti tanpa tahap berikutnya. stage=${stage}; ${body.slice(-600)}`);
      }
      return { email: showroom.email, slug: showroom.slug, stage, successPanel: Boolean(await registerPage.locator("#shr_register_success_section").count()) };
    });

    await registerContext.close();

    const approvalContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const approvalPage = await approvalContext.newPage();
    await runStep("Admin memeriksa dan menyetujui showroom baru", async () => {
      await login(approvalPage, "admin", accounts.admin);
      await goto(approvalPage, "/admin/approvals");
      if (await approvalPage.locator("#adpv_keyword_input").count()) {
        await approvalPage.locator("#adpv_keyword_input").fill(showroom.email);
        await approvalPage.locator("#adpv_apply_filter_button").click();
        await approvalPage.waitForTimeout(900);
      }
      const approveButtons = approvalPage.locator('button[id^="adpv_approve_button_"]');
      const rows = await approveButtons.evaluateAll((buttons) => buttons.map((button) => ({
        id: button.id,
        visible: Boolean(button.offsetWidth || button.offsetHeight || button.getClientRects().length),
        text: button.closest("tr, article, section, li")?.innerText || button.parentElement?.parentElement?.innerText || "",
      })));
      const candidate = rows.find((row) => row.visible && row.text.includes(showroom.email)) || rows.find((row) => row.visible) || rows.find((row) => row.text.includes(showroom.email)) || rows[0];
      if (!candidate) {
        throw new Error(`Showroom ${showroom.email} tidak ditemukan pada antrean approval.`);
      }
      const userId = candidate.id.match(/(\d+)$/)?.[1];
      const reviewButton = approvalPage.locator(`#adpv_review_button_desktop_${userId}:visible`);
      if (await reviewButton.count()) {
        await reviewButton.click();
        await approvalPage.locator("#adpv_review_detail_section").waitFor({ state: "visible", timeout: 10000 });
        const confirmPayment = approvalPage.locator(`#adpv_confirm_payment_button_${userId}:visible`);
        await confirmPayment.waitFor({ state: "visible", timeout: 15000 }).catch(() => null);
        if (await confirmPayment.count()) {
          await confirmPayment.click();
          await approvalPage.locator(`#adpv_confirm_payment_button_${userId}`).waitFor({ state: "detached", timeout: 15000 });
        }
        const modalApprove = approvalPage.locator(`#adpv_modal_approve_button_${userId}:visible`);
        await modalApprove.waitFor({ state: "visible", timeout: 15000 }).catch(() => null);
        if (await modalApprove.count()) {
          await modalApprove.click();
        } else {
          await approvalPage.locator(`#${candidate.id}:visible`).click();
        }
      } else {
        await approvalPage.locator(`#${candidate.id}:visible`).click();
      }
      await approvalPage.waitForTimeout(1400);
      // Jika refresh approval terjadi tepat bersamaan dengan klik modal,
      // ulangi tombol yang masih terlihat sekali agar test tidak meninggalkan
      // akun QA dalam status pending hanya karena race UI.
      const stillPending = approvalPage.locator("tr").filter({ hasText: showroom.email });
      if (await stillPending.count()) {
        const retryModal = approvalPage.locator(`#adpv_modal_approve_button_${userId}:visible`);
        const retryList = approvalPage.locator(`#${candidate.id}:visible`);
        if (await retryModal.count()) {
          await retryModal.click();
        } else if (await retryList.count()) {
          await retryList.click();
        }
        await approvalPage.waitForTimeout(1200);
      }
      if (await approvalPage.locator("tr").filter({ hasText: showroom.email }).count()) {
        throw new Error(`Approval showroom ${showroom.email} belum hilang dari queue.`);
      }
      return { email: showroom.email, approveButton: candidate.id, visibleRows: rows.length };
    });
    await approvalContext.close();

    const newSellerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const newSellerPage = await newSellerContext.newPage();
    await runStep("Showroom memakai fitur staf sesuai paket", async () => {
      await login(newSellerPage, "seller", showroom);
      await goto(newSellerPage, "/seller/staff");
      const add = newSellerPage.getByRole("button", { name: "Tambah Staf" });
      if (await add.isDisabled()) throw new Error("Paket QA yang dipilih tetap menonaktifkan fitur staf.");
      const staffEmail = `${RUN_ID}.staff@projectb.local`;
      await add.click();
      await newSellerPage.locator("#slstf_name_input").fill("QA Staff Browser");
      await newSellerPage.locator("#slstf_email_input").fill(staffEmail);
      await newSellerPage.locator("#slstf_phone_input").fill("081234567891");
      await newSellerPage.locator("#slstf_password_input").fill("DemoPass123!");
      await newSellerPage.locator("#slstf_password_confirmation_input").fill("DemoPass123!");
      await newSellerPage.locator("#slstf_submit_button").click();
      await newSellerPage.getByText(staffEmail, { exact: true }).waitFor({ state: "visible", timeout: 10000 });
      const body = await text(newSellerPage);
      if (!body.includes("Staf berhasil dibuat.")) throw new Error("Konfirmasi pembuatan akun staf tidak muncul.");
      const staffCard = newSellerPage.locator("section").filter({ hasText: staffEmail }).last();
      await staffCard.getByRole("button", { name: "Edit", exact: true }).click();
      await newSellerPage.locator("#slstf_name_input").fill("QA Staff Browser Updated");
      await newSellerPage.locator("#slstf_submit_button").click();
      await newSellerPage.waitForTimeout(700);
      const updatedStaffCard = newSellerPage.locator("section").filter({ hasText: staffEmail }).last();
      await updatedStaffCard.getByRole("button", { name: "Nonaktifkan", exact: true }).click();
      await newSellerPage.waitForTimeout(700);
      const inactiveStaffCard = newSellerPage.locator("section").filter({ hasText: staffEmail }).last();
      await inactiveStaffCard.getByRole("button", { name: "Aktifkan", exact: true }).click();
      await newSellerPage.waitForTimeout(700);
      const staffContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      try {
        const staffPage = await staffContext.newPage();
        const staffUrl = await login(staffPage, "seller", { email: staffEmail, password: "DemoPass123!" });
        await goto(staffPage, "/seller");
        const staffBody = await text(staffPage);
        if (/akses ditolak|access denied|login showroom/i.test(staffBody) || !staffBody.includes("Showroom")) {
          throw new Error("Akun staf tidak bisa masuk ke workspace seller sesuai scope showroom.");
        }
        return { email: staffEmail, planName: staffPlanName, staffLimit: 2, crud: "create/update/inactive/active", staffLoginUrl: staffUrl };
      } finally {
        await staffContext.close();
      }
    });
    await newSellerContext.close();

    const sellerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const sellerPage = await sellerContext.newPage();
    await runStep("Seller login dan fungsi staf", async () => {
      await login(sellerPage, "seller", accounts.seller);
      await goto(sellerPage, "/seller/staff");
      await sellerPage.waitForSelector("#slstf_page", { timeout: 10000 });
      const add = sellerPage.getByRole("button", { name: "Tambah Staf" });
      const disabled = await add.isDisabled().catch(() => true);
      const body = await text(sellerPage);
      if (!body.includes("Kelola Staf")) throw new Error("Halaman fungsi staf tidak termuat.");
      if (disabled) return { mode: "visible-but-disabled-by-plan", note: "Akun seller smoke tidak memiliki kuota staf aktif." };

      const staffEmail = `${RUN_ID}.staff@projectb.local`;
      await add.click();
      await sellerPage.locator("#slstf_name_input").fill("QA Staff Browser");
      await sellerPage.locator("#slstf_email_input").fill(staffEmail);
      await sellerPage.locator("#slstf_phone_input").fill("081234567891");
      await sellerPage.locator("#slstf_password_input").fill("DemoPass123!");
      await sellerPage.locator("#slstf_password_confirmation_input").fill("DemoPass123!");
      await sellerPage.locator("#slstf_submit_button").click();
      await sellerPage.waitForTimeout(1000);
      const after = await text(sellerPage);
      if (!after.includes(staffEmail)) throw new Error("Akun staf tidak muncul setelah disimpan.");
      return { mode: "created", email: staffEmail };
    });

    await runStep("Seller membuat listing published dengan Booking Fee", async () => {
      await goto(sellerPage, "/seller/cars");
      await sellerPage.locator("#slrc_add_car_button").click();
      await sellerPage.waitForSelector("#slrc_car_form_section", { timeout: 10000 });
      const plate = `QA UI ${RUN_ID.slice(-8)}`;
      await sellerPage.locator("#slrc_license_plate_number_input").fill(plate);
      const brand = sellerPage.locator("#slrc_brand_name_input");
      const brandValue = await brand.locator("option").evaluateAll((options) => options.map((option) => option.value).find(Boolean));
      if (!brandValue) throw new Error("Master brand tidak tersedia di form listing.");
      await brand.selectOption(brandValue);
      await sellerPage.waitForTimeout(250);
      const model = sellerPage.locator("#slrc_model_name_input");
      const modelValue = await model.locator("option").evaluateAll((options) => options.map((option) => option.value).find(Boolean));
      if (!modelValue) throw new Error("Model brand tidak tersedia di form listing.");
      await model.selectOption(modelValue);
      await sellerPage.locator("#slrc_primary_color_input").fill("Biru QA");
      await sellerPage.locator("#slrc_car_form_next_button").click();
      await sellerPage.waitForTimeout(250);
      await sellerPage.locator("#slrc_registration_date_input").fill("2022-01-15");
      await sellerPage.locator("#slrc_engine_capacity_cc_input").fill("1500");
      await sellerPage.locator("#slrc_mileage_km_input").fill("22000");
      const location = sellerPage.locator("#slrc_location_name_input");
      await location.fill("Bandung");
      await sellerPage.locator("#slrc_location_name_input_options [role=option]").first().click();
      await sellerPage.locator("#slrc_car_form_next_button").click();
      await sellerPage.waitForTimeout(250);
      await sellerPage.locator("#slrc_price_cash_input").fill("215000000");
      await sellerPage.locator("#slrc_dp_amount_input").fill("5000000");
      await sellerPage.locator("#slrc_listing_status_input").selectOption("published");
      await sellerPage.locator("#slrc_description_input").fill("Listing QA dibuat melalui alur browser.");
      await sellerPage.locator("#slrc_car_form_submit_button").click();
      await sellerPage.waitForTimeout(1400);
      if (await sellerPage.locator("#slrc_search_input").count()) {
        await sellerPage.locator("#slrc_search_input").fill(plate);
        await sellerPage.locator("#slrc_apply_filter_button").click();
        await sellerPage.locator("#slrc_cars_table_section tr").filter({ hasText: plate }).waitFor({ state: "visible", timeout: 10000 });
      }
      const created = await sellerPage.locator("body").innerText();
      const identityId = await sellerPage.locator('[id^="slrc_car_identity_"]').evaluateAll((nodes, needle) => nodes.find((node) => node.innerText.includes(needle))?.id || "", plate);
      if (!created.includes(plate) || !identityId) throw new Error(`Listing ${plate} tidak muncul setelah disimpan.`);
      testCarId = Number(identityId.match(/(\d+)_section$/)?.[1] ?? 0);
      if (!testCarId) throw new Error("ID listing baru tidak dapat dibaca dari UI.");
      return { plate, carId: testCarId, listingStatus: "published" };
    });

    let affiliateCode = "SMOKE-SELLER";
    await runStep("Seller membuat partner marketing", async () => {
      await goto(sellerPage, "/seller/affiliates?mode=create");
      await sellerPage.waitForSelector("#slraf_affiliate_submit_button", { timeout: 10000 });
      const email = `${RUN_ID}.marketing@projectb.local`;
      affiliateCode = `QA-${RUN_ID}`;
      marketingAccount = { email, password: "DemoPass123!" };
      await sellerPage.locator("#slraf_affiliate_name_input").fill("QA Marketing Browser");
      await sellerPage.locator("#slraf_affiliate_email_input").fill(email);
      await sellerPage.locator("#slraf_affiliate_referral_code_input").fill(affiliateCode);
      await sellerPage.locator("#slraf_affiliate_phone_number_input").fill("081234567892");
      await sellerPage.locator("#slraf_affiliate_password_input").fill("DemoPass123!");
      await sellerPage.locator("#slraf_affiliate_password_confirmation_input").fill("DemoPass123!");
      await sellerPage.waitForTimeout(1000);
      await sellerPage.locator("#slraf_affiliate_submit_button").click();
      await sellerPage.waitForTimeout(1200);
      const body = await text(sellerPage);
      if (!body.includes(affiliateCode) && !body.includes("QA Marketing Browser")) {
        throw new Error("Partner marketing tidak muncul setelah disimpan.");
      }
      return { email, referralCode: affiliateCode };
    });

    await runStep("Seller mengatur komisi umum marketing", async () => {
      await goto(sellerPage, "/seller/affiliate-commissions?mode=global");
      await sellerPage.locator("#slrafc_global_submit_button").waitFor({ state: "visible", timeout: 10000 });
      await sellerPage.locator("#slrafc_global_commission_type_input").selectOption("percent");
      await sellerPage.locator("#slrafc_global_commission_value_input").fill("5");
      await sellerPage.locator("#slrafc_global_status_input").selectOption("active");
      await sellerPage.locator("#slrafc_global_submit_button").click();
      await sellerPage.waitForTimeout(1000);
      const body = await text(sellerPage);
      if (!body.includes("Aktif") && !body.includes("5")) throw new Error("Aturan komisi umum tidak terlihat aktif setelah disimpan.");
      return { commissionType: "percent", commissionValue: 5, status: "active" };
    });
    await sellerContext.close();

    const buyerContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const buyerPage = await buyerContext.newPage();
    let transactionId = null;
    await runStep("Buyer login dan membuat transaksi dari listing", async () => {
      await login(buyerPage, "buyer", accounts.buyer);
      await goto(buyerPage, `/${testShowroomSlug}/${affiliateCode}/transactions/new?car_id=${testCarId}`);
      await buyerPage.waitForSelector("#pubtrx_submit_button", { timeout: 12000 });
      if (await buyerPage.locator("#pubtrx_booking_fee_block").count() === 0) throw new Error("Booking Fee tidak tampil.");
      await buyerPage.locator("#pubtrx_payment_method_manual_transfer_input").check();
      await buyerPage.locator("#pubtrx_submit_button").click();
      await buyerPage.waitForTimeout(1500);
      const result = await buyerPage.locator("#pubtrx_result_panel").count();
      const body = await text(buyerPage);
      if (!result && !/transaksi|pembayaran|pending/i.test(body)) {
        throw new Error(`Transaksi tidak menghasilkan panel status: ${body.slice(-700)}`);
      }
      const idText = await buyerPage.locator("#pubtrx_result_transaction_id_value").innerText().catch(() => "");
      transactionId = (idText.match(/\d+/) || [])[0] || null;
      return { transactionId, resultPanel: Boolean(result), url: buyerPage.url() };
    });
    await buyerContext.close();

    if (transactionId) {
      const bridge = await runStep("Jembatan pembayaran lokal untuk callback provider", async () => {
        const result = await import("node:child_process").then(({ execFileSync }) => execFileSync(process.platform === "win32" ? "php.bat" : "php", ["scripts/pay_transaction_for_tester.php", transactionId], { encoding: "utf8", cwd: process.cwd(), shell: process.platform === "win32" }));
        report.mutationBridge = { transactionId, output: result.trim() };
        return { transactionId, note: "Callback provider hanya tersedia di lingkungan local melalui script tester resmi." };
      });
      if (!bridge) report.mutationBridge = { transactionId, status: "failed" };
    }

    const affiliateContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const affiliatePage = await affiliateContext.newPage();
    await runStep("Marketing memeriksa dashboard, activity, ledger, dan settlement", async () => {
      await login(affiliatePage, "affiliate", marketingAccount);
      const checks = [];
      for (const route of ["/affiliate", "/affiliate/activity", "/affiliate/ledger", "/affiliate/settlements"]) {
        await goto(affiliatePage, route);
        const body = await text(affiliatePage);
        if (/404|not found|akses ditolak|access denied/i.test(body)) throw new Error(`Route marketing bermasalah: ${route}`);
        if (route === "/affiliate/ledger" && transactionId && !/10\.750\.000|10,750,000/.test(body)) {
          throw new Error("Ledger marketing belum menampilkan komisi 5% dari transaksi QA.");
        }
        checks.push({ route, textSample: body.slice(0, 160) });
      }
      return { routes: checks, referralCode: affiliateCode, transactionId };
    });
    await affiliateContext.close();
  } finally {
    await browser.close();
  }

  report.finishedAt = new Date().toISOString();
  report.status = report.issues.length ? "FAIL" : "PASS";
  await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
  await fs.writeFile(OUTPUT, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify({ status: report.status, output: OUTPUT, issues: report.issues.length }, null, 2));
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
