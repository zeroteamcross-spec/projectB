import { createPageLifecycle } from "../../../core/lifecycle.js";
import { brandConfig } from "../../../theme/brandConfig.js";
import { bangunRute } from "./carlynkLanding/content.js";
import { landingMarkup } from "./carlynkLanding/markup.js";
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
      root.innerHTML = landingMarkup({ rute: bangunRute(tautanWhatsapp()) });

      pasangGaya();
      sembunyikanHeaderShell();

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
    headerShell.style.display = tampilanHeaderShell ?? "";
    headerShell = null;
    tampilanHeaderShell = null;
  }
}

function tautanWhatsapp() {
  const nomor = String(brandConfig.contact?.whatsapp ?? "").replace(/\D/g, "");
  return nomor ? `https://wa.me/${nomor}` : "";
}
