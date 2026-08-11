import { createPageLifecycle } from "../../../core/lifecycle.js";
import { appStore } from "../../../state/store.js";
import { Button } from "../../../ui/primitives/button.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminMigrationService } from "../services/adminMigrationService.js";

export function AdminMigrationManagerPage() {
  let root = null;
  let unsubscribe = null;
  const state = {
    loading: false,
    running: false,
    marking: "",
    error: "",
    migrations: [],
    results: [],
  };

  const actions = {
    async refresh() {
      state.loading = true;
      state.error = "";
      render(root, state, actions);
      try {
        state.migrations = await adminMigrationService.status();
      } catch (error) {
        state.error = error.message || "Gagal mengambil status migration.";
        showToast(state.error, { type: "error" });
      } finally {
        state.loading = false;
        render(root, state, actions);
      }
    },

    async runPending() {
      state.running = true;
      state.error = "";
      render(root, state, actions);
      try {
        const response = await adminMigrationService.runPending();
        state.results = response.results;
        state.migrations = response.migrations;
        showToast("Migration pending selesai diproses.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menjalankan migration.";
        showToast(state.error, { type: "error" });
      } finally {
        state.running = false;
        render(root, state, actions);
      }
    },

    async markApplied(name) {
      state.marking = name;
      state.error = "";
      render(root, state, actions);
      try {
        const response = await adminMigrationService.markApplied(name);
        state.migrations = response.migrations;
        showToast("Migration ditandai sudah migrasi.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menandai migration.";
        showToast(state.error, { type: "error" });
      } finally {
        state.marking = "";
        render(root, state, actions);
      }
    },
  };

  return createPageLifecycle({
    mount(context = {}) {
      root = document.createElement("div");
      state.migrations = appStore.get("working.adminMigrations.migrations.data", null)?.migrations ?? state.migrations;
      render(root, state, actions);
      if (!state.migrations.length) {
        actions.refresh();
      }
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

  const pending = state.migrations.filter((migration) => migration.status === "pending").length;
  const applied = state.migrations.filter((migration) => migration.status === "applied").length;

  const page = document.createElement("section");
  page.className = "grid gap-5";

  const header = document.createElement("div");
  header.className = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  const title = document.createElement("h1");
  title.className = "text-2xl font-black tracking-normal text-gray-950";
  title.textContent = "Migration Manager";
  const subtitle = document.createElement("p");
  subtitle.className = "max-w-3xl text-sm leading-6 text-[var(--pb-text-muted)]";
  subtitle.textContent = "Kelola file schema database yang belum pernah dijalankan. Fitur ini khusus superadmin.";
  copy.append(title, subtitle);

  const actionsWrap = document.createElement("div");
  actionsWrap.className = "flex flex-wrap gap-2";
  actionsWrap.append(
    Button({
      label: state.loading ? "Memuat..." : "Refresh",
      variant: "secondary",
      disabled: state.loading || state.running,
      onClick: actions.refresh,
    }),
    Button({
      label: state.running ? "Menjalankan..." : "Jalankan Migration Pending",
      variant: "primary",
      disabled: state.loading || state.running || pending === 0,
      onClick: actions.runPending,
    })
  );
  header.append(copy, actionsWrap);

  const stats = document.createElement("div");
  stats.className = "grid gap-3 sm:grid-cols-3";
  stats.append(
    statCard("Pending", pending, "triangleWarning"),
    statCard("Applied", applied, "circleCheck"),
    statCard("Total File", state.migrations.length, "file")
  );

  const error = state.error ? alertBox(state.error) : null;
  const resultPanel = state.results.length ? resultsPanel(state.results) : null;

  page.append(header, stats);
  if (error) page.append(error);
  if (resultPanel) page.append(resultPanel);
  page.append(table(state.migrations, state, actions));

  root.replaceChildren(page);
}

function statCard(label, value, iconName) {
  const card = document.createElement("div");
  card.className = "rounded-lg border border-[var(--pb-border)] bg-white p-4 shadow-sm";
  const row = document.createElement("div");
  row.className = "flex items-center justify-between gap-3";
  const copy = document.createElement("div");
  const valueNode = document.createElement("div");
  valueNode.className = "text-2xl font-black text-gray-950";
  valueNode.textContent = String(value);
  const labelNode = document.createElement("div");
  labelNode.className = "text-xs font-bold uppercase tracking-normal text-[var(--pb-text-muted)]";
  labelNode.textContent = label;
  copy.append(valueNode, labelNode);
  const icon = document.createElement("span");
  icon.className = "inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-700";
  icon.append(createIcon(iconName, { className: "h-4 w-4" }));
  row.append(copy, icon);
  card.append(row);
  return card;
}

function alertBox(message) {
  const box = document.createElement("div");
  box.className = "rounded-lg border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-sm font-semibold text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
  box.textContent = message;
  return box;
}

function resultsPanel(results) {
  const panel = document.createElement("div");
  panel.className = "rounded-lg border border-[var(--pb-border)] bg-white p-4 shadow-sm";
  const title = document.createElement("h2");
  title.className = "mb-3 text-base font-black text-gray-950";
  title.textContent = "Hasil Eksekusi Terakhir";
  const list = document.createElement("div");
  list.className = "grid gap-2";
  list.append(...results.map((result) => {
    const item = document.createElement("div");
    item.className = "flex flex-wrap items-center justify-between gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm";
    const name = document.createElement("span");
    name.className = "font-semibold text-gray-800";
    name.textContent = result.name;
    const status = statusBadge(result.status);
    item.append(name, status);
    if (result.message) {
      const message = document.createElement("p");
      message.className = "basis-full text-xs text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
      message.textContent = result.message;
      item.append(message);
    }
    return item;
  }));
  panel.append(title, list);
  return panel;
}

function table(migrations, state, actions) {
  const panel = document.createElement("div");
  panel.className = "overflow-hidden rounded-lg border border-[var(--pb-border)] bg-white shadow-sm";

  const table = document.createElement("table");
  table.className = "min-w-full divide-y divide-gray-200 text-sm";
  table.innerHTML = `
    <thead class="bg-gray-50">
      <tr>
        <th class="px-4 py-3 text-left font-black text-gray-700">File</th>
        <th class="px-4 py-3 text-left font-black text-gray-700">Status</th>
        <th class="px-4 py-3 text-left font-black text-gray-700">Applied At</th>
        <th class="px-4 py-3 text-left font-black text-gray-700">Checksum</th>
        <th class="px-4 py-3 text-right font-black text-gray-700">Aksi</th>
      </tr>
    </thead>
  `;
  const body = document.createElement("tbody");
  body.className = "divide-y divide-gray-100";

  if (state.loading) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" class="px-4 py-6 text-center text-gray-500">Memuat status migration...</td>`;
    body.append(row);
  } else if (!migrations.length) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" class="px-4 py-6 text-center text-gray-500">Belum ada file migration.</td>`;
    body.append(row);
  } else {
    body.append(...migrations.map((migration) => row(migration, state, actions)));
  }

  table.append(body);
  panel.append(table);
  return panel;
}

function row(migration, state, actions) {
  const tr = document.createElement("tr");
  tr.className = "align-top";
  tr.append(
    cell(migration.name, "font-semibold text-gray-900"),
    cellNode(statusBadge(migration.status)),
    cell(migration.applied_at ?? "-", "text-gray-600"),
    cell(shortChecksum(migration.checksum), "font-mono text-xs text-gray-500"),
    actionCell(migration, state, actions)
  );
  return tr;
}

function cell(text, className = "") {
  const td = document.createElement("td");
  td.className = `px-4 py-3 ${className}`.trim();
  td.textContent = text;
  return td;
}

function cellNode(node) {
  const td = document.createElement("td");
  td.className = "px-4 py-3";
  td.append(node);
  return td;
}

function actionCell(migration, state, actions) {
  const td = document.createElement("td");
  td.className = "px-4 py-3 text-right";

  if (migration.status !== "pending") {
    const text = document.createElement("span");
    text.className = "text-xs font-semibold text-[var(--pb-text-muted)]";
    text.textContent = "-";
    td.append(text);
    return td;
  }

  td.append(Button({
    label: state.marking === migration.name ? "Menyimpan..." : "Sudah Migrasi",
    variant: "secondary",
    disabled: state.loading || state.running || Boolean(state.marking),
    onClick: () => actions.markApplied(migration.name),
  }));

  return td;
}

function statusBadge(status) {
  const badge = document.createElement("span");
  const tone = status === "applied"
    ? "bg-[color-mix(in_srgb,var(--pb-success)_8%,white)] text-[color-mix(in_srgb,var(--pb-success)_84%,black)] border-[color-mix(in_srgb,var(--pb-success)_26%,white)]"
    : status === "failed"
      ? "bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] text-[color-mix(in_srgb,var(--pb-danger)_84%,black)] border-[color-mix(in_srgb,var(--pb-danger)_26%,white)]"
      : status === "skipped"
        ? "bg-gray-50 text-gray-700 border-gray-200"
        : "bg-[color-mix(in_srgb,var(--pb-warning)_8%,white)] text-[color-mix(in_srgb,var(--pb-warning)_84%,black)] border-[color-mix(in_srgb,var(--pb-warning)_26%,white)]";
  badge.className = `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${tone}`;
  badge.textContent = status;
  return badge;
}

function shortChecksum(checksum = "") {
  return checksum ? checksum.slice(0, 12) : "-";
}
