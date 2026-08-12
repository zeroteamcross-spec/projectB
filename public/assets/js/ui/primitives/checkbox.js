import { tw } from "../theme/tailwindClasses.js";
import { ensureControlId } from "../../utils/controlIds.js";

export function Checkbox({ id = "", name, label = "", checked = false } = {}) {
  const wrap = document.createElement("label");
  wrap.className = tw.form.checkLabel;
  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = tw.form.checkControl;
  input.name = name ?? "";
  input.checked = Boolean(checked);
  ensureControlId(input, id);
  wrap.append(input, document.createTextNode(label));
  return wrap;
}
