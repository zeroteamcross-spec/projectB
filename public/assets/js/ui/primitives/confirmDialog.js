import { Button } from "./button.js";
import { closeModal, openModal } from "./modal.js";
import { createIcon } from "../../theme/iconRegistry.js";

export function confirmDialog({
  title = "Konfirmasi",
  message = "Lanjutkan aksi ini?",
  description = "",
  confirmLabel = "Lanjutkan",
  cancelLabel = "Batal",
  tone = "danger",
  key = "shared-confirm-dialog",
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      closeModal({ notify: false });
      resolve(value);
    };

    const content = document.createElement("section");
    content.id = "pb_confirm_dialog_section";
    content.className = "grid gap-4";

    const card = document.createElement("section");
    card.id = "pb_confirm_dialog_card_section";
    const config = toneClass(tone);
    card.className = [
      "relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3 overflow-hidden rounded-[1.25rem] border px-4 py-4 shadow-[0_22px_70px_rgba(15,23,42,0.14)] backdrop-blur-xl",
      config.shell,
    ].join(" ");

    const accent = document.createElement("span");
    accent.className = [
      "absolute inset-y-3 left-0 w-1 rounded-r-full",
      config.accent,
    ].join(" ");

    const icon = document.createElement("span");
    icon.className = [
      "grid h-10 w-10 shrink-0 place-items-center rounded-2xl border bg-white shadow-sm",
      config.icon,
    ].join(" ");
    icon.append(createIcon(toneIcon(tone), { className: "h-4 w-4" }));

    const copy = document.createElement("section");
    copy.id = "pb_confirm_dialog_copy_section";
    copy.className = "grid min-w-0 gap-1 pr-1";
    const heading = document.createElement("h3");
    heading.className = "break-words text-xs font-black leading-5 text-gray-950";
    heading.textContent = title;
    const text = document.createElement("p");
    text.className = "break-words text-xs font-semibold leading-5 text-gray-600";
    text.textContent = message;
    copy.append(heading, text);
    if (description) {
      const note = document.createElement("p");
      note.className = "break-words text-[10px] font-semibold leading-5 text-gray-500";
      note.textContent = description;
      copy.append(note);
    }
    card.append(accent, icon, copy);

    const actions = document.createElement("section");
    actions.id = "pb_confirm_dialog_actions_section";
    actions.className = "grid gap-2 sm:grid-cols-2";
    const cancel = Button({ label: cancelLabel, variant: "secondary", onClick: () => settle(false) });
    cancel.id = "pb_confirm_cancel_button";
    cancel.className = `${cancel.className} min-h-11 rounded-full`;
    const confirm = Button({ label: confirmLabel, variant: tone === "danger" ? "danger" : "primary", onClick: () => settle(true) });
    confirm.id = "pb_confirm_submit_button";
    confirm.className = [
      confirm.className,
      "min-h-11 rounded-full px-5",
      tone === "danger" ? "shadow-[0_16px_40px_rgba(185,28,28,0.20)]" : "",
    ].filter(Boolean).join(" ");
    confirm.prepend(createIcon(tone === "danger" ? "trash" : "circleCheck", { className: "h-4 w-4" }));
    actions.append(cancel, confirm);

    content.append(card, actions);

    openModal(content, {
      key,
      title: "",
      description: "",
      size: "md",
      footer: null,
      panelId: "pb_confirm_dialog_panel_section",
      bodyId: "pb_confirm_dialog_modal_body_section",
      panelClassName: "max-w-md border-white/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(250,244,237,0.92),rgba(234,244,249,0.86))]",
      onClose: () => settle(false),
    });
  });
}

function toneClass(tone) {
  if (tone === "danger") {
    return {
      shell: "border-[color-mix(in_srgb,var(--pb-danger)_14%,white)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(251,238,238,0.96),rgba(250,244,237,0.88))]",
      accent: "bg-[var(--pb-danger)]",
      icon: "border-[color-mix(in_srgb,var(--pb-danger)_14%,white)] text-[var(--pb-danger)]",
    };
  }

  return {
    shell: "border-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(234,244,249,0.96),rgba(234,244,249,0.84))]",
    accent: "bg-[var(--pb-brand-primary)]",
    icon: "border-[color-mix(in_srgb,var(--pb-brand-primary)_14%,white)] text-[var(--pb-brand-primary)]",
  };
}

function toneIcon(tone) {
  return tone === "danger" ? "triangleWarning" : "info";
}
