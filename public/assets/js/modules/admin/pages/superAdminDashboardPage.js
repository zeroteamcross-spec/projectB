import { createPageLifecycle } from "../../../core/lifecycle.js";
import { Button } from "../../../ui/primitives/button.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function SuperAdminDashboardPage() {
  let root = null;

  return createPageLifecycle({
    mount(context) {
      root = document.createElement("section");
      root.className = "grid gap-5";
      render(root, context);
      return root;
    },
    hydrate(context) {
      render(root, context);
    },
    dispose() {
      root = null;
    },
  });
}

function render(root, context) {
  if (!root) {
    return;
  }

  const header = document.createElement("div");
  header.className = "grid gap-2";
  const title = document.createElement("h1");
  title.className = "text-2xl font-black tracking-normal text-gray-950";
  title.textContent = "Superadmin Dashboard";
  const subtitle = document.createElement("p");
  subtitle.className = "max-w-3xl text-sm leading-6 text-[var(--pb-text-muted)]";
  subtitle.textContent = "Dashboard khusus superadmin. Desain dan metrik detail bisa dilanjutkan di fase berikutnya.";
  header.append(title, subtitle);

  const grid = document.createElement("div");
  grid.className = "grid gap-3 md:grid-cols-2";
  grid.append(
    actionCard({
      title: "Release Version Manager",
      body: "Kelola versi release dan bump resource setelah upload diverifikasi.",
      icon: "download",
      label: "Buka Release Manager",
      onClick: () => context.router?.navigate("/admin/release-versions"),
    }),
    actionCard({
      title: "Migration Manager",
      body: "Cek dan jalankan file schema database yang belum dimigrasikan.",
      icon: "database",
      label: "Buka Migration Manager",
      onClick: () => context.router?.navigate("/admin/migrations"),
    })
  );

  root.replaceChildren(header, grid);
}

function actionCard({ title, body, icon, label, onClick }) {
  const card = document.createElement("article");
  card.className = "grid gap-4 rounded-lg border border-[var(--pb-border)] bg-white p-5 shadow-sm";
  const iconWrap = document.createElement("span");
  iconWrap.className = "inline-flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-800";
  iconWrap.append(createIcon(icon, { className: "h-5 w-5" }));
  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  const heading = document.createElement("h2");
  heading.className = "text-lg font-black text-gray-950";
  heading.textContent = title;
  const description = document.createElement("p");
  description.className = "text-sm leading-6 text-[var(--pb-text-muted)]";
  description.textContent = body;
  copy.append(heading, description);
  card.append(iconWrap, copy, Button({ label, variant: "primary", onClick }));
  return card;
}
