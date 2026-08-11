import { Button } from "../../../ui/primitives/button.js";
import { tw } from "../../../ui/theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { SellerListingStatusBadge } from "./sellerListingStatusBadge.js";
import { SellerInspectionStatusBadge } from "./sellerInspectionStatusBadge.js";

export function SellerCarCard({ car, onEdit = null, onArchive = null, onImages = null, onInspection = null } = {}) {
  const cardId = car?.id ?? "unknown";
  const section = document.createElement("section");
  section.id = `slrc_car_card_${cardId}_section`;
  section.className = "group grid min-w-0 gap-4 overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white/90 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur-xl transition duration-150 hover:-translate-y-0.5 hover:border-[var(--pb-border)] hover:shadow-[0_24px_70px_rgba(15,23,42,0.11)] sm:p-5";
  section.dataset.ds = "seller.cars.card";

  const top = document.createElement("section");
  top.id = `slrc_car_card_header_${cardId}_section`;
  top.className = "grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start";

  const identity = document.createElement("section");
  identity.id = `slrc_car_card_identity_${cardId}_section`;
  identity.className = "flex min-w-0 gap-3";

  const icon = document.createElement("span");
  icon.className = "grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_14px_34px_rgba(30,129,176,0.18)]";
  icon.append(createIcon("car", { className: "h-5 w-5" }));

  const copy = document.createElement("section");
  copy.id = `slrc_car_card_copy_${cardId}_section`;
  copy.className = "grid min-w-0 gap-1";

  const title = document.createElement("h2");
  title.className = `${tw.text.sectionTitle} min-w-0 break-words`;
  title.textContent = [car.brand_name, car.model_name, car.sub_model_name].filter(Boolean).join(" ") || "Mobil";

  const meta = document.createElement("p");
  meta.className = `text-xs leading-6 ${tw.text.muted}`;
  meta.textContent = [car.registration_date?.slice(0, 4), labelize(car.transmission), car.primary_color, car.location_name]
    .filter(Boolean)
    .join(" | ") || "Detail listing belum lengkap";

  copy.append(title, meta);
  identity.append(icon, copy);

  const status = document.createElement("section");
  status.id = `slrc_car_card_status_${cardId}_section`;
  status.className = "flex flex-wrap justify-start gap-2 lg:justify-end";
  status.append(
    SellerListingStatusBadge({ status: car.listing_status }),
    SellerInspectionStatusBadge({ status: car.inspection_summary_status ?? "not_checked", type: "summary" })
  );
  top.append(identity, status);

  const facts = document.createElement("section");
  facts.id = `slrc_car_card_facts_${cardId}_section`;
  facts.className = "grid gap-2 sm:grid-cols-3";
  facts.append(
    factNode(`slrc_car_card_price_${cardId}_section`, "Harga", formatCurrency(car.price_discount || car.price_cash || 0), "transaction"),
    factNode(`slrc_car_card_mileage_${cardId}_section`, "Mileage", `${Number(car.mileage_km ?? 0).toLocaleString("id-ID")} km`, "dashboard"),
    factNode(`slrc_car_card_location_${cardId}_section`, "Lokasi", car.location_name || "-", "location")
  );

  const actions = document.createElement("section");
  actions.id = `slrc_car_card_actions_${cardId}_section`;
  actions.className = "grid gap-2 border-t border-gray-100 pt-4 sm:flex sm:flex-wrap sm:justify-end";

  const edit = Button({ label: "Edit", variant: "secondary", onClick: () => onEdit?.(car) });
  edit.id = `slrc_edit_car_button_${cardId}`;
  edit.prepend(createIcon("edit", { className: "h-4 w-4" }));

  const images = Button({ label: "Foto", variant: "secondary", onClick: () => onImages?.(car) });
  images.id = `slrc_car_images_button_${cardId}`;
  images.prepend(createIcon("image", { className: "h-4 w-4" }));

  const inspection = Button({ label: "Inspeksi", variant: "secondary", onClick: () => onInspection?.(car) });
  inspection.id = `slrc_car_inspection_button_${cardId}`;
  inspection.prepend(createIcon("eye", { className: "h-4 w-4" }));

  actions.append(edit, images, inspection);

  if (car.listing_status !== "archived") {
    const archive = Button({ label: "Archive", variant: "danger", onClick: () => onArchive?.(car) });
    archive.id = `slrc_archive_car_button_${cardId}`;
    archive.prepend(createIcon("folder", { className: "h-4 w-4" }));
    actions.append(archive);
  }

  section.append(top, facts, actions);
  return section;
}

function factNode(id, label, value, iconName) {
  const node = document.createElement("section");
  node.id = id;
  node.className = "flex min-w-0 items-center gap-3 rounded-[1rem] border border-gray-100 bg-gray-50/80 px-3 py-2.5";
  const icon = document.createElement("span");
  icon.className = "grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[var(--pb-brand-secondary)] shadow-sm";
  icon.append(createIcon(iconName, { className: "h-3.5 w-3.5" }));
  const copy = document.createElement("span");
  copy.className = "grid min-w-0";
  const caption = document.createElement("span");
  caption.className = "text-[10px] font-black uppercase tracking-[0.12em] text-gray-500";
  caption.textContent = label;
  const content = document.createElement("span");
  content.className = "min-w-0 truncate text-xs font-black text-gray-950";
  content.textContent = value ?? "-";
  copy.append(caption, content);
  node.append(icon, copy);
  return node;
}

function labelize(value) {
  return String(value ?? "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
