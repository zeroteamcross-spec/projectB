import { Card } from "../../../ui/composites/card.js";
import { Button } from "../../../ui/primitives/button.js";
import { Input } from "../../../ui/primitives/input.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { formatDate } from "../../../utils/formatDate.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { SellerAffiliateStatusBadge } from "./sellerAffiliateStatusBadge.js";
import { sellerAffiliateService } from "../services/sellerAffiliateService.js";

export function SellerAffiliateForm({
  affiliate = null,
  draftOverride = null,
  mode = "create",
  presentation = "sidebar",
  saving = false,
  checkingSlug = false,
  error = "",
  slugState = null,
  onSubmit = null,
  onDraftChange = null,
  onCreateNew = null,
  onOpenLanding = null,
  onCopyLanding = null,
  onClose = null,
} = {}) {
  const draft = draftOverride ?? affiliate ?? sellerAffiliateService.emptyDraft();
  const card = Card();
  card.classList.add("grid", "min-w-0", "gap-4");
  if (presentation === "sidebar") {
    card.classList.add("xl:sticky", "xl:top-6");
  }

  const header = document.createElement("div");
  header.className = "grid gap-3";

  const headerTop = document.createElement("div");
  headerTop.className = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

  const headerCopy = document.createElement("div");
  headerCopy.className = "grid gap-2";
  headerCopy.append(
    textBlock("text-sm font-semibold text-gray-500", mode === "edit" ? "Edit marketing" : "Marketing baru"),
    textBlock("text-xl font-bold text-gray-950", mode === "edit" ? (draft.user?.name || draft.name || "Marketing") : "Buat marketing seller"),
    textBlock(`text-sm ${tw.text.muted}`, mode === "edit"
      ? "Perbarui username/email login, slug, nomor WhatsApp, status, atau isi password baru untuk reset akses login affiliate."
      : "Tambahkan affiliate dengan username/email login, password, slug unik global, dan nomor WhatsApp yang dipakai di landing."),
  );
  headerTop.append(headerCopy);

  if (onClose) {
    headerTop.append(Button({
      label: "Tutup",
      variant: "secondary",
      disabled: saving,
      onClick: () => onClose?.(),
    }));
  }
  header.append(headerTop);

  if (mode === "edit" && draft.status) {
    const badges = document.createElement("div");
    badges.className = "flex flex-wrap items-center gap-2";
    badges.append(
      SellerAffiliateStatusBadge(draft.status),
      textBlock("text-xs font-medium text-gray-500", `Dibuat ${formatDate(draft.created_at)}`),
    );
    header.append(badges);
  }

  if (error) {
    const errorNode = document.createElement("div");
    errorNode.className = tw.alert.error;
    errorNode.textContent = error;
    card.append(header, errorNode);
  } else {
    card.append(header);
  }

  const form = document.createElement("form");
  form.className = "grid gap-4";

  form.append(
    Input({
      id: "slraf_affiliate_name_input",
      name: "name",
      label: "Nama Marketing",
      value: draft.user?.name ?? draft.name ?? "",
      placeholder: "Contoh: Joko Santoso",
    }),
    Input({
      id: "slraf_affiliate_email_input",
      name: "email",
      label: "Username / email login Marketing",
      type: "email",
      value: draft.user?.email ?? draft.email ?? "",
      placeholder: "affiliate@example.com",
    }),
    Input({
      id: "slraf_affiliate_referral_code_input",
      name: "referral_code",
      label: "Slug marketing",
      value: draft.referral_code ?? "",
      placeholder: "Contoh: JOKO_SANTOSO",
    }),
    Input({
      id: "slraf_affiliate_phone_number_input",
      name: "phone_number",
      label: "Nomor WhatsApp",
      value: draft.phone_number ?? draft.user?.phone_number ?? "",
      placeholder: "Contoh: 081234567890",
    }),
  );

  const passwordGrid = document.createElement("section");
  passwordGrid.className = "grid gap-4 sm:grid-cols-2";
  passwordGrid.append(
    passwordInput({
      id: "slraf_affiliate_password_input",
      name: "password",
      label: mode === "edit" ? "Password baru (opsional)" : "Password",
      value: "",
      placeholder: mode === "edit" ? "Kosongkan jika tidak reset" : "Minimal 6 karakter",
    }),
    passwordInput({
      id: "slraf_affiliate_password_confirmation_input",
      name: "password_confirmation",
      label: "Konfirmasi password",
      value: "",
      placeholder: "Ulangi password",
    }),
  );
  form.append(passwordGrid);

  const statusField = document.createElement("label");
  statusField.className = tw.form.label;
  statusField.append(document.createTextNode("Status marketing"));
  const statusSelect = document.createElement("select");
  statusSelect.id = "slraf_affiliate_status_input";
  statusSelect.name = "status";
  statusSelect.className = tw.form.control;
  [
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Nonaktif" },
  ].forEach((option) => {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    node.selected = (draft.status ?? "active") === option.value;
    statusSelect.append(node);
  });
  statusField.append(statusSelect);
  form.append(statusField);

  const slugHint = document.createElement("div");
  slugHint.className = `grid gap-1 rounded-lg px-3 py-3 text-sm ${slugState?.is_available ? "border border-[color-mix(in_srgb,var(--pb-success)_26%,white)] bg-[color-mix(in_srgb,var(--pb-success)_8%,white)] text-[color-mix(in_srgb,var(--pb-success)_84%,black)]" : "border border-gray-200 bg-gray-50 text-gray-600"}`;
  slugHint.append(
    textBlock("font-semibold", checkingSlug ? "Memeriksa slug..." : "Validasi slug"),
    textBlock("", slugState?.message || sellerAffiliateService.slugHelper(draft.referral_code)),
  );
  form.append(slugHint);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    onSubmit?.({
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      referral_code: String(formData.get("referral_code") ?? "").trim(),
      phone_number: String(formData.get("phone_number") ?? "").trim(),
      status: String(formData.get("status") ?? "active"),
      password: String(formData.get("password") ?? ""),
      password_confirmation: String(formData.get("password_confirmation") ?? ""),
    });
  });
  form.addEventListener("input", () => onDraftChange?.(collectFormDraft(form)));
  form.addEventListener("change", () => onDraftChange?.(collectFormDraft(form)));

  const actions = document.createElement("div");
  actions.className = "flex flex-col gap-2 sm:flex-row sm:flex-wrap";
  const submitButton = Button({
    label: saving ? "Menyimpan..." : mode === "edit" ? "Simpan perubahan" : "Buat marketing",
    disabled: saving,
    onClick: () => form.requestSubmit(),
  });
  submitButton.id = "slraf_affiliate_submit_button";
  actions.append(submitButton);

  if (mode === "edit") {
    const newButton = Button({
      label: "Marketing baru",
      variant: "secondary",
      disabled: saving,
      onClick: () => onCreateNew?.(),
    });
    newButton.id = "slraf_affiliate_new_button";
    actions.append(newButton);
  }

  form.append(actions);
  card.append(form);

  if (mode === "edit" && draft.referral_code) {
    const landing = document.createElement("div");
    landing.className = `grid gap-3 ${tw.surface.inset}`;
    landing.append(
      textBlock("text-xs font-semibold text-gray-500", "Link landing affiliate"),
      textBlock("break-all text-sm font-medium text-gray-900", sellerAffiliateService.landingUrl(draft.referral_code)),
    );

    const landingActions = document.createElement("div");
    landingActions.className = "flex flex-col gap-2 sm:flex-row sm:flex-wrap";
    landingActions.append(
      Button({ label: "Buka landing", variant: "secondary", onClick: () => onOpenLanding?.(draft) }),
      Button({ label: "Copy link", variant: "secondary", onClick: () => onCopyLanding?.(draft) }),
    );
    landing.append(landingActions);
    card.append(landing);
  }

  if (mode === "create" && !draft.referral_code && !draft.name) {
    card.append(EmptyState({
      title: "Landing marketing akan siap setelah disimpan",
      description: "Slug yang lolos validasi akan langsung bisa dipakai di route publik #/af/:slug.",
    }));
  }

  return card;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = className;
  node.textContent = text;
  return node;
}

function collectFormDraft(form) {
  const formData = new FormData(form);
  return {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    referral_code: String(formData.get("referral_code") ?? ""),
    phone_number: String(formData.get("phone_number") ?? ""),
    status: String(formData.get("status") ?? "active"),
    password: String(formData.get("password") ?? ""),
    password_confirmation: String(formData.get("password_confirmation") ?? ""),
  };
}

function passwordInput({ id = "", name = "", label = "", value = "", placeholder = "" } = {}) {
  const wrap = document.createElement("label");
  wrap.className = tw.form.label;
  wrap.append(document.createTextNode(label));

  const control = document.createElement("span");
  control.className = "relative block min-w-0";

  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = "password";
  input.className = `${tw.form.control} pr-11`;
  input.value = value ?? "";
  input.placeholder = placeholder;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-lg text-[var(--pb-text-muted)] transition hover:bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,transparent)] hover:text-[var(--pb-text)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  toggle.setAttribute("aria-label", `Lihat ${label.toLowerCase()}`);
  toggle.title = `Lihat ${label.toLowerCase()}`;
  toggle.append(createIcon("eye", { className: "h-4 w-4" }));
  toggle.addEventListener("click", () => {
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    toggle.replaceChildren(createIcon(visible ? "eye" : "eyeSlash", { className: "h-4 w-4" }));
    toggle.setAttribute("aria-label", `${visible ? "Lihat" : "Sembunyikan"} ${label.toLowerCase()}`);
    toggle.title = `${visible ? "Lihat" : "Sembunyikan"} ${label.toLowerCase()}`;
  });

  control.append(input, toggle);
  wrap.append(control);
  return wrap;
}
