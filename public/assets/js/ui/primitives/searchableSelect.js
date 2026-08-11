import { tw } from "../theme/tailwindClasses.js";

/**
 * Dropdown yang bisa dicari, untuk daftar panjang seperti Master Lokasi.
 *
 * Bukan <input list> dengan <datalist>. Datalist memang gratis fiturnya, tapi
 * ia menerima teks apa pun yang diketik, dan nama kota yang diketik bebas
 * persis yang ingin dihindari -- satu listing menulis "Jakarta Selatan", yang
 * lain "Jaksel", dan filter katalog pecah.
 *
 * Jadi bentuknya: satu input tersembunyi yang membawa nilai ke FormData, dan
 * satu input teks yang hanya untuk mencari. Nilai hanya berubah lewat memilih
 * salah satu pilihan. Apa pun yang tersisa di kotak pencarian saat fokus lepas
 * dikembalikan ke label pilihan yang sedang aktif.
 *
 * Bentuk options sama dengan Select: { value, label }. Pilihan dengan value
 * kosong diperlakukan sebagai placeholder.
 */
export function SearchableSelect({
  id = "",
  name,
  label = "",
  options = [],
  value = "",
  helper = "",
  emptyLabel = "Tidak ada yang cocok",
  // Form mobil seller memakai gaya kolomnya sendiri, bukan tw.form. Tanpa
  // celah ini kotak pencarian akan terlihat berbeda dari kolom di sebelahnya.
  labelClass = tw.form.label,
  controlClass = tw.form.control,
} = {}) {
  const daftar = Array.isArray(options) ? options : [];
  const placeholder = daftar.find((option) => String(option?.value ?? "") === "");
  const dapatDipilih = daftar.filter((option) => String(option?.value ?? "") !== "");

  let terpilih = dapatDipilih.find((option) => String(option.value) === String(value ?? "")) ?? null;
  let sorotan = -1;
  let tampilkan = [];

  const wrap = document.createElement("label");
  wrap.className = labelClass;
  wrap.dataset.searchableSelect = name ?? "";

  if (label) {
    const labelNode = document.createElement("span");
    labelNode.textContent = label;
    wrap.append(labelNode);
  }

  const anchor = document.createElement("span");
  anchor.className = "relative grid min-w-0";

  const hidden = document.createElement("input");
  hidden.type = "hidden";
  hidden.name = name ?? "";
  hidden.value = terpilih ? String(terpilih.value) : "";

  const search = document.createElement("input");
  search.type = "text";
  search.className = controlClass;
  search.autocomplete = "off";
  search.setAttribute("role", "combobox");
  search.setAttribute("aria-expanded", "false");
  search.setAttribute("aria-autocomplete", "list");
  search.placeholder = String(placeholder?.label ?? "Cari lalu pilih");
  search.value = terpilih ? String(terpilih.label) : "";
  if (id) {
    // id-nya menempel di kotak yang benar-benar diketik pengguna, supaya
    // tester dan label tetap menunjuk ke sesuatu yang bisa diisi.
    search.id = id;
  }

  const panel = document.createElement("span");
  panel.className =
    "absolute left-0 right-0 top-full z-30 mt-1 hidden max-h-56 overflow-y-auto rounded-[1rem] border border-[var(--pb-form-border)] bg-white p-1 shadow-[0_18px_50px_rgba(15,23,42,0.16)]";
  panel.setAttribute("role", "listbox");
  if (id) {
    panel.id = `${id}_options`;
  }

  anchor.append(hidden, search, panel);
  wrap.append(anchor);

  if (helper) {
    const helperNode = document.createElement("span");
    helperNode.className = "text-[10px] font-semibold text-gray-500";
    helperNode.textContent = helper;
    wrap.append(helperNode);
  }

  const TINGGI_PANEL = 224; // sama dengan max-h-56

  /**
   * Form mobil dipakai di dalam modal yang menggulir. Kolom Lokasi ada di
   * langkah dua, dekat bagian bawah, jadi panel yang selalu terbuka ke bawah
   * akan terpotong tepi modal. Kalau ruang di bawah kurang dan ruang di atas
   * lebih lega, panelnya dibalik ke atas.
   */
  function aturArahPanel() {
    const kotak = search.getBoundingClientRect();
    const ruangBawah = window.innerHeight - kotak.bottom;
    const keAtas = ruangBawah < TINGGI_PANEL && kotak.top > ruangBawah;

    panel.classList.toggle("top-full", !keAtas);
    panel.classList.toggle("mt-1", !keAtas);
    panel.classList.toggle("bottom-full", keAtas);
    panel.classList.toggle("mb-1", keAtas);
  }

  function bukaPanel() {
    panel.classList.remove("hidden");
    search.setAttribute("aria-expanded", "true");
    aturArahPanel();
  }

  function tutupPanel() {
    panel.classList.add("hidden");
    search.setAttribute("aria-expanded", "false");
    sorotan = -1;
  }

  function saring(kataKunci) {
    const kunci = String(kataKunci ?? "").trim().toLowerCase();

    if (!kunci) {
      return dapatDipilih;
    }

    return dapatDipilih.filter((option) => String(option.label).toLowerCase().includes(kunci));
  }

  function pilih(option) {
    terpilih = option;
    hidden.value = String(option.value);
    search.value = String(option.label);
    tutupPanel();
    hidden.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function gambarPanel(kataKunci) {
    tampilkan = saring(kataKunci);
    panel.replaceChildren();

    if (!tampilkan.length) {
      const kosong = document.createElement("span");
      kosong.className = "block px-3 py-2 text-xs font-semibold text-gray-500";
      kosong.textContent = emptyLabel;
      panel.append(kosong);
      return;
    }

    tampilkan.forEach((option, index) => {
      const item = document.createElement("span");
      item.className = itemClass(index === sorotan, terpilih && String(option.value) === String(terpilih.value));
      item.textContent = String(option.label);
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", terpilih && String(option.value) === String(terpilih.value) ? "true" : "false");
      // mousedown, bukan click: blur pada input berjalan lebih dulu daripada
      // click dan akan menutup panel sebelum pilihannya sempat terbaca.
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        pilih(option);
      });
      panel.append(item);
    });
  }

  function geserSorotan(langkah) {
    if (!tampilkan.length) {
      return;
    }

    sorotan = (sorotan + langkah + tampilkan.length) % tampilkan.length;
    gambarPanel(search.value);
    panel.children[sorotan]?.scrollIntoView({ block: "nearest" });
  }

  search.addEventListener("focus", () => {
    // Kotaknya dikosongkan supaya seluruh daftar terlihat lagi; labelnya
    // dikembalikan saat fokus lepas kalau tidak ada yang dipilih.
    search.select();
    gambarPanel("");
    bukaPanel();
  });

  search.addEventListener("input", () => {
    sorotan = -1;
    gambarPanel(search.value);
    bukaPanel();
  });

  search.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      bukaPanel();
      geserSorotan(event.key === "ArrowDown" ? 1 : -1);
      return;
    }

    if (event.key === "Enter") {
      const kandidat = sorotan >= 0 ? tampilkan[sorotan] : tampilkan.length === 1 ? tampilkan[0] : null;
      if (kandidat) {
        // Hanya menahan Enter kalau benar-benar memilih sesuatu, supaya form
        // tetap bisa dikirim dengan Enter saat panelnya tidak menawarkan apa pun.
        event.preventDefault();
        pilih(kandidat);
      }
      return;
    }

    if (event.key === "Escape") {
      tutupPanel();
    }
  });

  search.addEventListener("blur", () => {
    // Teks yang tidak pernah dipilih tidak boleh tertinggal dan terlihat
    // seolah tersimpan. Nilainya ada di hidden input, bukan di sini.
    search.value = terpilih ? String(terpilih.label) : "";
    tutupPanel();
  });

  gambarPanel("");

  return wrap;
}

function itemClass(disorot, dipilih) {
  const dasar = "block cursor-pointer rounded-[0.75rem] px-3 py-2 text-xs font-semibold text-[var(--pb-text)]";

  if (disorot) {
    return `${dasar} bg-[var(--pb-surface-muted)]`;
  }

  if (dipilih) {
    return `${dasar} bg-[color-mix(in_srgb,var(--pb-brand-secondary)_12%,white)]`;
  }

  return `${dasar} hover:bg-[var(--pb-surface-muted)]`;
}
