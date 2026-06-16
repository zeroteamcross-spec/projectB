import { createPageLifecycle } from "../../../core/lifecycle.js";
import { carsResource } from "../../../resources/carsResource.js";
import { appStore } from "../../../state/store.js";
import { syncBusinessListing } from "../../../state/sync/businessStatusSync.js";
import { Button } from "../../../ui/primitives/button.js";
import { confirmDialog } from "../../../ui/primitives/confirmDialog.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminMasterService } from "../../admin/services/adminMasterService.js";
import { sellerState } from "../state/sellerState.js";
import { SellerCarForm } from "../components/sellerCarForm.js";
import { SellerCarsList } from "../components/sellerCarsList.js";

const RUNTIME_KEY = "sellerCars";
const CAR_FORM_MODAL_KEY = "seller-cars-form-modal";
const DEFAULT_RUNTIME = {
  mode: "list",
  selectedCar: null,
  form: null,
  saving: false,
  archivingId: null,
  error: "",
  notice: "",
  filters: {
    keyword: "",
    status: "",
  },
  formStep: 1,
};

export function SellerCarsPage() {
  let root = null;
  let unsubscribe = null;

  return createPageLifecycle({
    mount({ router }) {
      ensureRuntime();
      root = document.createElement("div");
      render(root, router);
      return root;
    },
    hydrate({ router }) {
      render(root, router);
    },
    bindEvents({ router }) {
      unsubscribe = appStore.subscribe((state, action) => {
        if (action !== "seller:cars-form") {
          render(root, router);
        }
      });
      return () => unsubscribe?.();
    },
    dispose() {
      closeCarFormModal();
      unsubscribe = null;
      appStore.destroyRuntimeState(RUNTIME_KEY);
    },
  });
}

function render(root, router) {
  if (!root) {
    return;
  }

  const snapshotCars = sellerState.snapshot("cars", { cars: [] });
  const workingCars = sellerState.working("sellerCars", "cars", snapshotCars);
  const cars = workingCars?.cars ?? snapshotCars?.cars ?? [];
  const snapshotBrandMaster = sellerState.snapshot("masterBrand", adminMasterService.normalizeMaster(null));
  const workingBrandMaster = sellerState.working("sellerCars", "masterBrand", snapshotBrandMaster);
  const brandMaster = adminMasterService.normalizeMaster(workingBrandMaster ?? snapshotBrandMaster);
  const brandOptions = brandMaster?.data?.brands ?? [];
  const runtime = runtimeState();
  const isForm = runtime.mode === "create" || runtime.mode === "edit";
  const filteredCars = filterCars(cars, runtime.filters);

  const notice = document.createElement("p");
  notice.id = "slrc_notice_section";
  notice.className = "rounded-[1rem] border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700";
  notice.textContent = runtime.notice;
  notice.hidden = !runtime.notice;

  const error = document.createElement("p");
  error.id = "slrc_error_section";
  error.className = "rounded-[1rem] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700";
  error.textContent = runtime.error;
  error.hidden = !runtime.error || isForm;

  const body = SellerCarsList({
    cars: filteredCars,
    onCreate: () => setRuntime({ mode: "create", selectedCar: null, form: emptyCarForm(), error: "", notice: "", formStep: 1 }),
    onEdit: (car) => setRuntime({ mode: "edit", selectedCar: car, form: carToForm(car), error: "", notice: "", formStep: 1 }),
    onArchive: (car) => archiveCar(car),
    onImages: (car) => router?.navigate(`/seller/cars/${car.id}/images`),
    onInspection: (car) => router?.navigate(`/seller/cars/${car.id}/inspection`),
  });

  const layout = document.createElement("section");
  layout.id = "slrc_page_section";
  layout.className = "grid min-w-0 gap-5";
  layout.dataset.ds = "seller.cars.page";
  layout.append(
    carsHero({ cars, filteredCars, isForm }),
    carsToolbar({ filters: runtime.filters, isForm }),
    notice,
    error,
    body
  );

  root.replaceChildren(layout);

  if (isForm) {
    openCarFormModal({ runtime, brandOptions });
  } else {
    closeCarFormModal();
  }
}

function openCarFormModal({ runtime, brandOptions }) {
  const isEdit = runtime.mode === "edit" && runtime.selectedCar?.id;
  const content = document.createElement("section");
  content.id = "slrc_car_form_modal_content_section";
  content.className = "grid min-w-0 gap-4";
  content.append(SellerCarForm({
    car: isEdit ? runtime.selectedCar : null,
    draft: runtime.form,
    saving: runtime.saving,
    error: runtime.error,
    brandOptions,
    step: runtime.formStep ?? 1,
    onStepChange: (formStep) => setRuntime({ formStep }),
    onCancel: () => setRuntime({ mode: "list", selectedCar: null, form: null, error: "", formStep: 1 }),
    onChange: (form) => setFormState(form),
    onSubmit: (payload) => saveCar(payload),
  }));

  openModal(content, {
    key: CAR_FORM_MODAL_KEY,
    title: isEdit ? "Edit mobil" : "Tambah mobil",
    description: "Pilih brand dan model dari Master Brand, lalu lengkapi detail listing.",
    size: "xl",
    footer: null,
    panelId: "slrc_car_form_modal_section",
    panelClassName: "md:min-w-[900px]",
    headerId: "slrc_car_form_modal_header_section",
    bodyId: "slrc_car_form_modal_body_section",
    closeButtonId: "slrc_car_form_modal_close_button",
    onClose: () => setRuntime({ mode: "list", selectedCar: null, form: null, error: "", formStep: 1 }),
    preserveContentOnSameSignature: true,
    contentSignature: carFormModalSignature(runtime),
  });
}

function closeCarFormModal() {
  const modal = appStore.get("ui.modal", null);
  if (modal?.key === CAR_FORM_MODAL_KEY) {
    closeModal({ notify: false });
  }
}

function carFormModalSignature(runtime) {
  return [
    runtime.mode,
    runtime.selectedCar?.id ?? "new",
    runtime.saving ? "saving" : "idle",
    runtime.error ?? "",
    runtime.formStep ?? 1,
  ].join("|");
}

function carsHero({ cars, filteredCars, isForm }) {
  const section = document.createElement("section");
  section.id = "slrc_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,247,237,0.84),rgba(240,253,250,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-shadow duration-150 sm:p-6 lg:p-7";
  section.dataset.ds = "seller.cars.hero";

  const layout = document.createElement("section");
  layout.id = "slrc_hero_layout_section";
  layout.className = "grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";

  const copy = document.createElement("section");
  copy.id = "slrc_hero_copy_section";
  copy.className = "grid min-w-0 gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f97316,#14b8a6)] text-white shadow-[0_16px_40px_rgba(249,115,22,0.22)]";
  icon.append(createIcon("car", { className: "h-5 w-5" }));
  copy.append(
    icon,
    textNode("p", "text-xs font-black uppercase tracking-[0.18em] text-orange-700", "Seller inventory"),
    textNode("h1", "max-w-3xl text-3xl font-black leading-tight tracking-normal text-gray-950 sm:text-4xl", isForm ? "Form listing mobil" : "Mobil Saya"),
    textNode("p", "max-w-2xl text-sm leading-6 text-gray-600", "Kelola listing mobil, status publikasi, harga, foto, dan inspeksi dari satu halaman operasional.")
  );

  const stats = document.createElement("section");
  stats.id = "slrc_summary_section";
  stats.className = "grid gap-2 sm:grid-cols-3 lg:min-w-[440px]";
  [
    ["Total", cars.length],
    ["Tampil", filteredCars.length],
    ["Published", cars.filter((car) => car.listing_status === "published").length],
  ].forEach(([label, value]) => {
    const stat = document.createElement("section");
    stat.id = `slrc_summary_${slugify(label)}_section`;
    stat.className = "rounded-[1.25rem] border border-white/80 bg-white/78 p-3 shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md";
    stat.append(
      textNode("p", "text-[11px] font-black uppercase tracking-[0.14em] text-gray-500", label),
      textNode("p", "text-2xl font-black text-gray-950", String(value))
    );
    stats.append(stat);
  });

  layout.append(copy, stats);
  section.append(layout);
  return section;
}

function carsToolbar({ filters, isForm }) {
  const section = document.createElement("section");
  section.id = "slrc_toolbar_section";
  section.className = "grid gap-3 rounded-[1.5rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end";
  section.dataset.ds = "seller.cars.toolbar";

  const searchWrap = document.createElement("label");
  searchWrap.className = "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700";
  searchWrap.textContent = "Cari mobil";
  const search = document.createElement("input");
  search.id = "slrc_search_input";
  search.value = filters.keyword ?? "";
  search.placeholder = "Brand, model, warna, lokasi";
  search.className = "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--pb-text)] outline-none transition duration-150 placeholder:text-gray-400 focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      setRuntime({ filters: { ...runtimeState().filters, keyword: search.value.trim() } });
    }
  });
  searchWrap.append(search);

  const statusWrap = document.createElement("label");
  statusWrap.className = "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700";
  statusWrap.textContent = "Status";
  const status = document.createElement("select");
  status.id = "slrc_status_filter_input";
  status.className = "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--pb-text)] outline-none transition duration-150 focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  [
    ["", "Semua"],
    ["draft", "Draft"],
    ["published", "Tersedia"],
    ["reserved", "Terkunci DP"],
    ["sold", "Terjual"],
    ["archived", "Archived"],
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === (filters.status ?? "");
    status.append(option);
  });
  status.addEventListener("change", () => setRuntime({ filters: { ...runtimeState().filters, status: status.value } }));
  statusWrap.append(status);

  const actions = document.createElement("section");
  actions.id = "slrc_toolbar_actions_section";
  actions.className = "grid gap-2 sm:flex sm:flex-wrap sm:justify-end";
  const apply = Button({ label: "Terapkan", variant: "secondary", onClick: () => setRuntime({ filters: { ...runtimeState().filters, keyword: search.value.trim(), status: status.value } }) });
  apply.id = "slrc_apply_filter_button";
  apply.prepend(createIcon("filter", { className: "h-4 w-4" }));
  const main = isForm
    ? Button({ label: "Lihat list", variant: "secondary", onClick: () => setRuntime({ mode: "list", selectedCar: null, form: null, error: "", formStep: 1 }) })
    : Button({ label: "Tambah mobil", onClick: () => setRuntime({ mode: "create", selectedCar: null, form: emptyCarForm(), error: "", notice: "", formStep: 1 }) });
  main.id = isForm ? "slrc_back_to_list_button" : "slrc_add_car_button";
  main.prepend(createIcon(isForm ? "list" : "plus", { className: "h-4 w-4" }));
  actions.append(apply, main);

  section.append(searchWrap, statusWrap, actions);
  return section;
}

async function saveCar(payload) {
  const runtime = runtimeState();
  const isEdit = runtime.mode === "edit" && runtime.selectedCar?.id;
  setRuntime({ saving: true, error: "", notice: "" });

  try {
    const car = isEdit
      ? await carsResource.sellerUpdate(runtime.selectedCar.id, payload)
      : await carsResource.sellerCreate(payload);
    upsertCarInWorkingList(car);
    closeCarFormModal();
    setRuntime({ mode: "list", selectedCar: null, form: null, saving: false, error: "", notice: "Mobil berhasil disimpan.", formStep: 1 });
    showToast(isEdit ? "Mobil berhasil diperbarui." : "Mobil berhasil ditambahkan.", { type: "success" });
  } catch (error) {
    const message = error?.message ?? "Mobil gagal disimpan.";
    setRuntime({
      saving: false,
      error: message,
    });
    showToast(message, { type: "error" });
  }
}

async function archiveCar(car) {
  if (!car?.id) {
    return;
  }
  const confirmed = await confirmDialog({
    title: "Archive mobil",
    message: "Yakin mau archive mobil ini?",
    confirmLabel: "Archive",
    key: `slrc-archive-car-${car.id}`,
  });
  if (!confirmed) {
    return;
  }

  setRuntime({ archivingId: car.id, error: "", notice: "" });

  try {
    const archived = await carsResource.sellerArchive(car.id);
    upsertCarInWorkingList({ ...car, ...archived, listing_status: "archived" });
    setRuntime({ archivingId: null, notice: "Mobil berhasil diarsipkan." });
    showToast("Mobil berhasil diarsipkan.", { type: "success" });
  } catch (error) {
    const message = error?.message ?? "Mobil gagal diarsipkan.";
    setRuntime({
      archivingId: null,
      error: message,
    });
    showToast(message, { type: "error" });
  }
}

function upsertCarInWorkingList(car) {
  const current = sellerState.working("sellerCars", "cars", { cars: [] }) ?? { cars: [] };
  const cars = current.cars ?? [];
  const exists = cars.some((item) => item.id === car.id);
  const nextCars = exists
    ? cars.map((item) => (item.id === car.id ? { ...item, ...car } : item))
    : [car, ...cars];

  const next = {
    ...current,
    cars: nextCars,
  };

  appStore.patchState("working.sellerCars.cars", {
    data: next,
    hydratedAt: Date.now(),
  }, "seller:cars-upsert");
  syncBusinessListing(car, {
    primaryRole: "seller",
    source: "seller:cars-snapshot",
  });
}

function ensureRuntime() {
  if (!appStore.get(`runtime.${RUNTIME_KEY}`, null)) {
    appStore.patchState(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME, "seller:cars-runtime-init");
  }
}

function runtimeState() {
  return appStore.get(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME) ?? DEFAULT_RUNTIME;
}

function setRuntime(patch = {}) {
  appStore.patchState(`runtime.${RUNTIME_KEY}`, {
    ...runtimeState(),
    ...patch,
  }, "seller:cars-runtime");
}

function setFormState(form) {
  appStore.patchState(`runtime.${RUNTIME_KEY}.form`, form, "seller:cars-form");
}

function filterCars(cars = [], filters = {}) {
  const keyword = String(filters.keyword ?? "").trim().toLowerCase();
  const status = String(filters.status ?? "").trim().toLowerCase();

  return cars.filter((car) => {
    if (status && String(car.listing_status ?? "").toLowerCase() !== status) {
      return false;
    }

    if (!keyword) {
      return true;
    }

    return [
      car.brand_name,
      car.model_name,
      car.sub_model_name,
      car.license_plate_number,
      car.primary_color,
      car.transmission,
      car.location_name,
      car.listing_status,
    ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
  });
}

function emptyCarForm() {
  return {
    brand_name: "",
    model_name: "",
    license_plate_number: null,
    sub_model_name: null,
    primary_color: null,
    secondary_color: null,
    color_variation: null,
    document_type: "new",
    transmission: null,
    location_name: null,
    registration_date: null,
    engine_number: null,
    chassis_number: null,
    engine_capacity_cc: null,
    mileage_km: null,
    seat_count: null,
    previous_owner_count: null,
    has_service_book: null,
    key_count: null,
    stock: 1,
    price_cash: null,
    price_discount: null,
    price_credit: null,
    youtube_url: null,
    description: null,
    listing_status: "draft",
    inspection_summary_status: "not_checked",
  };
}

function carToForm(car) {
  return {
    ...emptyCarForm(),
    brand_name: car?.brand_name ?? "",
    model_name: car?.model_name ?? "",
    license_plate_number: car?.license_plate_number ?? null,
    sub_model_name: car?.sub_model_name ?? null,
    primary_color: car?.primary_color ?? null,
    secondary_color: car?.secondary_color ?? null,
    color_variation: car?.color_variation ?? null,
    document_type: car?.document_type ?? "new",
    transmission: car?.transmission ?? null,
    location_name: car?.location_name ?? null,
    registration_date: car?.registration_date ?? null,
    engine_number: car?.engine_number ?? null,
    chassis_number: car?.chassis_number ?? null,
    engine_capacity_cc: car?.engine_capacity_cc ?? null,
    mileage_km: car?.mileage_km ?? null,
    seat_count: car?.seat_count ?? null,
    previous_owner_count: car?.previous_owner_count ?? null,
    has_service_book: car?.has_service_book ?? null,
    key_count: car?.key_count ?? null,
    stock: car?.stock ?? 1,
    price_cash: car?.price_cash ?? null,
    price_discount: car?.price_discount ?? null,
    price_credit: car?.price_credit ?? null,
    youtube_url: car?.youtube_url ?? null,
    description: car?.description ?? null,
    listing_status: car?.listing_status ?? "draft",
    inspection_summary_status: car?.inspection_summary_status ?? "not_checked",
  };
}

function textNode(tagName, className, text) {
  const node = document.createElement(tagName);
  node.className = className;
  node.textContent = text ?? "";
  return node;
}

function slugify(value) {
  return String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}
