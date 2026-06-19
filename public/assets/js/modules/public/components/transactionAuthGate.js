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
  eyebrow.textContent = "Akun akses";
  const title = document.createElement("h2");
  title.className = "text-xl font-bold tracking-normal text-gray-950";
  title.textContent = "Masuk";
  const body = document.createElement("p");
  body.className = "text-sm leading-6 text-gray-600";
  body.textContent = "Transaksi membutuhkan akun aktif agar pesanan dan pembayaran tercatat aman.";
  header.append(eyebrow, title, body);

  const tabs = document.createElement("div");
  tabs.className = `grid grid-cols-2 gap-2 ${tw.surface.inset} p-1`;
  tabs.append(
    tabButton("login", "Masuk", mode, onModeChange),
    tabButton("register", "Daftar Pembeli", mode, onModeChange)
  );

  const form = mode === "register"
    ? registerForm({ isSubmitting, onRegister })
    : loginForm({ isSubmitting, onLogin });

  section.append(header);

  if (error) {
    const message = document.createElement("p");
    message.className = tw.alert.error;
    message.textContent = error;
    // section.append(message);
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

  const button = document.createElement("button");
  button.id = "google_login_buyer_button";
  button.type = "button";
  button.disabled = isSubmitting;
  button.className = "inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-[1rem] border border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.84),rgba(216,222,236,0.58))] px-4 text-sm font-black tracking-normal text-[#171a35] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_14px_30px_rgba(84,92,170,0.13)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white focus:outline-none focus:ring-4 focus:ring-[#dfe3ff] disabled:cursor-wait disabled:opacity-70";

  const icon = document.createElement("span");
  icon.className = "grid h-5 w-5 shrink-0 place-items-center text-lg font-black leading-none";
  icon.textContent = "G";
  icon.style.background = "conic-gradient(from -45deg,#4285f4 0 25%,#34a853 0 50%,#fbbc05 0 75%,#ea4335 0 100%)";
  icon.style.setProperty("-webkit-background-clip", "text");
  icon.style.setProperty("background-clip", "text");
  icon.style.color = "transparent";

  const text = document.createTextNode(isSubmitting ? "Membuka Google..." : "Login dengan Google");

  button.append(icon, text);

  button.addEventListener("click", (event) => {
    event.preventDefault();
    onLogin?.();
  });

  const note = document.createElement("p");
  note.className = "text-xs leading-5 text-gray-500 text-center mt-2";
  note.textContent = "";

  form.append(button, note);
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
    "",
    "",
  ].forEach((copy) => {
    const item = document.createElement("p");
    item.className = "rounded-2xl bg-orange-50/70 px-3 py-2";
    item.textContent = copy;
    strip.append(item);
  });
  return strip;
}
