import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { confirmDialog } from "../../../ui/primitives/confirmDialog.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminReleaseVersionService } from "../services/adminReleaseVersionService.js";

const DEFAULT_RESOURCES = ["app", "cars", "transactions", "notifications", "sliders", "master_data", "design_studio"];

export function AdminReleaseVersionManagerPage() {
  let root = null;
  let unsubscribe = null;
  const state = {
    loading: false,
    bumping: "",
    error: "",
    manifest: null,
    versions: [],
    resourceName: "app",
  };

  const actions = {
    async refresh() {
      state.loading = true;
      state.error = "";
      render(root, state, actions);
      try {
        const [manifest, versions] = await Promise.all([
          adminReleaseVersionService.manifest(),
          adminReleaseVersionService.versions(DEFAULT_RESOURCES),
        ]);
        state.manifest = manifest;
        state.versions = versions;
      } catch (error) {
        state.error = error.message || "Gagal memuat data release.";
        showToast(state.error, { type: "error" });
      } finally {
        state.loading = false;
        render(root, state, actions);
      }
    },

    setResourceName(value) {
      state.resourceName = value;
      render(root, state, actions);
    },

    async bump(resourceName = state.resourceName) {
      const normalized = String(resourceName || "").trim();
      if (!normalized) {
        showToast("Resource wajib diisi.", { type: "error" });
        return;
      }

      const confirmed = await confirmDialog({
        title: "Bump versi resource",
        message: `Pastikan file release sudah selesai di-upload dan diverifikasi. Lanjut bump ${normalized}?`,
        confirmLabel: "Bump versi",
        key: `release-bump-${normalized}`,
      });

      if (!confirmed) {
        return;
      }

      state.bumping = normalized;
      state.error = "";
      render(root, state, actions);
      try {
        await adminReleaseVersionService.bump(normalized, { displayName: labelForResource(normalized) });
        showToast(`Versi ${normalized} berhasil dinaikkan.`, { type: "success" });
        await actions.refresh();
      } catch (error) {
        state.error = error.message || "Gagal bump versi.";
        showToast(state.error, { type: "error" });
      } finally {
        state.bumping = "";
        render(root, state, actions);
      }
    },
  };

  return createPageLifecycle({
    mount() {
      root = document.createElement("div");
      const payload = appStore.get("working.adminReleaseVersions.versions.data", null);
      state.versions = payload?.versions ?? state.versions;
      render(root, state, actions);
      actions.refresh();
      return root;
    },
    hydrate() {
      render(root, state, actions);
    },
    bindEvents() {
      unsubscribe = appStore.subscribe(() => render(root, state, actions));
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
      root = null;
    },
  });
}

function render(root, state, actions) {
  if (!root) {
    return;
  }

  const page = document.createElement("section");
  page.className = "grid gap-5";
  page.append(header(state, actions), summary(state), bumpPanel(state, actions));
  if (state.error) page.append(errorBox(state.error));
  page.append(versionsTable(state.versions, state.loading, actions));
  root.replaceChildren(page);
}

function header(state, actions) {
  const wrap = document.createElement("div");
  wrap.className = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";
  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  const title = document.createElement("h1");
  title.className = "text-2xl font-black tracking-normal text-gray-950";
  title.textContent = "Release Version Manager";
  const subtitle = document.createElement("p");
  subtitle.className = "max-w-3xl text-sm leading-6 text-[var(--pb-text-muted)]";
  subtitle.textContent = "Kelola versi release dan bump resource setelah upload selesai diverifikasi. Fitur ini khusus superadmin.";
  copy.append(title, subtitle);
  wrap.append(copy, Button({
    label: state.loading ? "Memuat..." : "Refresh",
    variant: "secondary",
    disabled: state.loading || Boolean(state.bumping),
    onClick: actions.refresh,
  }));
  return wrap;
}

function summary(state) {
  const grid = document.createElement("div");
  grid.className = "grid gap-3 md:grid-cols-3";
  grid.append(
    card("Release Version", state.manifest?.release_version ?? "-", "download"),
    card("Channel", state.manifest?.channel ?? "-", "globe"),
    card("Created At", state.manifest?.created_at ?? "-", "clock")
  );
  return grid;
}

function bumpPanel(state, actions) {
  const panel = document.createElement("div");
  panel.className = "rounded-lg border border-[var(--pb-border)] bg-white p-4 shadow-sm";
  const title = document.createElement("h2");
  title.className = "mb-3 text-base font-black text-gray-950";
  title.textContent = "Bump Versi Resource";

  const row = document.createElement("div");
  row.className = "grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]";
  const input = document.createElement("input");
  input.className = "min-h-11 rounded-lg border border-[var(--pb-border)] px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  input.value = state.resourceName;
  input.placeholder = "app";
  input.addEventListener("input", (event) => actions.setResourceName(event.target.value));

  row.append(input, Button({
    label: state.bumping ? "Memproses..." : "Bump Setelah Upload Diverifikasi",
    variant: "primary",
    disabled: Boolean(state.bumping),
    onClick: () => actions.bump(),
  }));

  const note = document.createElement("p");
  note.className = "mt-3 text-xs leading-5 text-[var(--pb-text-muted)]";
  note.textContent = "Jangan bump sebelum file release selesai di-upload dan dicek di server.";
  panel.append(title, row, note);
  return panel;
}

function versionsTable(versions, loading, actions) {
  const panel = document.createElement("div");
  panel.className = "overflow-hidden rounded-lg border border-[var(--pb-border)] bg-white shadow-sm";
  const table = document.createElement("table");
  table.className = "min-w-full divide-y divide-gray-200 text-sm";
  table.innerHTML = `
    <thead class="bg-gray-50">
      <tr>
        <th class="px-4 py-3 text-left font-black text-gray-700">Resource</th>
        <th class="px-4 py-3 text-left font-black text-gray-700">Version</th>
        <th class="px-4 py-3 text-left font-black text-gray-700">Updated</th>
        <th class="px-4 py-3 text-right font-black text-gray-700">Aksi</th>
      </tr>
    </thead>
  `;
  const body = document.createElement("tbody");
  body.className = "divide-y divide-gray-100";

  if (loading) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="4" class="px-4 py-6 text-center text-gray-500">Memuat versi...</td>`;
    body.append(row);
  } else if (!versions.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="4" class="px-4 py-6 text-center text-gray-500">Belum ada data versi.</td>`;
    body.append(row);
  } else {
    body.append(...versions.map((version) => versionRow(version, actions)));
  }

  table.append(body);
  panel.append(table);
  return panel;
}

function versionRow(version, actions) {
  const tr = document.createElement("tr");
  tr.append(
    cell(version.resource_name, "font-semibold text-gray-900"),
    cell(String(version.version_number ?? "-"), "text-gray-700"),
    cell(version.updated_at ?? version.created_at ?? "-", "text-gray-600"),
    actionCell(version.resource_name, actions)
  );
  return tr;
}

function actionCell(resourceName, actions) {
  const td = document.createElement("td");
  td.className = "px-4 py-3 text-right";
  td.append(Button({
    label: "Bump",
    variant: "secondary",
    onClick: () => actions.bump(resourceName),
  }));
  return td;
}

function card(label, value, iconName) {
  const node = document.createElement("div");
  node.className = "rounded-lg border border-[var(--pb-border)] bg-white p-4 shadow-sm";
  const row = document.createElement("div");
  row.className = "flex items-center justify-between gap-3";
  const copy = document.createElement("div");
  const labelNode = document.createElement("div");
  labelNode.className = "text-xs font-bold uppercase tracking-normal text-[var(--pb-text-muted)]";
  labelNode.textContent = label;
  const valueNode = document.createElement("div");
  valueNode.className = "mt-1 break-words text-lg font-black text-gray-950";
  valueNode.textContent = String(value);
  copy.append(labelNode, valueNode);
  const icon = document.createElement("span");
  icon.className = "inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700";
  icon.append(createIcon(iconName, { className: "h-4 w-4" }));
  row.append(copy, icon);
  node.append(row);
  return node;
}

function cell(text, className = "") {
  const td = document.createElement("td");
  td.className = `px-4 py-3 ${className}`.trim();
  td.textContent = text ?? "-";
  return td;
}

function errorBox(message) {
  const box = document.createElement("div");
  box.className = "rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-sm font-semibold text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
  box.textContent = message;
  return box;
}

function labelForResource(resourceName) {
  return resourceName
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
