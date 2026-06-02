import { tw } from "../theme/tailwindClasses.js";

export function Checkbox({ name, label = "", checked = false } = {}) {
  const wrap = document.createElement("label");
  wrap.className = tw.form.checkLabel;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = tw.form.checkControl;
  input.name = name ?? "";
  input.checked = Boolean(checked);
  wrap.append(input, document.createTextNode(label));
  return wrap;
}
