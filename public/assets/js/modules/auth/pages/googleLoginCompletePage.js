import { createPageLifecycle } from "../../../core/lifecycle.js";
import { Button } from "../../../ui/primitives/button.js";
import { showToast } from "../../../ui/primitives/toast.js";
import { defaultLoginPath } from "../../../config/authUxConfig.js";
import { googleLoginService } from "../services/googleLoginService.js";

const PAGE_BG = "bg-[radial-gradient(circle_at_18%_10%,color-mix(in_srgb,var(--pb-brand-primary)_16%,transparent),transparent_34%),linear-gradient(135deg,#f8fafc,#fff7ed_50%,#eef7f3)]";

export function GoogleLoginCompletePage() {
  let root = null;
  const state = {
    loading: true,
    submitting: false,
    status: null,
    error: "",
    done: null,
  };

  return createPageLifecycle({
    bootstrap(context) {
      state.loading = true;
      state.submitting = false;
      state.status = null;
      state.error = context.query?.message || "";
      state.done = null;
    },
    mount(context) {
      root = document.createElement("main");
      root.className = `min-h-screen ${PAGE_BG} px-4 py-8 sm:px-6 lg:px-10`;
      render(root, context, state);
      return root;
    },
    async hydrate(context) {
      if (context.query?.status === "error") {
        state.loading = false;
        render(root, context, state);
        return;
      }

      try {
        state.status = await googleLoginService.status();
      } catch (error) {
        state.error = error.message || "Status completion Google gagal diambil.";
      } finally {
        state.loading = false;
        render(root, context, state);
      }
    },
  });
}

function render(root, context, state) {
  if (!root) {
    return;
  }

  const panel = document.createElement("section");
  panel.id = "google_login_complete_panel";
  panel.className = "mx-auto grid min-h-[calc(100vh-4rem)] max-w-2xl items-center";

  const card = document.createElement("div");
  card.className = "grid gap-5 rounded-[2rem] border border-white/80 bg-white/86 p-5 shadow-[0_34px_100px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-8";

  card.append(header());

  if (state.loading) {
    card.append(text("Memeriksa status Google Login..."));
  } else if (state.error) {
    card.append(messageBox(state.error, "error"), navButton("Kembali ke Google Login Seller", () => context.router.navigate("/google-login/seller")));
  } else if (state.done) {
    card.append(donePanel(context, state.done));
  } else if (state.status?.completion?.required) {
    card.append(completionForm(root, context, state));
  } else {
    card.append(messageBox("Tidak ada data Google yang perlu dilengkapi.", "info"), navButton("Kembali ke Google Login", () => context.router.navigate(defaultLoginPath("buyer"))));
  }

  panel.append(card);
  root.replaceChildren(panel);
}

function header() {
  const headerEl = document.createElement("header");
  headerEl.className = "grid gap-2";

  const eyebrow = document.createElement("p");
  eyebrow.className = "text-xs font-black uppercase tracking-[0.18em] text-orange-700";
  eyebrow.textContent = "Google profile completion";

  const title = document.createElement("h1");
  title.className = "text-3xl font-black tracking-[-0.04em] text-gray-950";
  title.textContent = "Lengkapi Data Google Login";

  const body = document.createElement("p");
  body.className = "text-sm leading-7 text-gray-600";
  body.textContent = "Seller wajib melengkapi WhatsApp format 62 dan data showroom sebelum proses approval admin.";

  headerEl.append(eyebrow, title, body);
  return headerEl;
}

function completionForm(root, context, state) {
  const completion = state.status.completion;
  const form = document.createElement("form");
  form.className = "grid gap-4";

  form.append(
    field({ name: "name", label: "Nama", value: completion.user?.name || "", required: true }),
    field({ name: "email", label: "Email Google", value: completion.user?.email || "", readonly: true }),
    field({ name: "whatsapp", label: "Nomor WhatsApp", value: completion.user?.phone_number || "", placeholder: "6281234567890", required: true }),
    field({ name: "showroom_name", label: "Nama Showroom", value: completion.showroom?.name || "", required: true }),
    field({ name: "showroom_address", label: "Alamat Showroom", value: completion.showroom?.address || "", required: false }),
  );

  const hint = document.createElement("p");
  hint.className = "rounded-2xl bg-orange-50 px-4 py-3 text-sm leading-6 text-gray-700";
  hint.textContent = "Nomor WhatsApp wajib diawali 62 dan hanya angka. Contoh: 6281234567890.";
  form.append(hint);

  const submit = Button({
    label: state.submitting ? "Menyimpan..." : "Simpan data seller",
    variant: "primary",
    disabled: state.submitting,
  });
  submit.type = "submit";
  submit.id = "google_login_complete_submit_button";
  submit.classList.add("w-full", "justify-center");
  form.append(submit);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitCompletion(root, context, state, form);
  });

  return form;
}

async function submitCompletion(root, context, state, form) {
  const payload = Object.fromEntries(new FormData(form));

  if (!/^62[0-9]{8,18}$/.test(String(payload.whatsapp || ""))) {
    showToast("Nomor WhatsApp wajib format 62 dan hanya angka.", { type: "error", key: "google-complete-wa" });
    return;
  }

  state.submitting = true;
  render(root, context, state);

  try {
    const result = await googleLoginService.completeProfile(payload);
    state.done = result.next ?? { status: "ready", target: "/seller" };
    showToast(result.next?.message || "Profil Google berhasil dilengkapi.", { type: "success", key: "google-complete-success" });

    if (result.login_available && result.next?.target) {
      context.router.navigate(result.next.target);
      return;
    }
  } catch (error) {
    state.error = error.message || "Data Google gagal disimpan.";
    showToast(state.error, { type: "error", key: "google-complete-error" });
  } finally {
    state.submitting = false;
    render(root, context, state);
  }
}

function donePanel(context, done) {
  const wrap = document.createElement("div");
  wrap.className = "grid gap-4";
  wrap.append(messageBox(done.message || "Profil Google berhasil dilengkapi.", done.status === "ready" ? "info" : "warning"));

  if (done.target) {
    wrap.append(navButton(done.status === "ready" ? "Lanjut" : "Buka Login Seller", () => context.router.navigate(done.target)));
  }

  return wrap;
}

function field({ name, label, value = "", placeholder = "", required = false, readonly = false }) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1.5 text-sm font-semibold text-gray-700";
  wrap.textContent = label;

  const input = document.createElement("input");
  input.name = name;
  input.value = value;
  input.placeholder = placeholder;
  input.required = required;
  input.readOnly = readonly;
  input.className = "min-h-11 w-full rounded-2xl border border-gray-200 bg-white/90 px-4 py-2.5 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 read-only:bg-gray-50 read-only:text-gray-500";

  wrap.append(input);
  return wrap;
}

function text(value) {
  const paragraph = document.createElement("p");
  paragraph.className = "text-sm leading-6 text-gray-600";
  paragraph.textContent = value;
  return paragraph;
}

function messageBox(message, type) {
  const box = document.createElement("p");
  const classes = {
    error: "border-red-200 bg-red-50 text-red-700",
    warning: "border-orange-200 bg-orange-50 text-orange-800",
    info: "border-blue-100 bg-blue-50 text-blue-800",
  };
  box.className = `rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 ${classes[type] ?? classes.info}`;
  box.textContent = message;
  return box;
}

function navButton(label, onClick) {
  const button = Button({ label, variant: "primary", onClick });
  button.classList.add("w-full", "justify-center");
  return button;
}
