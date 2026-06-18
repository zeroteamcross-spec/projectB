import { Button } from "../../../ui/primitives/button.js";
import { tw } from "../../../theme/tailwindClasses.js";

export function TransactionAuthGate({
  mode = "login",
  isSubmitting = false,
  error = "",
  onModeChange = null,
  onLogin = null,
  onRegister = null,
} = {}) {
  const section = document.createElement("section");
  section.className = `grid gap-5 ${tw.surface.raisedCard} p-5 sm:p-6`;

  const header = document.createElement("div");
  header.className = "grid gap-2";
  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Buyer access";
  const title = document.createElement("h2");
  title.className = "text-xl font-bold tracking-normal text-gray-950";
  title.textContent = "Masuk sebagai buyer";
  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-gray-600";
  body.textContent = "Transaksi membutuhkan akun buyer aktif agar pesanan dan pembayaran tercatat aman.";
  header.append(eyebrow, title, body);

  const tabs = document.createElement("div");
  tabs.className = `grid grid-cols-2 gap-2 ${tw.surface.inset} p-1`;
  tabs.append(
    tabButton("login", "Masuk", mode, onModeChange),
    tabButton("register", "Daftar buyer", mode, onModeChange)
  );

  const form = mode === "register"
    ? registerForm({ isSubmitting, onRegister })
    : loginForm({ isSubmitting, onLogin });

  section.append(header, tabs);

  if (error) {
    const message = document.createElement("p");
    message.className = tw.alert.error;
    message.textContent = error;
    section.append(message);
  }

  section.append(helperStrip(), form);
  return section;
}

function tabButton(value, label, activeMode, onModeChange) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = value === activeMode
    ? tw.tabs.active
    : tw.tabs.idle;
  button.textContent = label;
  button.addEventListener("click", () => onModeChange?.(value));
  return button;
}

function loginForm({ isSubmitting, onLogin }) {
  const form = baseForm();
  form.append(
    field({ name: "email", label: "Email", type: "email", placeholder: "buyer@projectb.local" }),
    field({ name: "password", label: "Password", type: "password", placeholder: "Password buyer" }),
    submitButton(isSubmitting ? "Memproses..." : "Masuk dan lanjut", isSubmitting)
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    onLogin?.({
      email: data.email,
      password: data.password,
    });
  });
  return form;
}

function registerForm({ isSubmitting, onRegister }) {
  const form = baseForm();
  form.append(
    field({ name: "name", label: "Nama", placeholder: "Nama buyer" }),
    field({ name: "phone_number", label: "Nomor WhatsApp", placeholder: "081234567890" }),
    field({ name: "email", label: "Email", type: "email", placeholder: "buyer-baru@projectb.local" }),
    field({ name: "password", label: "Password", type: "password", placeholder: "Minimal 6 karakter" }),
    submitButton(isSubmitting ? "Mendaftarkan..." : "Daftar dan lanjut", isSubmitting)
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    onRegister?.({
      name: data.name,
      phone_number: data.phone_number,
      email: data.email,
      password: data.password,
      address: "Buyer registration from transaction entry",
    });
  });
  return form;
}

function baseForm() {
  const form = document.createElement("form");
  form.className = "grid gap-4";
  return form;
}

function field({ name, label, type = "text", placeholder = "" }) {
  const wrap = document.createElement("label");
  wrap.className = tw.form.label;
  wrap.textContent = label;
  const input = document.createElement("input");
  input.name = name;
  input.type = type;
  input.required = true;
  input.placeholder = placeholder;
  input.className = tw.form.control;
  wrap.append(input);
  return wrap;
}

function submitButton(label, disabled = false) {
  const button = Button({ label, variant: "primary", disabled });
  button.type = "submit";
  button.classList.add("w-full");
  return button;
}

function helperStrip() {
  const strip = document.createElement("div");
  strip.className = "grid gap-2 border-t border-white/60 pt-4 text-sm text-gray-600";
  [
    "Gunakan akun buyer agar transaksi dan payment status tercatat di dashboard buyer.",
    "Daftar buyer dari sini tetap menjaga funnel berjalan tanpa pindah halaman.",
  ].forEach((copy) => {
    const item = document.createElement("p");
    item.className = "rounded-2xl bg-orange-50/70 px-3 py-2";
    item.textContent = copy;
    strip.append(item);
  });
  return strip;
}
