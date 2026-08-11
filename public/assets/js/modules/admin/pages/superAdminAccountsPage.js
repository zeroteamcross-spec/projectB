import { createPageLifecycle } from "../../../core/lifecycle.js";
import { authStore } from "../../../state/authStore.js";
import { Button } from "../../../ui/primitives/button.js";
import { EmptyState } from "../../../ui/primitives/emptyState.js";
import { Input } from "../../../ui/primitives/input.js";
import { Select } from "../../../ui/primitives/select.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { adminAccountsResource } from "../../../resources/adminAccountsResource.js";
import { adminMasterService } from "../services/adminMasterService.js";

/**
 * Pembuatan akun admin dan showroom, khusus super admin.
 *
 * Penjagaan sebenarnya ada di server (AdminUserService::createAccount). Yang di
 * sini hanya supaya admin biasa tidak melihat form yang pasti ditolak.
 */
export function SuperAdminAccountsPage() {
  let root = null;
  const state = {
    kota: [],
    mengirim: false,
    error: "",
    fieldError: {},
    berhasil: null,
    jenis: "admin",
  };

  return createPageLifecycle({
    async bootstrap() {
      const master = await adminMasterService.getLocationMaster().catch(() => null);
      state.kota = (master?.data?.cities ?? master?.cities ?? [])
        .filter((kota) => (kota?.status ?? "active") === "active")
        .map((kota) => String(kota?.name ?? "").trim())
        .filter(Boolean);
    },
    mount(context) {
      root = document.createElement("section");
      root.id = "sadm_accounts_page";
      root.className = "grid gap-5";
      render(root, context, state);
      return root;
    },
    hydrate(context) {
      render(root, context, state);
    },
    dispose() {
      root = null;
    },
  });
}

function render(root, context, state) {
  if (!root) {
    return;
  }

  if (authStore.role() !== "super_admin") {
    root.replaceChildren(EmptyState({
      title: "Khusus super admin",
      description: "Pembuatan akun admin dan showroom hanya tersedia untuk super admin.",
    }));
    return;
  }

  const header = document.createElement("div");
  header.className = "grid gap-2";

  const judul = document.createElement("h1");
  judul.id = "sadm_accounts_title";
  judul.className = "text-xl font-black tracking-normal text-gray-950";
  judul.textContent = "Buat Akun";

  const sub = document.createElement("p");
  sub.className = "max-w-3xl text-xs leading-6 text-[var(--pb-text-muted)]";
  sub.textContent = "Akun yang dibuat di sini langsung aktif dan tidak perlu melewati antrean approval.";

  header.append(judul, sub);

  const pemilih = Select({
    id: "sadm_accounts_role_select",
    name: "role",
    label: "Jenis akun",
    value: state.jenis,
    options: [
      { value: "admin", label: "Admin" },
      { value: "seller", label: "Showroom" },
    ],
  });
  pemilih.querySelector("select")?.addEventListener("change", (event) => {
    state.jenis = event.target.value;
    state.error = "";
    state.fieldError = {};
    render(root, context, state);
  });

  const isi = [header, pemilih];

  if (state.berhasil) {
    isi.push(panelBerhasil(state));
  }

  if (state.error) {
    isi.push(panelError(state.error));
  }

  isi.push(state.jenis === "admin" ? formAdmin(root, context, state) : formShowroom(root, context, state));

  root.replaceChildren(...isi);
}

function panelBerhasil(state) {
  const panel = document.createElement("div");
  panel.id = "sadm_accounts_success_panel";
  panel.className = "grid gap-1 rounded-[1.25rem] border border-[color-mix(in_srgb,var(--pb-success)_26%,white)] bg-[color-mix(in_srgb,var(--pb-success)_8%,white)] px-4 py-3";

  const judul = document.createElement("p");
  judul.className = "text-xs font-black text-[color-mix(in_srgb,var(--pb-success)_84%,black)]";
  judul.textContent = state.berhasil.pesan;

  const rinci = document.createElement("p");
  rinci.className = "break-words text-xs text-[var(--pb-text-muted)]";
  rinci.textContent = `${state.berhasil.nama} — ${state.berhasil.email}`;

  panel.append(judul, rinci);
  return panel;
}

function panelError(pesan) {
  const panel = document.createElement("p");
  panel.id = "sadm_accounts_error_panel";
  panel.className = "rounded-[1.25rem] border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-4 py-3 text-xs font-semibold text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
  panel.textContent = pesan;
  return panel;
}

function kartuForm(id, judulTeks, ikon, kolom, tombol) {
  const kartu = document.createElement("form");
  kartu.id = id;
  kartu.className = "grid gap-4 rounded-lg border border-[var(--pb-border)] bg-white p-5 shadow-sm";
  kartu.noValidate = true;

  const kepala = document.createElement("div");
  kepala.className = "flex min-w-0 items-center gap-3";
  const bulat = document.createElement("span");
  bulat.className = "inline-flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-800";
  bulat.append(createIcon(ikon, { className: "h-5 w-5" }));
  const judul = document.createElement("h2");
  judul.className = "text-base font-black text-gray-950";
  judul.textContent = judulTeks;
  kepala.append(bulat, judul);

  const grid = document.createElement("div");
  grid.className = "grid gap-3 md:grid-cols-2";
  grid.append(...kolom);

  kartu.append(kepala, grid, tombol);
  return kartu;
}

function formAdmin(root, context, state) {
  const nama = Input({ id: "sadm_admin_name_input", name: "name", label: "Nama", value: "" });
  const email = Input({ id: "sadm_admin_email_input", name: "email", label: "Email", type: "email", value: "" });
  const telepon = Input({ id: "sadm_admin_phone_input", name: "phone_number", label: "Nomor telepon", value: "" });
  const sandi = Input({ id: "sadm_admin_password_input", name: "password", label: "Password", type: "password", value: "" });

  const tombol = Button({
    label: state.mengirim ? "Menyimpan..." : "Buat akun admin",
    disabled: state.mengirim,
    onClick: () => kirim(root, context, state, {
      role: "admin",
      name: nilai(nama),
      email: nilai(email),
      phone_number: nilai(telepon) || null,
      password: nilai(sandi),
    }),
  });
  tombol.id = "sadm_admin_submit_button";

  return kartuForm("sadm_admin_form", "Akun Admin", "user", [
    bungkus(nama, state, "name"),
    bungkus(email, state, "email"),
    bungkus(telepon, state, "phone_number"),
    bungkus(sandi, state, "password"),
  ], tombol);
}

function formShowroom(root, context, state) {
  const nama = Input({ id: "sadm_seller_name_input", name: "name", label: "Nama pemilik", value: "" });
  const email = Input({ id: "sadm_seller_email_input", name: "email", label: "Email pemilik", type: "email", value: "" });
  const telepon = Input({ id: "sadm_seller_phone_input", name: "phone_number", label: "Nomor telepon pemilik", value: "" });
  const sandi = Input({ id: "sadm_seller_password_input", name: "password", label: "Password", type: "password", value: "" });
  const namaShowroom = Input({ id: "sadm_seller_showroom_name_input", name: "showroom_name", label: "Nama showroom", value: "" });
  const slug = Input({ id: "sadm_seller_showroom_slug_input", name: "showroom_slug", label: "Slug showroom", value: "", placeholder: "toko-jaya-motor" });
  const alamat = Input({ id: "sadm_seller_showroom_address_input", name: "showroom_address", label: "Alamat showroom", value: "" });

  const kota = Select({
    id: "sadm_seller_showroom_city_select",
    name: "showroom_city",
    label: "Kota showroom",
    value: "",
    options: [
      { value: "", label: "Pilih kota" },
      ...state.kota.map((item) => ({ value: item, label: item })),
    ],
  });

  const tombol = Button({
    label: state.mengirim ? "Menyimpan..." : "Buat akun showroom",
    disabled: state.mengirim,
    onClick: () => kirim(root, context, state, {
      role: "seller",
      name: nilai(nama),
      email: nilai(email),
      phone_number: nilai(telepon) || null,
      password: nilai(sandi),
      showroom: {
        name: nilai(namaShowroom),
        slug: nilai(slug),
        city_name: nilai(kota),
        address: nilai(alamat) || null,
        phone_number: nilai(telepon) || null,
      },
    }),
  });
  tombol.id = "sadm_seller_submit_button";

  return kartuForm("sadm_seller_form", "Akun Showroom", "showroom", [
    bungkus(nama, state, "name"),
    bungkus(email, state, "email"),
    bungkus(telepon, state, "phone_number"),
    bungkus(sandi, state, "password"),
    bungkus(namaShowroom, state, "showroom.name"),
    bungkus(slug, state, "showroom.slug"),
    bungkus(kota, state, "showroom.city_name"),
    bungkus(alamat, state, "showroom.address"),
  ], tombol);
}

/**
 * Menempelkan pesan galat per kolom di bawah inputnya, memakai kunci yang
 * dikirim server apa adanya -- termasuk bentuk bertitik seperti
 * "showroom.slug", supaya bentrok slug mendarat tepat di kolomnya.
 */
function bungkus(field, state, kunci) {
  const pesan = state.fieldError?.[kunci];

  if (!pesan) {
    return field;
  }

  const wrap = document.createElement("div");
  wrap.className = "grid gap-1";
  const nota = document.createElement("p");
  nota.className = "text-[10px] font-semibold text-[var(--pb-danger)]";
  nota.textContent = pesan;
  wrap.append(field, nota);
  return wrap;
}

function nilai(field) {
  return String(field.querySelector("input, select")?.value ?? "").trim();
}

async function kirim(root, context, state, payload) {
  state.mengirim = true;
  state.error = "";
  state.fieldError = {};
  state.berhasil = null;
  render(root, context, state);

  try {
    const hasil = await adminAccountsResource.create(payload);
    state.berhasil = {
      pesan: hasil.message,
      nama: hasil.user?.name ?? payload.name,
      email: hasil.user?.email ?? payload.email,
    };
    showToast(hasil.message, { type: "success", key: "sadm-account-created" });
  } catch (error) {
    state.fieldError = normalkanFieldError(error);
    state.error = Object.keys(state.fieldError).length
      ? "Periksa kembali isian yang ditandai."
      : (error?.message || "Akun gagal dibuat.");
  } finally {
    state.mengirim = false;
    render(root, context, state);
  }
}

function normalkanFieldError(error) {
  const errors = error?.errors;

  if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
    return {};
  }

  return Object.keys(errors).reduce((carry, kunci) => {
    const pesan = errors[kunci];
    carry[kunci] = Array.isArray(pesan) ? String(pesan[0] ?? "") : String(pesan ?? "");
    return carry;
  }, {});
}
