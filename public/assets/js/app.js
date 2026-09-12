import { createProjectBApp } from "./core/app.js";
import { bindDomainRouteGuard } from "./core/domainRouteGuard.js";
import { bindInternalLinkInterceptor } from "./core/router.js";
import { upgradeLegacyHashUrl } from "./core/legacyHashUrl.js";
import { brandConfig } from "./theme/brandConfig.js";

document.title = brandConfig.appName;
upgradeLegacyHashUrl();
const domainRouteGuard = bindDomainRouteGuard();

// Kalau guard barusan memicu location.replace() ke host lain, navigasi
// sungguhan sedang berjalan tapi belum benar-benar memotong eksekusi skrip
// ini. Boot SPA (fetch manifest, autologin, render shell & halaman) di sini
// sia-sia sekaligus berbahaya -- sempat ter-mount di host yang salah untuk
// sesaat sebelum browser memotongnya, itulah "form login muncul dua kali /
// berkedip" yang terlihat pengguna. Berhenti total, biarkan navigasi yang
// sudah berjalan menyelesaikan dirinya sendiri; app.js akan jalan ulang dari
// awal begitu halaman baru di host tujuan selesai dimuat.
if (!domainRouteGuard.redirected) {
  bindInternalLinkInterceptor();

  const app = createProjectBApp({
    root: "#app",
    toastRoot: "#toast-root",
    modalRoot: "#modal-root",
  });

  app.bootstrap().catch((error) => {
    console.error("ProjectB app bootstrap failed.", error);
    domainRouteGuard.dispose();
  });
}
