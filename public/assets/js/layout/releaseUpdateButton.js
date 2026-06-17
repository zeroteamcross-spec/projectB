import { createIcon } from "../theme/iconRegistry.js";
import { Button } from "../ui/primitives/button.js";
import { closeModal, openModal } from "../ui/primitives/modal.js";

const RELEASE_STORAGE_KEY = "projectB.releaseVersion";

export function createReleaseUpdateButton(store) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = [
    "fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[95]",
    "hidden h-12 min-w-12 items-center justify-center gap-2 rounded-full",
    "border border-[color-mix(in_srgb,var(--pb-brand-primary)_34%,white)]",
    "bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))]",
    "px-4 text-sm font-black text-white shadow-[var(--pb-shadow-elevated)]",
    "transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]",
    "md:bottom-6 md:right-6",
  ].join(" ");
  button.setAttribute("aria-label", "Muat ulang aplikasi");
  button.title = "Muat ulang aplikasi";

  const sync = () => {
    const updateAvailable = Boolean(store?.get("app.release.updateAvailable", false));
    button.classList.toggle("hidden", !updateAvailable);
    button.classList.toggle("inline-flex", updateAvailable);
    button.replaceChildren(
      createIcon("download", { className: "block h-4 w-4 leading-none" }),
      labelNode()
    );
  };

  button.addEventListener("click", () => openReleaseModal(store));
  sync();

  return {
    element: button,
    sync,
  };
}

function labelNode() {
  const label = document.createElement("span");
  label.className = "hidden whitespace-nowrap sm:inline";
  label.textContent = "Muat Ulang";
  return label;
}

function openReleaseModal(store) {
  const latestVersion = store?.get("app.release.latestVersion", null);
  const appliedVersion = store?.get("app.release.appliedVersion", null);
  const body = document.createElement("div");
  body.className = "grid gap-4 text-sm leading-6 text-[var(--pb-text-muted)]";

  const message = document.createElement("p");
  message.textContent = "Versi aplikasi terbaru sudah tersedia. Setelah dimuat ulang, browser akan mengambil file aplikasi terbaru dari server.";

  const detail = document.createElement("div");
  detail.className = "rounded-lg border border-[var(--pb-border)] bg-gray-50 px-4 py-3 text-xs leading-5 text-gray-700";
  detail.textContent = [
    latestVersion ? `Versi terbaru: ${latestVersion}` : "",
    appliedVersion ? `Versi sebelumnya: ${appliedVersion}` : "",
  ].filter(Boolean).join(" | ");

  body.append(message);
  if (detail.textContent) {
    body.append(detail);
  }

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap justify-end gap-2 pt-2";
  actions.append(
    Button({
      label: "Nanti",
      variant: "secondary",
      onClick: () => closeModal(),
    }),
    Button({
      label: "Muat ulang sekarang",
      variant: "primary",
      onClick: () => {
        markReleaseApplied(latestVersion);
        window.location.reload();
      },
    })
  );
  body.append(actions);

  openModal(body, {
    key: "release-update-confirmation",
    title: "Update aplikasi tersedia",
    description: "Muat ulang aplikasi untuk menggunakan versi terbaru.",
    size: "md",
    footer: null,
    closeLabel: "Nanti",
  });
}

function markReleaseApplied(version) {
  if (!version) {
    return;
  }

  try {
    window.localStorage?.setItem(RELEASE_STORAGE_KEY, String(version));
  } catch (error) {
    // Storage can be unavailable in restricted browser contexts.
  }
}
