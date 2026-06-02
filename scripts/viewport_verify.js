import { chromium } from "playwright";

const BASE = "https://public.test/app.html";

const VIEWPORTS = [
  { name: "320", width: 320, height: 900 },
  { name: "360", width: 360, height: 900 },
  { name: "390", width: 390, height: 900 },
  { name: "430", width: 430, height: 932 },
];

const CREDS = {
  admin: { email: "admin@projectb.local", password: "SmokePass123!" },
  seller: { email: "seller@projectb.local", password: "SmokePass123!" },
  buyer: { email: "buyer@projectb.local", password: "SmokePass123!" },
  affiliate_admin: { email: "affiliate@projectb.local", password: "SmokePass123!" },
};

const ROUTES = [
  { key: "publicCatalog", role: "public", path: "#/" },
  { key: "publicCarDetail", role: "public", path: "#/cars/2" },
  { key: "buyerTransactionEntry", role: "public", path: "#/transactions/new?car_id=2" },
  { key: "buyerPaymentStatus", role: "buyer", path: "#/buyer/transactions/29" },
  {
    key: "buyerCompletionPayment",
    role: "buyer",
    path: "#/buyer/transactions/29",
    afterLoad: async (page) => {
      const button = page.getByRole("button", { name: /Lanjut pelunasan/i }).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await page.waitForTimeout(800);
      }
    },
  },
  { key: "sellerAffiliatesModal", role: "seller", path: "#/seller/affiliates?mode=create" },
  { key: "sellerAffiliateCommissions", role: "seller", path: "#/seller/affiliate-commissions?mode=create" },
  { key: "adminUsers", role: "admin", path: "#/admin/users?user_id=19" },
  { key: "adminTransactions", role: "admin", path: "#/admin/transactions?transaction_id=29" },
  { key: "adminApprovals", role: "admin", path: "#/admin/approvals?user_id=19" },
  { key: "affiliateLedger", role: "affiliate_admin", path: "#/affiliate/ledger" },
  { key: "affiliateSettlements", role: "affiliate_admin", path: "#/affiliate/settlements" },
];

async function loginThroughUi(page, role) {
  if (role === "public") {
    return;
  }

  const email = page.locator('input[name="email"]').first();
  const password = page.locator('input[name="password"]').first();

  if (!await email.isVisible().catch(() => false)) {
    return;
  }

  await email.fill(CREDS[role].email);
  await password.fill(CREDS[role].password);

  const submit = page.locator('button[type="submit"]').first();
  await submit.click();
  await page.waitForTimeout(1800);
}

async function verifyPage(page, routeKey, viewport) {
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.scrollTo(0, 0));

  return page.evaluate(({ routeKey, viewport }) => {
    const width = window.innerWidth;
    const doc = document.documentElement;
    const body = document.body;
    const pageOverflow = Math.max(doc.scrollWidth, body.scrollWidth) - width;
    const selectors = "main, section, aside, form, header, footer, nav, [role='dialog'], [data-seller-affiliate-modal-host] > div";
    const offenders = [];

    const ignoredScrollableParent = (node) => {
      let current = node.parentElement;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        if (["auto", "scroll"].includes(style.overflowX)) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    };

    document.querySelectorAll(selectors).forEach((node) => {
      if (offenders.length >= 8) {
        return;
      }
      const style = window.getComputedStyle(node);
      if (style.display === "none" || style.visibility === "hidden") {
        return;
      }
      const rect = node.getBoundingClientRect();
      if (rect.width < 40 || rect.height < 20) {
        return;
      }
      if (ignoredScrollableParent(node)) {
        return;
      }
      if (rect.left < -1 || rect.right > width + 1) {
        offenders.push({
          tag: node.tagName.toLowerCase(),
          className: (node.className || "").toString().slice(0, 120),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
    });

    const fixed = Array.from(document.querySelectorAll("body *")).filter((node) => {
      const style = window.getComputedStyle(node);
      return ["fixed", "sticky"].includes(style.position) && style.display !== "none" && style.visibility !== "hidden";
    }).slice(0, 20).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        tag: node.tagName.toLowerCase(),
        className: (node.className || "").toString().slice(0, 120),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      };
    }).filter((item) => item.left < -1 || item.right > width + 1);

    return {
      routeKey,
      viewport,
      width,
      pageOverflow,
      offenders,
      fixed,
      title: document.title,
      hash: window.location.hash,
    };
  }, { routeKey, viewport });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const viewport of VIEWPORTS) {
      for (const route of ROUTES) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          ignoreHTTPSErrors: true,
        });

        try {
          const page = await context.newPage();
          await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
          await loginThroughUi(page, route.role);
          if (route.role !== "public") {
            await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
          }

          if (route.afterLoad) {
            await route.afterLoad(page);
          }

          results.push(await verifyPage(page, route.key, viewport.name));
        } finally {
          await context.close();
        }
      }
    }

    process.stdout.write(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
