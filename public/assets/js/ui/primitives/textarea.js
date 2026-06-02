import { tw } from "../theme/tailwindClasses.js";

export function Textarea({ id = "", name, label = "", value = "", placeholder = "" } = {}) {
  const wrap = document.createElement("label");
  wrap.className = tw.form.label;
  if (label) {
    wrap.append(document.createTextNode(label));
  }

  const textarea = document.createElement("textarea");
  if (id) {
    textarea.id = id;
  }
  textarea.name = name ?? "";
  textarea.className = tw.form.control;
  textarea.value = value ?? "";
  textarea.placeholder = placeholder;
  wrap.append(textarea);
  return wrap;
}
