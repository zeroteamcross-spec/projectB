import { Card } from "../../../ui/composites/card.js";
import { Button } from "../../../ui/primitives/button.js";
import { Textarea } from "../../../ui/primitives/textarea.js";
import { tw } from "../../../ui/theme/tailwindClasses.js";
import { SellerInspectionStatusBadge } from "./sellerInspectionStatusBadge.js";

export function SellerInspectionReportPanel({
  car = null,
  report = null,
  summaryDraft = "",
  progress = { completed: 0, total: 0 },
  dirty = false,
  creating = false,
  publishing = false,
  savingDraft = false,
  savingSummary = false,
  onCreate = null,
  onPublish = null,
  onSaveDraft = null,
  onSummaryChange = null,
  onSummarySave = null,
} = {}) {
  const title = document.createElement("h2");
  title.className = tw.text.sectionTitle;
  title.textContent = "Status inspeksi";

  const description = document.createElement("p");
  description.className = `mt-1 text-sm leading-6 ${tw.text.muted}`;
  description.textContent = "Pilih kondisi item, simpan draft, lalu publish saat checklist lengkap.";

  const heading = document.createElement("div");
  heading.className = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";
  const copy = document.createElement("div");
  copy.append(title, description);
  const badges = document.createElement("div");
  badges.className = "flex flex-wrap gap-2";
  badges.append(SellerInspectionStatusBadge({ status: car?.inspection_summary_status ?? "not_checked", type: "summary" }));
  if (report?.report_status) {
    badges.append(SellerInspectionStatusBadge({ status: report.report_status, type: "report" }));
  }
  heading.append(copy, badges);

  if (!report) {
    const action = document.createElement("div");
    action.className = "mt-5 flex flex-wrap gap-2";
    const createButton = Button({ label: creating ? "Menyiapkan..." : "Mulai isi checklist", variant: "secondary", disabled: creating, onClick: onCreate });
    createButton.id = "slrinsp_create_report_button";
    const saveButton = Button({ label: savingDraft ? "Menyimpan..." : "Simpan Inspeksi", disabled: savingDraft || publishing, onClick: onSaveDraft });
    saveButton.id = "slrinsp_save_draft_button";
    action.append(createButton, saveButton);
    return Card([heading, progressBar(progress), action]);
  }

  const stats = document.createElement("div");
  stats.className = "mt-5 grid gap-3 sm:grid-cols-5";
  stats.append(
    stat("Total item", String(progress.total ?? report.items?.length ?? 0)),
    stat("Terisi", `${progress.completed}/${progress.total}`),
    stat("Perlu dicek", String(progress.fair ?? 0)),
    stat("Bermasalah", String(progress.bad ?? 0)),
    stat("Tidak tersedia", String(progress.notAvailable ?? 0))
  );

  const summary = Textarea({
    name: "summary_notes",
    label: "Catatan ringkas",
    value: summaryDraft ?? report.summary_notes ?? "",
    placeholder: "Contoh: Unit siap jual, minor baret di bumper belakang.",
  });
  summary.className = `${summary.className} mt-5`;
  const summaryInput = summary.querySelector("textarea");
  if (summaryInput) {
    summaryInput.id = "slrinsp_summary_notes_input";
    summaryInput.addEventListener("input", (event) => onSummaryChange?.(event.target.value));
  }

  const actions = document.createElement("div");
  actions.className = "mt-4 grid gap-2 sm:flex sm:flex-wrap sm:justify-end";
  const saveDraftButton = Button({ label: savingDraft ? "Menyimpan..." : "Simpan Inspeksi", variant: "secondary", disabled: savingDraft || publishing, onClick: onSaveDraft });
  saveDraftButton.id = "slrinsp_save_draft_button";
  const saveSummaryButton = Button({ label: savingSummary ? "Menyimpan..." : "Simpan catatan", variant: "secondary", disabled: savingSummary || publishing, onClick: onSummarySave });
  saveSummaryButton.id = "slrinsp_save_summary_button";
  saveSummaryButton.hidden = true;
  saveSummaryButton.classList.add("hidden");
  const publishButton = Button({ label: publishing ? "Publish..." : "Publish report", disabled: publishing || report.report_status === "published", onClick: onPublish });
  publishButton.id = "slrinsp_publish_button";
  actions.append(
    dirty ? dirtyPill() : cleanPill(),
    saveDraftButton,
    saveSummaryButton,
    publishButton
  );

  return Card([heading, stats, progressBar(progress), summary, actions]);
}

function stat(label, value) {
  const node = document.createElement("div");
  node.className = "rounded-lg border border-gray-200 bg-gray-50 p-3";

  const caption = document.createElement("p");
  caption.className = "text-xs font-semibold uppercase tracking-normal text-gray-500";
  caption.textContent = label;

  const content = document.createElement("p");
  content.className = "mt-1 text-xl font-bold tracking-normal text-gray-950";
  content.textContent = value;

  node.append(caption, content);
  return node;
}

function progressBar(progress = {}) {
  const total = Number(progress.total || 0);
  const completed = Number(progress.completed || 0);
  const percent = total ? Math.round((completed / total) * 100) : 0;
  const wrap = document.createElement("section");
  wrap.id = "slrinsp_progress_section";
  wrap.className = "mt-4 grid gap-2";

  const label = document.createElement("div");
  label.className = "flex items-center justify-between text-xs font-bold text-gray-600";
  label.append(document.createTextNode("Progress item"), document.createTextNode(`${completed}/${total}`));

  const track = document.createElement("div");
  track.className = "h-2 overflow-hidden rounded-full bg-gray-100";
  const fill = document.createElement("div");
  fill.className = "h-full rounded-full bg-[var(--pb-brand-secondary)] transition-all";
  fill.style.width = `${percent}%`;
  track.append(fill);
  wrap.append(label, track);
  return wrap;
}

function dirtyPill() {
  const pill = document.createElement("span");
  pill.className = "inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700";
  pill.textContent = "Belum disimpan";
  return pill;
}

function cleanPill() {
  const pill = document.createElement("span");
  pill.className = "inline-flex items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700";
  pill.textContent = "Tersimpan";
  return pill;
}
