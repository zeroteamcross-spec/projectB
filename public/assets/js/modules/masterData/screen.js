import { showToast } from "../../ui/primitives/toast.js";
import { appStore } from "../../state/store.js";
import { masterDataService } from "./service.js";

export function masterDataScreen({ params }) {
  const masterKey = params.master_key ?? "colors";
  const root = document.createElement("section");
  root.className = "grid gap-4";
  const title = document.createElement("h1");
  title.className = "text-xl font-bold tracking-normal text-gray-950";
  const output = document.createElement("pre");
  output.className = "overflow-auto rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-700 shadow-card";

  title.textContent = `Master Data: ${masterKey}`;
  output.textContent = "Memuat data...";
  root.append(title, output);

  loadMaster(masterKey, output);

  return root;
}

async function loadMaster(masterKey, output) {
  appStore.patchState("ui.loading", true, "master-data:loading");

  try {
    const master = await masterDataService.getByKey(masterKey);
    appStore.patchState(`modules.masterData.${masterKey}`, master, "master-data:loaded");
    output.textContent = JSON.stringify(master, null, 2);
  } catch (error) {
    output.textContent = "Master data tidak tersedia.";
    showToast(error.message || "Gagal memuat master data.", { type: "error" });
  } finally {
    appStore.patchState("ui.loading", false, "master-data:loaded");
  }
}
