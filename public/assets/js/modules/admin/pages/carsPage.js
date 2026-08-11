import { createPageLifecycle } from "../../../core/lifecycle.js";
import { carsResource } from "../../../resources/carsResource.js";
import { appStore } from "../../../state/store.js";
import { syncBusinessListing } from "../../../state/sync/businessStatusSync.js";
import { Button } from "../../../ui/primitives/button.js";
import { confirmDialog } from "../../../ui/primitives/confirmDialog.js";
import { closeModal, openModal } from "../../../ui/primitives/modal.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminMasterService } from "../services/adminMasterService.js";
import { adminCarsBackgroundLoader } from "../services/adminCarsBackgroundLoader.js";
import { SellerCarForm } from "../../seller/components/sellerCarForm.js";
import { SellerCarsList } from "../../seller/components/sellerCarsList.js";

const RUNTIME_KEY = "adminCars";
const CAR_FORM_MODAL_KEY = "admin-cars-form-modal";
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
  pagination: {
    page: 1,
    pageSize: 10,
  },
  formStep: 1,
};

export function AdminCarsPage() {
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
        if (action !== "admin:cars-form") {
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

  const carsPayload = resolveCarsPayload();
  const cars = carsPayload?.cars ?? [];
  const masterPayload = appStore.get("working.adminCars.masterBrand.data", null)
    ?? appStore.get("snapshot.admin.masterBrand.data", null)
    ?? adminMasterService.normalizeMaster(null);
  const brandMaster = adminMasterService.normalizeMaster(masterPayload);
  const brandOptions = brandMaster?.data?.brands ?? [];
  const runtime = runtimeState();
  const isForm = runtime.mode === "create" || runtime.mode === "edit";
  const filteredCars = filterCars(cars, runtime.filters);
  const pagination = paginate(filteredCars, runtime.pagination);

  const notice = message("green", runtime.notice);
  notice.id = "adcars_notice_section";
  const error = message("red", runtime.error);
  error.id = "adcars_error_section";
  error.hidden = !runtime.error || isForm;

  const body = SellerCarsList({
    cars: pagination.items,
    onCreate: () => setRuntime({ mode: "create", selectedCar: null, form: emptyCarForm(), error: "", notice: "", formStep: 1 }),
    onEdit: (car) => setRuntime({ mode: "edit", selectedCar: car, form: carToForm(car), error: "", notice: "", formStep: 1 }),
    onArchive: (car) => archiveCar(car),
    onImages: (car) => router?.navigate(`/admin/cars/${car.id}/images`),
    onInspection: (car) => router?.navigate(`/admin/cars/${car.id}/inspection`),
    pagination: createCarsPagination(pagination),
  });

  const layout = document.createElement("section");
  layout.id = "adcars_page_section";
  layout.className = "grid min-w-0 gap-5";
  layout.dataset.ds = "admin.cars.page";
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

  startBackgroundLoad();
}

function openCarFormModal({ runtime, brandOptions }) {
  const isEdit = runtime.mode === "edit" && runtime.selectedCar?.id;
  const content = document.createElement("section");
  content.id = "adcars_car_form_modal_content_section";
  content.className = "grid min-w-0 gap-4";
  content.append(adminSellerSelector(runtime), SellerCarForm({
    car: isEdit ? runtime.selectedCar : null,
    draft: runtime.form,
    saving: runtime.saving,
    error: runtime.error,
    brandOptions,
    step: runtime.formStep ?? 1,
    showNavigation: false,
    onStepChange: (formStep) => setRuntime({ formStep }),
    onCancel: () => setRuntime({ mode: "list", selectedCar: null, form: null, error: "", formStep: 1 }),
    onChange: (form) => setFormState(form),
    onSubmit: (payload) => saveCar(payload),
  }));

  openModal(content, {
    key: CAR_FORM_MODAL_KEY,
    title: isEdit ? "Edit mobil" : "Tambah mobil",
    description: "Admin dapat mengelola listing seluruh seller/showroom dari katalog ini.",
    size: "xl",
    footer: "custom",
    footerNode: createCarFormFooter(runtime),
    panelId: "adcars_car_form_modal_section",
    rootClassName: "p-0 sm:p-4",
    panelClassName: "h-screen max-h-screen rounded-none sm:h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-2rem)] sm:!max-w-[900px] sm:rounded-[1.5rem] md:min-w-[900px]",
    bodyClassName: "modal-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6",
    headerId: "adcars_car_form_modal_header_section",
    bodyId: "adcars_car_form_modal_body_section",
    closeButtonId: "adcars_car_form_modal_close_button",
    onClose: () => setRuntime({ mode: "list", selectedCar: null, form: null, error: "", formStep: 1 }),
    preserveContentOnSameSignature: true,
    contentSignature: carFormModalSignature(runtime),
  });
}

function createCarFormFooter(runtime) {
  const currentStep = Number(runtime.formStep ?? 1);
  const saving = Boolean(runtime.saving);
  const footer = document.createElement("section");
  footer.id = "adcars_car_form_modal_footer_actions_section";
  footer.className = "flex w-full flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between";

  const cancel = Button({
    label: "Batal",
    variant: "secondary",
    disabled: saving,
    onClick: () => dispatchCarFormEvent("seller-car-form:cancel"),
  });
  cancel.id = "adcars_cancel_car_button";

  const actions = document.createElement("section");
  actions.id = "adcars_car_form_modal_footer_step_actions_section";
  actions.className = "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end";

  const back = Button({
    label: "Kembali",
    variant: "secondary",
    disabled: saving || currentStep === 1,
    onClick: () => dispatchCarFormEvent("seller-car-form:previous"),
  });
  back.id = "adcars_car_form_back_button";
  back.prepend(createIcon("arrowLeft", { className: "h-4 w-4" }));
  setFooterButtonVisibility(back, currentStep !== 1);

  const next = Button({
    label: "Lanjut",
    disabled: saving,
    onClick: () => dispatchCarFormEvent("seller-car-form:next"),
  });
  next.id = "adcars_car_form_next_button";
  next.append(createIcon("arrowRight", { className: "h-4 w-4" }));
  setFooterButtonVisibility(next, currentStep !== 3);

  const submit = Button({
    label: saving ? "Menyimpan..." : "Simpan mobil",
    disabled: saving,
    onClick: () => dispatchCarFormEvent("seller-car-form:submit"),
  });
  submit.id = "adcars_car_form_submit_button";
  submit.prepend(createIcon("circleCheck", { className: "h-4 w-4" }));
  setFooterButtonVisibility(submit, currentStep === 3);

  actions.append(back, next, submit);
  footer.append(cancel, actions);
  return footer;
}

function dispatchCarFormEvent(name) {
  document.querySelector("#slrc_car_form_section")?.dispatchEvent(new Event(name));
}

function setFooterButtonVisibility(button, visible) {
  button.hidden = !visible;
  button.style.display = visible ? "" : "none";
  button.setAttribute("aria-hidden", visible ? "false" : "true");
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
  section.id = "adcars_hero_section";
  section.className = "relative overflow-hidden rounded-[2rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,244,237,0.84),rgba(234,244,249,0.72))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-shadow duration-150 sm:p-6 lg:p-7";
  section.dataset.ds = "admin.cars.hero";

  const layout = document.createElement("section");
  layout.id = "adcars_hero_layout_section";
  layout.className = "grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end";

  const copy = document.createElement("section");
  copy.id = "adcars_hero_copy_section";
  copy.className = "grid min-w-0 gap-3";
  const icon = document.createElement("span");
  icon.className = "grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#1e81b0,#1e81b0)] text-white shadow-[0_16px_40px_rgba(30,129,176,0.22)]";
  icon.append(createIcon("car", { className: "h-5 w-5" }));
  copy.append(
    icon,
    textNode("p", "text-xs font-black uppercase tracking-[0.18em] text-[var(--pb-brand-secondary)]", ""),
    textNode("h1", "max-w-3xl text-3xl font-black leading-tight tracking-normal text-gray-950 sm:text-4xl", isForm ? "Form listing mobil" : "Katalog Mobil"),
    textNode("p", "max-w-2xl text-sm leading-6 text-gray-600", "")
  );

  const stats = document.createElement("section");
  stats.id = "adcars_summary_section";
  stats.className = "grid gap-2 sm:grid-cols-3 lg:min-w-[440px]";
  [
    ["Total", cars.length],
    ["Tampil", filteredCars.length],
    ["Published", cars.filter((car) => car.listing_status === "published").length],
  ].forEach(([label, value]) => {
    const stat = document.createElement("section");
    stat.id = `adcars_summary_${slugify(label)}_section`;
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
  section.id = "adcars_toolbar_section";
  section.className = "grid gap-3 rounded-[1.5rem] border border-white/80 bg-white/80 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.07)] backdrop-blur-xl md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end";
  section.dataset.ds = "admin.cars.toolbar";

  const searchWrap = document.createElement("label");
  searchWrap.className = "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700";
  searchWrap.textContent = "Cari mobil";
  const search = document.createElement("input");
  search.id = "adcars_search_input";
  search.value = filters.keyword ?? "";
  search.placeholder = "Brand, model, warna, lokasi";
  search.className = "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--pb-text)] outline-none transition duration-150 placeholder:text-[var(--pb-text-muted)] focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  search.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      setRuntime({ filters: { ...runtimeState().filters, keyword: search.value.trim() }, pagination: { ...runtimeState().pagination, page: 1 } });
    }
  });
  searchWrap.append(search);

  const statusWrap = document.createElement("label");
  statusWrap.className = "grid min-w-0 gap-1.5 text-sm font-bold text-gray-700";
  statusWrap.textContent = "Status";
  const status = document.createElement("select");
  status.id = "adcars_status_filter_input";
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
  status.addEventListener("change", () => setRuntime({ filters: { ...runtimeState().filters, status: status.value }, pagination: { ...runtimeState().pagination, page: 1 } }));
  statusWrap.append(status);

  const actions = document.createElement("section");
  actions.id = "adcars_toolbar_actions_section";
  actions.className = "grid gap-2 sm:flex sm:flex-wrap sm:justify-end";
  const apply = Button({ label: "Terapkan", variant: "secondary", onClick: () => setRuntime({ filters: { ...runtimeState().filters, keyword: search.value.trim(), status: status.value }, pagination: { ...runtimeState().pagination, page: 1 } }) });
  apply.id = "adcars_apply_filter_button";
  apply.prepend(createIcon("filter", { className: "h-4 w-4" }));
  const main = isForm
    ? Button({ label: "Lihat list", variant: "secondary", onClick: () => setRuntime({ mode: "list", selectedCar: null, form: null, error: "", formStep: 1 }) })
    : Button({ label: "Tambah mobil", onClick: () => setRuntime({ mode: "create", selectedCar: null, form: emptyCarForm(), error: "", notice: "", formStep: 1 }) });
  main.id = isForm ? "adcars_back_to_list_button" : "adcars_add_car_button";
  main.prepend(createIcon(isForm ? "list" : "plus", { className: "h-4 w-4" }));
  actions.append(apply, main);

  section.append(searchWrap, statusWrap, actions);
  return section;
}

async function saveCar(payload) {
  const runtime = runtimeState();
  const isEdit = runtime.mode === "edit" && runtime.selectedCar?.id;
  const sellerUserId = Number(runtime.form?.seller_user_id ?? runtime.selectedCar?.seller_user_id ?? 0);
  if (!sellerUserId) {
    setRuntime({ error: "Pilih seller/showroom terlebih dahulu." });
    showToast("Pilih seller/showroom terlebih dahulu.", { type: "error" });
    return;
  }
  setRuntime({ saving: true, error: "", notice: "" });

  try {
    const adminPayload = {
      ...payload,
      seller_user_id: sellerUserId,
      showroom_id: runtime.form?.showroom_id ?? runtime.selectedCar?.showroom_id ?? null,
    };
    const car = isEdit
      ? await carsResource.adminUpdate(runtime.selectedCar.id, adminPayload)
      : await carsResource.adminCreate(adminPayload);
    upsertCarInWorkingList(car);
    closeCarFormModal();
    setRuntime({ mode: "list", selectedCar: null, form: null, saving: false, error: "", notice: "Mobil berhasil disimpan.", formStep: 1 });
    showToast(isEdit ? "Mobil berhasil diperbarui." : "Mobil berhasil ditambahkan.", { type: "success" });
  } catch (error) {
    const messageText = error?.message ?? "Mobil gagal disimpan.";
    setRuntime({
      saving: false,
      error: messageText,
    });
    showToast(messageText, { type: "error" });
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
    key: `adcars-archive-car-${car.id}`,
  });
  if (!confirmed) {
    return;
  }

  setRuntime({ archivingId: car.id, error: "", notice: "" });

  try {
    const archived = await carsResource.adminArchive(car.id);
    upsertCarInWorkingList({ ...car, ...archived, listing_status: "archived" });
    setRuntime({ archivingId: null, notice: "Mobil berhasil diarsipkan." });
    showToast("Mobil berhasil diarsipkan.", { type: "success" });
  } catch (error) {
    const messageText = error?.message ?? "Mobil gagal diarsipkan.";
    setRuntime({
      archivingId: null,
      error: messageText,
    });
    showToast(messageText, { type: "error" });
  }
}

function upsertCarInWorkingList(car) {
  if (!car?.id) {
    return;
  }
  const current = resolveCarsPayload();
  const cars = current.cars ?? [];
  const exists = cars.some((item) => item.id === car.id);
  const nextCars = exists
    ? cars.map((item) => (item.id === car.id ? { ...item, ...car } : item))
    : [car, ...cars];

  const next = {
    ...current,
    cars: nextCars,
  };

  appStore.patchState("working.adminCars.cars", {
    data: next,
    hydratedAt: Date.now(),
  }, "admin:cars-upsert");
  syncBusinessListing(car, {
    primaryRole: "admin",
    source: "admin:cars-snapshot",
  });
}

function resolveCarsPayload() {
  return largestCarsPayload([
    appStore.get("working.adminCars.cars.data", null),
    appStore.get("snapshot.admin.cars.data", null),
    appStore.get("working.adminDashboard.cars.data", null),
  ]) ?? { cars: [] };
}

function largestCarsPayload(payloads = []) {
  return payloads
    .filter(Boolean)
    .sort((left, right) => normalizeCarsPayload(right).length - normalizeCarsPayload(left).length)[0] ?? null;
}

function normalizeCarsPayload(payload) {
  if (Array.isArray(payload)) {
    return payload.filter(Boolean);
  }
  if (Array.isArray(payload?.cars)) {
    return payload.cars.filter(Boolean);
  }
  if (Array.isArray(payload?.data?.cars)) {
    return payload.data.cars.filter(Boolean);
  }
  return [];
}

function adminSellerSelector(runtime) {
  const usersPayload = appStore.get("working.adminCars.users.data", null)
    ?? appStore.get("snapshot.admin.users.data", null)
    ?? appStore.get("working.adminUsers.users.data", null)
    ?? { users: [] };
  const sellers = normalizeUsers(usersPayload).filter((user) => user.role === "seller");
  const selectedSellerId = String(runtime.form?.seller_user_id ?? runtime.selectedCar?.seller_user_id ?? "");

  const section = document.createElement("section");
  section.id = "adcars_seller_selector_section";
  section.className = "grid gap-2 rounded-[1rem] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-4";

  const label = document.createElement("label");
  label.className = "grid gap-1.5 text-sm font-bold text-gray-700";
  label.textContent = "Seller / showroom";

  const select = document.createElement("select");
  select.id = "adcars_seller_user_id_input";
  select.className = "min-h-11 min-w-0 rounded-[1rem] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--pb-text)] outline-none transition duration-150 focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = sellers.length ? "Pilih seller" : "Seller belum tersedia di preload users";
  placeholder.selected = !selectedSellerId;
  select.append(placeholder);

  sellers.forEach((seller) => {
    const option = document.createElement("option");
    option.value = String(seller.id);
    option.textContent = seller.name || seller.email || `Seller #${seller.id}`;
    option.selected = String(seller.id) === selectedSellerId;
    select.append(option);
  });

  select.addEventListener("change", () => {
    const seller = sellers.find((item) => String(item.id) === select.value);
    setRuntime({
      form: {
        ...(runtimeState().form ?? emptyCarForm()),
        seller_user_id: select.value ? Number(select.value) : null,
        showroom_id: seller?.showroom?.id ?? seller?.showroom_id ?? null,
      },
      error: "",
    });
  });

  const helper = document.createElement("p");
  helper.className = "text-xs font-semibold leading-5 text-[var(--pb-brand-secondary)]";
  helper.textContent = "Wajib dipilih agar listing admin tercatat sebagai milik seller/showroom yang benar.";

  label.append(select);
  section.append(label, helper);
  return section;
}

function normalizeUsers(payload) {
  if (Array.isArray(payload)) {
    return payload.filter(Boolean);
  }
  if (Array.isArray(payload?.users)) {
    return payload.users.filter(Boolean);
  }
  if (Array.isArray(payload?.data?.users)) {
    return payload.data.users.filter(Boolean);
  }
  return [];
}

function ensureRuntime() {
  if (!appStore.get(`runtime.${RUNTIME_KEY}`, null)) {
    appStore.patchState(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME, "admin:cars-runtime-init");
  }
}

function runtimeState() {
  return appStore.get(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME) ?? DEFAULT_RUNTIME;
}

function setRuntime(patch = {}) {
  appStore.patchState(`runtime.${RUNTIME_KEY}`, {
    ...runtimeState(),
    ...patch,
  }, "admin:cars-runtime");
}

function setFormState(form) {
  const current = runtimeState().form ?? {};
  appStore.patchState(`runtime.${RUNTIME_KEY}.form`, {
    ...form,
    seller_user_id: current.seller_user_id ?? form?.seller_user_id ?? null,
    showroom_id: current.showroom_id ?? form?.showroom_id ?? null,
  }, "admin:cars-form");
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
      car.seller?.name,
      car.showroom_name,
      car.seller_name,
    ].filter(Boolean).join(" ").toLowerCase().includes(keyword);
  });
}

function paginate(items = [], pagination = {}) {
  const pageSize = allowedPageSize(pagination.pageSize);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = clampPage(Number(pagination.page ?? 1), totalPages);
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems,
    totalPages,
  };
}

function createCarsPagination({ page, pageSize, totalItems, totalPages }) {
  const section = document.createElement("section");
  section.id = "adcars_pagination_section";
  section.className = "grid gap-3 rounded-[1.35rem] border border-[var(--pb-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,244,237,0.90),rgba(234,244,249,0.82))] p-3 shadow-sm sm:p-4";

  const top = document.createElement("section");
  top.className = "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between";

  const meta = document.createElement("section");
  meta.className = "grid gap-1";
  meta.append(
    textNode("p", "text-[11px] font-black uppercase tracking-[0.16em] text-gray-500", "Pagination"),
    textNode("p", "text-sm font-semibold text-gray-700", paginationLabel({ page, pageSize, totalItems, totalPages }))
  );

  const sizeWrap = document.createElement("label");
  sizeWrap.className = "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-500";
  sizeWrap.textContent = "Rows";
  const sizeSelect = document.createElement("select");
  sizeSelect.id = "adcars_rows_per_page_input";
  sizeSelect.className = "min-h-10 rounded-full border border-[var(--pb-border)] bg-white px-3 text-sm font-semibold text-gray-700 shadow-sm";
  [10, 25, 50, 100].forEach((option) => {
    const node = document.createElement("option");
    node.value = String(option);
    node.textContent = String(option);
    node.selected = Number(option) === Number(pageSize);
    sizeSelect.append(node);
  });
  sizeSelect.addEventListener("change", () => {
    setRuntime({ pagination: { page: 1, pageSize: Number(sizeSelect.value) } });
  });
  sizeWrap.append(sizeSelect);
  top.append(meta, sizeWrap);

  const controls = document.createElement("section");
  controls.id = "adcars_pagination_controls_section";
  controls.className = "flex flex-wrap items-center gap-2";

  controls.append(
    paginationButton({
      id: "adcars_pagination_first_button",
      label: "First",
      disabled: page <= 1,
      onClick: () => changePage(1),
    }),
    paginationButton({
      id: "adcars_pagination_previous_button",
      label: "Previous",
      disabled: page <= 1,
      onClick: () => changePage(page - 1),
    })
  );

  pageWindow(page, totalPages).forEach((item) => {
    if (item === "...") {
      controls.append(textNode("span", "px-1 text-sm font-bold text-[var(--pb-text-muted)]", "..."));
      return;
    }

    controls.append(paginationButton({
      id: item === page ? `adcars_pagination_page_current_${item}` : `adcars_pagination_page_button_${item}`,
      label: String(item),
      active: item === page,
      disabled: item === page,
      onClick: () => changePage(item),
    }));
  });

  controls.append(
    paginationButton({
      id: "adcars_pagination_next_button",
      label: "Next",
      disabled: page >= totalPages,
      onClick: () => changePage(page + 1),
    }),
    paginationButton({
      id: "adcars_pagination_last_button",
      label: "Last",
      disabled: page >= totalPages,
      onClick: () => changePage(totalPages),
    })
  );

  section.append(top, controls);
  return section;
}

function changePage(page) {
  const current = runtimeState().pagination ?? DEFAULT_RUNTIME.pagination;
  setRuntime({
    pagination: {
      ...current,
      page,
    },
  });
}

function paginationButton({ id, label, disabled = false, active = false, onClick = null }) {
  const button = document.createElement("button");
  button.type = "button";
  button.id = id;
  button.disabled = disabled;
  button.textContent = label;
  button.className = active
    ? "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-transparent bg-[var(--pb-brand-primary)] px-3 text-sm font-semibold text-white shadow-sm"
    : "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-[var(--pb-border-strong)] bg-white/82 px-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-45";
  if (onClick) {
    button.addEventListener("click", onClick);
  }
  return button;
}

function pageWindow(page, totalPages) {
  if (totalPages <= 9) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = [1, 2];
  const start = Math.max(3, page - 1);
  const end = Math.min(totalPages - 2, page + 1);

  if (start > 3) {
    items.push("...");
  }

  for (let item = start; item <= end; item += 1) {
    items.push(item);
  }

  if (end < totalPages - 2) {
    items.push("...");
  }

  [totalPages - 1, totalPages].forEach((item) => {
    if (!items.includes(item)) {
      items.push(item);
    }
  });

  return items;
}

function paginationLabel({ page, pageSize, totalItems, totalPages }) {
  if (!totalItems) {
    return `Halaman ${page} dari ${totalPages}`;
  }

  const from = ((page - 1) * pageSize) + 1;
  const to = Math.min(page * pageSize, totalItems);
  return `${from}-${to} dari ${totalItems} mobil`;
}

function allowedPageSize(value) {
  const normalized = Number(value);
  return [10, 25, 50, 100].includes(normalized) ? normalized : 10;
}

function clampPage(page, totalPages) {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.max(1, Math.min(Math.trunc(page), totalPages));
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
    seller_user_id: car?.seller_user_id ?? null,
    showroom_id: car?.showroom_id ?? null,
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

function message(color, text) {
  const node = document.createElement("p");
  const palette = color === "green"
    ? "border-[color-mix(in_srgb,var(--pb-success)_26%,white)] bg-[color-mix(in_srgb,var(--pb-success)_8%,white)] text-[color-mix(in_srgb,var(--pb-success)_84%,black)]"
    : "border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
  node.className = `rounded-[1rem] border px-4 py-3 text-sm font-semibold ${palette}`;
  node.textContent = text ?? "";
  node.hidden = !text;
  return node;
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

function startBackgroundLoad() {
  if (adminCarsBackgroundLoader.status().running) {
    return;
  }

  adminCarsBackgroundLoader.ensure({ batchLimit: 100 }).catch((error) => {
    console.warn?.("Admin cars background load failed.", error);
  });
}
