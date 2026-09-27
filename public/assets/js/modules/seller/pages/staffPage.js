import { createPageLifecycle } from "../../../core/lifecycle.js";
import { staffResource } from "../../../resources/staffResource.js";
import { appStore } from "../../../state/store.js";
import { Card } from "../../../ui/composites/card.js";
import { Button } from "../../../ui/primitives/button.js";
import { Input } from "../../../ui/primitives/input.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { tw } from "../../../theme/tailwindClasses.js";

const RUNTIME_KEY = "sellerStaff";
const DEFAULT_RUNTIME = {
  mode: "list",
  editingId: null,
  saving: false,
  error: "",
};

export function SellerStaffPage() {
  let root = null;
  let unsubscribe = null;

  const actions = {
    createNew() {
      setRuntime({ mode: "create", editingId: null, error: "" });
    },
    edit(staff) {
      setRuntime({ mode: "edit", editingId: staff.id, error: "" });
    },
    cancel() {
      setRuntime({ mode: "list", editingId: null, error: "" });
    },
    async submit(payload) {
      const runtime = runtimeState();
      const showroom = currentShowroom();

      if (!showroom?.id) {
        setRuntime({ error: "Showroom belum tersedia." });
        return;
      }

      if (payload.password && payload.password !== payload.password_confirmation) {
        setRuntime({ error: "Konfirmasi password tidak cocok." });
        return;
      }

      setRuntime({ saving: true, error: "" });

      try {
        if (runtime.mode === "edit" && runtime.editingId) {
          await staffResource.update(showroom.id, runtime.editingId, payload);
          showToast("Staf berhasil diperbarui.", { type: "success" });
        } else {
          await staffResource.create(showroom.id, payload);
          showToast("Staf berhasil dibuat.", { type: "success" });
        }

        await reloadStaff(showroom.id);
        setRuntime({ mode: "list", editingId: null, saving: false, error: "" });
      } catch (error) {
        setRuntime({ saving: false, error: error?.message ?? "Staf gagal disimpan." });
        showToast(error?.message ?? "Staf gagal disimpan.", { type: "error" });
      }
    },
    async toggleStatus(staff) {
      const showroom = currentShowroom();
      if (!showroom?.id) {
        return;
      }

      const nextStatus = staff.status === "active" ? "inactive" : "active";

      try {
        await staffResource.update(showroom.id, staff.id, {
          name: staff.name,
          email: staff.email,
          phone_number: staff.phone_number ?? "",
          status: nextStatus,
        });
        await reloadStaff(showroom.id);
        showToast(nextStatus === "active" ? "Staf diaktifkan." : "Staf dinonaktifkan.", { type: "success" });
      } catch (error) {
        showToast(error?.message ?? "Status staf gagal diperbarui.", { type: "error" });
      }
    },
  };

  return createPageLifecycle({
    mount() {
      ensureRuntime();
      root = document.createElement("div");
      render(root, actions);
      return root;
    },
    hydrate() {
      render(root, actions);
    },
    bindEvents() {
      unsubscribe = appStore.subscribe(() => render(root, actions));
      return () => unsubscribe?.();
    },
    dispose() {
      unsubscribe = null;
      appStore.destroyRuntimeState(RUNTIME_KEY);
    },
  });
}

async function reloadStaff(showroomId) {
  const staff = await staffResource.listMine(showroomId).catch(() => []);
  appStore.patchState("working.sellerStaff.staff", { data: staff, hydratedAt: Date.now() }, "seller:staff-reloaded");
}

function currentShowroom() {
  return appStore.get("working.sellerStaff.showroom.data", null);
}

function render(root, actions) {
  if (!root) {
    return;
  }

  const showroom = currentShowroom();
  const staff = appStore.get("working.sellerStaff.staff.data", []) ?? [];
  const runtime = runtimeState();
  const limit = Number(showroom?.selected_plan_staff_limit ?? 0);
  const quotaReached = limit > 0 && staff.length >= limit;
  const staffDisabled = limit <= 0;

  const layout = document.createElement("section");
  layout.id = "slstf_page";
  layout.className = "grid min-w-0 gap-5";

  layout.append(hero(actions, { staffDisabled, quotaReached, limit, total: staff.length }));

  if (runtime.error) {
    const errorNode = document.createElement("div");
    errorNode.className = tw.alert.error;
    errorNode.textContent = runtime.error;
    layout.append(errorNode);
  }

  if (runtime.mode === "create" || runtime.mode === "edit") {
    const editingStaff = runtime.mode === "edit" ? staff.find((row) => row.id === runtime.editingId) ?? null : null;
    layout.append(staffForm({ staff: editingStaff, mode: runtime.mode, saving: runtime.saving, actions }));
  }

  layout.append(staffList({ staff, actions, staffDisabled }));

  root.replaceChildren(layout);
}

function hero(actions, { staffDisabled, quotaReached, limit, total }) {
  const card = Card();
  card.classList.add("grid", "gap-3", "sm:flex", "sm:items-start", "sm:justify-between");

  const copy = document.createElement("div");
  copy.className = "grid gap-1";
  copy.append(
    textBlock("text-lg font-bold text-gray-950", "Kelola Staf"),
    textBlock(
      `text-xs ${tw.text.muted}`,
      staffDisabled
        ? "Paket showroom Anda belum mendukung fitur staf."
        : `Staf yang login sendiri dan mengelola showroom ini atas nama Anda. Terpakai ${total} dari ${limit} akun staf.`
    ),
  );
  card.append(copy);

  const addButton = Button({
    label: "Tambah Staf",
    disabled: staffDisabled || quotaReached,
    onClick: () => actions.createNew(),
  });

  if (staffDisabled) {
    addButton.title = "Paket showroom Anda belum mendukung fitur staf.";
  } else if (quotaReached) {
    addButton.title = "Batas jumlah staf untuk paket Anda sudah tercapai.";
  }

  card.append(addButton);
  return card;
}

function staffList({ staff, actions, staffDisabled }) {
  if (!staff.length) {
    return EmptyState({
      title: staffDisabled ? "Fitur staf belum aktif" : "Belum ada staf",
      description: staffDisabled
        ? "Upgrade paket showroom Anda untuk memberi login terpisah ke staf operasional."
        : "Tambahkan staf untuk membantu mengelola katalog, inspeksi, dan transaksi cabang ini.",
    });
  }

  const list = document.createElement("div");
  list.className = "grid gap-3";

  staff.forEach((row) => {
    const card = Card();
    card.classList.add("flex", "flex-col", "gap-2", "sm:flex-row", "sm:items-center", "sm:justify-between");

    const info = document.createElement("div");
    info.className = "grid gap-0.5";
    info.append(
      textBlock("text-sm font-semibold text-gray-950", row.name),
      textBlock(`text-xs ${tw.text.muted}`, row.email),
      textBlock(`text-xs ${tw.text.muted}`, row.phone_number || "-"),
    );

    const actionsWrap = document.createElement("div");
    actionsWrap.className = "flex items-center gap-2";
    actionsWrap.append(
      statusBadge(row.status),
      Button({ label: "Edit", variant: "netral", onClick: () => actions.edit(row) }),
      Button({
        label: row.status === "active" ? "Nonaktifkan" : "Aktifkan",
        variant: row.status === "active" ? "tidak" : "ya",
        onClick: () => actions.toggleStatus(row),
      }),
    );

    card.append(info, actionsWrap);
    list.append(card);
  });

  return list;
}

function statusBadge(status) {
  const badge = document.createElement("span");
  const active = status === "active";
  badge.className = active
    ? "inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--pb-success)_16%,transparent)] px-2.5 py-1 text-[10px] font-semibold text-[color-mix(in_srgb,var(--pb-success)_80%,black)]"
    : "inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--pb-danger)_14%,transparent)] px-2.5 py-1 text-[10px] font-semibold text-[color-mix(in_srgb,var(--pb-danger)_80%,black)]";
  badge.textContent = active ? "Aktif" : "Nonaktif";
  return badge;
}

function staffForm({ staff, mode, saving, actions }) {
  const card = Card();
  card.classList.add("grid", "min-w-0", "gap-4");

  const header = document.createElement("div");
  header.className = "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between";
  header.append(
    textBlock("text-lg font-bold text-gray-950", mode === "edit" ? "Edit staf" : "Staf baru"),
    Button({ label: "Batal", variant: "tidak", disabled: saving, onClick: () => actions.cancel() }),
  );
  card.append(header);

  const form = document.createElement("form");
  form.className = "grid gap-4";
  form.append(
    Input({ id: "slstf_name_input", name: "name", label: "Nama Staf", value: staff?.name ?? "", placeholder: "Contoh: Siti Aminah" }),
    Input({ id: "slstf_email_input", name: "email", label: "Email login", type: "email", value: staff?.email ?? "", placeholder: "staf@example.com" }),
    Input({ id: "slstf_phone_input", name: "phone_number", label: "Nomor WhatsApp", value: staff?.phone_number ?? "", placeholder: "Contoh: 081234567890" }),
  );

  const passwordGrid = document.createElement("section");
  passwordGrid.className = "grid gap-4 sm:grid-cols-2";
  passwordGrid.append(
    Input({
      id: "slstf_password_input",
      name: "password",
      label: mode === "edit" ? "Password baru (opsional)" : "Password",
      type: "password",
      value: "",
      placeholder: mode === "edit" ? "Kosongkan jika tidak reset" : "Minimal 6 karakter",
    }),
    Input({ id: "slstf_password_confirmation_input", name: "password_confirmation", label: "Konfirmasi password", type: "password", value: "", placeholder: "Ulangi password" }),
  );
  form.append(passwordGrid);

  const statusField = document.createElement("label");
  statusField.className = tw.form.label;
  statusField.append(document.createTextNode("Status"));
  const statusSelect = document.createElement("select");
  statusSelect.id = "slstf_status_input";
  statusSelect.name = "status";
  statusSelect.className = tw.form.control;
  [
    { value: "active", label: "Aktif" },
    { value: "inactive", label: "Nonaktif" },
  ].forEach((option) => {
    const node = document.createElement("option");
    node.value = option.value;
    node.textContent = option.label;
    node.selected = (staff?.status ?? "active") === option.value;
    statusSelect.append(node);
  });
  statusField.append(statusSelect);
  form.append(statusField);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    actions.submit({
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone_number: String(formData.get("phone_number") ?? "").trim(),
      status: String(formData.get("status") ?? "active"),
      password: String(formData.get("password") ?? ""),
      password_confirmation: String(formData.get("password_confirmation") ?? ""),
    });
  });

  const submitButton = Button({
    id: "slstf_submit_button",
    label: saving ? "Menyimpan..." : mode === "edit" ? "Simpan perubahan" : "Buat staf",
    disabled: saving,
    onClick: () => form.requestSubmit(),
  });
  form.append(submitButton);
  card.append(form);

  return card;
}

function textBlock(className, text) {
  const node = document.createElement("p");
  node.className = className;
  node.textContent = text;
  return node;
}

function ensureRuntime() {
  if (!appStore.get(`runtime.${RUNTIME_KEY}`, null)) {
    appStore.patchState(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME, "seller:staff-runtime-init");
  }
}

function runtimeState() {
  return appStore.get(`runtime.${RUNTIME_KEY}`, DEFAULT_RUNTIME) ?? DEFAULT_RUNTIME;
}

function setRuntime(patch = {}) {
  appStore.patchState(`runtime.${RUNTIME_KEY}`, {
    ...runtimeState(),
    ...patch,
  }, "seller:staff-runtime");
}
