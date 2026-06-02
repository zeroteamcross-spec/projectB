import { Button } from "../../../ui/primitives/button.js";
import { Input } from "../../../ui/primitives/input.js";
import { Select } from "../../../ui/primitives/select.js";

export function PublicFilterBottomSheet({
  open = false,
  filters = {},
  options = {},
  onApply = null,
  onClose = null,
  onReset = null,
} = {}) {
  const overlay = document.createElement("div");
  overlay.className = open
    ? "fixed inset-0 z-30 grid items-end overflow-x-clip bg-gray-950/55 p-0 sm:items-center sm:p-4"
    : "hidden";

  const panel = document.createElement("form");
  panel.className = "max-h-[86vh] w-full max-w-full overflow-y-auto rounded-t-[28px] bg-white/95 p-4 shadow-card backdrop-blur sm:mx-auto sm:max-w-xl sm:rounded-[28px] sm:p-5";

  const header = document.createElement("div");
  header.className = "mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

  const copy = document.createElement("div");
  const title = document.createElement("h2");
  title.className = "text-xl font-bold tracking-normal text-gray-950";
  title.textContent = "Filter pencarian";
  const desc = document.createElement("p");
  desc.className = "mt-1 text-sm text-gray-500";
  desc.textContent = "Temukan mobil sesuai kebutuhan Anda.";
  copy.append(title, desc);

  const close = Button({ label: "Tutup", variant: "secondary", onClick: () => onClose?.() });
  header.append(copy, close);

  const fields = document.createElement("div");
  fields.className = "grid gap-4";
  fields.append(
    Select({
      name: "brand_name",
      label: "Merek",
      value: filters.brand_name ?? "",
      options: withEmptyOption(options.brands ?? [], "Semua merek"),
    }),
    Select({
      name: "transmission",
      label: "Transmisi",
      value: filters.transmission ?? "",
      options: withEmptyOption(options.transmissions ?? [], "Semua transmisi"),
    }),
    Select({
      name: "location_name",
      label: "Lokasi",
      value: filters.location_name ?? "",
      options: withEmptyOption(options.locations ?? [], "Semua lokasi"),
    }),
    Input({
      name: "min_price_cash",
      type: "number",
      label: "Harga minimum",
      value: filters.min_price_cash ?? "",
      placeholder: "Contoh 100000000",
    }),
    Input({
      name: "max_price_cash",
      type: "number",
      label: "Harga maksimum",
      value: filters.max_price_cash ?? "",
      placeholder: "Contoh 300000000",
    })
  );

  const actions = document.createElement("div");
  actions.className = "mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2";
  const resetButton = Button({ label: "Reset", variant: "secondary", onClick: () => onReset?.() });
  const applyButton = Button({ label: "Terapkan" });
  applyButton.type = "submit";
  resetButton.classList.add("w-full");
  applyButton.classList.add("w-full");
  actions.append(
    resetButton,
    applyButton
  );

  panel.append(header, fields, actions);
  panel.addEventListener("submit", (event) => {
    event.preventDefault();
    onApply?.(Object.fromEntries(new FormData(panel).entries()));
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      event.stopPropagation();
    }
  });
  overlay.append(panel);
  return overlay;
}

function withEmptyOption(values, label) {
  return [
    { value: "", label },
    ...values.filter(Boolean).map((value) => ({ value, label: value })),
  ];
}
