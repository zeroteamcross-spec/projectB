import { Button } from "../primitives/button.js";

/**
 * Batal + Simpan pair meant to replace a modal's default close (X) button,
 * via modal.js's `headerActions` option — so the actions stay visible without
 * scrolling down through a long form, instead of being buried at the bottom.
 *
 * The submit button lives outside the <form> (it's a header, not a footer of
 * the form), so it targets the form by id via the standard HTML `form`
 * attribute rather than relying on being a descendant of it.
 */
export function ModalHeaderFormActions({
  formId,
  idPrefix,
  cancelLabel = "Batal",
  submitLabel = "Simpan",
  savingLabel = "Menyimpan...",
  saving = false,
  onCancel,
} = {}) {
  const wrap = document.createElement("div");
  wrap.className = "flex shrink-0 items-center gap-2";

  const cancel = Button({ label: cancelLabel, variant: "secondary", disabled: saving, onClick: onCancel });
  cancel.type = "button";
  cancel.id = `${idPrefix}_cancel_button`;

  const submit = Button({ label: saving ? savingLabel : submitLabel, disabled: saving });
  submit.type = "submit";
  submit.setAttribute("form", formId);
  submit.id = `${idPrefix}_submit_button`;

  wrap.append(cancel, submit);
  return wrap;
}

export function ModalHeaderActions({ children = [] } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "flex max-w-full flex-wrap items-center justify-end gap-2";
  wrap.append(...children.filter(Boolean));
  return wrap;
}
