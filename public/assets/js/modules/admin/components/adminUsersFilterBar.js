import { Button } from "../../../ui/primitives/button.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";

export function AdminUsersFilterBar({ filters = {}, counts = {}, onSubmit = null } = {}) {
  const form = document.createElement("form");
  form.id = "adusr_filter_section";
  form.className = `grid min-w-0 gap-4 ${tw.section.toolbar} border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(234,244,249,0.72),rgba(250,244,237,0.70))] lg:grid-cols-[minmax(0,1.2fr)_180px_220px_auto]`;

  const heading = document.createElement("div");
  heading.className = "flex min-w-0 items-start gap-3 lg:col-span-4";
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_14px_34px_rgba(30,129,176,0.20)]";
  icon.append(createIcon("filter", { className: "h-4 w-4" }));
  const copy = document.createElement("div");
  copy.className = "grid min-w-0 gap-1";
  copy.append(
    textBlock("text-[10px] font-black uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--pb-brand-primary)_84%,black)]", "User filter"),
    textBlock("text-xs leading-6 text-gray-600", "Saring level user, status, dan keyword supaya review operasional tetap cepat dibaca."),
  );
  heading.append(icon, copy);

  const keyword = inputField({
    id: "adusr_keyword_input",
    name: "keyword",
    value: filters.keyword ?? "",
    placeholder: "Cari nama, email, atau nomor telepon",
  });

  const role = selectField({
    id: "adusr_role_input",
    name: "role",
    value: filters.role ?? "",
    options: [
      { value: "", label: "Semua level user" },
      { value: "buyer", label: "Buyer" },
      { value: "seller", label: "Showroom" },
      { value: "affiliate_admin", label: "Marketing Admin" },
      { value: "admin", label: "Admin" },
    ],
  });

  const status = selectField({
    id: "adusr_status_input",
    name: "status",
    value: filters.status ?? "",
    options: [
      { value: "", label: "Semua status" },
      { value: "pending_approval", label: "Pending approvals" },
      { value: "active", label: "Active" },
      { value: "pending", label: "Pending account" },
      { value: "suspended", label: "Suspended" },
      { value: "approved", label: "Approved" },
    ],
  });

  const actions = document.createElement("div");
  actions.className = "grid gap-2 sm:grid-cols-2 lg:grid-cols-1";

  const submit = Button({ label: "Terapkan", variant: "primary" });
  submit.id = "adusr_apply_filter_button";
  submit.type = "submit";
  submit.prepend(createIcon("search", { className: "h-4 w-4" }));
  const reset = Button({ label: "Reset", variant: "secondary" });
  reset.id = "adusr_reset_filter_button";
  reset.type = "button";
  reset.addEventListener("click", () => {
    keyword.value = "";
    role.value = "";
    status.value = "";
    onSubmit?.({ keyword: "", role: "", status: "" });
  });
  actions.append(submit, reset);

  const chips = document.createElement("div");
  chips.className = "flex flex-wrap gap-2 lg:col-span-4";
  [
    `${counts.total ?? 0} user`,
    `${counts.pendingApproval ?? 0} pending approval`,
    `${counts.active ?? 0} active`,
    `${counts.suspended ?? 0} suspended`,
  ].forEach((label) => chips.append(chip(label)));

  form.append(heading, keyword, role, status, actions, chips);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit?.({
      keyword: keyword.value.trim(),
      role: role.value,
      status: status.value,
    });
  });

  return form;
}

function inputField({ id, name, value = "", placeholder = "" }) {
  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.value = value;
  input.placeholder = placeholder;
  input.className = `${tw.form.control} min-w-0 max-w-full`;
  return input;
}

function selectField({ id, name, value = "", options = [] }) {
  const select = document.createElement("select");
  select.id = id;
  select.name = name;
  select.className = `${tw.form.control} min-w-0 max-w-full`;

  options.forEach((option) => {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    node.selected = option.value === value;
    select.append(node);
  });

  return select;
}

function chip(label) {
  const node = document.createElement("span");
  node.className = tw.interactive.pillIdle;
  node.textContent = label;
  return node;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = className;
  node.textContent = text;
  return node;
}
