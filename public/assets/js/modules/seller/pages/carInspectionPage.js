import { createPageLifecycle } from "../../../core/lifecycle.js";
import { inspectionsResource } from "../../../resources/inspectionsResource.js";
import { appStore } from "../../../state/store.js";
import { SectionHeader } from "../../../ui/composites/sectionHeader.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { Skeleton } from "../../../ui/primitives/skeleton.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { sellerState } from "../state/sellerState.js";
import { SellerInspectionItemsList } from "../components/sellerInspectionItemsList.js";
import { SellerInspectionReportPanel } from "../components/sellerInspectionReportPanel.js";

const RUNTIME_KEY = "sellerCarInspection";
const DEFAULT_RUNTIME = {
  summaryDraft: null,
  creating: false,
  publishing: false,
  savingDraft: false,
  savingSummary: false,
  busyItemId: null,
  itemDrafts: {},
  dirty: false,
  error: "",
  notice: "",
};

export function SellerCarInspectionPage() {
  let root = null;
  let unsubscribe = null;

  return createPageLifecycle({
    mount({ router, params }) {
      ensureRuntime();
      root = document.createElement("div");
      render(root, router, params);
      return root;
    },
    hydrate({ router, params }) {
      syncDraftsFromReport();
      render(root, router, params);
    },
    bindEvents({ router, params }) {
      unsubscribe = appStore.subscribe(() => render(root, router, params));
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
      appStore.destroyRuntimeState(RUNTIME_KEY);
    },
  });
}

function render(root, router, params) {
  if (!root) {
    return;
  }

  const carId = params.id;
  const carNode = appStore.get("working.sellerCarInspection.car", null);
  const templatesNode = appStore.get("working.sellerCarInspection.templates", null);
  const reportNode = appStore.get("working.sellerCarInspection.report", null);
  const car = carNode?.data ?? sellerState.working("sellerCarInspection", "car", null);
  const templates = templatesNode?.data ?? sellerState.working("sellerCarInspection", "templates", []);
  const report = reportNode?.data ?? sellerState.working("sellerCarInspection", "report", null);
  const hasHydrated = Boolean(carNode?.hydratedAt) && Boolean(templatesNode?.hydratedAt) && Boolean(reportNode?.hydratedAt);
  const runtime = runtimeState();
  const title = car
    ? [car.brand_name, car.model_name, car.sub_model_name].filter(Boolean).join(" ")
    : "Inspection Flow";

  const notice = message("green", runtime.notice);
  const error = message("red", runtime.error);
  const backButton = Button({ label: "Kembali ke Katalog", variant: "secondary", onClick: () => router?.navigate("/seller/cars") });
  backButton.id = "slrinsp_back_to_cars_button";
  const header = SectionHeader({
    title,
    description: "Kelola inspection report seller untuk mobil ini.",
    action: backButton,
  });

  if (!hasHydrated) {
    root.replaceChildren(header, Skeleton({ lines: 10 }));
    return;
  }

  if (!car) {
    root.replaceChildren(
      header,
      EmptyState({
        title: "Mobil tidak ditemukan",
        description: "Pastikan inspection dibuka dari list mobil seller yang aktif.",
      })
    );
    return;
  }

  const body = document.createElement("div");
  body.className = "grid gap-6";
  const inspectionItems = buildInspectionItems(templates, report, runtime.itemDrafts);
  const progress = inspectionProgress(inspectionItems);
  body.append(
    SellerInspectionReportPanel({
      car,
      report,
      summaryDraft: runtime.summaryDraft ?? report?.summary_notes ?? "",
      progress,
      dirty: runtime.dirty,
      creating: runtime.creating,
      publishing: runtime.publishing,
      savingDraft: runtime.savingDraft,
      savingSummary: runtime.savingSummary,
      onCreate: () => createReport(carId, templates),
      onPublish: () => publishReport(carId, report),
      onSaveDraft: () => saveInspectionDraft(carId, report, templates),
      onSummaryChange: (value) => setRuntime({ summaryDraft: value, dirty: true }),
      onSummarySave: () => saveSummary(report),
    })
  );

  if (templates.length) {
    const toolbar = document.createElement("div");
    toolbar.className = "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";

    const heading = document.createElement("div");
    const itemTitle = document.createElement("h2");
    itemTitle.className = "text-xl font-bold tracking-normal text-gray-950";
    itemTitle.textContent = "Item inspeksi";
    const helper = document.createElement("p");
    helper.className = "mt-1 text-sm text-gray-500";
    helper.textContent = "Pilih kondisi langsung di setiap item. Catatan bersifat opsional.";
    heading.append(itemTitle, helper);

    toolbar.append(heading);

    body.append(toolbar, SellerInspectionItemsList({
      items: inspectionItems,
      busyItemId: runtime.busyItemId,
      onStatusChange: (item, status) => updateItemDraft(item, { result_status: status }),
      onNotesChange: (item, notes) => updateItemDraft(item, { notes }),
    }));
  } else {
    body.append(EmptyState({
      title: "Master inspection belum tersedia",
      description: "Checklist seller akan tampil setelah admin mengaktifkan master inspection.",
    }));
  }

  root.replaceChildren(
    header,
    notice,
    error,
    body,
    templates.length
      ? floatingSaveButton({
          saving: runtime.savingDraft,
          disabled: runtime.publishing,
          onClick: () => saveInspectionDraft(carId, report, templates),
        })
      : document.createDocumentFragment()
  );
}

function floatingSaveButton({ saving = false, disabled = false, onClick = null } = {}) {
  const wrap = document.createElement("section");
  wrap.id = "slrinsp_floating_save_section";
  wrap.className = "fixed bottom-5 right-4 z-40 sm:bottom-6 sm:right-6";

  const button = Button({
    label: saving ? "Menyimpan..." : "Simpan Inspeksi",
    disabled: saving || disabled,
    onClick,
  });
  button.id = "slrinsp_floating_save_button";
  button.className = `${button.className} shadow-[0_18px_40px_rgba(15,23,42,0.22)]`;

  wrap.append(button);
  return wrap;
}

async function createReport(carId, templates) {
  if (!templates.length) {
    setRuntime({ error: "Master inspection belum tersedia." });
    showToast("Master inspection belum tersedia.", { type: "error" });
    return;
  }

  setRuntime({ creating: false, error: "", notice: "Checklist siap diisi. Pilih kondisi lalu simpan draft." });
  showToast("Checklist siap diisi.", { type: "success" });
}

async function publishReport(carId, report) {
  const templates = sellerState.working("sellerCarInspection", "templates", []) ?? [];
  const runtime = runtimeState();
  const currentReport = report ?? sellerState.working("sellerCarInspection", "report", null);
  const items = buildInspectionItems(templates, currentReport, runtime.itemDrafts);
  const progress = inspectionProgress(items);

  if (progress.completed < progress.total) {
    const message = "Lengkapi semua item sebelum publish.";
    setRuntime({ error: message });
    showToast(message, { type: "error" });
    return;
  }

  setRuntime({ publishing: true, error: "", notice: "" });

  try {
    const saved = runtime.dirty ? await persistInspectionDraft(carId, currentReport, templates) : currentReport;
    if (!saved?.id) {
      throw new Error("Simpan draft inspection terlebih dahulu.");
    }
    await publishSavedReport(carId, saved, {
      notice: "Inspection report berhasil dipublish.",
      toast: "Inspection report berhasil dipublish.",
    });
  } catch (error) {
    const message = error?.message ?? "Inspection report gagal dipublish.";
    setRuntime({ publishing: false, error: message });
    showToast(message, { type: "error" });
  }
}

async function saveInspectionDraft(carId, report, templates) {
  let draftSaved = false;
  setRuntime({ savingDraft: true, publishing: true, error: "", notice: "" });

  try {
    const updated = await persistInspectionDraft(carId, report, templates);
    draftSaved = true;
    setReport(updated, { syncDrafts: false });
    syncCarInspectionSummary("partial");
    await publishSavedReport(carId, updated, {
      notice: "Inspection berhasil disimpan dan dipublish.",
      toast: "Inspection berhasil disimpan dan dipublish.",
    });
  } catch (error) {
    const message = error?.message ?? "Inspection gagal disimpan atau dipublish.";
    setRuntime({ savingDraft: false, publishing: false, dirty: draftSaved ? false : runtimeState().dirty, error: message });
    showToast(message, { type: "error" });
  }
}

async function publishSavedReport(carId, report, { notice, toast } = {}) {
  const runtime = runtimeState();
  const templates = sellerState.working("sellerCarInspection", "templates", []) ?? [];
  const items = buildInspectionItems(templates, report, runtime.itemDrafts);
  const progress = inspectionProgress(items);

  if (progress.completed < progress.total) {
    throw new Error("Draft tersimpan. Lengkapi semua item sebelum publish.");
  }

  if (!report?.id) {
    throw new Error("Simpan draft inspection terlebih dahulu.");
  }

  const updated = await inspectionsResource.updateReport(report.id, {
    report_status: "published",
    summary_notes: runtime.summaryDraft ?? report.summary_notes ?? null,
  });
  setReport(updated);
  syncCarInspectionSummary("completed");
  setRuntime({
    savingDraft: false,
    publishing: false,
    dirty: false,
    notice: notice ?? "Inspection report berhasil dipublish.",
  });
  showToast(toast ?? "Inspection report berhasil dipublish.", { type: "success" });
  return updated;
}

async function persistInspectionDraft(carId, report, templates) {
  const runtime = runtimeState();
  const drafts = runtime.itemDrafts ?? {};
  const selected = templates
    .map((template) => draftPayloadForTemplate(template, drafts[String(template.id)]))
    .filter(Boolean);

  if (!report?.id) {
    if (!selected.length) {
      throw new Error("Pilih minimal satu kondisi sebelum simpan draft.");
    }

    return inspectionsResource.createReport(carId, {
      report_status: "draft",
      summary_notes: runtime.summaryDraft ?? null,
      inspected_at: sqlDateTimeNow(),
      items: selected,
    });
  }

  let updated = report;
  for (const template of templates) {
    const draft = drafts[String(template.id)];
    if (!draft?.dirty || !draft.result_status) {
      continue;
    }

    const payload = draftPayloadForTemplate(template, draft);
    updated = draft.itemId
      ? await inspectionsResource.updateItem(updated.id, draft.itemId, payload)
      : await inspectionsResource.createItem(updated.id, payload);
  }

  if ((runtime.summaryDraft ?? "") !== (updated.summary_notes ?? "")) {
    updated = await inspectionsResource.updateReport(updated.id, {
      report_status: updated.report_status ?? "draft",
      summary_notes: runtime.summaryDraft ?? "",
    });
  }

  return updated;
}

async function saveSummary(report) {
  if (!report?.id) {
    return;
  }

  setRuntime({ savingSummary: true, error: "", notice: "" });

  try {
    const updated = await inspectionsResource.updateReport(report.id, {
      summary_notes: runtimeState().summaryDraft ?? "",
    });
    setReport(updated);
    setRuntime({ savingSummary: false, dirty: hasDirtyItemDrafts(), notice: "Catatan inspection report berhasil disimpan." });
    showToast("Catatan inspection berhasil disimpan.", { type: "success" });
  } catch (error) {
    const message = error?.message ?? "Catatan gagal disimpan.";
    setRuntime({ savingSummary: false, error: message });
    showToast(message, { type: "error" });
  }
}

function setReport(report, { syncDrafts = true } = {}) {
  appStore.patchState("working.sellerCarInspection.report", {
    data: report,
    hydratedAt: Date.now(),
  }, "seller:inspection-report");
  if (syncDrafts) {
    syncDraftsFromReport(report, { force: true });
  }
}

function syncCarInspectionSummary(status) {
  const current = sellerState.working("sellerCarInspection", "car", null);
  if (!current) {
    return;
  }

  appStore.patchState("working.sellerCarInspection.car", {
    data: { ...current, inspection_summary_status: status },
    hydratedAt: Date.now(),
  }, "seller:inspection-car-summary");

  patchSellerCarCollections(current.id, status);
}

function patchSellerCarCollections(carId, status) {
  const syncTargets = [
    {
      path: "working.sellerCars.cars",
      build: (current) => ({
        ...current,
        data: {
          ...current?.data,
          cars: (current?.data?.cars ?? []).map((car) => (
            Number(car.id) === Number(carId)
              ? { ...car, inspection_summary_status: status }
              : car
          )),
        },
        hydratedAt: Date.now(),
      }),
    },
    {
      path: "snapshot.seller.cars",
      build: (current) => ({
        ...current,
        data: {
          ...current?.data,
          cars: (current?.data?.cars ?? []).map((car) => (
            Number(car.id) === Number(carId)
              ? { ...car, inspection_summary_status: status }
              : car
          )),
        },
        fetchedAt: Date.now(),
        ttl: current?.ttl ?? 120,
        version: current?.version ?? "seller-cars-v1",
        stale: false,
      }),
    },
  ];

  syncTargets.forEach(({ path, build }) => {
    const current = appStore.get(path, null);
    const cars = current?.data?.cars ?? [];

    if (!cars.length) {
      return;
    }

    appStore.patchState(path, build(current), "seller:inspection-car-list-sync");
  });
}

function message(color, text) {
  const node = document.createElement("p");
  const palette = color === "green"
    ? "border-green-200 bg-green-50 text-green-700"
    : "border-red-200 bg-red-50 text-red-700";
  node.className = `mb-4 rounded-lg border px-3 py-2 text-sm font-medium ${palette}`;
  node.textContent = text;
  node.hidden = !text;
  return node;
}

function ensureRuntime() {
  if (!appStore.get(`runtime.${RUNTIME_KEY}`, null)) {
    appStore.patchState(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME, "seller:inspection-runtime-init");
  }
}

function runtimeState() {
  return appStore.get(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME) ?? DEFAULT_RUNTIME;
}

function setRuntime(patch = {}) {
  appStore.patchState(`runtime.${RUNTIME_KEY}`, {
    ...runtimeState(),
    ...patch,
  }, "seller:inspection-runtime");
}

function syncDraftsFromReport(reportOverride = null, { force = false } = {}) {
  const runtime = runtimeState();
  if (runtime.dirty && !force) {
    return;
  }
  const report = reportOverride ?? sellerState.working("sellerCarInspection", "report", null);
  const drafts = {};
  (report?.items ?? []).forEach((item) => {
    drafts[String(item.template_id)] = {
      itemId: item.id,
      result_status: item.result_status ?? "",
      notes: item.notes ?? "",
      dirty: false,
    };
  });

  setRuntime({
    summaryDraft: runtime.summaryDraft === null || force ? report?.summary_notes ?? "" : runtime.summaryDraft,
    itemDrafts: drafts,
    dirty: false,
  });
}

function updateItemDraft(item, patch = {}) {
  const templateId = String(item.template_id ?? item.template?.id ?? "");
  if (!templateId) {
    return;
  }

  const current = runtimeState();
  const previous = current.itemDrafts?.[templateId] ?? {};
  setRuntime({
    itemDrafts: {
      ...(current.itemDrafts ?? {}),
      [templateId]: {
        itemId: item.id ?? previous.itemId ?? null,
        result_status: previous.result_status ?? "",
        notes: previous.notes ?? "",
        ...patch,
        dirty: true,
      },
    },
    dirty: true,
    error: "",
    notice: "",
  });
}

function buildInspectionItems(templates = [], report = null, drafts = {}) {
  const byTemplate = new Map((report?.items ?? []).map((item) => [Number(item.template_id), item]));
  return templates.map((template) => {
    const existing = byTemplate.get(Number(template.id));
    const draft = drafts[String(template.id)] ?? {};
    return {
      ...(existing ?? {}),
      id: existing?.id ?? null,
      template_id: template.id,
      item_name_snapshot: existing?.item_name_snapshot ?? template.item_name,
      result_status: draft.result_status ?? existing?.result_status ?? "",
      description: existing?.description ?? template.description ?? "",
      notes: draft.notes ?? existing?.notes ?? "",
      template,
    };
  });
}

function inspectionProgress(items = []) {
  const total = items.length;
  const completed = items.filter((item) => ["good", "fair", "bad", "not_available"].includes(item.result_status)).length;
  return {
    total,
    completed,
    good: items.filter((item) => item.result_status === "good").length,
    fair: items.filter((item) => item.result_status === "fair").length,
    bad: items.filter((item) => item.result_status === "bad").length,
    notAvailable: items.filter((item) => item.result_status === "not_available").length,
  };
}

function draftPayloadForTemplate(template, draft) {
  if (!draft?.result_status) {
    return null;
  }

  return {
    template_id: Number(template.id),
    result_status: draft.result_status,
    description: template.description ?? null,
    notes: draft.notes ?? null,
  };
}

function hasDirtyItemDrafts() {
  return Object.values(runtimeState().itemDrafts ?? {}).some((draft) => Boolean(draft?.dirty));
}

function sqlDateTimeNow() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
