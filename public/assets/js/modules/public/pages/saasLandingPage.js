import { createPageLifecycle } from "../../../core/lifecycle.js";
import { brandConfig } from "../../../theme/brandConfig.js";
import { landingMarkup } from "./saasLanding/markup.js";
import { pasangInteraksi } from "./saasLanding/interactions.js";
import { pasangGaya, lepasGaya } from "./saasLanding/styles.js";

/**
 * Landing SaaS, port dari paket "Carlynk Automotive SaaS Landing Page".
 *
 * Panggung 3D-nya sudah dibuang. Paket asli memuat three.js 1,3 MB plus model
 * mobil GLB 18 MB hanya untuk latar hero, dan itu membuat halaman depan --
 * halaman yang paling sering dibuka orang asing di jaringan seluler -- terasa
 * berat tanpa menambah satu pun informasi. Latarnya sekarang gradien CSS
 * murni: nol permintaan jaringan, nol frame yang perlu digambar.
 */
export function SaasLandingPage() {
  let root = null;
  let lepasInteraksi = null;
  let headerShell = null;
  let tampilanHeaderShell = null;

  return createPageLifecycle({
    mount() {
      root = document.createElement("div");
      root.id = "saas_landing_root";
      root.className = "relative w-full";
      // Nyaris putih, bukan putih murni: kartu-kartu di halaman ini putih,
      // dan di atas kanvas putih penuh batasnya hilang.
      root.style.background = "#FDFDFC";
      root.innerHTML = landingMarkup({
        namaMerek: brandConfig.appName,
        tagline: brandConfig.appTagline,
        tautanWhatsapp: tautanWhatsapp(),
        alamatEtalase: alamatEtalase(),
      });

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
   * membawa nav lengkap berikut bilah progres, jadi dua header akan bertumpuk
   * dan warnanya bertabrakan. Disembunyikan selama landing tampil saja.
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

/**
 * Host yang dipakai di contoh alamat etalase.
 *
 * Sengaja ditulis tetap, bukan diambil dari window.location.host, supaya
 * contohnya tidak berubah jadi "localhost:8000" saat dijalankan lokal.
 */
const HOST_CONTOH = "carlynk.id";

/**
 * Bentuk alamat etalase di aplikasi ini memakai hash routing, jadi berbeda
 * dari "carlynk.id/showroom-anda" pada paket asli.
 *
 * Yang dipajang adalah alias pendek /#/s/<slug>, bukan /#/showrooms/<slug>,
 * supaya tautannya enak dibagikan. Keduanya menuju halaman yang sama.
 */
function alamatEtalase() {
  return `${HOST_CONTOH}/#/s/showroom-anda`;
}
