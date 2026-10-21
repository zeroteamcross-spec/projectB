import { createPageLifecycle } from "../../../core/lifecycle.js";
import { currentHost, hostForRole } from "../../../core/roleHosts.js";
import { brandConfig } from "../../../theme/brandConfig.js";
import { adminMasterService } from "../../admin/services/adminMasterService.js";
import { activeSubscriptionPlans } from "../services/subscriptionPricing.js";
import { bangunRute } from "./carlynkLanding/content.js";
import { landingMarkup, landingPricingCardsMarkup } from "./carlynkLanding/markup.js";
import { pasangInteraksi } from "./carlynkLanding/interactions.js";
import { pasangGaya, lepasGaya } from "./carlynkLanding/styles.js";

/**
 * Landing Carlynk, mengikuti berkas desain "Landing page Carlynk.cdr".
 *
 * Halaman ini berdiri sendiri di samping SaasLandingPage, bukan menggantikan
 * berkasnya: keduanya terdaftar di landingPageRegistry, jadi admin bisa
 * berpindah dari panel tanpa perlu deploy ulang.
 */
export function CarlynkLandingPage() {
  let root = null;
  let lepasInteraksi = null;
  let headerShell = null;
  let tampilanHeaderShell = null;

  return createPageLifecycle({
    mount() {
      root = document.createElement("div");
      root.id = "carlynk_landing_root";
      root.className = "relative w-full";
      const rute = bangunRute(tautanWhatsapp(), tautanLoginShowroom());
      root.innerHTML = landingMarkup({ rute, pricingLoading: true });

      pasangGaya();
      sembunyikanHeaderShell();
      void muatHargaPaket(root, rute);

      return root;
    },

    bindEvents() {
      if (!root || lepasInteraksi) {
        return;
      }

      lepasInteraksi = pasangInteraksi(root);
    },

    unmount() {
      lepasInteraksi?.();
      lepasInteraksi = null;
    },

    dispose() {
      lepasInteraksi?.();
      lepasInteraksi = null;
      lepasGaya();
      kembalikanHeaderShell();
      root = null;
    },
  });

  /**
   * PublicShell memasang header terangnya sendiri di top-0. Landing ini sudah
   * membawa navbar lengkap, jadi dua header akan bertumpuk.
   */
  function sembunyikanHeaderShell() {
    headerShell = document.querySelector("#app header");
    if (!headerShell) {
      return;
    }
    tampilanHeaderShell = headerShell.style.display;
    headerShell.style.display = "none";
  }

  function kembalikanHeaderShell() {
    if (!headerShell) {
      return;
    }
    const header = headerShell;
    const previousDisplay = tampilanHeaderShell ?? "";
    const oldRoot = root;
    const outlet = oldRoot?.parentNode;
    const restore = () => {
      // Jangan tampilkan header shell selagi landing lama masih terlihat.
      // Router melepas page lama sebelum bootstrap halaman tujuan selesai.
      if (outlet?.querySelector("#carlynk_landing_root")) {
        return;
      }
      header.style.display = previousDisplay;
    };
    if (oldRoot?.isConnected && outlet) {
      const observer = new MutationObserver(() => {
        if (oldRoot.isConnected) {
          return;
        }
        observer.disconnect();
        restore();
      });
      observer.observe(outlet, { childList: true });
    } else {
      restore();
    }
    headerShell = null;
    tampilanHeaderShell = null;
  }

  async function muatHargaPaket(target, rute) {
    try {
      const master = await adminMasterService.getPricingMaster();
      perbaruiGridHarga(target, rute, activeSubscriptionPlans(master?.data?.plans));
    } catch {
      perbaruiGridHarga(target, rute, [], { error: true });
    }
  }

  function perbaruiGridHarga(target, rute, plans, options = {}) {
    if (root !== target) {
      return;
    }
    const grid = target.querySelector("#ck_harga_grid");
    if (!grid) {
      return;
    }
    grid.innerHTML = landingPricingCardsMarkup(plans, rute, options);
    grid.setAttribute("aria-busy", "false");
  }
}

// Langsung ke subdomain showroom, tanpa singgah di domain utama lalu dialihkan.
// Tanpa host khusus (satu host saja) tetap memakai rute SPA biasa.
function tautanLoginShowroom() {
  const host = hostForRole("seller");
  return host && host !== currentHost() ? `${window.location.protocol}//${host}/login/seller` : "";
}

function tautanWhatsapp() {
  const nomor = String(brandConfig.contact?.whatsapp ?? "").replace(/\D/g, "").replace(/^0/, "62");
  return nomor ? `https://wa.me/${nomor}` : "";
}
