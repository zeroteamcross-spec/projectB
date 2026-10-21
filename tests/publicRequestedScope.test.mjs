import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { activeSubscriptionPlans, selectedSubscriptionPlan, registrationPackageUrl } from "../public/assets/js/modules/public/services/subscriptionPricing.js";
import { landingPricingCardsMarkup } from "../public/assets/js/modules/public/pages/carlynkLanding/markup.js";
import { subscriptionBankIconsFromMaster } from "../public/assets/js/ui/composites/subscriptionMidtransPanel.js";
import { copyTextToClipboard } from "../public/assets/js/utils/copyTextToClipboard.js";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("landing prices use the current active master plans and omit inactive plans", () => {
  const plans = activeSubscriptionPlans([
    { id: "p-pro", name: "Pro", price: 750000, status: "active", features: ["Inspeksi"] },
    { id: "p-basic", name: "Basic", price: 350000, status: "active" },
    { id: "p-old", name: "Paket Lama", price: 1, status: "inactive" },
  ]);
  const markup = landingPricingCardsMarkup(plans, { daftar: "/daftar-showroom" });

  assert.deepEqual(plans.map((plan) => plan.id), ["p-basic", "p-pro"]);
  assert.match(markup, /Rp\s?350\.000/);
  assert.match(markup, /Rp\s?750\.000/);
  assert.doesNotMatch(markup, /Paket Lama/);
});

test("selected package survives the landing-to-registration URL and query lookup", async () => {
  const plans = activeSubscriptionPlans([
    { id: "p-pro", name: "Paket Pro & Plus", price: 750000, status: "active" },
  ]);
  const href = registrationPackageUrl("/daftar-showroom", plans[0]);
  const requestedName = new URL(href, "https://carlynk.id").searchParams.get("paket");
  const selected = selectedSubscriptionPlan(plans, requestedName);
  const registrationSource = await read("../public/assets/js/modules/public/pages/showroomRegisterPage.js");

  assert.equal(href, "/daftar-showroom?paket=Paket%20Pro%20%26%20Plus");
  assert.equal(selected?.id, "p-pro");
  assert.match(registrationSource, /selectedSubscriptionPlan\(state\.plans, context\?\.query\?\.paket\)/);
});

test("landing renders before pricing resolves and the main shell suppresses its duplicate header", async () => {
  const landing = await read("../public/assets/js/modules/public/pages/carlynkLandingPage.js");
  const shell = await read("../public/assets/js/layout/publicShell.js");
  const app = await read("../public/assets/js/core/app.js");
  const initialMarkup = landingPricingCardsMarkup([], { daftar: "/daftar-showroom" }, { loading: true });

  assert.match(initialMarkup, /Memuat harga paket terbaru/);
  assert.match(landing, /root\.innerHTML = landingMarkup\(\{ rute, pricingLoading: true \}\)/);
  assert.match(landing, /void muatHargaPaket\(root, rute\)/);
  assert.doesNotMatch(landing, /async bootstrap\s*\(/);
  assert.match(shell, /isMainDomainLandingRoot/);
  assert.match(shell, /headerNode\.classList\.toggle\("hidden", isAuthenticated \|\| isMainDomainLandingRoot\)/);

  // PublicShell.render() synchronizes the root-path hidden state before it
  // returns to ShellHost, and the shell is attached before Router.start().
  assert.match(shell, /this\.syncActionLink\(\);[\s\S]*return this\.root;/);
  assert.ok(app.indexOf("this.root.replaceChildren(this.shell.render())") < app.indexOf("this.router.start()"));

  // On navigation away, keep the inline suppression until the landing root is
  // actually replaced, avoiding a header-only frame during async registration bootstrap.
  assert.match(landing, /const observer = new MutationObserver\(\(\) => \{[\s\S]*if \(oldRoot\.isConnected\) \{[\s\S]*observer\.disconnect\(\);\s*restore\(\);/);
});

test("main-domain showroom registration gets Carlynk tab title and favicon on direct and SPA navigation", async () => {
  const server = await read("../public/index.php");
  const context = await read("../public/assets/js/modules/public/services/publicContextService.js");
  const shell = await read("../public/index.html");

  assert.match(server, /\$isMainRegistrationPage[\s\S]*favicon-carlynk\.png/);
  assert.match(shell, /__PROJECTB_CARLYNK_REGISTER_ICON__[\s\S]*__ASSET_VER__/);
  assert.match(shell, /pathname === "\/daftar-showroom"/);
  assert.match(context, /normalizedPath === "\/daftar-showroom"/);
  assert.match(context, /MAIN_CARLYNK_REGISTER_ICON/);
});

test("Virtual Account bank icons are sourced only from active master records", () => {
  const icons = subscriptionBankIconsFromMaster({ data: { banks: [
    { slug: "bca", bank_name: "Bank Central Asia", icon_path: "/bank/bca.svg", status: "active" },
    { slug: "bni", bank_name: "BNI", icon_path: "/bank/bni-old.svg", status: "inactive" },
    { slug: "mandiri", bank_name: "Bank Mandiri", icon_path: "/bank/mandiri.svg", status: "active" },
    { slug: "bri", bank_name: "BRI", icon_path: "", status: "active" },
  ] } });

  assert.equal(icons.get("bca"), "/bank/bca.svg");
  assert.equal(icons.has("bni"), false);
  assert.equal(icons.get("mandiri"), "/bank/mandiri.svg");
  assert.equal(icons.has("bri"), false);
});

test("transfer amount and account copy use the requested exact values with clipboard fallback", async () => {
  const registerSource = await read("../public/assets/js/modules/public/pages/showroomRegisterPage.js");
  assert.match(registerSource, /detailRow\("Jumlah transfer"[\s\S]*copyValue: String\(plan\.price \?\? ""\)/);
  assert.match(registerSource, /detailRow\("Nomor rekening"[\s\S]*copyValue: state\.subscriptionDestination\.account_number/);
  assert.match(registerSource, /const available = typeof result\?\.is_available === "boolean"/);
  assert.match(registerSource, /Alamat halaman dipakai oleh sistem/);

  let written = "";
  const clipboardSuccess = await copyTextToClipboard("500000", {
    clipboard: { async writeText(value) { written = value; } },
    documentRef: null,
  });
  assert.equal(clipboardSuccess, true);
  assert.equal(written, "500000");

  let fallbackText = "";
  const helper = {
    value: "",
    style: {},
    setAttribute() {},
    select() {},
    remove() {},
  };
  const fallbackDocument = {
    body: { append(node) { fallbackText = node.value; } },
    createElement() { return helper; },
    execCommand(command) { return command === "copy"; },
  };
  const clipboardFallback = await copyTextToClipboard("88110120725", {
    clipboard: { async writeText() { throw new Error("permission denied"); } },
    documentRef: fallbackDocument,
  });
  assert.equal(clipboardFallback, true);
  assert.equal(fallbackText, "88110120725");
});
