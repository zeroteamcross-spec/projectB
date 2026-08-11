export function PublicSellerSummary({ car } = {}) {
  const section = document.createElement("section");
  section.className = "hidden grid gap-4 rounded-[28px] border border-white/75 bg-white/95 p-5 shadow-card backdrop-blur";

  const eyebrow = document.createElement("span");
  eyebrow.className = "text-[10px] font-semibold uppercase tracking-normal text-[var(--pb-brand-secondary)]";
  eyebrow.textContent = "Showroom";

  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = "Ringkasan showroom";

  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = car?.location_name
    ? `Mobil ini terdaftar di area ${car.location_name}.`
    : "Informasi showroom ringkas tersedia dari listing publik.";

  const facts = document.createElement("div");
  facts.className = "grid gap-2 rounded-[22px] bg-gray-50 p-4 text-xs";
  facts.append(
    factRow("Showroom ID", car?.showroom_id ? `#${car.showroom_id}` : "-"),
    factRow("Showroom ID", car?.seller_user_id ? `#${car.seller_user_id}` : "-"),
    factRow("Lokasi", car?.location_name ?? "-")
  );

  section.append(eyebrow, title, body, facts);
  return section;
}

function factRow(label, value) {
  const row = document.createElement("div");
  row.className = "flex items-center justify-between gap-3";

  const caption = document.createElement("span");
  caption.className = "text-gray-500";
  caption.textContent = label;

  const content = document.createElement("span");
  content.className = "font-semibold text-gray-900";
  content.textContent = value;

  row.append(caption, content);
  return row;
}
