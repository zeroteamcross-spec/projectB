import { createPageLifecycle } from "../../../core/lifecycle.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { adminTasksService } from "../services/adminTasksService.js";

const STATUS_LABEL = {
  open: "Belum selesai",
  sip: "Sip",
};

export function TasksPage({ service = adminTasksService } = {}) {
  let root = null;
  let currentContext = null;
  const state = {
    tasks: [],
    loading: true,
    savingId: null,
    error: "",
  };

  const actions = {
    async refresh() {
      state.loading = true;
      state.error = "";
      render(root, state, actions);

      try {
        state.tasks = await service.list();
      } catch (error) {
        state.tasks = [];
        state.error = error.message || "Gagal memuat daftar tugas.";
        showToast(state.error, { type: "error" });
      } finally {
        state.loading = false;
        render(root, state, actions);
      }
    },

    async complete(task) {
      if (!task || task.status === "sip" || state.savingId !== null) {
        return;
      }

      state.savingId = task.id;
      state.error = "";
      render(root, state, actions);

      try {
        const updated = await service.updateStatus(task.id, "sip");
        state.tasks = state.tasks.map((item) => item.id === task.id ? (updated ?? { ...item, status: "sip" }) : item);
        showToast("Tugas ditandai sip.", { type: "success" });
      } catch (error) {
        state.error = error.message || "Gagal menandai tugas.";
        showToast(state.error, { type: "error" });
      } finally {
        state.savingId = null;
        render(root, state, actions);
      }
    },
  };

  return createPageLifecycle({
    bootstrap(context) {
      currentContext = context;
    },
    mount(context) {
      currentContext = context;
      root = document.createElement("div");
      render(root, state, actions);
      actions.refresh();
      return root;
    },
    hydrate(context) {
      currentContext = context;
      render(root, state, actions);
    },
    dispose() {
      currentContext = null;
      root = null;
    },
  });
}

export function AdminTasksPage() {
  return TasksPage();
}

function render(root, state, actions) {
  if (!root) {
    return;
  }

  const page = document.createElement("section");
  page.id = "admintasks_page_section";
  page.className = "grid gap-6";
  page.append(hero(state, actions));

  if (state.error) {
    page.append(errorBox(state.error));
  }

  page.append(summary(state));

  if (state.loading) {
    page.append(loadingPanel());
  } else if (!state.tasks.length) {
    page.append(EmptyState({
      title: "Belum ada tugas",
      description: "Permintaan baru akan muncul di halaman ini.",
    }));
  } else {
    const list = document.createElement("div");
    list.className = "grid gap-3";
    list.append(...state.tasks.map((task) => taskCard(task, state, actions)));
    page.append(list);
  }

  root.replaceChildren(page);
}

function hero(state, actions) {
  const panel = document.createElement("section");
  panel.className = "grid gap-2 rounded-2xl border border-[var(--pb-border)] bg-white p-5 shadow-sm sm:p-6";

  const eyebrow = document.createElement("p");
  eyebrow.className = "text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--pb-text-muted)]";
  eyebrow.textContent = "Task board";

  const title = document.createElement("h1");
  title.className = "text-xl font-black tracking-normal text-gray-950";
  title.textContent = "Daftar Tugas";

  const description = document.createElement("p");
  description.className = "max-w-3xl text-xs leading-6 text-[var(--pb-text-muted)]";
  description.textContent = "Daftar tugas dan permintaan dari Anda. Klik Beres setelah pekerjaan selesai untuk mengubah status menjadi sip.";

  const refresh = Button({
    label: state.loading ? "Memuat..." : "Refresh",
    variant: "secondary",
    disabled: state.loading,
    onClick: actions.refresh,
  });
  refresh.classList.add("mt-2", "w-fit");

  panel.append(eyebrow, title, description, refresh);
  return panel;
}

function summary(state) {
  const open = state.tasks.filter((task) => task.status === "open").length;
  const done = state.tasks.filter((task) => task.status === "sip").length;
  const grid = document.createElement("div");
  grid.className = "grid gap-3 sm:grid-cols-2";
  grid.append(summaryCard("Belum selesai", open), summaryCard("Sip", done));
  return grid;
}

function summaryCard(label, value) {
  const card = document.createElement("div");
  card.className = "rounded-2xl border border-[var(--pb-border)] bg-white p-4 shadow-sm";
  const labelNode = document.createElement("p");
  labelNode.className = "text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--pb-text-muted)]";
  labelNode.textContent = label;
  const valueNode = document.createElement("p");
  valueNode.className = "mt-1 text-2xl font-black text-gray-950";
  valueNode.textContent = String(value);
  card.append(labelNode, valueNode);
  return card;
}

function taskCard(task, state, actions) {
  const card = document.createElement("article");
  card.id = `admin_task_card_${task.id}`;
  card.className = "grid gap-4 rounded-2xl border border-[var(--pb-border)] bg-white p-5 shadow-sm sm:p-6";

  const header = document.createElement("div");
  header.className = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";

  const copy = document.createElement("div");
  copy.className = "min-w-0 grid gap-2";
  const title = document.createElement("h2");
  title.className = "break-words text-base font-black text-gray-950";
  title.textContent = task.title || "Tugas tanpa judul";
  const key = document.createElement("p");
  key.className = "break-all text-[10px] font-semibold text-[var(--pb-text-muted)]";
  key.textContent = task.task_key || `task-${task.id}`;
  copy.append(title, key);

  const status = document.createElement("span");
  status.className = `inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1 text-[10px] font-bold ${task.status === "sip" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`;
  status.textContent = STATUS_LABEL[task.status] || task.status;
  header.append(copy, status);

  const description = document.createElement("p");
  description.className = "break-words text-xs leading-6 text-gray-600";
  description.textContent = task.description || "Tidak ada detail tambahan.";

  const footer = document.createElement("div");
  footer.className = "flex flex-col gap-3 border-t border-[var(--pb-border)] pt-4 sm:flex-row sm:items-center sm:justify-between";
  const meta = document.createElement("p");
  meta.className = "break-words text-[10px] leading-5 text-[var(--pb-text-muted)]";
  meta.textContent = task.status === "sip" && task.completed_at
    ? `Diselesaikan ${task.completed_at}${task.completed_by_name ? ` oleh ${task.completed_by_name}` : ""}`
    : `Dibuat ${task.created_at || "-"}`;

  const button = Button({
    id: `admin_task_beres_${task.id}`,
    label: task.status === "sip" ? "Sip" : (state.savingId === task.id ? "Menyimpan..." : "Beres"),
    variant: task.status === "sip" ? "secondary" : "ya",
    disabled: task.status === "sip" || state.savingId !== null,
    onClick: () => actions.complete(task),
  });
  button.classList.add("w-full", "sm:w-auto");
  footer.append(meta, button);
  card.append(header, description, footer);
  return card;
}

function loadingPanel() {
  const panel = document.createElement("div");
  panel.className = "rounded-2xl border border-[var(--pb-border)] bg-white p-6 text-xs text-[var(--pb-text-muted)] shadow-sm";
  panel.textContent = "Memuat daftar tugas...";
  return panel;
}

function errorBox(message) {
  const box = document.createElement("div");
  box.className = "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700";
  box.textContent = message;
  return box;
}
