import { tw } from "../theme/tailwindClasses.js";
import { ensureControlId } from "../../utils/controlIds.js";

export function Radio({ id = "", name, label = "", value = "", checked = false } = {}) {
  const wrap = document.createElement("label");
  wrap.className = tw.form.checkLabel;
  const input = document.createElement("input");
  input.type = "radio";
  input.className = tw.form.radioControl;
  input.name = name ?? "";
  input.value = value;
  input.checked = Boolean(checked);
  ensureControlId(input, id);
  wrap.append(input, document.createTextNode(label));
  return wrap;
}
