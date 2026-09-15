import { Button } from "../../../ui/primitives/button.js";
import { createIcon } from "../../../theme/iconRegistry.js";

/**
 * Ditampilkan alih-alih katalog/detail mobil/checkout ketika showroom yang
 * sedang dibuka dinonaktifkan admin (lihat ShowroomService::deactivate() dan
 * publicContextService.isActiveContextInactive()). Sengaja tidak menyebutkan
 * alasan spesifik (menunggak, dsb) -- itu catatan internal admin, bukan
 * konsumsi buyer.
 */
export function MaintenancePage({ showroomName = "" } = {}) {
  const section = document.createElement("section");
  section.id = "public_maintenance_section";
  section.className = "grid min-h-[70vh] place-items-center px-4 py-12";

  const card = document.createElement("div");
  card.className = "grid max-w-md gap-5 justify-items-center rounded-[2rem] border border-[var(--pb-card-border)] bg-white/90 p-8 text-center shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur-xl";

  const iconWrap = document.createElement("div");
  iconWrap.className = "grid h-20 w-20 place-items-center rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)] text-[var(--pb-brand-secondary)]";
  iconWrap.append(createIcon("wrench", { className: "h-9 w-9" }));

  const title = document.createElement("h1");
  title.id = "public_maintenance_title";
  title.className = "text-xl font-black tracking-tight text-gray-950";
  title.textContent = "Halaman Sedang Tidak Tersedia";

  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-gray-600";
  body.textContent = showroomName
    ? `Halaman showroom "${showroomName}" sedang dalam pemeliharaan dan untuk sementara tidak dapat diakses.`
    : "Halaman showroom ini sedang dalam pemeliharaan dan untuk sementara tidak dapat diakses.";

  const hint = document.createElement("p");
  hint.className = "text-xs leading-6 text-gray-500";
  hint.textContent = "Silakan coba lagi beberapa saat lagi, atau kembali ke beranda untuk melihat showroom lain.";

  const home = Button({
    label: "Kembali ke Beranda",
    variant: "primary",
    onClick: () => window.location.assign("/"),
  });
  home.id = "public_maintenance_home_button";
  home.classList.add("w-full", "sm:w-fit");

  card.append(iconWrap, title, body, hint, home);
  section.append(card);
  return section;
}
