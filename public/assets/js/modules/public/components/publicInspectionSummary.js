import { Badge } from "../../../ui/primitives/badge.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function PublicInspectionSummary({ car, inspection } = {}) {
  const section = document.createElement("section");
  section.className = "grid gap-4 rounded-[28px] border border-white/75 bg-white/95 p-5 shadow-card backdrop-blur";

  const items = Array.isArray(inspection?.items) ? inspection.items : [];
  const hasPublishedReport = Boolean(inspection?.id) && ["published", "completed"].includes(String(inspection?.report_status ?? "").toLowerCase());

  section.append(header({ car, inspection, hasPublishedReport, itemCount: items.length }));

  if (!hasPublishedReport || items.length === 0) {
    section.append(emptyInspection(car));
    return section;
  }

  section.append(summaryGrid(items, inspection), notesBlock(inspection), groupedItems(items));
  return section;
}

function header({ car, inspection, hasPublishedReport, itemCount }) {
  const wrap = document.createElement("div");
  wrap.className = "flex items-start justify-between gap-3";

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";

  const eyebrow = document.createElement("span");
  eyebrow.className = "text-[10px] font-semibold uppercase tracking-normal text-[var(--pb-brand-secondary)]";
  eyebrow.textContent = "Kondisi kendaraan";

  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = "Laporan inspeksi";

  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = hasPublishedReport
    ? `${itemCount} item inspeksi tersedia untuk unit ini.`
    : "Data inspeksi belum tersedia untuk listing ini.";

  copy.append(eyebrow, title, body);

  wrap.append(copy, Badge({
    label: reportLabel(inspection?.report_status ?? car?.inspection_summary_status),
    variant: hasPublishedReport ? "success" : "default",
  }));
  return wrap;
}

function summaryGrid(items, inspection) {
  const counts = countStatuses(items);
  const grid = document.createElement("div");
  grid.className = "grid grid-cols-2 gap-3 sm:grid-cols-4";
  grid.append(
    metricCard("clipboard", "Total dicek", String(items.length), "default"),
    metricCard("circleCheck", "Baik", String(counts.good), "success"),
    metricCard("triangleWarning", "Kurang baik", String(counts.fair), "warning"),
    metricCard("circleXmark", "Tidak baik", String(counts.bad), "danger"),
  );

  if (inspection?.inspected_at) {
    const date = document.createElement("p");
    date.className = "col-span-full text-[10px] font-semibold text-gray-500";
    date.textContent = `Tanggal inspeksi: ${new Date(inspection.inspected_at).toLocaleDateString("id-ID")}`;
    grid.append(date);
  }

  return grid;
}

function metricCard(iconName, label, value, variant) {
  const card = document.createElement("div");
  card.className = "grid min-w-0 gap-2 rounded-[20px] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-3";

  const icon = document.createElement("span");
  icon.className = `inline-flex h-9 w-9 items-center justify-center rounded-full ${metricIconClass(variant)}`;
  icon.append(createIcon(iconName, { className: "block h-4 w-4 leading-none" }));

  const number = document.createElement("strong");
  number.className = "text-lg font-black leading-none text-gray-950";
  number.textContent = value;

  const caption = document.createElement("span");
  caption.className = "text-[10px] font-semibold text-gray-500";
  caption.textContent = label;

  card.append(icon, number, caption);
  return card;
}

function notesBlock(inspection) {
  const notes = document.createElement("div");
  notes.className = "grid gap-2 rounded-[22px] bg-gray-50 p-4 text-xs text-gray-700";
  notes.append(
    summaryRow("Status laporan", reportLabel(inspection?.report_status)),
    summaryRow("Nomor laporan", inspection?.id ? `#${inspection.id}` : "-"),
    summaryRow("Catatan umum", inspection?.summary_notes || "-"),
  );
  return notes;
}

function groupedItems(items) {
  const groups = groupBySection(items);
  const wrap = document.createElement("div");
  wrap.className = "grid gap-3";

  groups.forEach((group) => {
    const box = document.createElement("div");
    box.className = "grid gap-2 rounded-[22px] border border-[var(--pb-border)] bg-white p-3";

    const title = document.createElement("h3");
    title.className = "text-xs font-bold text-gray-950";
    title.textContent = sectionLabel(group.name);
    box.append(title);

    group.items.forEach((item) => {
      box.append(inspectionItem(item));
    });

    wrap.append(box);
  });

  return wrap;
}

function inspectionItem(item) {
  const row = document.createElement("div");
  row.className = "grid gap-2 rounded-[18px] bg-gray-50 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start";

  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";

  const title = document.createElement("p");
  title.className = "break-words text-xs font-semibold text-gray-900";
  title.textContent = item?.item_name_snapshot || item?.template?.item_name || "Item inspeksi";

  const note = document.createElement("p");
  note.className = "break-words text-[10px] leading-5 text-gray-500";
  note.textContent = item?.notes || item?.description || "Tidak ada catatan tambahan.";

  copy.append(title, note);
  row.append(copy, Badge(statusBadge(item?.result_status)));
  return row;
}

function emptyInspection(car) {
  const empty = document.createElement("div");
  empty.className = "grid gap-3 rounded-[22px] border border-dashed border-[var(--pb-border-strong)] bg-[var(--pb-surface-muted)] p-5 text-center";

  const icon = document.createElement("span");
  icon.className = "mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] text-[var(--pb-brand-secondary)]";
  icon.append(createIcon("clipboard", { className: "block h-5 w-5 leading-none" }));

  const title = document.createElement("h3");
  title.className = "text-sm font-bold text-gray-950";
  title.textContent = "Data inspeksi belum tersedia";

  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = car?.inspection_summary_status
    ? `Status ringkas listing: ${reportLabel(car.inspection_summary_status)}.`
    : "Showroom belum mempublikasikan laporan inspeksi untuk unit ini.";

  empty.append(icon, title, body);
  return empty;
}

function summaryRow(label, value) {
  const row = document.createElement("div");
  row.className = "flex items-start justify-between gap-3";

  const caption = document.createElement("span");
  caption.className = "text-gray-500";
  caption.textContent = label;

  const content = document.createElement("span");
  content.className = "max-w-[65%] break-words text-right font-semibold text-gray-900";
  content.textContent = value || "-";

  row.append(caption, content);
  return row;
}

function countStatuses(items) {
  return items.reduce((acc, item) => {
    const status = normalizeStatus(item?.result_status);
    if (status === "good") acc.good += 1;
    if (status === "fair") acc.fair += 1;
    if (status === "bad") acc.bad += 1;
    return acc;
  }, { good: 0, fair: 0, bad: 0 });
}

function groupBySection(items) {
  const groups = new Map();
  items.forEach((item) => {
    const section = item?.template?.category_name || "general";
    if (!groups.has(section)) {
      groups.set(section, []);
    }
    groups.get(section).push(item);
  });

  return [...groups.entries()].map(([name, groupItems]) => ({ name, items: groupItems }));
}

function statusBadge(value) {
  const status = normalizeStatus(value);
  if (status === "good") {
    return { label: "Baik", variant: "success" };
  }
  if (status === "fair") {
    return { label: "Kurang baik", variant: "warning" };
  }
  if (status === "bad") {
    return { label: "Tidak baik", variant: "danger" };
  }
  return { label: "Belum tersedia", variant: "default" };
}

function metricIconClass(variant) {
  if (variant === "success") return "bg-[color-mix(in_srgb,var(--pb-success)_15%,white)] text-[var(--pb-success)]";
  if (variant === "warning") return "bg-[color-mix(in_srgb,var(--pb-warning)_15%,white)] text-[var(--pb-warning)]";
  if (variant === "danger") return "bg-[color-mix(in_srgb,var(--pb-danger)_12%,white)] text-[var(--pb-danger)]";
  return "bg-[var(--pb-surface-card)] text-[var(--pb-brand-secondary)]";
}

function normalizeStatus(value) {
  return String(value ?? "").toLowerCase();
}

function reportLabel(value) {
  const status = normalizeStatus(value);
  if (status === "published") return "Published";
  if (status === "completed") return "Completed";
  if (status === "draft") return "Draft";
  if (status === "not_checked") return "Belum tersedia";
  if (!status || status === "-") return "Belum tersedia";
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function sectionLabel(value) {
  return String(value || "general")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
