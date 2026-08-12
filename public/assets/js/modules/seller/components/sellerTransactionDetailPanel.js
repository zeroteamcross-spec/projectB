import { Card } from "../../../ui/composites/card.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { formatDate } from "../../../utils/formatDate.js";
import { sellerTransactionService } from "../services/sellerTransactionService.js";
import { SellerTransactionStatusBadge } from "./sellerTransactionStatusBadge.js";

export function SellerTransactionDetailPanel({
  transaction = null,
  checklistDraft = {},
  checklistSaving = false,
  onChecklistToggle = null,
  onChecklistNote = null,
  onChecklistDate = null,
  onChecklistSave = null,
  isCancelling = false,
  onCancel = null,
  isReturning = false,
  onReturn = null,
} = {}) {
  if (!transaction) {
    return EmptyState({
      title: "Detail transaksi tidak tersedia",
      description: "Buka transaksi dari daftar showroom yang aktif.",
    });
  }

  const financials = sellerTransactionService.financials(transaction);
  const statusMeta = sellerTransactionService.statusMeta(transaction.transaction_status);
  const layout = document.createElement("div");
  layout.className = "grid min-w-0 gap-4";
  layout.append(
    statusCard(transaction, statusMeta, { isCancelling, onCancel, isReturning, onReturn }),
    fulfillmentChecklistCard({
      transaction,
      checklistDraft,
      checklistSaving,
      onChecklistToggle,
      onChecklistNote,
      onChecklistDate,
      onChecklistSave,
    }),
    identityCard("Buyer", [
      ["Nama", transaction?.buyer?.name ?? "Buyer terdaftar"],
      ["Email", transaction?.buyer?.email ?? "-"],
      ["Kode transaksi", transaction.transaction_code ?? `#${transaction.id ?? "-"}`],
    ]),
    identityCard("Mobil", [
      ["Unit", [transaction?.car?.brand_name, transaction?.car?.model_name].filter(Boolean).join(" ") || `Mobil #${transaction?.car_id ?? "-"}`],
      ["Listing", transaction?.car?.listing_status ?? "-"],
      ["Tipe pembayaran", sellerTransactionService.paymentTypeLabel(transaction.payment_type)],
    ]),
    financialCard(financials),
    identityCard("Tanggal penting", [
      ["Dibuat", formatDate(transaction.created_at)],
      ["Jatuh tempo", formatDate(transaction.expires_at)],
      ["Lunas pada", formatDate(transaction.paid_at)],
    ]),
    paymentLogsCard(transaction.payment_logs ?? [])
  );
  return layout;
}

function fulfillmentChecklistCard({
  transaction,
  checklistDraft = {},
  checklistSaving = false,
  onChecklistToggle = null,
  onChecklistNote = null,
  onChecklistDate = null,
  onChecklistSave = null,
} = {}) {
  const status = String(transaction?.transaction_status ?? "").toLowerCase();
  const checklist = transaction?.fulfillment_checklist ?? [];
  const isPaidLike = ["paid", "completed"].includes(status);
  const shouldShow = status === "completed" && checklist.length > 0;

  if (!shouldShow) {
    return document.createDocumentFragment();
  }

  const doneCount = checklist.filter((item) => Boolean((checklistDraft[item.key] ?? item).is_completed)).length;
  const card = Card();
  card.classList.add("grid", "gap-4");

  const header = document.createElement("div");
  header.className = "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between";
  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = "Proses Transaksi";
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = status === "completed"
    ? "Checklist sudah selesai dan buyer telah menyelesaikan transaksi."
    : "Centang item yang sudah beres agar buyer bisa menyelesaikan transaksi.";
  copy.append(title, body);

  const progress = document.createElement("span");
  progress.className = "inline-flex w-fit items-center rounded-full border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] px-3 py-1 text-[10px] font-black text-[var(--pb-brand-secondary)]";
  progress.textContent = `${doneCount}/${checklist.length} selesai`;
  header.append(copy, progress);
  card.append(header);

  const list = document.createElement("div");
  list.className = "grid gap-3";
  checklist.forEach((item) => {
    list.append(checklistItem({
      item,
      draft: checklistDraft[item.key] ?? item,
      disabled: status === "completed" || !isPaidLike,
      onToggle: onChecklistToggle,
      onNote: onChecklistNote,
      onDate: onChecklistDate,
    }));
  });
  card.append(list);

  const action = Button({
    label: checklistSaving ? "Menyimpan..." : "Simpan Checklist",
    variant: "primary",
    disabled: checklistSaving || status === "completed" || !isPaidLike,
    onClick: onChecklistSave,
    designHook: "shared.button.primary",
  });
  action.id = "slrtx_save_checklist_button";
  action.classList.add("sticky", "bottom-3", "z-10", "w-full", "shadow-[0_16px_42px_rgba(30,129,176,0.28)]", "sm:w-fit", "sm:justify-self-end");
  card.append(action);

  return card;
}

function checklistItem({ item, draft, disabled, onToggle, onNote, onDate }) {
  const row = document.createElement("section");
  row.className = "grid gap-3 rounded-[1rem] border border-[var(--pb-card-border)] bg-gray-50/70 p-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = `slrtx_checklist_${item.key}`;
  checkbox.checked = Boolean(draft?.is_completed);
  checkbox.disabled = disabled;
  checkbox.className = "mt-1 h-4 w-4 rounded border-gray-300 text-[var(--pb-brand-secondary)] focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_45%,white)]";
  checkbox.addEventListener("change", () => onToggle?.(item.key, checkbox.checked));

  const content = document.createElement("div");
  content.className = "grid min-w-0 gap-2";
  const title = document.createElement("label");
  title.htmlFor = checkbox.id;
  title.className = "break-words text-xs font-black text-gray-950";
  title.textContent = item.label ?? item.key;

  if (item.key === "handover_schedule") {
    const dateWrap = document.createElement("label");
    dateWrap.className = "grid min-w-0 gap-1 text-[10px] font-black uppercase tracking-normal text-gray-500";
    dateWrap.textContent = "Tanggal serah terima";

    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.id = `slrtx_checklist_${item.key}_handover_date_input`;
    dateInput.value = draft?.handover_date ?? extractHandoverDate(draft?.notes ?? item.notes ?? "");
    dateInput.disabled = disabled;
    dateInput.className = "min-h-11 min-w-0 rounded-[0.9rem] border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 outline-none transition focus:border-[color-mix(in_srgb,var(--pb-brand-primary)_45%,white)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)] disabled:bg-gray-100 disabled:text-gray-500";
    dateInput.addEventListener("change", () => onDate?.(item.key, dateInput.value));
    dateWrap.append(dateInput);
    content.append(title, dateWrap);
  } else {
    content.append(title);
  }

  const note = document.createElement("textarea");
  note.id = `slrtx_checklist_${item.key}_notes_input`;
  note.value = stripHandoverDate(draft?.notes ?? "");
  note.placeholder = "Catatan showroom";
  note.disabled = disabled;
  note.rows = 2;
  note.className = "min-w-0 resize-y rounded-[0.9rem] border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-800 outline-none transition placeholder:text-[var(--pb-text-muted)] focus:border-[color-mix(in_srgb,var(--pb-brand-primary)_45%,white)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)] disabled:bg-gray-100 disabled:text-gray-500";
  note.addEventListener("input", () => onNote?.(item.key, note.value));

  content.append(note);
  row.append(checkbox, content);
  return row;
}

function extractHandoverDate(notes = "") {
  const match = String(notes).match(/Tanggal serah terima:\s*(\d{4}-\d{2}-\d{2})/i);
  return match?.[1] ?? "";
}

function stripHandoverDate(notes = "") {
  return String(notes)
    .replace(/Tanggal serah terima:\s*\d{4}-\d{2}-\d{2}\s*/i, "")
    .trim();
}

function statusCard(transaction, statusMeta, { isCancelling = false, onCancel = null, isReturning = false, onReturn = null } = {}) {
  const header = document.createElement("div");
  header.className = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  const title = document.createElement("h2");
  title.className = "text-lg font-bold tracking-normal text-gray-950";
  title.textContent = transaction.transaction_code ?? `Transaksi #${transaction.id ?? "-"}`;
  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = statusMeta.description;
  copy.append(title, body);

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap items-center gap-2 sm:justify-end";
  actions.append(SellerTransactionStatusBadge({ status: transaction.transaction_status }));

  if (canSellerCancel(transaction)) {
    const cancel = Button({
      label: isCancelling ? "Membatalkan..." : "Batalkan",
      variant: "secondary",
      disabled: isCancelling,
      onClick: onCancel,
      designHook: "shared.button.secondary",
    });
    cancel.id = "slrtx_cancel_button";
    cancel.classList.add("w-full", "sm:w-fit");
    actions.append(cancel);
  }

  if (canSellerReturn(transaction)) {
    const retur = Button({
      label: isReturning ? "Memproses retur..." : "Retur",
      variant: "danger",
      disabled: isReturning,
      onClick: onReturn,
      designHook: "shared.button.secondary",
    });
    retur.id = "slrtx_return_button";
    retur.classList.add("w-full", "sm:w-fit");
    actions.append(retur);
  }

  header.append(copy, actions);
  return Card(header);
}

function canSellerCancel(transaction) {
  return ["pending_payment", "dp_paid"].includes(String(transaction?.transaction_status ?? "").toLowerCase());
}

// Retur tetap menjadi jalur pengecualian untuk transaksi dp_paid yang sudah selesai.
function canSellerReturn(transaction) {
  return String(transaction?.transaction_status ?? "").toLowerCase() === "dp_paid";
}

function financialCard(financials) {
  return identityCard("Nominal transaksi", [
    ["Total transaksi", formatCurrency(financials.total)],
    [financials.dueNowLabel, formatCurrency(financials.dueNow)],
    ["Sudah dibayar", formatCurrency(financials.paid)],
    ["Sisa", formatCurrency(financials.remaining)],
  ]);
}

function paymentLogsCard(logs = []) {
  if (!logs.length) {
    return identityCard("Riwayat pembayaran", [["Log pembayaran", "Belum ada log pembayaran"]]);
  }

  const wrap = document.createElement("div");
  wrap.className = "grid gap-3";

  const title = document.createElement("h2");
  title.className = "text-base font-bold tracking-normal text-gray-950";
  title.textContent = "Riwayat pembayaran";
  wrap.append(title);

  logs.forEach((log) => {
    wrap.append(identityCard(null, [
      ["Provider", `${log.provider_name ?? "-"} / ${log.payment_method ?? "-"}`],
      ["Status provider", log.transaction_status ?? "-"],
      ["Gross amount", formatCurrency(log.gross_amount ?? 0)],
      ["Waktu log", formatDate(log.logged_at)],
    ]));
  });

  return wrap;
}

function identityCard(title, rows = []) {
  const card = Card();
  card.classList.add("grid", "gap-3");

  if (title) {
    const heading = document.createElement("h2");
    heading.className = "text-base font-bold tracking-normal text-gray-950";
    heading.textContent = title;
    card.append(heading);
  }

  rows.forEach(([label, value]) => {
    const row = document.createElement("div");
    row.className = "grid gap-1 border-b border-[var(--pb-card-border)] pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-start";

    const labelNode = document.createElement("span");
    labelNode.className = "text-xs text-gray-500";
    labelNode.textContent = label;

    const valueNode = document.createElement("span");
    valueNode.className = "break-words text-xs font-semibold text-gray-900 sm:text-right";
    valueNode.textContent = value;

    row.append(labelNode, valueNode);
    card.append(row);
  });

  return card;
}
