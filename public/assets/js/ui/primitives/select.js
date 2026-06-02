import { tw } from "../theme/tailwindClasses.js";

export function Select({ id = "", name, label = "", options = [], value = "" } = {}) {
  const wrap = document.createElement("label");
  wrap.className = tw.form.label;
  if (label) {
    wrap.append(document.createTextNode(label));
  }

  const select = document.createElement("select");
  if (id) {
    select.id = id;
  }
  select.name = name ?? "";
  select.className = tw.form.control;
  options.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    item.selected = option.value === value;
    select.append(item);
  });
  wrap.append(select);
  return wrap;
}
