import { createPageLifecycle } from "../../../core/lifecycle.js";
import { brandConfig } from "../../../theme/brandConfig.js";
import { landingMarkup } from "./saasLanding/markup.js";
import { pasangInteraksi } from "./saasLanding/interactions.js";
import { pasangGaya, lepasGaya } from "./saasLanding/styles.js";

/**
 * Landing SaaS, port dari paket "Carlynk Automotive SaaS Landing Page".
 *
 * Markup, gaya, animasi, dan panggung 3D-nya sama dengan paket asli; yang
 * berbeda hanya cara memuatnya. three.js dan model GLB 17,9 MB di-import
 * setelah halaman tampil, sehingga render pertama tidak menunggu 24 MB aset.
 * Kanvas memang mulai dari opacity 0, jadi urutan tampilnya tetap sama seperti
 * paket asli: halaman dulu, lencana "MEMUAT MODEL 3D", baru mobilnya.
 */
export function SaasLandingPage() {
  let root = null;
  let lepasInteraksi = null;
  let lepasPanggung = null;
  let dibuang = false;
  let headerShell = null;
  let tampilanHeaderShell = null;

  return createPageLifecycle({
    mount() {
      dibuang = false;
      root = document.createElement("div");
      root.id = "saas_landing_root";
      root.className = "relative w-full";
      // Krem, bukan hitam. Teks landing sudah gelap sejak palet baru, jadi
      // latar hitam di sini bikin tulisan hilang di celah antar seksi yang
      // tidak tertutup kanvas 3D.
      root.style.background = "#FAF4ED";
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
      mulaiPanggungDiLatar();
    },

    unmount() {
      lepasPanggungDanInteraksi();
    },

    dispose() {
      dibuang = true;
      lepasPanggungDanInteraksi();
      lepasGaya();
      kembalikanHeaderShell();
      root = null;
    },
  });

  /**
   * Panggung 3D dimuat setelah halaman terpasang, dan kegagalannya tidak boleh
   * menjatuhkan landing. Tanpa 3D halaman tetap terbaca penuh.
   */
  function mulaiPanggungDiLatar() {
    import("./saasLanding/scene.js")
      .then(({ mulaiPanggung }) => {
        if (dibuang || !root) {
          return null;
        }
        return mulaiPanggung(root);
      })
      .then((lepas) => {
        if (typeof lepas !== "function") {
          return;
        }
        if (dibuang) {
          lepas();
          return;
        }
        lepasPanggung = lepas;
      })
      .catch((error) => {
        console.warn("Panggung 3D landing gagal dimuat.", error);
        const lencana = root?.querySelector("[data-modelload]");
        if (lencana) {
          lencana.textContent = "MODEL 3D GAGAL DIMUAT";
        }
      });
  }

  function lepasPanggungDanInteraksi() {
    lepasPanggung?.();
    lepasPanggung = null;
    lepasInteraksi?.();
    lepasInteraksi = null;
  }

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
