export function PublicSpecSummary({ car } = {}) {
  const section = document.createElement("section");
  section.className = "grid gap-4";

  const eyebrow = document.createElement("span");
  eyebrow.className = "text-[11px] font-semibold uppercase tracking-normal text-white";
  eyebrow.textContent = "Ringkasan mobil";

  const title = document.createElement("h2");
  title.className = "text-lg font-bold tracking-normal text-white";
  title.textContent = "Ringkasan spesifikasi";

  const grid = document.createElement("div");
  grid.className = "grid grid-cols-2 gap-3 sm:grid-cols-3";
  grid.append(
    specItem("Tahun", car?.year ?? yearFromDate(car?.registration_date)),
    specItem("Transmisi", normalize(car?.transmission)),
    specItem("Kilometer", car?.mileage_km ? `${Number(car.mileage_km).toLocaleString("id-ID")} km` : "-"),
    specItem("Kursi", car?.seat_count ? `${car.seat_count} kursi` : "-"),
    specItem("Dokumen", normalize(car?.document_type)),
    specItem("Warna", normalize(car?.primary_color)),
    specItem("Kapasitas mesin", car?.engine_capacity_cc ? `${Number(car.engine_capacity_cc).toLocaleString("id-ID")} cc` : "-"),
    specItem("Service book", car?.has_service_book ? "Ada" : "Tidak ada")
  );

  section.append(eyebrow, title, grid);
  return section;
}

function specItem(label, value) {
  const node = document.createElement("div");
  node.className = "rounded-[24px] border border-white/75 bg-white/95 p-4 shadow-card backdrop-blur";

  const caption = document.createElement("p");
  caption.className = "text-xs font-medium text-gray-500";
  caption.textContent = label;

  const content = document.createElement("p");
  content.className = "mt-1 text-sm font-bold tracking-normal text-gray-950";
  content.textContent = value || "-";

  node.append(caption, content);
  return node;
}

function yearFromDate(value) {
  if (!value) {
    return "-";
  }

  const year = new Date(value).getFullYear();
  return Number.isFinite(year) ? String(year) : "-";
}

function normalize(value) {
  if (!value) {
    return "-";
  }

  return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
