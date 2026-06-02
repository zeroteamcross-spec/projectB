import { Button } from "../primitives/button.js";
import { createIcon } from "../../theme/iconRegistry.js";
import { tw } from "../theme/tailwindClasses.js";

export function SearchBar({ name = "q", placeholder = "Cari", onSubmit = null } = {}) {
  const form = document.createElement("form");
  form.className = `flex min-w-0 w-full max-w-4xl flex-col gap-2 sm:flex-row ${tw.form.searchWrap}`;

  const input = document.createElement("input");
  input.name = name;
  input.type = "search";
  input.placeholder = placeholder;
  input.className = tw.form.searchInput;

  const button = Button({ label: "Cari" });
  button.prepend(createIcon("search", { className: "h-4 w-4" }));
  button.classList.add("w-full", "sm:w-auto");

  form.append(input, button);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    onSubmit?.(Object.fromEntries(new FormData(form).entries()));
  });
  return form;
}
