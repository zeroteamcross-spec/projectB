import { Button } from "../../../ui/primitives/button.js";
import { Badge } from "../../../ui/primitives/badge.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { showroomsResource } from "../../../resources/showroomsResource.js";
import { activeShowroom } from "../state/activeShowroom.js";

/**
 * Widget mandiri (pola sama dengan SubscriptionMidtransPanel) -- dipasang di
 * halaman Showroom seller. Sengaja RENDER KOSONG kalau seller cuma punya satu
 * cabang, supaya mayoritas seller (semua yang belum punya paket multi-cabang)
 * sama sekali tidak melihat UI ini berubah.
 *
 * Ganti cabang aktif memuat ulang seluruh halaman (window.location.reload())
 * daripada mencoba menyegarkan tiap slot preload satu-satu -- berpindah
 * cabang adalah aksi yang jarang dan disengaja, bukan alur cepat yang perlu
 * dioptimalkan, jadi reload penuh jauh lebih sederhana dan lebih kecil
 * risikonya daripada melacak ulang semua state yang bergantung pada cabang
 * sebelumnya.
 */
export function SellerBranchSwitcher() {
  const root = document.createElement("div");
  root.id = "slrbrn_switcher_section";
  root.className = "grid gap-3";

  let branches = [];
  let loaded = false;

  showroomsResource.mineList()
    .then((result) => {
      branches = Array.isArray(result) ? result : [];
    })
    .catch(() => {
      branches = [];
    })
    .finally(() => {
      loaded = true;
      render();
    });

  return {
    element: root,
    dispose() {},
  };

  function render() {
    root.replaceChildren();

    if (!loaded || branches.length <= 1) {
      return;
    }

    const activeId = activeShowroom.id() ?? branches[0].id;

    const card = document.createElement("section");
    card.id = "slrbrn_switcher_card";
    card.className = "grid gap-3 rounded-[1.5rem] border border-[var(--pb-card-border)] bg-white/85 p-5 shadow-sm";

    const heading = document.createElement("div");
    heading.className = "flex flex-wrap items-center justify-between gap-2";
    heading.append(
      textNode("h2", "text-sm font-black text-gray-950", "Cabang Showroom"),
      Badge({ label: `${branches.length} cabang`, variant: "info" }),
    );
    card.append(heading);

    const grid = document.createElement("div");
    grid.id = "slrbrn_branch_list";
    grid.className = "grid gap-2 sm:grid-cols-2";
    grid.append(...branches.map((branch) => branchCard(branch, activeId)));
    card.append(grid);

    const addButton = Button({
      label: "Tambah Cabang",
      variant: "secondary",
      disabled: true,
      onClick: () => {},
    });
    addButton.id = "slrbrn_add_branch_button";
    addButton.prepend(createIcon("plus", { className: "h-4 w-4" }));
    card.append(
      addButton,
      textNode("p", "text-[10px] text-gray-500", "Upgrade ke paket yang mendukung multi-cabang untuk menambah cabang baru."),
    );

    root.append(card);
  }

  function branchCard(branch, activeId) {
    const isActive = Number(branch.id) === Number(activeId);

    const card = document.createElement("button");
    card.type = "button";
    card.id = `slrbrn_branch_card_${branch.id}`;
    card.className = [
      "grid gap-1 rounded-2xl border p-3 text-left text-xs transition",
      isActive
        ? "border-[var(--pb-brand-primary)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_6%,white)]"
        : "border-[var(--pb-card-border)] bg-gray-50 hover:border-[color-mix(in_srgb,var(--pb-brand-primary)_35%,var(--pb-card-border))]",
    ].join(" ");
    card.append(textNode("p", "font-black text-gray-950", branch.name || `Showroom #${branch.id}`));
    card.append(textNode("p", "text-gray-500", branch.slug || "-"));
    if (isActive) {
      card.append(Badge({ label: "Sedang dikelola", variant: "success" }));
    }

    card.addEventListener("click", () => {
      if (isActive) {
        return;
      }
      activeShowroom.set(branch.id);
      window.location.reload();
    });

    return card;
  }
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
