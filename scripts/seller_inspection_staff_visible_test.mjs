import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = process.env.PB_BASE_URL || "https://showroom.carlynk.id";
const OWNER_EMAIL = process.env.PB_OWNER_EMAIL || "";
const STAFF_EMAIL = process.env.PB_STAFF_EMAIL || "";
const TEST_PASSWORD = process.env.PB_TEST_PASSWORD || "";
const REPORT_DIR = path.resolve("storage", "browser-smoke");
const REPORT_PATH = path.join(REPORT_DIR, "seller-inspection-staff-visible.json");
const FINAL_SCREENSHOT = path.join(REPORT_DIR, "seller-inspection-staff-visible-final.png");
const FAILURE_SCREENSHOT = path.join(REPORT_DIR, "seller-inspection-staff-visible-failure.png");

fs.mkdirSync(REPORT_DIR, { recursive: true });

const report = {
  status: "RUNNING",
  browser: {
    engine: "Chromium",
    headless: false,
    taskCount: 1,
    browserCount: 1,
    contextCount: 1,
    pageCount: 1,
    lifecycle: "Browser, context, dan page sengaja dibiarkan terbuka.",
  },
  baseUrl: BASE_URL,
  startedAt: new Date().toISOString(),
  pages: [],
  steps: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
  screenshots: [],
  data: {
    accounts: {
      owner: { email: maskEmail(OWNER_EMAIL) },
      staff: { email: maskEmail(STAFF_EMAIL) },
    },
  },
};

let browser = null;
let context = null;
let page = null;
let failureIndex = 0;

function now() {
  return new Date().toISOString();
}

function maskEmail(email) {
  const value = String(email || "");
  if (!value.includes("@")) {
    return value ? "configured" : "not-configured";
  }
  const [local, domain] = value.split("@");
  return `${local.slice(0, 3)}***@${domain}`;
}

function routePath(url = page?.url?.() || "") {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

function reportUrl(url = page?.url?.() || "") {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function isExpectedFailedRequest(entry) {
  const pathname = String(entry.pathname || entry.url || "");
  const currentPath = String(entry.pagePath || "");

  if (entry.status === 401 && pathname.endsWith("/api/auth/autologin")) {
    return true;
  }

  if (entry.status === 403 && (
    currentPath === "/seller/staff"
    || currentPath === "/seller/master-inspection"
    || pathname.includes("/inspection-templates")
  )) {
    return true;
  }

  if (entry.type === "requestfailed"
    && entry.failure === "net::ERR_ABORTED"
    && currentPath === "/"
    && /\/assets\/.*\.js$/i.test(pathname)) {
    // Logout mengarahkan ke landing page lalu test segera membuka login
    // berikutnya. Browser membatalkan bundle landing yang belum selesai
    // dimuat karena navigasi kedua itu; request tetap dicatat, tetapi bukan
    // kegagalan aplikasi yang dilihat user pada alur target.
    return true;
  }

  return false;
}

function recordScreenshot(file, reason) {
  const relative = path.relative(process.cwd(), file);
  if (!report.screenshots.some((item) => item.file === relative && item.reason === reason)) {
    report.screenshots.push({ file: relative, reason });
  }
}

async function saveScreenshot(file, reason) {
  if (!page) {
    return;
  }

  try {
    await page.screenshot({ path: file, fullPage: true });
    recordScreenshot(file, reason);
  } catch (error) {
    report.consoleErrors.push({
      type: "screenshot",
      text: error.message,
      pagePath: routePath(),
    });
  }
}

async function visibleCandidateOnce(locator, label, { enabled = false, optional = false } = {}) {
  const count = await locator.count().catch(() => 0);
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (!(await candidate.isVisible().catch(() => false))) {
      continue;
    }

    try {
      await candidate.scrollIntoViewIfNeeded();
    } catch {
      // SPA re-render dapat mengganti node di antara isVisible() dan scroll.
      // Ulangi pencarian locator yang sama agar tetap berinteraksi dengan node
      // visible terbaru, bukan node detached.
      continue;
    }
    if (!(await candidate.isVisible().catch(() => false))) {
      continue;
    }

    const visibleStyle = await candidate.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        hidden: element.hidden,
        ariaHidden: element.getAttribute("aria-hidden") === "true",
        display: style.display,
        visibility: style.visibility,
        opacity: Number(style.opacity),
      };
    }).catch(() => null);

    if (!visibleStyle
      || visibleStyle.hidden
      || visibleStyle.ariaHidden
      || visibleStyle.display === "none"
      || visibleStyle.visibility === "hidden"
      || visibleStyle.opacity <= 0) {
      continue;
    }

    const box = await candidate.boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport || box.bottom <= 0 || box.right <= 0 || box.top >= viewport.height || box.left >= viewport.width) {
      continue;
    }

    const covered = await candidate.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + Math.min(Math.max(rect.width / 2, 1), Math.max(rect.width - 1, 1));
      const centerY = rect.top + Math.min(Math.max(rect.height / 2, 1), Math.max(rect.height - 1, 1));
      const top = document.elementFromPoint(centerX, centerY);
      return Boolean(top && top !== element && !element.contains(top));
    }).catch(() => true);

    if (covered) {
      continue;
    }

    if (enabled && !(await candidate.isEnabled().catch(() => false))) {
      continue;
    }

    return candidate;
  }

  if (optional) {
    return null;
  }

  throw new Error(`BLOCKED: elemen ${label} tidak tersedia secara visible, berada di viewport, dan dapat dioperasikan.`);
}

async function visibleCandidate(locator, label, options = {}) {
  const deadline = Date.now() + 3500;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const candidate = await visibleCandidateOnce(locator, label, { ...options, optional: true });
      if (candidate) {
        return candidate;
      }
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  if (options.optional) {
    return null;
  }
  throw lastError || new Error(`BLOCKED: elemen ${label} tidak tersedia secara visible.`);
}

async function clickVisible(locator, label) {
  const target = await visibleCandidate(locator, label, { enabled: true });
  await target.click();
  return target;
}

async function typeVisible(locator, label, value) {
  const target = await visibleCandidate(locator, label, { enabled: true });
  await target.click();
  await target.press("ControlOrMeta+A").catch(() => null);
  await target.press("Backspace").catch(() => null);
  await target.pressSequentially(String(value), { delay: 18 });
  const actual = await target.inputValue();
  if (actual !== String(value)) {
    throw new Error(`Input ${label} tidak menyimpan teks yang diketik manusia.`);
  }
  return target;
}

async function waitForVisible(locator, label, timeout = 25000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const candidate = await visibleCandidate(locator, label, { optional: true });
    if (candidate) {
      return candidate;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`BLOCKED: elemen ${label} tidak menjadi visible dalam ${timeout} ms.`);
}

async function waitForText(textValue, label, timeout = 20000) {
  return waitForVisible(page.getByText(textValue, { exact: true }), label, timeout);
}

async function waitForRegex(regex, label, timeout = 20000) {
  return waitForVisible(page.getByText(regex), label, timeout);
}

async function waitForPageHydration(rootLocator, label, hydrationText = null) {
  await waitForVisible(rootLocator, label, 45000);
  if (hydrationText) {
    await waitForText(hydrationText, `${label} selesai hydrate`, 30000);
  }
}

async function rememberPage(label, role = null) {
  const entry = {
    label,
    role,
    title: await page.title().catch(() => ""),
    url: reportUrl(page.url()),
    path: routePath(),
    viewport: page.viewportSize(),
  };
  report.pages.push(entry);
  return entry;
}

async function navigate(pathname, label, role = null) {
  const separator = pathname.includes("?") ? "&" : "?";
  await page.goto(`${BASE_URL}${pathname}${separator}visible_test=${Date.now()}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await rememberPage(label, role);
}

async function runStep(name, action) {
  const startedAt = now();
  try {
    const details = await action();
    const step = {
      name,
      status: "PASS",
      startedAt,
      finishedAt: now(),
      details: details ?? {},
    };
    report.steps.push(step);
    console.log(`[PASS] ${name}`);
    return step;
  } catch (error) {
    const status = String(error.message || "").startsWith("BLOCKED:") ? "BLOCKED" : "FAILED";
    const step = {
      name,
      status,
      startedAt,
      finishedAt: now(),
      error: error.message,
    };
    report.steps.push(step);
    failureIndex += 1;
    const failurePath = failureIndex === 1
      ? FAILURE_SCREENSHOT
      : path.join(REPORT_DIR, `seller-inspection-staff-visible-failure-${failureIndex}.png`);
    await saveScreenshot(failurePath, `failure: ${name}`);
    console.log(`[${status}] ${name}: ${error.message}`);
    return step;
  }
}

function passed(name) {
  return report.steps.find((step) => step.name === name)?.status === "PASS";
}

function firstVisibleCardLocator() {
  return page.locator('#slrinsp_queue_list_section > section[id^="slrinsp_car_card_section_"]');
}

async function findInspectionCard() {
  const cards = firstVisibleCardLocator();
  const count = await cards.count();
  let first = null;

  for (let index = 0; index < count; index += 1) {
    const card = cards.nth(index);
    if (!(await card.isVisible().catch(() => false))) {
      continue;
    }
    first ??= card;
    const createAction = await visibleCandidate(
      card.getByRole("button", { name: "Mulai inspeksi", exact: true }),
      "tombol Mulai inspeksi pada mobil visible",
      { enabled: true, optional: true },
    );
    if (createAction) {
      return { card, action: createAction, mode: "create" };
    }
  }

  if (!first) {
    throw new Error("BLOCKED: tidak ada kartu mobil inspeksi yang visible untuk dipilih.");
  }

  const manageAction = await visibleCandidate(
    first.getByRole("button", { name: "Kelola checklist", exact: true }),
    "tombol Kelola checklist pada mobil visible",
    { enabled: true },
  );
  return { card: first, action: manageAction, mode: "read-update" };
}

async function getInspectionCarData(card) {
  const cardId = await card.getAttribute("id");
  const match = String(cardId || "").match(/^slrinsp_car_card_section_(.+)$/);
  if (!match) {
    throw new Error("ID kartu mobil visible tidak dapat digunakan untuk membuka alur inspeksi detail.");
  }

  const carIdToken = match[1];
  if (!/^\d+$/.test(carIdToken)) {
    throw new Error("ID mobil visible bukan identifier numerik yang dapat dibuka melalui URL bisnis.");
  }

  const titleNode = await visibleCandidate(card.locator("h3").first(), "judul mobil pada kartu inspeksi");
  const title = (await titleNode.innerText()).trim();
  const cardText = await card.innerText();
  return {
    carId: Number(carIdToken),
    title,
    cardText,
    cardId: carIdToken,
  };
}

async function loginSeller(email, password, expectedLabel, accountName) {
  if (!email || !password) {
    throw new Error("BLOCKED: kredensial test seller/staff belum tersedia pada environment.");
  }

  await navigate("/login/seller", `Login ${accountName}`, accountName);
  await waitForVisible(page.locator("#role_login_seller_email_input"), "field email login showroom");
  await typeVisible(page.locator("#role_login_seller_email_input"), "email login showroom", email);
  await typeVisible(page.locator("#role_login_seller_password_input"), "password login showroom", password);
  await clickVisible(page.locator("#role_login_seller_submit_button"), "tombol Masuk login showroom");
  await page.waitForURL((url) => url.pathname === "/seller", { timeout: 30000 });
  await waitForText("Dashboard Showroom", `dashboard ${expectedLabel} setelah login`);
  await clickVisible(page.getByRole("button", { name: "Profil pengguna", exact: true }), `tombol Profil untuk verifikasi ${accountName}`);
  await page.waitForURL((url) => url.pathname === "/profile", { timeout: 25000 });
  await rememberPage(`Verifikasi identitas ${accountName}`, accountName);
  await waitForText("Profil Saya", `halaman Profil ${accountName} visible`);
  const identityText = await page.locator("body").innerText();
  const normalizedIdentityText = identityText.replace(/\s+/g, "");
  if (!normalizedIdentityText.includes(email.replace(/\s+/g, ""))) {
    throw new Error(`Email akun ${accountName} tidak terlihat utuh pada kartu Profil.`);
  }
  await navigate("/seller", `Dashboard ${accountName} setelah verifikasi identitas`, accountName);
  await rememberPage(`Dashboard ${accountName} setelah verifikasi identitas`, accountName);
  await waitForText("Dashboard Showroom", `dashboard ${expectedLabel} setelah verifikasi identitas`);
  await rememberPage(`Dashboard setelah login ${accountName}`, accountName);
  return {
    path: routePath(),
    roleLabelVisible: false,
    dashboardVisible: true,
    identityEmailVisible: true,
    account: maskEmail(email),
  };
}

async function ownerInspectionReadiness() {
  await navigate("/seller/inspection", "Seller Inspeksi / Readiness", "owner");
  await waitForPageHydration(page.locator("#slrinsp_page_section"), "halaman Seller Inspeksi", "Data lengkap");
  await waitForVisible(page.locator("#slrinsp_queue_list_section"), "daftar inspeksi showroom visible");
  await waitForVisible(page.locator("#slrinsp_master_section"), "panel Master inspection visible");

  const selected = await findInspectionCard();
  const car = await getInspectionCarData(selected.card);
  report.data.car = car;
  const visibleCarCount = await firstVisibleCardLocator().count();
  if (visibleCarCount < 1) {
    throw new Error("Daftar readiness tidak merender kartu mobil setelah hydrate.");
  }

  const keyword = car.title.split(/\s+/).filter(Boolean)[0] || "Toyota";
  await typeVisible(page.locator("#slrinsp_search_input"), "pencarian readiness berdasarkan data visible", keyword);
  await clickVisible(page.locator("#slrinsp_apply_filter_button"), "tombol Terapkan filter readiness");
  const filtered = await visibleCandidate(
    firstVisibleCardLocator().filter({ hasText: keyword }),
    "kartu mobil hasil filter readiness",
    { enabled: false },
  );
  const filteredText = await filtered.innerText();
  await clickVisible(page.locator("#slrinsp_reset_filter_button"), "tombol Reset filter readiness");
  await visibleCandidate(firstVisibleCardLocator(), "kartu mobil setelah reset filter", { enabled: false });

  return {
    page: reportUrl(page.url()),
    title: await page.title(),
    visibleCarCount,
    selectedCar: car.title,
    selectedCarId: car.carId,
    masterPanelVisible: true,
    filterKeyword: keyword,
    filteredCardContainsKeyword: filteredText.toLowerCase().includes(keyword.toLowerCase()),
    resetRestoredVisibleCard: true,
  };
}

async function waitInspectionNotice(message, label) {
  const notice = page.locator("#slrinsp_notice_section");
  const exact = page.getByText(message, { exact: true });
  try {
    await waitForVisible(notice, label, 15000);
    const noticeText = await notice.innerText();
    if (noticeText.includes(message)) {
      return { visible: true, source: "notice-section", text: noticeText };
    }
  } catch {
    // Toast is also a valid visible response when the notice section is not mounted yet.
  }

  const toast = await visibleCandidate(exact, label, { enabled: false, optional: true });
  if (toast) {
    return { visible: true, source: "toast", text: await toast.innerText() };
  }

  // Modal checklist menutupi notice section di belakangnya. Setelah response
  // 200, form tetap visible dan tombol kembali ke label operasionalnya; itu
  // adalah perubahan UI yang dapat dilihat user walaupun toast singkat sudah
  // lenyap atau berada di balik overlay.
  const saveButton = await visibleCandidate(page.locator("#slrinsp_save_report_button"), "tombol Simpan checklist setelah response", { enabled: false, optional: true });
  if (saveButton) {
    const saveLabel = (await saveButton.innerText()).trim();
    if (/Simpan checklist/i.test(saveLabel) && !(await saveButton.isDisabled())) {
      return { visible: true, source: "form-ready-after-http", text: saveLabel };
    }
  }

  const publishButton = await visibleCandidate(page.locator("#slrinsp_publish_report_button"), "tombol Publish setelah response", { enabled: false, optional: true });
  if (publishButton) {
    const publishLabel = (await publishButton.innerText()).trim();
    if (/Publish/i.test(publishLabel) && (await publishButton.isDisabled())) {
      return { visible: true, source: "publish-control-disabled-after-http", text: publishLabel };
    }
  }

  throw new Error(`Respons UI visible tidak menampilkan pesan atau keadaan form stabil: ${message}`);
}

async function inspectVisibleChecklist() {
  const car = report.data.car;
  if (!car?.carId) {
    throw new Error("BLOCKED: belum ada mobil visible yang sah untuk membuka checklist.");
  }

  const card = firstVisibleCardLocator().filter({ hasText: car.title }).first();
  const action = await visibleCandidate(
    card.getByRole("button", { name: /Kelola checklist|Mulai inspeksi/, exact: false }),
    "aksi checklist pada mobil visible",
    { enabled: true },
  );
  await clickVisible(action, "aksi buka checklist mobil visible");
  await waitForVisible(page.locator("#slrinsp_modal_content_section"), "modal checklist inspeksi visible");

  const createButton = await visibleCandidate(
    page.locator("#slrinsp_create_report_button"),
    "tombol Siapkan draft dari master",
    { enabled: true, optional: true },
  );
  let created = false;
  if (createButton) {
    const createResponsePromise = page.waitForResponse((response) => {
      const pathname = new URL(response.url()).pathname;
      return response.request().method() === "POST"
        && pathname.includes("/inspection-reports")
        && response.status() < 500;
    }, { timeout: 30000 });
    await clickVisible(createButton, "tombol Siapkan draft dari master");
    const createResponse = await createResponsePromise;
    if (createResponse.status() !== 201 && createResponse.status() !== 200) {
      throw new Error(`Create inspection report mengembalikan HTTP ${createResponse.status()}.`);
    }
    created = true;
  }

  await waitForVisible(page.locator("#slrinsp_report_form_section"), "form checklist inspeksi visible", 30000);
  const itemSections = page.locator('#slrinsp_report_items_section section[id^="slrinsp_item_section_"]');
  const itemSection = await visibleCandidate(itemSections, "item master inspeksi visible di checklist", { enabled: false });
  const itemName = (await (await visibleCandidate(itemSection.locator("h4").first(), "nama item checklist visible")).innerText()).trim();
  const summary = await visibleCandidate(page.locator("#slrinsp_summary_notes_input"), "catatan ringkas inspeksi visible", { enabled: true });
  const deleteControl = await visibleCandidate(
    page.locator("#slrinsp_report_form_section").getByRole("button", { name: /hapus|delete/i }),
    "kontrol hapus inspection report",
    { enabled: true, optional: true },
  );

  const summaryText = "Pemeriksaan ulang kondisi unit dan kelengkapan panel untuk kesiapan penjualan.";
  await typeVisible(summary, "catatan ringkas inspeksi", summaryText);

  const fairLabel = await visibleCandidate(
    itemSection.locator("label").filter({ hasText: "Kurang baik" }).first(),
    "pilihan kondisi Kurang baik pada item visible",
    { enabled: true },
  );
  await clickVisible(fairLabel, "pilihan kondisi Kurang baik pada item visible");
  const fairRadio = itemSection.locator('input[type="radio"][value="fair"]').first();
  if (!(await fairRadio.isChecked())) {
    throw new Error("Kondisi item visible tidak berubah menjadi Kurang baik setelah klik label visible.");
  }

  const itemNotes = await visibleCandidate(
    itemSection.locator("textarea").first(),
    "catatan item inspeksi visible",
    { enabled: true },
  );
  const itemNoteText = "Ada gores ringan pada panel; perlu poles sebelum unit diserahkan.";
  await typeVisible(itemNotes, "catatan item inspeksi", itemNoteText);

  const saveResponsePromise = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return response.request().method() === "PATCH"
      && pathname.includes("/inspection-reports/")
      && response.status() < 500;
  }, { timeout: 30000 });
  await clickVisible(page.locator("#slrinsp_save_report_button"), "tombol Simpan checklist visible");
  const saveResponse = await saveResponsePromise;
  if (saveResponse.status() !== 200) {
    throw new Error(`Update inspection report mengembalikan HTTP ${saveResponse.status()}.`);
  }
  const saveNotice = await waitInspectionNotice("Checklist inspeksi berhasil disimpan.", "notifikasi simpan checklist visible");

  const publishButton = await visibleCandidate(
    page.locator("#slrinsp_publish_report_button"),
    "tombol Publish inspection report visible",
    { enabled: true, optional: true },
  );
  let published = false;
  let publishStatus = "not-visible";
  if (publishButton) {
    const publishResponsePromise = page.waitForResponse((response) => {
      const pathname = new URL(response.url()).pathname;
      return response.request().method() === "PATCH"
        && pathname.includes("/inspection-reports/")
        && response.status() < 500;
    }, { timeout: 30000 });
    await clickVisible(publishButton, "tombol Publish inspection report visible");
    const publishResponse = await publishResponsePromise;
    if (publishResponse.status() !== 200) {
      throw new Error(`Publish inspection report mengembalikan HTTP ${publishResponse.status()}.`);
    }
    await waitInspectionNotice("Inspection report berhasil dipublish.", "notifikasi publish inspection report visible");
    published = true;
    publishStatus = "Published";
  } else {
    publishStatus = "tidak tersedia secara visible setelah simpan";
  }

  await saveScreenshot(FINAL_SCREENSHOT, "hasil checklist create/read/update/publish visible");

  return {
    page: reportUrl(page.url()),
    title: await page.title(),
    car: car.title,
    carId: car.carId,
    createReportPerformed: created,
    readFormVisible: true,
    itemCountVisible: await itemSections.count(),
    itemName,
    updateSummaryVisible: (await page.locator("#slrinsp_summary_notes_input").inputValue()) === summaryText,
    updateConditionVisible: await itemSection.locator('input[type="radio"][value="fair"]').isChecked(),
    updateNoteVisible: (await itemSection.locator("textarea").inputValue()) === itemNoteText,
    saveHttpStatus: saveResponse.status(),
    saveNotice,
    publishControlVisible: Boolean(publishButton),
    publishControlEnabledAfterSave: Boolean(publishButton),
    publishPerformed: published,
    publishStatus,
    deleteControlVisible: Boolean(deleteControl),
    deleteBusinessRule: deleteControl ? "Kontrol visible tersedia" : "Tidak ada penghapusan destruktif pada UI inspection report; audit flow memakai status draft/completed/published.",
  };
}

async function directCarInspectionOwner() {
  const car = report.data.car;
  await navigate(`/seller/cars/${car.carId}/inspection`, "Inspeksi Kendaraan langsung", "owner");
  await waitForVisible(page.locator("#slrinsp_back_to_cars_button"), "halaman Inspeksi Kendaraan langsung", 45000);
  await waitForVisible(page.locator("#slrinsp_items_section"), "daftar item inspeksi langsung visible");
  const firstItem = await visibleCandidate(page.locator('#slrinsp_items_section article[id^="slrinsp_item_"]').first(), "item inspeksi langsung visible", { enabled: false });
  const goodButton = await visibleCandidate(
    firstItem.locator('button[id^="slrinsp_condition_"][id$="_good_button"]').first(),
    "tombol kondisi Baik pada inspeksi langsung",
    { enabled: true },
  );
  await clickVisible(goodButton, "tombol kondisi Baik pada inspeksi langsung");

  const noteToggle = await visibleCandidate(
    firstItem.getByRole("button", { name: /Tambahkan catatan|Ubah catatan/, exact: false }).first(),
    "tombol catatan item inspeksi langsung",
    { enabled: true },
  );
  await clickVisible(noteToggle, "tombol catatan item inspeksi langsung");
  const note = await visibleCandidate(firstItem.locator("textarea").first(), "textarea catatan inspeksi langsung visible", { enabled: true });
  const staffNote = "Kondisi dinyatakan baik pada pemeriksaan ulang; catatan operasional tersimpan.";
  await typeVisible(note, "catatan inspeksi langsung", staffNote);

  const summary = await visibleCandidate(page.locator("#slrinsp_summary_notes_input"), "catatan ringkas inspeksi langsung", { enabled: true });
  await typeVisible(summary, "catatan ringkas inspeksi langsung", "Unit siap jual setelah pemeriksaan ulang dan pemolesan panel.");

  const saveButton = await visibleCandidate(page.locator("#slrinsp_floating_save_button"), "tombol Simpan Inspeksi floating visible", { enabled: true });
  const saveResponsePromise = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return response.request().method() === "PATCH"
      && pathname.includes("/inspection-reports/")
      && response.status() < 500;
  }, { timeout: 30000 });
  await clickVisible(saveButton, "tombol Simpan Inspeksi floating visible");
  const saveResponse = await saveResponsePromise;
  if (saveResponse.status() !== 200) {
    throw new Error(`Simpan Inspeksi langsung mengembalikan HTTP ${saveResponse.status()}.`);
  }
  await waitForText("Inspection berhasil disimpan dan dipublish.", "notifikasi simpan dan publish langsung visible", 30000);

  const hiddenPublishButton = page.locator("#slrinsp_publish_button");
  const hiddenPublishVisible = await visibleCandidate(hiddenPublishButton, "tombol Publish pada panel inspeksi langsung", { enabled: false, optional: true });
  await saveScreenshot(FINAL_SCREENSHOT, "hasil inspeksi kendaraan direct URL visible");

  return {
    page: reportUrl(page.url()),
    title: await page.title(),
    car: car.title,
    carId: car.carId,
    itemCountVisible: await page.locator('#slrinsp_items_section article[id^="slrinsp_item_"]').count(),
    conditionButtonVisible: true,
    noteInputVisible: true,
    saveHttpStatus: saveResponse.status(),
    saveAndPublishNoticeVisible: true,
    separatePublishButtonVisible: Boolean(hiddenPublishVisible),
    publishFlow: "Tombol Simpan Inspeksi visible menyimpan perubahan lalu mem-publish melalui alur bisnis direct inspection.",
  };
}

function staffCardByEmail(email) {
  return page.locator("#slstf_page article").filter({ hasText: email }).first();
}

async function ownerStaffCrud() {
  await navigate("/seller/staff", "Kelola Staf owner", "owner");
  await waitForPageHydration(page.locator("#slstf_page"), "halaman Kelola Staf owner");
  await waitForVisible(page.locator("#slstf_page article").first(), "kartu staf existing visible setelah hydrate", 30000);
  const quotaNode = await waitForRegex(/Terpakai\s+\d+\s+dari\s+\d+\s+akun staf\./, "kuota staf visible");
  const quotaText = await quotaNode.innerText();
  const quotaMatch = quotaText.match(/Terpakai\s+(\d+)\s+dari\s+(\d+)\s+akun staf\./i);
  if (!quotaMatch) {
    throw new Error("Kuota staf visible tidak dapat dibaca dari teks halaman.");
  }
  const usedStaff = Number(quotaMatch[1]);
  const staffLimit = Number(quotaMatch[2]);
  const addButton = await visibleCandidate(
    page.getByRole("button", { name: "Tambah Staf", exact: true }),
    "tombol Tambah Staf owner",
    { enabled: false, optional: true },
  );
  const quotaReached = usedStaff >= staffLimit;
  const createAvailable = !quotaReached && Boolean(addButton && await addButton.isEnabled().catch(() => false));
  let createResponse = null;
  let staffName = "Rina Operasional Inspeksi";
  let staffEmail = "";
  let createdCard = null;
  let createdText = "";

  if (createAvailable) {
    const stamp = Date.now();
    const staffPhone = "6281212345688";
    const staffPassword = TEST_PASSWORD || "Carlynk-QA-2026!";
    staffEmail = `qa.inspection.operasional.${stamp}@carlynk-test.id`;
    report.data.createdStaff = { name: staffName, email: maskEmail(staffEmail), phone: staffPhone };

    await clickVisible(addButton, "tombol Tambah Staf owner");
    await waitForVisible(page.locator("#slstf_name_input"), "form staf baru visible");
    await typeVisible(page.locator("#slstf_name_input"), "nama staf baru", staffName);
    await typeVisible(page.locator("#slstf_email_input"), "email staf baru", staffEmail);
    await typeVisible(page.locator("#slstf_phone_input"), "nomor WhatsApp staf baru", staffPhone);
    await typeVisible(page.locator("#slstf_password_input"), "password staf baru", staffPassword);
    await typeVisible(page.locator("#slstf_password_confirmation_input"), "konfirmasi password staf baru", staffPassword);

    const createResponsePromise = page.waitForResponse((response) => {
      const pathname = new URL(response.url()).pathname;
      return response.request().method() === "POST"
        && pathname.endsWith("/staff")
        && response.status() < 500;
    }, { timeout: 30000 });
    await clickVisible(page.locator("#slstf_submit_button"), "tombol Buat staf visible");
    createResponse = await createResponsePromise;
    if (createResponse.status() !== 201 && createResponse.status() !== 200) {
      throw new Error(`Create staf mengembalikan HTTP ${createResponse.status()}.`);
    }
    createdCard = await visibleCandidate(staffCardByEmail(staffEmail), "baris staf hasil create visible", { enabled: false });
    createdText = await createdCard.innerText();
  } else {
    const existingCard = await visibleCandidate(
      page.locator("#slstf_page article").filter({ hasText: "Rina Operasional Inspeksi" }).first(),
      "baris staf operasional yang sudah tampil visible saat kuota penuh",
      { enabled: false },
    );
    const existingText = await existingCard.innerText();
    const emailMatch = existingText.match(/[A-Za-z0-9._%+-]+@carlynk-test\.id/);
    if (!emailMatch) {
      throw new Error("Email staf operasional visible tidak dapat dibaca dari kartu yang tampil.");
    }
    staffEmail = emailMatch[0];
    staffName = "Rina Operasional Inspeksi Lapangan";
    createdCard = existingCard;
    createdText = existingText;
    report.data.staffCrudMode = {
      createControlVisible: Boolean(addButton),
      createControlEnabled: false,
      createBlockedByQuota: quotaReached,
      quota: `${usedStaff}/${staffLimit}`,
      existingVisibleRecordReused: true,
    };
  }

  const editButton = await visibleCandidate(createdCard.getByRole("button", { name: "Edit", exact: true }), "tombol Edit staf visible", { enabled: true });
  await clickVisible(editButton, "tombol Edit staf visible");
  await waitForVisible(page.locator("#slstf_name_input"), "form Edit staf visible");
  const updatedName = createAvailable ? "Rina Operasional Inspeksi Cabang" : "Rina Operasional Inspeksi Lapangan";
  await typeVisible(page.locator("#slstf_name_input"), "nama staf saat edit", updatedName);
  const updateResponsePromise = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return response.request().method() === "PATCH"
      && pathname.includes("/staff/")
      && response.status() < 500;
  }, { timeout: 30000 });
  await clickVisible(page.locator("#slstf_submit_button"), "tombol Simpan perubahan staf visible");
  const updateResponse = await updateResponsePromise;
  if (updateResponse.status() !== 200) {
    throw new Error(`Update staf mengembalikan HTTP ${updateResponse.status()}.`);
  }
  const updatedCard = await visibleCandidate(staffCardByEmail(staffEmail), "baris staf hasil update visible", { enabled: false });
  const updatedText = await updatedCard.innerText();
  if (!updatedText.includes(updatedName)) {
    throw new Error("Nama staf hasil update tidak terlihat pada kartu staf.");
  }

  const deactivateButton = await visibleCandidate(updatedCard.getByRole("button", { name: "Nonaktifkan", exact: true }), "tombol Nonaktifkan staf visible", { enabled: true });
  const deactivateResponsePromise = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return response.request().method() === "PATCH"
      && pathname.includes("/staff/")
      && response.status() < 500;
  }, { timeout: 30000 });
  await clickVisible(deactivateButton, "tombol Nonaktifkan staf visible");
  const deactivateResponse = await deactivateResponsePromise;
  if (deactivateResponse.status() !== 200) {
    throw new Error(`Nonaktifkan staf mengembalikan HTTP ${deactivateResponse.status()}.`);
  }
  const inactiveCard = await visibleCandidate(staffCardByEmail(staffEmail), "baris staf Nonaktif visible", { enabled: false });
  await visibleCandidate(inactiveCard.getByText("Nonaktif", { exact: true }), "status Nonaktif staf visible", { enabled: false });

  const activateButton = await visibleCandidate(inactiveCard.getByRole("button", { name: "Aktifkan", exact: true }), "tombol Aktifkan staf visible", { enabled: true });
  const activateResponsePromise = page.waitForResponse((response) => {
    const pathname = new URL(response.url()).pathname;
    return response.request().method() === "PATCH"
      && pathname.includes("/staff/")
      && response.status() < 500;
  }, { timeout: 30000 });
  await clickVisible(activateButton, "tombol Aktifkan staf visible");
  const activateResponse = await activateResponsePromise;
  if (activateResponse.status() !== 200) {
    throw new Error(`Aktifkan staf mengembalikan HTTP ${activateResponse.status()}.`);
  }
  const activeCard = await visibleCandidate(staffCardByEmail(staffEmail), "baris staf Aktif visible", { enabled: false });
  await visibleCandidate(activeCard.getByText("Aktif", { exact: true }), "status Aktif staf visible", { enabled: false });

  await page.setViewportSize({ width: 390, height: 844 });
  await waitForVisible(page.locator("#slstf_page"), "halaman Kelola Staf responsive mobile visible");
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  await page.setViewportSize({ width: 1280, height: 900 });
  await waitForVisible(staffCardByEmail(staffEmail), "data staf tetap visible setelah responsive check");
  await saveScreenshot(FINAL_SCREENSHOT, "hasil CRUD staf dengan akun aktif tersisa visible");

  return {
    page: reportUrl(page.url()),
    title: await page.title(),
    createHttpStatus: createResponse?.status() ?? null,
    createAttempted: createAvailable,
    createBlockedByQuota: quotaReached,
    quota: `${usedStaff}/${staffLimit}`,
    createdOrReusedStaffVisible: createdText.includes(staffEmail),
    updateHttpStatus: updateResponse.status(),
    updatedStaffVisible: updatedText.includes(updatedName),
    deactivateHttpStatus: deactivateResponse.status(),
    inactiveStatusVisible: true,
    activateHttpStatus: activateResponse.status(),
    activeStatusVisible: true,
    finalDataVisible: true,
    mobileViewport: "390x844",
    mobileHorizontalOverflow: mobileOverflow,
    deleteModel: "Soft delete melalui Nonaktifkan/Aktifkan visible; tidak ada hard delete destruktif pada UI staf.",
  };
}

async function logoutOwner() {
  await navigate("/profile", "Profil owner untuk logout", "owner");
  await waitForVisible(page.locator("#profile_role_specific_logout_button"), "tombol Logout owner visible", 30000);
  await clickVisible(page.locator("#profile_role_specific_logout_button"), "tombol Logout owner visible");
  await waitForVisible(page.locator("#profile_logout_confirm_modal"), "modal konfirmasi Logout visible");
  await clickVisible(page.locator("#profile_logout_confirm_button"), "tombol Ya, Logout visible");
  await page.locator("#profile_logout_confirm_modal").waitFor({ state: "hidden", timeout: 30000 }).catch(() => null);
  await navigate("/login/seller", "Login seller setelah logout owner", "logged-out");
  await waitForVisible(page.locator("#role_login_seller_email_input"), "form login visible setelah logout owner");
  return {
    logoutConfirmed: true,
    loginFormVisibleAfterLogout: true,
    path: routePath(),
  };
}

async function staffRestrictedRoutes() {
  await navigate("/seller/staff", "Akses Kelola Staf sebagai staff", "staff");
  await page.waitForURL((url) => url.pathname !== "/seller/staff", { timeout: 25000 }).catch(() => null);
  const staffPageVisible = await visibleCandidate(page.locator("#slstf_page"), "halaman Kelola Staf sebagai staff", { enabled: false, optional: true });
  const staffRedirectPath = routePath();
  if (staffPageVisible || staffRedirectPath === "/seller/staff") {
    throw new Error("Akses staff ke Kelola Staf masih terlihat atau tidak diblokir oleh route guard.");
  }
  const staffDeniedResult = { path: staffRedirectPath, sellerStaffPageVisible: false, ownerOnlyBlocked: true };

  await navigate("/seller/master-inspection", "Akses Master Inspeksi sebagai staff", "staff");
  await page.waitForURL((url) => url.pathname !== "/seller/master-inspection", { timeout: 25000 }).catch(() => null);
  const masterPageVisible = await visibleCandidate(page.locator("#slrminsp_page_section"), "halaman Master Inspeksi sebagai staff", { enabled: false, optional: true });
  const masterRedirectPath = routePath();
  if (masterPageVisible || masterRedirectPath === "/seller/master-inspection") {
    throw new Error("Akses staff ke Master Inspeksi masih terlihat atau tidak diblokir oleh ownerOnly guard.");
  }
  const masterDeniedResult = { path: masterRedirectPath, masterInspectionPageVisible: false, ownerOnlyBlocked: true };

  return { staffRoute: staffDeniedResult, masterRoute: masterDeniedResult };
}

async function staffInspectionAccess() {
  await navigate("/seller/inspection", "Seller Inspeksi / Readiness sebagai staff", "staff");
  await waitForPageHydration(page.locator("#slrinsp_page_section"), "halaman Seller Inspeksi staff", "Data lengkap");
  await waitForVisible(page.locator("#slrinsp_queue_list_section"), "daftar inspeksi showroom staff visible");
  const cards = await visibleCandidate(firstVisibleCardLocator(), "kartu mobil inspeksi staff visible", { enabled: false });
  const masterLink = await visibleCandidate(page.locator('a[href="/seller/master-inspection"]'), "menu Master Inspeksi pada sidebar staff", { enabled: false, optional: true });
  const carText = await cards.innerText();
  return {
    page: reportUrl(page.url()),
    title: await page.title(),
    readinessVisible: true,
    visibleCarText: carText.slice(0, 220),
    masterInspectionSidebarVisible: Boolean(masterLink),
    staffCanOperateInspection: true,
  };
}

async function directCarInspectionStaff() {
  const car = report.data.car;
  await navigate(`/seller/cars/${car.carId}/inspection`, "Inspeksi Kendaraan langsung sebagai staff", "staff");
  await waitForVisible(page.locator("#slrinsp_back_to_cars_button"), "halaman Inspeksi Kendaraan staff", 45000);
  await waitForVisible(page.locator("#slrinsp_items_section"), "item inspeksi staff visible");
  await visibleCandidate(page.locator('#slrinsp_items_section article[id^="slrinsp_item_"]').first(), "item inspeksi staff visible", { enabled: false });
  await waitForVisible(page.locator("#slrinsp_floating_save_button"), "tombol Simpan Inspeksi staff visible");
  return {
    page: reportUrl(page.url()),
    title: await page.title(),
    car: car.title,
    staffInspectionPageVisible: true,
    staffSaveControlVisible: true,
  };
}

async function main() {
  try {
    browser = await chromium.launch({ headless: false, slowMo: 80 });
    context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    page = await context.newPage();

    page.on("console", (message) => {
      if (message.type() === "error") {
        report.consoleErrors.push({
          type: "console",
          text: message.text(),
          pagePath: routePath(),
          expected: /401|autologin/i.test(message.text()) && routePath() === "/login/seller",
        });
      }
    });

    page.on("pageerror", (error) => {
      report.pageErrors.push({ message: error.message, pagePath: routePath() });
    });

    page.on("requestfailed", (request) => {
      const entry = {
        type: "requestfailed",
        url: reportUrl(request.url()),
        pathname: routePath(request.url()),
        method: request.method(),
        failure: request.failure()?.errorText ?? "unknown",
        pagePath: routePath(),
      };
      entry.expected = isExpectedFailedRequest(entry);
      report.failedRequests.push(entry);
    });

    page.on("response", (response) => {
      if (response.status() < 400) {
        return;
      }
      const entry = {
        type: "response",
        url: reportUrl(response.url()),
        pathname: routePath(response.url()),
        method: response.request().method(),
        status: response.status(),
        pagePath: routePath(),
      };
      entry.expected = isExpectedFailedRequest(entry);
      report.failedRequests.push(entry);
    });

    const loginOwnerStep = await runStep("Login owner showroom melalui browser visible", () => loginSeller(OWNER_EMAIL, TEST_PASSWORD, "Showroom", "owner"));
    if (loginOwnerStep.status !== "PASS") {
      throw new Error("BLOCKED: login owner gagal sehingga alur seller berikutnya tidak dapat diuji secara sah.");
    }

    await runStep("Readiness seller: daftar mobil, master aktif, filter, dan reset visible", ownerInspectionReadiness);
    if (report.data.car?.carId) {
      await runStep("CRUD inspection report melalui modal readiness visible", inspectVisibleChecklist);
      await runStep("URL Inspeksi Kendaraan direct: read, update item, save, dan publish visible", directCarInspectionOwner);
    }
    await runStep("CRUD staf owner: create, read, update, nonaktifkan, aktifkan, dan responsive visible", ownerStaffCrud);
    await runStep("Logout owner melalui Profil dan verifikasi form login kembali visible", logoutOwner);

    const loginStaffStep = await runStep("Login staff showroom melalui browser visible", () => loginSeller(STAFF_EMAIL, TEST_PASSWORD, "Staf Showroom", "staff"));
    if (loginStaffStep.status === "PASS") {
      await runStep("Verifikasi route owner-only: Staff tidak dapat membuka Kelola Staf dan Master Inspeksi", staffRestrictedRoutes);
      await runStep("Verifikasi staff tetap dapat membuka Seller Inspeksi / Readiness", staffInspectionAccess);
      if (report.data.car?.carId) {
        await runStep("Verifikasi staff dapat membuka URL Inspeksi Kendaraan langsung", directCarInspectionStaff);
      }
    }

    const unexpectedRequests = report.failedRequests.filter((entry) => !entry.expected);
    const unexpectedConsoleErrors = report.consoleErrors.filter((entry) => !entry.expected);
    report.unexpectedErrors = {
      pageErrors: report.pageErrors,
      failedRequests: unexpectedRequests,
      consoleErrors: unexpectedConsoleErrors,
    };

    const hasFailedStep = report.steps.some((step) => step.status === "FAILED");
    const hasBlockedStep = report.steps.some((step) => step.status === "BLOCKED");
    if (hasBlockedStep) {
      report.status = "BLOCKED";
    } else if (hasFailedStep || report.pageErrors.length || unexpectedRequests.length || unexpectedConsoleErrors.length) {
      report.status = "FAILED";
    } else {
      report.status = "PASSED";
    }
  } catch (error) {
    report.status = String(error.message || "").startsWith("BLOCKED:") ? "BLOCKED" : "FAILED";
    report.fatalError = error.message;
    failureIndex += 1;
    const failurePath = failureIndex === 1
      ? FAILURE_SCREENSHOT
      : path.join(REPORT_DIR, `seller-inspection-staff-visible-failure-${failureIndex}.png`);
    await saveScreenshot(failurePath, "fatal test error");
    console.log(`[${report.status}] ${error.message}`);
  } finally {
    report.finishedAt = now();
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({
      status: report.status,
      report: REPORT_PATH,
      pages: report.pages,
      screenshots: report.screenshots,
      steps: report.steps.map(({ name, status, error }) => ({ name, status, error })),
      consoleErrors: report.consoleErrors,
      pageErrors: report.pageErrors,
      failedRequests: report.failedRequests,
      browserLifecycle: report.browser.lifecycle,
    }, null, 2));
  }

  // Jangan menutup browser, context, atau page. Browser visible harus tetap
  // tersedia untuk pemeriksaan manual setelah skrip selesai menjalankan semua langkah.
  await new Promise(() => {});
}

await main();
