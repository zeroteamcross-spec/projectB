import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE = process.env.GOOGLE_LOGIN_SMOKE_BASE || "http://127.0.0.1:8034/app.html";

const ROUTES = [
  { route: "#/google-login/buyer", title: "Google Login Buyer", expectedText: "Google Login belum dikonfigurasi" },
  { route: "#/google-login/admin", title: "Google Login Admin", expectedText: "Google Login belum dikonfigurasi" },
  { route: "#/google-login/seller", title: "Google Login Seller", expectedText: "Google Login belum dikonfigurasi" },
  { route: "#/google-login/affiliate", title: "Google Login Affiliate", expectedText: "Affiliate tetap menggunakan login user/password" },
  { route: "#/google-login/complete", title: "Lengkapi Data Google Login", expectedText: "Tidak ada data Google yang perlu dilengkapi" },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const evidence = {
    base: BASE,
    providerStatus: "BLOCKED_PROVIDER_CONFIG",
    routes: [],
  };

  try {
    for (const route of ROUTES) {
      evidence.routes.push(await inspectRoute(browser, route));
    }
  } finally {
    await browser.close();
  }

  evidence.result = evidence.routes.every((item) => item.result === "PASS") ? "PASS" : "FAIL";
  writeEvidence(evidence);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);

  if (evidence.result !== "PASS") {
    process.exit(1);
  }
}

async function inspectRoute(browser, test) {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await page.goto(`${BASE}${test.route}`, { waitUntil: "networkidle" });
    const bodyText = await page.locator("body").innerText({ timeout: 8000 });
    const ok = bodyText.includes(test.title) && bodyText.includes(test.expectedText);

    return {
      route: test.route,
      expectedTitle: test.title,
      expectedText: test.expectedText,
      result: ok ? "PASS" : "FAIL",
    };
  } catch (error) {
    return {
      route: test.route,
      expectedTitle: test.title,
      expectedText: test.expectedText,
      result: "FAIL",
      error: error.message,
    };
  } finally {
    await context.close();
  }
}

function writeEvidence(evidence) {
  const dir = path.resolve("storage/browser-smoke");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "google_role_login_smoke.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exit(1);
});
