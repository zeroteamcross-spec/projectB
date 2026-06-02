import { tw } from "../theme/tailwindClasses.js";
import { applyDesignHook } from "../../theme/designStudioHooks.js";

export function NumericInput({
  id = "",
  name,
  label = "",
  value = "",
  placeholder = "",
  helper = "",
  required = false,
  designHook = null,
} = {}) {
  const wrap = document.createElement("label");
  wrap.className = tw.form.label;
  if (label) {
    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    wrap.append(labelNode);
  }

  const visible = document.createElement("input");
  if (id) {
    visible.id = id;
  }
  visible.type = "text";
  visible.inputMode = "numeric";
  visible.autocomplete = "off";
  visible.required = Boolean(required);
  visible.className = tw.form.control;
  visible.placeholder = formatThousands(placeholder);
  visible.value = formatThousands(value);
  visible.dataset.numericFormatted = "thousands";
  applyDesignHook(visible, designHook);

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = name ?? "";
  hidden.value = rawNumericValue(value);
  if (id) {
    hidden.id = `${id}_raw`;
    hidden.dataset.numericVisibleId = id;
  }

  visible.addEventListener("input", () => {
    const caret = visible.selectionStart ?? visible.value.length;
    const digitsBeforeCaret = rawNumericValue(visible.value.slice(0, caret)).length;
    const raw = rawNumericValue(visible.value);
    hidden.value = raw;
    visible.value = formatThousands(raw);
    const nextCaret = caretFromDigits(visible.value, digitsBeforeCaret);
    visible.setSelectionRange(nextCaret, nextCaret);
  });

  visible.addEventListener("blur", () => {
    hidden.value = rawNumericValue(visible.value);
    visible.value = formatThousands(hidden.value);
  });

  wrap.append(visible, hidden);

  if (helper) {
    const helperNode = document.createElement("span");
    helperNode.className = "text-xs font-semibold text-gray-500";
    helperNode.textContent = helper;
    wrap.append(helperNode);
  }

  return wrap;
}

export function rawNumericValue(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function formatThousands(value) {
  const raw = rawNumericValue(value);
  if (!raw) {
    return "";
  }
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function caretFromDigits(formattedValue, digitsBeforeCaret) {
  if (digitsBeforeCaret <= 0) {
    return 0;
  }

  let digitCount = 0;
  for (let index = 0; index < formattedValue.length; index += 1) {
    if (/\d/.test(formattedValue[index])) {
      digitCount += 1;
    }
    if (digitCount >= digitsBeforeCaret) {
      return index + 1;
    }
  }

  return formattedValue.length;
}
