import { Badge } from "../../../ui/primitives/badge.js";
import { getListingStatusMeta } from "../../../utils/transactionStatus.js";

export function PublicCarTitleBlock({ car } = {}) {
  const section = document.createElement("section");
  section.className = "grid gap-4 rounded-[28px] border border-white/75 bg-white/95 p-5 shadow-card backdrop-blur";

  const statusRow = document.createElement("div");
  statusRow.className = "flex flex-wrap items-center gap-2";
  const listingMeta = getListingStatusMeta(car?.listing_status ?? "draft");
  statusRow.append(Badge({
    label: listingMeta.label,
    variant: listingMeta.variant,
  }));

  if (car?.stock !== null && car?.stock !== undefined) {
    statusRow.append(Badge({ label: `Stok ${car.stock}`, variant: "info" }));
  }

  const eyebrow = document.createElement("span");
  eyebrow.className = "text-[11px] font-semibold uppercase tracking-normal text-orange-600";
  eyebrow.textContent = "Detail mobil";

  const title = document.createElement("h1");
  title.className = "text-3xl font-bold tracking-normal text-gray-950 sm:text-4xl";
  title.textContent = [car?.brand_name, car?.model_name, car?.sub_model_name].filter(Boolean).join(" ") || `Mobil #${car?.id ?? "-"}`;

  const meta = document.createElement("p");
  meta.className = "text-sm leading-7 text-gray-600";
  meta.textContent = [car?.year ? `Tahun ${car.year}` : "", car?.primary_color, car?.location_name].filter(Boolean).join(" | ") || "Lokasi dan warna belum tersedia";

  const micro = document.createElement("div");
  micro.className = "grid gap-2 sm:grid-cols-3";
  micro.append(
    metaItem("Transmisi", normalizeLabel(car?.transmission ?? "-")),
    metaItem("Kilometer", car?.mileage_km ? `${Number(car.mileage_km).toLocaleString("id-ID")} km` : "-"),
    metaItem("Kursi", car?.seat_count ? `${car.seat_count} kursi` : "-"),
  );

  section.append(eyebrow, statusRow, title, meta, micro);
  return section;
}

function metaItem(label, value) {
  const node = document.createElement("div");
  node.className = "rounded-2xl bg-gray-50 px-3 py-3";

  const caption = document.createElement("p");
  caption.className = "text-[11px] font-medium uppercase tracking-normal text-gray-500";
  caption.textContent = label;

  const content = document.createElement("p");
  content.className = "mt-1 text-sm font-semibold text-gray-900";
  content.textContent = value;

  node.append(caption, content);
  return node;
}

function normalizeLabel(value) {
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
