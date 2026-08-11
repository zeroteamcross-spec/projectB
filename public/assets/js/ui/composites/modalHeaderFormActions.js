import { Button } from "../primitives/button.js";

/**
 * Menitipkan baris aksi sebuah form ke simpul yang dikembalikannya, supaya
 * modal bisa memasangnya di header menggantikan tombol Tutup.
 *
 * Tombolnya tetap dirakit di dalam komponen form -- di sanalah draft dan
 * keadaan saving berada, dan memindahkannya keluar berarti membocorkan isi
 * perut form ke pemanggilnya. Yang berpindah hanya tempat tayangnya.
 *
 * Properti pada simpul DOM sudah jadi kebiasaan di berkas-berkas ini; `dispose`
 * dititipkan dengan cara yang sama di sidebar dan header.
 */
export function titipkanAksiModal(node, actions) {
  node.modalHeaderActions = actions;
  return node;
}

export function aksiModalDari(node) {
  return node?.modalHeaderActions ?? null;
}

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
