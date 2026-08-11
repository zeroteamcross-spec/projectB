import { adminSessionService } from "../modules/admin/services/adminSessionService.js";
import { showToast } from "../ui/primitives/toast.js";
import { tw } from "../theme/tailwindClasses.js";

export function renderImpersonationBanner(host, store, { redirectTo = "#/admin" } = {}) {
  if (!host) {
    return;
  }

  const impersonation = store?.get("auth.impersonation", null) ?? null;

  if (!impersonation?.is_impersonating) {
    host.classList.add("hidden");
    host.replaceChildren();
    return;
  }

  host.classList.remove("hidden");

  const panel = document.createElement("div");
  panel.id = "global_impersonation_banner";
  panel.className = "flex min-w-0 flex-col gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--pb-warning)_42%,white)] bg-[color-mix(in_srgb,var(--pb-warning)_8%,white)] px-4 py-3 text-xs text-[color-mix(in_srgb,var(--pb-warning)_84%,black)] shadow-sm md:flex-row md:items-center md:justify-between";

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";

  const targetRole = String(impersonation.impersonated_role ?? impersonation.target?.role ?? "").trim();
  const targetRoleLabel = targetRole === "seller" ? "Seller" : "Marketing";
  const targetName = impersonation.target?.name ?? impersonation.target?.email ?? targetRoleLabel;
  const actorName = impersonation.actor?.name ?? impersonation.actor?.email ?? "Admin";

  const title = document.createElement("strong");
  title.className = "break-words";
  title.textContent = `Anda sedang login sebagai ${targetRoleLabel}: ${targetName}`;

  const text = document.createElement("span");
  text.className = "break-words text-[color-mix(in_srgb,var(--pb-warning)_84%,black)]";
  text.textContent = `Admin asli: ${actorName}`;

  const button = document.createElement("button");
  button.id = "global_impersonation_return_button";
  button.type = "button";
  button.className = `${tw.button.base} ${tw.button.secondary}`;
  button.textContent = "Kembali ke Admin";
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = "Memproses...";

    try {
      await adminSessionService.stopImpersonation();
      showToast("Kembali ke akun admin.", { type: "success" });
      window.location.hash = redirectTo;
    } catch (error) {
      showToast(error.message || "Gagal menghentikan impersonation.", { type: "error" });
      button.disabled = false;
      button.textContent = "Kembali ke Admin";
    }
  });

  copy.append(title, text);
  panel.append(copy, button);
  host.replaceChildren(panel);
}
