import { tw } from "../theme/tailwindClasses.js";
import { applyDesignHook } from "../../theme/designStudioHooks.js";
import { ensureControlId } from "../../utils/controlIds.js";

export function Input({ id = "", name, label = "", value = "", type = "text", placeholder = "", designHook = null } = {}) {
  const wrap = document.createElement("label");
  wrap.className = tw.form.label;
  if (label) {
    wrap.append(document.createTextNode(label));
  }

  const input = document.createElement("input");
  input.name = name ?? "";
  input.type = type;
  input.className = tw.form.control;
  input.value = value ?? "";
  input.placeholder = placeholder;
  ensureControlId(input, id);
  applyDesignHook(input, designHook);
  wrap.append(input);
  return wrap;
}
