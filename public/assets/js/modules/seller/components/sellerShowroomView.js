import { Badge } from "../../../ui/primitives/badge.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { tw } from "../../../ui/theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";

const FIELDS = [
  { key: "name", label: "Nama showroom", icon: "showroom" },
  { key: "public_url", label: "Halaman publik", icon: "link", wide: true },
  { key: "address", label: "Alamat", icon: "location", wide: true },
  { key: "phone_number", label: "Nomor telepon", icon: "phone" },
  { key: "bank_type", label: "Bank type", icon: "bank" },
  { key: "bank_account_number", label: "Bank account number", icon: "creditCard" },
  { key: "bank_account_name", label: "Bank account name", icon: "idCard" },
];

export function SellerShowroomView({ showroom = null, onEdit = null } = {}) {
  if (!showroom) {
    const wrap = document.createElement("section");
    wrap.id = "slrsr_empty_section";
    wrap.className = "grid gap-4 rounded-[2rem] border border-dashed border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,244,237,0.78))] p-5 shadow-[var(--pb-shadow-card)] sm:p-6";
    const action = document.createElement("section");
    action.id = "slrsr_empty_actions_section";
    action.className = "flex justify-center";
    const createButton = Button({ label: "Buat showroom", onClick: onEdit });
    createButton.id = "slrsr_create_showroom_button";
    createButton.prepend(createIcon("plus", { className: "h-4 w-4" }));
    action.append(createButton);
    wrap.append(
      EmptyState({
        title: "Showroom belum tersedia",
        description: "Lengkapi profil showroom agar seller bisa mengelola listing dan transaksi dengan jelas.",
      }),
      action
    );
    return wrap;
  }

  const section = document.createElement("section");
  section.id = "slrsr_view_section";
  section.className = "grid gap-5 rounded-[2rem] border border-white/80 bg-white/86 p-5 shadow-[0_22px_70px_rgba(15,23,42,0.09)] backdrop-blur-xl transition duration-150 sm:p-6";
  section.dataset.ds = "seller.showroom.view";

  const header = document.createElement("section");
  header.id = "slrsr_view_header_section";
  header.className = "flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-start sm:justify-between";

  const titleWrap = document.createElement("div");
  titleWrap.className = "grid min-w-0 gap-2";
  const eyebrow = document.createElement("p");
  eyebrow.className = "text-[10px] font-black uppercase tracking-[0.18em] text-[var(--pb-brand-secondary)]";
  eyebrow.textContent = "Showroom identity";
  const title = document.createElement("h2");
  title.className = `${tw.text.sectionTitle} break-words`;
  title.textContent = showroom.name || "Showroom";
  const subtitle = document.createElement("p");
  subtitle.className = `max-w-2xl text-xs leading-6 ${tw.text.muted}`;
  subtitle.textContent = "Profil showroom dan informasi rekening seller.";
  titleWrap.append(eyebrow, title, subtitle);

  const actions = document.createElement("section");
  actions.id = "slrsr_view_actions_section";
  actions.className = "flex flex-wrap items-center gap-2";
  actions.append(Badge({ label: showroom.phone_number ? "Kontak siap" : "Kontak belum lengkap", variant: showroom.phone_number ? "success" : "warning" }));
  const editButton = Button({ label: "Edit", variant: "secondary", onClick: onEdit });
  editButton.id = "slrsr_edit_showroom_button";
  editButton.prepend(createIcon("edit", { className: "h-4 w-4" }));
  actions.append(editButton);
  header.append(titleWrap, actions);

  const grid = document.createElement("dl");
  grid.className = "grid gap-3 sm:grid-cols-2 xl:grid-cols-3";
  FIELDS.forEach((field) => {
    const item = document.createElement("section");
    item.id = `slrsr_fact_${field.key}_section`;
    item.className = `${field.wide ? "sm:col-span-2 xl:col-span-2" : ""} grid gap-2 rounded-[1.25rem] border border-gray-100 bg-[linear-gradient(135deg,rgba(249,250,251,0.95),rgba(255,255,255,0.88))] px-4 py-4 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:border-[var(--pb-border)] hover:shadow-md`;

    const labelRow = document.createElement("div");
    labelRow.className = "flex items-center gap-2";
    const icon = document.createElement("span");
    icon.className = "grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[var(--pb-surface-muted)] text-[var(--pb-brand-secondary)]";
    icon.append(createIcon(field.icon, { className: "h-3.5 w-3.5" }));
    const label = document.createElement("dt");
    label.className = `text-[10px] font-black uppercase tracking-[0.12em] ${tw.text.muted}`;
    label.textContent = field.label;
    labelRow.append(icon, label);

    const value = document.createElement("dd");
    value.className = "min-w-0 break-words text-xs font-bold leading-6 text-gray-950";
    value.textContent = field.key === "public_url" ? showroomPublicUrl(showroom) || "-" : showroom[field.key] || "-";

    item.append(labelRow, value);
    grid.append(item);
  });

  section.append(header, grid);
  return section;
}

function showroomPublicUrl(showroom = {}) {
  const slug = String(showroom?.slug ?? "").trim();

  if (!slug) {
    return "";
  }

  const hostname = window.location.hostname.replace(/^(showroom|marketing|admin)\./i, "");
  const origin = `${window.location.protocol}//${hostname}${window.location.port ? ":" + window.location.port : ""}`;

  // Alias pendek, sama dengan yang dijanjikan landing page dan panel sukses
  // pendaftaran. Menuju halaman yang sama dengan /#/showrooms/<slug>.
  return `${origin}${window.location.pathname}#/s/${encodeURIComponent(slug)}`;
}
