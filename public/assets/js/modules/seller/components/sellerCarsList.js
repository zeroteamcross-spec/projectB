import { Button } from "../../../ui/primitives/button.js";
import { DataTable } from "../../../ui/composites/dataTable.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { SellerListingStatusBadge } from "./sellerListingStatusBadge.js";
import { SellerInspectionStatusBadge } from "./sellerInspectionStatusBadge.js";

export function SellerCarsList({
  cars = [],
  onCreate = null,
  onEdit = null,
  onArchive = null,
  onImages = null,
  onInspection = null,
  pagination = null,
} = {}) {
  const shell = document.createElement("section");
  shell.id = "slrc_list_section";
  shell.className = "grid min-w-0 gap-4";
  shell.dataset.ds = "seller.cars.list";

  shell.append(DataTable({
    shellId: "slrc_cars_table_section",
    title: "Daftar mobil",
    subtitle: `${cars.length} listing cocok dengan filter aktif`,
    icon: tableIcon(),
    columns: carColumns({ onEdit, onArchive, onImages, onInspection }),
    rows: cars,
    emptyTitle: "Mobil belum tersedia",
    emptyDescription: "Buat listing mobil pertama agar buyer bisa melihat katalog dari showroom.",
    tableMinWidth: "min-w-[1040px]",
    mobileMode: "stack",
    getRowKey: (car) => car.id,
    mobileCardId: (car) => `slrc_car_row_${car.id}_section`,
    mobileCardTitle: (car) => carTitle(car),
    mobileCardSubtitle: (car) => carMeta(car),
    mobileCardBadges: (car) => [
      SellerListingStatusBadge({ status: car.listing_status }),
      SellerInspectionStatusBadge({ status: car.inspection_summary_status ?? "not_checked", type: "summary" }),
    ],
    mobileCardFields: (car) => [
      { label: "Harga", value: formatCurrency(car.price_discount || car.price_cash || 0) },
      { label: "Mileage", value: `${Number(car.mileage_km ?? 0).toLocaleString("id-ID")} km` },
      { label: "Lokasi", value: car.location_name || "-" },
    ],
    mobileCardActions: (car) => actionButtons(car, { onEdit, onArchive, onImages, onInspection }),
    pagination,
  }));

  if (!cars.length) {
    const action = document.createElement("section");
    action.id = "slrc_empty_actions_section";
    action.className = "flex justify-center";
    const create = Button({ label: "Buat listing pertama", onClick: onCreate });
    create.id = "slrc_empty_create_car_button";
    create.prepend(createIcon("plus", { className: "h-4 w-4" }));
    action.append(create);
    shell.append(action);
  }

  return shell;
}

function carColumns({ onEdit, onArchive, onImages, onInspection }) {
  return [
    {
      label: "Mobil",
      key: "identity",
      render: (car) => {
        const wrap = document.createElement("section");
        wrap.id = `slrc_car_identity_${car.id}_section`;
        wrap.className = "grid min-w-0 gap-1";
        wrap.append(
          textNode("p", "break-words text-sm font-black text-gray-950", carTitle(car)),
          textNode("p", "break-words text-xs font-semibold leading-5 text-gray-500", carMeta(car)),
        );
        return wrap;
      },
    },
    {
      label: "Status",
      key: "listing_status",
      render: (car) => {
        const wrap = document.createElement("section");
        wrap.id = `slrc_car_status_${car.id}_section`;
        wrap.className = "flex flex-wrap gap-2";
        wrap.append(
          SellerListingStatusBadge({ status: car.listing_status }),
          SellerInspectionStatusBadge({ status: car.inspection_summary_status ?? "not_checked", type: "summary" }),
        );
        return wrap;
      },
    },
    {
      label: "Harga",
      key: "price",
      render: (car) => textNode("span", "text-sm font-black text-gray-950", formatCurrency(car.price_discount || car.price_cash || 0)),
    },
    {
      label: "Mileage",
      key: "mileage_km",
      render: (car) => textNode("span", "text-sm font-semibold text-gray-700", `${Number(car.mileage_km ?? 0).toLocaleString("id-ID")} km`),
    },
    {
      label: "Lokasi",
      key: "location_name",
      render: (car) => textNode("span", "break-words text-sm font-semibold text-gray-700", car.location_name || "-"),
    },
    {
      label: "Aksi",
      key: "actions",
      cellClassName: "px-4 py-4 align-top",
      render: (car) => actionButtons(car, { onEdit, onArchive, onImages, onInspection }),
    },
  ];
}

function actionButtons(car, { onEdit, onArchive, onImages, onInspection }) {
  const carId = car?.id ?? "unknown";
  const actions = document.createElement("section");
  actions.id = `slrc_car_actions_${carId}_section`;
  actions.className = "flex flex-wrap gap-2";

  const edit = Button({ label: "Edit", variant: "secondary", onClick: () => onEdit?.(car) });
  edit.id = `slrc_edit_car_button_${carId}`;
  edit.prepend(createIcon("edit", { className: "h-4 w-4" }));

  const images = Button({ label: "Foto", variant: "secondary", onClick: () => onImages?.(car) });
  images.id = `slrc_car_images_button_${carId}`;
  images.prepend(createIcon("image", { className: "h-4 w-4" }));

  const inspection = Button({ label: "Inspeksi", variant: "secondary", onClick: () => onInspection?.(car) });
  inspection.id = `slrc_car_inspection_button_${carId}`;
  inspection.prepend(createIcon("eye", { className: "h-4 w-4" }));

  actions.append(edit, images, inspection);

  if (car.listing_status !== "archived") {
    const archive = Button({ label: "Archive", variant: "danger", onClick: () => onArchive?.(car) });
    archive.id = `slrc_archive_car_button_${carId}`;
    archive.prepend(createIcon("folder", { className: "h-4 w-4" }));
    actions.append(archive);
  }

  return actions;
}

function carTitle(car) {
  return [car.brand_name, car.model_name, car.sub_model_name].filter(Boolean).join(" ") || "Mobil";
}

function carMeta(car) {
  return [car.registration_date?.slice(0, 4), labelize(car.transmission), car.primary_color, car.license_plate_number]
    .filter(Boolean)
    .join(" | ") || "Detail listing belum lengkap";
}

function tableIcon() {
  const icon = document.createElement("span");
  icon.className = "grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--pb-brand-accent)_28%,white)] text-[var(--pb-brand-secondary)]";
  icon.append(createIcon("table", { className: "h-4 w-4" }));
  return icon;
}

function labelize(value) {
  return String(value ?? "").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}
