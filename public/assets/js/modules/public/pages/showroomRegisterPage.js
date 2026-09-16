import { createPageLifecycle } from "../../../core/lifecycle.js";
import { authService } from "../../../core/auth.js";
import { authStore } from "../../../state/authStore.js";
import { Button } from "../../../ui/primitives/button.js";
import { createBackgroundVideoLayer } from "../../../ui/composites/backgroundVideo.js";
import { createIcon } from "../../../theme/iconRegistry.js";
import { tw } from "../../../theme/tailwindClasses.js";
import { adminMasterService } from "../../admin/services/adminMasterService.js";
import { showroomsResource } from "../../../resources/showroomsResource.js";
import { formatCurrency } from "../../../utils/formatCurrency.js";
import { SubscriptionMidtransPanel } from "../../../ui/composites/subscriptionMidtransPanel.js";

const SHOWROOM_REGISTER_FALLBACK = "bg-[radial-gradient(circle_at_12%_10%,color-mix(in_srgb,var(--pb-brand-primary)_18%,transparent),transparent_32%),radial-gradient(circle_at_88%_18%,color-mix(in_srgb,var(--pb-brand-accent)_16%,transparent),transparent_30%),linear-gradient(135deg,#faf4ed,#f8fafc_44%,#eaf4f9)]";

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 80;

/**
 * Registration-only entry point for showrooms. There is deliberately no login
 * form here — signing in happens from the landing page.
 */
export function ShowroomRegisterPage() {
  let root = null;
  let backgroundVideoLayer = null;
  const state = {
    isSubmitting: false,
    error: "",
    fieldErrors: {},
    registered: null,
    banks: [],
    bankIcons: new Map(),
    cities: [],
    // Keeps the typed values across re-renders so a failed submit never wipes
    // a long form.
    draft: {},
    plans: [],
    selectedPlanId: null,
    isSelectingPlan: false,
    planError: "",
    // Cuma menahan di kartu pilihan kalau memang ada paket aktif untuk
    // dipilih -- showroom yang mendaftar sebelum Admin sempat membuat satu
    // pun paket tidak boleh terjebak tanpa jalan keluar.
    planConfirmed: false,
    subscriptionDestination: null,
    paymentProofFile: null,
    paymentNote: "",
    isSubmittingProof: false,
    paymentError: "",
    // Sama seperti planConfirmed -- kalau memang tidak ada paket untuk
    // dipilih, tidak ada juga yang perlu dibayar, jadi langkah ini dilewati.
    paymentSubmitted: false,
    // "midtrans" (Virtual Account, instan -- ditampilkan lebih dulu) atau
    // "manual" (transfer + upload bukti, alur lama, tetap tersedia).
    paymentMethodTab: "midtrans",
    midtransShowroom: null,
    midtransPanelWidget: null,
  };

  const getBackgroundVideoLayer = () => {
    backgroundVideoLayer ??= createBackgroundVideoLayer({
      id: "showroom_register_background_video_layer",
      fallbackClassName: SHOWROOM_REGISTER_FALLBACK,
      overlayClassName: "bg-white/42",
    });
    return backgroundVideoLayer;
  };

  const rerender = (context) => render(root, context, state, handlers);

  const handlers = {
    async submit(context, payload) {
      state.isSubmitting = true;
      state.error = "";
      state.fieldErrors = {};
      rerender(context);

      try {
        await authService.register({ ...payload, role: "seller" });
        state.registered = {
          showroomName: payload.showroom.name,
          slug: payload.showroom.slug,
          email: payload.email,
        };
        // register() masuk juga sekalian (lihat AuthService::register() --
        // seller boleh login walau masih pending approval), jadi endpoint
        // showroom yang butuh sesi aktif (dipakai confirmPlan() di bawah)
        // sudah bisa dipanggil sekarang, tanpa langkah login terpisah.
        if (!state.plans.length) {
          state.planConfirmed = true;
          state.paymentSubmitted = true;
        }
      } catch (error) {
        state.fieldErrors = normalizeFieldErrors(error);
        // "Validation failed" is the transport-level message; when the server
        // pinpointed fields, point the reader at those instead.
        state.error = Object.keys(state.fieldErrors).length
          ? "Periksa kembali isian yang ditandai."
          : (error?.message || "Pendaftaran showroom gagal.");
      } finally {
        state.isSubmitting = false;
        rerender(context);
      }
    },
    updateDraft(patch) {
      Object.assign(state.draft, patch);
    },
    selectPlan(context, planId) {
      state.selectedPlanId = planId;
      rerender(context);
    },
    async confirmPlan(context) {
      const plan = state.plans.find((item) => item.id === state.selectedPlanId);
      if (!plan) {
        return;
      }

      state.isSelectingPlan = true;
      state.planError = "";
      rerender(context);

      try {
        // Harga & periode tagihan tidak dikirim -- server yang menentukan
        // keduanya dari Master Harga berdasarkan nama paket ini, supaya
        // request yang diutak-atik manual tidak bisa mengaku pilih paket
        // dengan harga karangan (lihat ShowroomService::resolveSelectedPlan()).
        await showroomsResource.updateMine({
          selected_plan_name: plan.name,
        });
        state.planConfirmed = true;
      } catch (error) {
        state.planError = error?.message || "Gagal menyimpan pilihan paket harga.";
      } finally {
        state.isSelectingPlan = false;
        rerender(context);
      }
    },
    updateProofFile(context, file) {
      state.paymentProofFile = file;
      state.paymentError = "";
      rerender(context);
    },
    updateProofNote(note) {
      state.paymentNote = note;
    },
    async submitProof(context) {
      if (!state.paymentProofFile) {
        state.paymentError = "Pilih file bukti transfer terlebih dahulu.";
        rerender(context);
        return;
      }

      state.isSubmittingProof = true;
      state.paymentError = "";
      rerender(context);

      try {
        await showroomsResource.submitSubscriptionProof(state.paymentProofFile, state.paymentNote);
        state.paymentSubmitted = true;
      } catch (error) {
        state.paymentError = error?.message || "Gagal mengunggah bukti transfer.";
      } finally {
        state.isSubmittingProof = false;
        rerender(context);
      }
    },
    goToLogin(context) {
      context?.router?.navigate("/auth?role=seller");
    },
    goHome(context) {
      context?.router?.navigate("/");
    },
    switchPaymentMethodTab(context, tab) {
      state.paymentMethodTab = tab;
      rerender(context);
    },
    handleMidtransPaid(context, showroom) {
      state.midtransShowroom = showroom;
      if (showroom && showroom.subscription_payment_status !== "unpaid") {
        state.paymentSubmitted = true;
      }
      rerender(context);
    },
  };

  return createPageLifecycle({
    async bootstrap() {
      const [bankMaster, locationMaster, pricingMaster, destinationMaster] = await Promise.all([
        // Fallback ke normalize<X>Master(null), bukan null mentah -- itu yang
        // mengembalikan seed default (mis. daftar bank/kota bawaan) saat
        // master key ini belum pernah disimpan Admin sama sekali. Fallback ke
        // null polos berarti pendaftar melihat form kosong tanpa penjelasan.
        adminMasterService.getBankMaster().catch(() => adminMasterService.normalizeBankMaster(null)),
        adminMasterService.getLocationMaster().catch(() => adminMasterService.normalizeLocationMaster(null)),
        adminMasterService.getPricingMaster().catch(() => adminMasterService.normalizePricingMaster(null)),
        adminMasterService.getSubscriptionDestinationMaster().catch(() => adminMasterService.normalizeSubscriptionDestinationMaster(null)),
      ]);

      state.plans = (pricingMaster?.data?.plans ?? [])
        .filter((plan) => (plan?.status ?? "active") === "active")
        .sort((a, b) => Number(a.price ?? 0) - Number(b.price ?? 0));

      state.subscriptionDestination = destinationMaster?.data ?? null;

      const activeBanks = (bankMaster?.data?.banks ?? bankMaster?.banks ?? [])
        .filter((bank) => (bank?.status ?? "active") === "active");
      state.banks = activeBanks.map((bank) => String(bank?.bank_name ?? "").trim()).filter(Boolean);
      state.bankIcons = new Map(
        activeBanks
          .map((bank) => [String(bank?.bank_name ?? "").trim(), String(bank?.icon_path ?? "").trim()])
          .filter(([name, icon]) => name && icon)
      );

      state.cities = (locationMaster?.data?.cities ?? locationMaster?.cities ?? [])
        .filter((city) => (city?.status ?? "active") === "active")
        .map((city) => String(city?.name ?? "").trim())
        .filter(Boolean);

      await resumeExistingRegistration(state);
    },
    mount(context) {
      root = document.createElement("div");
      rerender(context);
      return root;
    },
    hydrate(context) {
      rerender(context);
    },
    dispose() {
      backgroundVideoLayer?.dispose?.();
      backgroundVideoLayer = null;
      state.midtransPanelWidget?.dispose?.();
      state.midtransPanelWidget = null;
      root = null;
    },
  });

  function render(target, context, pageState, actions) {
    if (!target) {
      return;
    }

    const shell = document.createElement("div");
    shell.className = "relative isolate min-h-screen overflow-x-clip";
    const background = getBackgroundVideoLayer();

    if (background) {
      shell.append(background);
    }

    const frame = document.createElement("div");
    frame.className = "relative z-10 mx-auto grid w-full max-w-[720px] gap-5 px-4 py-8 sm:px-6";
    frame.append(pageHeader(actions, context));
    if (!pageState.registered) {
      frame.append(registerPanel(pageState, actions, context));
    } else if (!pageState.planConfirmed) {
      frame.append(plansPanel(pageState, actions, context));
    } else if (!pageState.paymentSubmitted) {
      frame.append(paymentPanel(pageState, actions, context));
    } else {
      frame.append(successPanel(pageState, actions, context));
    }

    shell.append(frame);
    target.replaceChildren(shell);
  }
}

function pageHeader(actions, context) {
  const header = document.createElement("header");
  header.id = "shr_register_header";
  header.className = "grid gap-2";

  const back = document.createElement("button");
  back.id = "shr_register_back_button";
  back.type = "button";
  back.className = `inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:brightness-95 ${tw.button.tidak}`;
  back.append(createIcon("chevronRight", { className: "block h-3.5 w-3.5 rotate-180 leading-none" }), document.createTextNode("Kembali ke beranda"));
  back.addEventListener("click", () => actions.goHome(context));

  const eyebrow = document.createElement("p");
  eyebrow.className = tw.text.eyebrow;
  eyebrow.textContent = "Pendaftaran showroom";

  const title = document.createElement("h1");
  // Judul dan body duduk di kanvas krem, bukan di atas video gelap seperti dulu.
  title.className = "text-xl font-black tracking-normal text-[var(--pb-text-strong)] sm:text-2xl";
  title.textContent = "Daftarkan showroom Anda";

  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-[var(--pb-text-muted)]";
  body.textContent = "Isi data pemilik dan showroom.";

  header.append(back, eyebrow, title, body);
  return header;
}

function registerPanel(state, actions, context) {
  const section = document.createElement("section");
  section.id = "shr_register_section";
  section.className = "grid gap-4 rounded-[2rem] border border-[var(--pb-card-border)] bg-white/85 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-6";

  const form = document.createElement("form");
  form.id = "shr_register_form";
  form.className = "grid gap-4";
  form.noValidate = true;

  const nameInput = field({
    id: "shr_register_name_input",
    name: "name",
    label: "Nama",
    placeholder: "Nama lengkap pemilik showroom",
    value: state.draft.name,
    error: state.fieldErrors.name,
  });

  const showroomNameInput = field({
    id: "shr_register_showroom_name_input",
    name: "showroom_name",
    label: "Nama showroom",
    placeholder: "Contoh: Toko Jaya Motor",
    value: state.draft.showroom_name,
    error: state.fieldErrors["showroom.name"],
  });

  const slugInput = field({
    id: "shr_register_showroom_slug_input",
    name: "showroom_slug",
    label: "Alamat URL Showroom",
    placeholder: "toko-jaya-motor",
    value: state.draft.showroom_slug,
    error: state.fieldErrors["showroom.slug"],
    hint: "Huruf kecil, angka, dan dash. Inilah alamat halaman publik Anda.",
  });

  const slugPreview = document.createElement("p");
  slugPreview.id = "shr_register_slug_preview";
  slugPreview.className = "-mt-1 break-all text-[10px] font-semibold text-[var(--pb-brand-secondary)]";
  const paintSlugPreview = (value) => {
    const normalized = normalizeSlug(value);
    slugPreview.textContent = normalized
      ? `Halaman Anda: ${window.location.origin}/${normalized}`
      : "Halaman Anda akan muncul di sini setelah slug diisi.";
  };
  paintSlugPreview(state.draft.showroom_slug ?? "");

  // Typing the showroom name fills the slug until the owner edits it directly.
  let slugTouched = Boolean(state.draft.showroom_slug);
  const slugField = slugInput.querySelector("input");
  const nameField = showroomNameInput.querySelector("input");

  nameField?.addEventListener("input", () => {
    if (slugTouched || !slugField) {
      return;
    }
    slugField.value = normalizeSlug(nameField.value);
    paintSlugPreview(slugField.value);
  });

  slugField?.addEventListener("input", () => {
    slugTouched = slugField.value.trim() !== "";
    paintSlugPreview(slugField.value);
  });

  form.append(
    fieldGroup("", [
      nameInput,
      field({
        id: "shr_register_email_input",
        name: "email",
        label: "Email",
        type: "email",
        placeholder: "pemilik@showroom.com",
        value: state.draft.email,
        error: state.fieldErrors.email,
      }),
      field({
        id: "shr_register_password_input",
        name: "password",
        label: "Password",
        type: "password",
        placeholder: "Minimal 6 karakter",
        value: state.draft.password,
        error: state.fieldErrors.password,
      }),
    ]),
    fieldGroup("", [
      showroomNameInput,
      slugInput,
      slugPreview,
      selectField({
        id: "shr_register_city_input",
        name: "city_name",
        label: "Kota",
        placeholder: "Pilih kota",
        options: state.cities,
        value: state.draft.city_name,
        error: state.fieldErrors["showroom.city_name"],
      }),
      // Alamat showroom, bukan alamat pemilik di atas. Keduanya memang terpisah:
      // yang ini yang tampil di #/seller/showroom dan di halaman publik showroom.
      textareaField({
        id: "shr_register_showroom_address_input",
        name: "showroom_address",
        label: "Alamat showroom",
        placeholder: "Alamat lengkap showroom",
        required: false,
        value: state.draft.showroom_address,
        error: state.fieldErrors["showroom.address"],
      }),
      field({
        id: "shr_register_showroom_phone_input",
        name: "showroom_phone_number",
        label: "Nomor WA Showroom",
        placeholder: "08123456789",
        required: false,
        value: state.draft.showroom_phone_number,
        error: state.fieldErrors["showroom.phone_number"],
      }),
    ]),
    fieldGroup("", [
      selectField({
        id: "shr_register_bank_type_input",
        name: "bank_type",
        label: "Bank",
        placeholder: "Pilih bank",
        options: state.banks,
        required: false,
        value: state.draft.bank_type,
        error: state.fieldErrors["showroom.bank_type"],
        iconFor: (option) => state.bankIcons.get(option) ?? "",
      }),
      field({
        id: "shr_register_bank_account_number_input",
        name: "bank_account_number",
        label: "Nomor rekening",
        placeholder: "1234567890",
        required: false,
        value: state.draft.bank_account_number,
        error: state.fieldErrors["showroom.bank_account_number"],
      }),
      field({
        id: "shr_register_bank_account_name_input",
        name: "bank_account_name",
        label: "Nama pemilik rekening",
        placeholder: "Sesuai buku tabungan",
        required: false,
        value: state.draft.bank_account_name,
        error: state.fieldErrors["showroom.bank_account_name"],
      }),
    ]),
  );

  if (state.error) {
    const message = document.createElement("p");
    message.id = "shr_register_error_message";
    message.className = "rounded-xl border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    message.textContent = state.error;
    form.append(message);
  }

  const submit = Button({
    label: state.isSubmitting ? "Mendaftarkan..." : "Daftarkan showroom",
    variant: "primary",
    disabled: state.isSubmitting,
  });
  submit.id = "shr_register_submit_button";
  submit.type = "submit";
  submit.classList.add("w-full", "shadow-[0_16px_34px_rgba(30,129,176,0.24)]", "transition", "duration-200");
  form.append(submit);

  const helper = document.createElement("p");
  helper.className = "text-xs leading-6 text-gray-600";
  helper.textContent = "Sudah punya akun showroom?";

  const loginLink = document.createElement("button");
  loginLink.id = "shr_register_login_link";
  loginLink.type = "button";
  loginLink.className = "ml-1 font-bold text-[var(--pb-brand-secondary)] underline underline-offset-2";
  loginLink.textContent = "Masuk di sini";
  loginLink.addEventListener("click", () => actions.goToLogin(context));
  helper.append(loginLink);
  form.append(helper);

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (state.isSubmitting) {
      return;
    }

    const data = Object.fromEntries(new FormData(form));
    actions.updateDraft(data);

    const localError = validateDraft(data);
    if (localError) {
      state.error = localError.message;
      state.fieldErrors = localError.fields;
      render();
      return;
    }

    actions.submit(context, {
      name: String(data.name ?? "").trim(),
      email: String(data.email ?? "").trim(),
      password: String(data.password ?? ""),
      phone_number: emptyToNull(data.phone_number),
      address: emptyToNull(data.address),
      showroom: {
        name: String(data.showroom_name ?? "").trim(),
        slug: normalizeSlug(data.showroom_slug),
        address: emptyToNull(data.showroom_address),
        city_name: emptyToNull(data.city_name),
        phone_number: emptyToNull(data.showroom_phone_number),
        bank_type: emptyToNull(data.bank_type),
        bank_account_number: emptyToNull(data.bank_account_number),
        bank_account_name: emptyToNull(data.bank_account_name),
      },
    });
  });

  section.append(form);
  return section;

  function render() {
    section.replaceWith(registerPanel(state, actions, context));
  }
}

function plansPanel(state, actions, context) {
  const section = document.createElement("section");
  section.id = "shr_register_plans_section";
  section.className = "grid gap-4 rounded-[2rem] border border-[var(--pb-card-border)] bg-white/85 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-6";

  const badge = document.createElement("span");
  badge.className = "inline-flex w-fit items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--pb-success)_16%,white)] px-3 py-1.5 text-xs font-bold text-[var(--pb-success)]";
  badge.append(createIcon("shield", { className: "block h-4 w-4 leading-none" }), document.createTextNode("Akun berhasil dibuat"));

  const title = document.createElement("h2");
  title.className = "text-lg font-black tracking-normal text-gray-950";
  title.textContent = "Pilih paket harga";

  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = "Pilih salah satu paket untuk melanjutkan ke pendaftaran. Anda bisa mengubah paket ini nanti.";

  const grid = document.createElement("div");
  grid.id = "shr_register_plan_cards_section";
  grid.className = "grid gap-3 sm:grid-cols-2 lg:grid-cols-3";
  grid.append(...state.plans.map((plan) => planCard(plan, state, actions, context)));

  if (state.planError) {
    const message = document.createElement("p");
    message.id = "shr_register_plan_error_message";
    message.className = "rounded-xl border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    message.textContent = state.planError;
    section.append(badge, title, body, grid, message);
  } else {
    section.append(badge, title, body, grid);
  }

  const submit = Button({
    label: state.isSelectingPlan ? "Menyimpan..." : "Lanjutkan",
    variant: "primary",
    disabled: state.isSelectingPlan || !state.selectedPlanId,
    onClick: () => actions.confirmPlan(context),
  });
  submit.id = "shr_register_plan_confirm_button";
  submit.classList.add("w-full", "shadow-[0_16px_34px_rgba(30,129,176,0.24)]", "transition", "duration-200");
  section.append(submit);

  return section;
}

function planCard(plan, state, actions, context) {
  const isSelected = state.selectedPlanId === plan.id;
  const card = document.createElement("button");
  card.type = "button";
  card.id = `shr_register_plan_card_${plan.id}`;
  card.className = [
    "relative grid gap-3 rounded-[1.5rem] border p-4 text-left transition duration-150",
    isSelected
      ? "border-[var(--pb-brand-primary)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_8%,white)] shadow-[0_16px_34px_rgba(30,129,176,0.18)]"
      : "border-[var(--pb-card-border)] bg-white/70 hover:border-[color-mix(in_srgb,var(--pb-brand-primary)_35%,var(--pb-card-border))]",
  ].join(" ");
  card.setAttribute("aria-pressed", String(isSelected));
  card.addEventListener("click", () => actions.selectPlan(context, plan.id));

  if (plan.is_recommended) {
    const ribbon = document.createElement("span");
    ribbon.className = "absolute -top-2.5 left-4 rounded-full bg-[var(--pb-brand-primary)] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm";
    ribbon.textContent = "Rekomendasi";
    card.append(ribbon);
  }

  const name = document.createElement("p");
  name.className = "text-sm font-black text-gray-950";
  name.textContent = plan.name;

  const price = document.createElement("p");
  price.className = "text-lg font-black text-[var(--pb-brand-secondary)]";
  price.textContent = `${formatCurrency(plan.price)}${plan.billing_period ? ` ${plan.billing_period}` : ""}`;

  card.append(name, price);

  if (plan.features?.length) {
    const list = document.createElement("ul");
    list.className = "grid gap-1.5 text-xs leading-5 text-gray-600";
    plan.features.forEach((feature) => {
      const item = document.createElement("li");
      item.className = "flex items-start gap-1.5";
      item.append(createIcon("circleCheck", { className: "mt-0.5 block h-3.5 w-3.5 shrink-0 leading-none text-[var(--pb-success)]" }), document.createTextNode(feature));
      list.append(item);
    });
    card.append(list);
  }

  return card;
}

function paymentPanel(state, actions, context) {
  const section = document.createElement("section");
  section.id = "shr_register_payment_section";
  section.className = "grid gap-4 rounded-[2rem] border border-[var(--pb-card-border)] bg-white/85 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-6";

  const plan = state.plans.find((item) => item.id === state.selectedPlanId);

  const badge = document.createElement("span");
  badge.className = "inline-flex w-fit items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--pb-success)_16%,white)] px-3 py-1.5 text-xs font-bold text-[var(--pb-success)]";
  badge.append(createIcon("shield", { className: "block h-4 w-4 leading-none" }), document.createTextNode("Paket dipilih"));

  const title = document.createElement("h2");
  title.className = "text-lg font-black tracking-normal text-gray-950";
  title.textContent = "Bayar paket showroom";

  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = "Bayar instan lewat Virtual Account, atau transfer manual dan unggah buktinya. Admin akan memeriksa sebelum akun showroom Anda disetujui.";

  const recap = document.createElement("div");
  recap.className = "grid gap-2 rounded-2xl border border-[var(--pb-card-border)] bg-gray-50 p-3 text-xs";
  if (plan) {
    recap.append(
      detailRow("Paket", plan.name),
      detailRow("Jumlah transfer", `${formatCurrency(plan.price)}${plan.billing_period ? ` ${plan.billing_period}` : ""}`),
    );
  }

  section.append(badge, title, body, recap, paymentMethodTabs(state, actions, context));

  if (state.paymentMethodTab === "midtrans") {
    state.midtransPanelWidget?.dispose?.();
    state.midtransPanelWidget = SubscriptionMidtransPanel({
      getShowroom: () => state.midtransShowroom,
      onPaid: (showroom) => actions.handleMidtransPaid(context, showroom),
    });
    section.append(state.midtransPanelWidget.element);
    return section;
  }

  if (state.subscriptionDestination?.account_number) {
    recap.append(
      detailRow("Bank tujuan", state.subscriptionDestination.bank_name || "-"),
      detailRow("Nomor rekening", state.subscriptionDestination.account_number),
      detailRow("Atas nama", state.subscriptionDestination.account_holder || "-"),
    );
  }

  const fileLabel = document.createElement("label");
  fileLabel.className = "grid gap-1 text-xs font-semibold text-gray-700";
  fileLabel.textContent = "Bukti transfer (JPG, PNG, atau PDF, maks. 5 MB)";
  const fileInput = document.createElement("input");
  fileInput.id = "shr_register_proof_file_input";
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp,application/pdf";
  fileInput.className = "min-h-10 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-white px-3 py-2 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  fileInput.addEventListener("change", (event) => actions.updateProofFile(context, event.target.files?.[0] ?? null));
  fileLabel.append(fileInput);

  // Memilih file men-trigger rerender() penuh, yang membuat <input type=file>
  // baru -- input file tidak bisa membawa nilai "file terpilih" lintas
  // re-render (native browser tidak mengizinkan .files diisi ulang lewat
  // script), jadi labelnya selalu balik ke "No file chosen" walau
  // state.paymentProofFile-nya benar. Nama file di sini sumbernya dari state,
  // bukan dari elemen input, jadi konfirmasinya tetap terlihat.
  if (state.paymentProofFile) {
    const fileName = document.createElement("p");
    fileName.id = "shr_register_proof_file_name";
    fileName.className = "text-[11px] font-medium text-[var(--pb-success)]";
    fileName.textContent = `File dipilih: ${state.paymentProofFile.name}`;
    fileLabel.append(fileName);
  }

  const noteLabel = document.createElement("label");
  noteLabel.className = "grid gap-1 text-xs font-semibold text-gray-700";
  noteLabel.textContent = "Catatan (opsional)";
  const noteInput = document.createElement("textarea");
  noteInput.id = "shr_register_proof_note_input";
  noteInput.rows = 2;
  noteInput.className = "min-h-10 rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-white px-3 py-2 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]";
  noteInput.value = state.paymentNote;
  noteInput.addEventListener("input", (event) => actions.updateProofNote(event.target.value));
  noteLabel.append(noteInput);

  section.append(fileLabel, noteLabel);

  if (state.paymentError) {
    const message = document.createElement("p");
    message.id = "shr_register_payment_error_message";
    message.className = "rounded-xl border border-[color-mix(in_srgb,var(--pb-danger)_26%,white)] bg-[color-mix(in_srgb,var(--pb-danger)_8%,white)] px-3 py-2 text-xs font-medium text-[color-mix(in_srgb,var(--pb-danger)_84%,black)]";
    message.textContent = state.paymentError;
    section.append(message);
  }

  const submit = Button({
    label: state.isSubmittingProof ? "Mengunggah..." : "Kirim bukti transfer",
    variant: "primary",
    disabled: state.isSubmittingProof || !state.paymentProofFile,
    onClick: () => actions.submitProof(context),
  });
  submit.id = "shr_register_payment_submit_button";
  submit.classList.add("w-full", "shadow-[0_16px_34px_rgba(30,129,176,0.24)]", "transition", "duration-200");
  section.append(submit);

  return section;
}

function paymentMethodTabs(state, actions, context) {
  const wrap = document.createElement("div");
  wrap.id = "shr_register_payment_method_tabs";
  wrap.className = "grid grid-cols-2 gap-2";

  [
    { value: "midtrans", label: "Virtual Account (Instan)" },
    { value: "manual", label: "Transfer Manual" },
  ].forEach(({ value, label }) => {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.dataset.paymentMethodTab = value;
    const isActive = state.paymentMethodTab === value;
    tab.className = [
      "rounded-xl border px-3 py-2 text-xs font-bold transition",
      isActive
        ? "border-[var(--pb-brand-primary)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_8%,white)] text-[var(--pb-brand-secondary)]"
        : "border-[var(--pb-card-border)] bg-white text-gray-700 hover:border-[color-mix(in_srgb,var(--pb-brand-primary)_35%,var(--pb-card-border))]",
    ].join(" ");
    tab.textContent = label;
    tab.addEventListener("click", () => actions.switchPaymentMethodTab(context, value));
    wrap.append(tab);
  });

  return wrap;
}

function successPanel(state, actions, context) {
  const registered = state.registered;
  const section = document.createElement("section");
  section.id = "shr_register_success_section";
  section.className = "grid gap-4 rounded-[2rem] border border-[var(--pb-card-border)] bg-white/85 p-5 shadow-[0_30px_90px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-6";

  const badge = document.createElement("span");
  badge.className = "inline-flex w-fit items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--pb-success)_16%,white)] px-3 py-1.5 text-xs font-bold text-[var(--pb-success)]";
  badge.append(createIcon("shield", { className: "block h-4 w-4 leading-none" }), document.createTextNode("Pendaftaran diterima"));

  const title = document.createElement("h2");
  title.className = "text-lg font-black tracking-normal text-gray-950";
  title.textContent = `${registered.showroomName} berhasil didaftarkan`;

  const body = document.createElement("p");
  body.className = "text-xs leading-6 text-gray-600";
  body.textContent = state.plans.length
    ? "Akun Anda menunggu persetujuan admin, termasuk verifikasi pembayaran paket yang baru saja Anda lakukan. Anda sudah bisa masuk dan menyiapkan showroom, tetapi sebagian fitur baru terbuka penuh setelah disetujui."
    : "Akun Anda menunggu persetujuan admin. Anda sudah bisa masuk dan menyiapkan showroom, tetapi sebagian fitur baru terbuka penuh setelah disetujui.";

  const detail = document.createElement("div");
  detail.className = "grid gap-2 rounded-2xl border border-[var(--pb-card-border)] bg-gray-50 p-3 text-xs";
  detail.append(
    detailRow("Email masuk", registered.email),
    detailRow("Halaman showroom", `${window.location.origin}/${registered.slug}`),
  );

  const login = Button({ label: "Masuk sekarang", variant: "primary" });
  login.id = "shr_register_success_login_button";
  login.classList.add("w-full");
  login.addEventListener("click", () => actions.goToLogin(context));

  section.append(badge, title, body, detail, login);
  return section;
}

function detailRow(label, value) {
  const row = document.createElement("div");
  row.className = "grid gap-0.5";

  const caption = document.createElement("span");
  caption.className = "text-[10px] font-semibold uppercase tracking-wide text-gray-500";
  caption.textContent = label;

  const content = document.createElement("span");
  content.className = "break-all font-semibold text-gray-900";
  content.textContent = value;

  row.append(caption, content);
  return row;
}

function fieldGroup(title, children) {
  const group = document.createElement("fieldset");
  group.className = "grid gap-3 rounded-2xl border border-[var(--pb-card-border)] bg-white/70 p-4";

  const legend = document.createElement("legend");
  legend.className = "px-1 text-xs font-black text-gray-900";
  legend.textContent = title;

  group.append(legend, ...children);
  return group;
}

function field({ id, name, label, type = "text", placeholder = "", required = true, value = "", hint = "", error = "" }) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1.5 text-xs font-semibold text-gray-700";
  wrap.append(document.createTextNode(label));

  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = type;
  input.required = required;
  input.placeholder = placeholder;
  input.value = value ?? "";
  input.className = inputClassName(Boolean(error));
  wrap.append(input);

  if (hint) {
    wrap.append(hintNode(hint));
  }

  if (error) {
    wrap.append(errorNode(error));
  }

  return wrap;
}

/**
 * Combobox bergaya dropdown-dan-cari (seperti Select2 di jQuery), dibangun
 * sendiri tanpa menambah dependency baru — aplikasi ini murni vanilla JS di
 * semua tempat lain, jadi menarik jQuery+plugin hanya untuk dua field ini
 * akan jadi satu-satunya pengecualian. <input list>+<datalist> bawaan
 * browser yang dipakai sebelumnya punya masalah yang sama persis dengan
 * yang dikeluhkan: panel sarannya di-render browser sendiri (putih polos,
 * font sistem) dan sama sekali tidak bisa di-styling lewat CSS.
 *
 * Klik atau fokus pada input membuka panel; mengetik menyaring opsi secara
 * live; klik salah satu opsi mengisi input dan menutup panel. Nilai yang
 * dikirim ke form tetap teks polos dari input (sama seperti versi
 * datalist), jadi validasi backend dan frontend tidak berubah.
 */
function selectField({ id, name, label, placeholder = "", options = [], required = true, value = "", error = "", iconFor = null }) {
  const wrap = document.createElement("div");
  wrap.className = "grid gap-1.5 text-xs font-semibold text-gray-700";

  const labelNode = document.createElement("label");
  labelNode.htmlFor = id;
  labelNode.textContent = label;
  wrap.append(labelNode);

  const comboWrap = document.createElement("div");
  comboWrap.id = `${id}_combobox`;
  comboWrap.className = "relative";

  const input = document.createElement("input");
  input.id = id;
  input.name = name;
  input.type = "text";
  input.required = required;
  input.autocomplete = "off";
  input.placeholder = placeholder ? `${placeholder} — ketik untuk mencari` : "Ketik untuk mencari";
  input.value = value ?? "";
  input.className = `${inputClassName(Boolean(error))} pr-10`;
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-expanded", "false");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", `${id}_listbox`);

  const chevron = document.createElement("span");
  chevron.className = "pointer-events-none absolute right-3.5 top-1/2 flex -translate-y-1/2 text-[var(--pb-text-muted)]";
  chevron.append(createIcon("chevronRight", { className: "block h-3 w-3 rotate-90 leading-none" }));

  // Ikon di dalam input sendiri, muncul begitu nilainya cocok dengan salah
  // satu opsi yang punya ikon (mis. bank) -- bukan cuma di daftar dropdown.
  const leadingIcon = document.createElement("span");
  leadingIcon.className = "pointer-events-none absolute left-2.5 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center overflow-hidden rounded-lg border border-[var(--pb-border)] bg-white";
  const leadingIconImg = document.createElement("img");
  leadingIconImg.alt = "";
  leadingIconImg.className = "h-full w-full object-contain p-0.5";
  leadingIcon.append(leadingIconImg);

  function syncLeadingIcon() {
    const iconUrl = iconFor?.(input.value);
    if (iconUrl) {
      leadingIconImg.src = iconUrl;
      leadingIcon.classList.remove("hidden");
      leadingIcon.classList.add("flex");
      input.classList.add("pl-11");
    } else {
      leadingIcon.classList.add("hidden");
      leadingIcon.classList.remove("flex");
      input.classList.remove("pl-11");
    }
  }

  const panel = document.createElement("div");
  panel.id = `${id}_listbox`;
  panel.setAttribute("role", "listbox");
  panel.className = "modal-scrollbar absolute inset-x-0 top-[calc(100%+0.4rem)] z-30 max-h-56 overflow-y-auto rounded-2xl border border-[var(--pb-card-border)] bg-white p-1.5 shadow-[0_20px_45px_rgba(15,23,42,0.16)]";
  panel.hidden = true;

  let filtered = options.slice();
  let highlighted = -1;

  function filterOptions(query) {
    const q = String(query ?? "").trim().toLowerCase();
    return q ? options.filter((option) => option.toLowerCase().includes(q)) : options.slice();
  }

  function renderOptions() {
    panel.replaceChildren();

    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "px-3 py-2 text-xs font-medium text-[var(--pb-text-muted)]";
      empty.textContent = "Tidak ada hasil.";
      panel.append(empty);
      return;
    }

    filtered.forEach((option, index) => {
      const item = document.createElement("button");
      item.type = "button";
      item.dataset.comboboxOption = option;
      item.setAttribute("role", "option");
      item.className = [
        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition",
        index === highlighted ? "bg-[var(--pb-surface-muted)] text-[var(--pb-brand-secondary)]" : "text-gray-800 hover:bg-gray-50",
      ].join(" ");
      const iconUrl = iconFor?.(option);
      if (iconUrl) {
        const icon = document.createElement("span");
        icon.className = "grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--pb-border)] bg-white";
        const image = document.createElement("img");
        image.src = iconUrl;
        image.alt = "";
        image.className = "h-full w-full object-contain p-0.5";
        icon.append(image);
        item.append(icon);
      }
      item.append(document.createTextNode(option));
      // mousedown (bukan click) supaya terjadi sebelum blur input menutup panel.
      item.addEventListener("mousedown", (event) => {
        event.preventDefault();
        selectOption(option);
      });
      panel.append(item);
    });
  }

  function openPanel() {
    filtered = filterOptions(input.value);
    highlighted = -1;
    renderOptions();
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }

  function closePanel() {
    panel.hidden = true;
    input.setAttribute("aria-expanded", "false");
  }

  function selectOption(option) {
    input.value = option;
    syncLeadingIcon();
    // Menutup panel HARUS terakhir: listener "input" di bawah membuka lagi
    // panelnya (dipakai saat mengetik manual), jadi kalau closePanel() lebih
    // dulu, dispatch "input" ini langsung membukanya kembali.
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    closePanel();
  }

  input.addEventListener("focus", openPanel);
  input.addEventListener("input", () => {
    filtered = filterOptions(input.value);
    highlighted = -1;
    renderOptions();
    panel.hidden = false;
    input.setAttribute("aria-expanded", "true");
    syncLeadingIcon();
  });
  input.addEventListener("blur", closePanel);
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (panel.hidden) {
        openPanel();
        return;
      }
      highlighted = Math.min(highlighted + 1, filtered.length - 1);
      renderOptions();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      highlighted = Math.max(highlighted - 1, 0);
      renderOptions();
    } else if (event.key === "Enter") {
      if (!panel.hidden && filtered[highlighted]) {
        event.preventDefault();
        selectOption(filtered[highlighted]);
      }
    } else if (event.key === "Escape") {
      closePanel();
    }
  });

  comboWrap.append(input, leadingIcon, chevron, panel);
  wrap.append(comboWrap);

  // Render sekali di awal (tetap hidden) supaya opsinya sudah ada di DOM
  // sebelum panel pernah dibuka — dibutuhkan alat uji otomatis yang mengecek
  // opsi lewat querySelector, dan menghindari kedipan kosong sesaat panel
  // pertama kali dibuka.
  renderOptions();
  syncLeadingIcon();

  if (error) {
    wrap.append(errorNode(error));
  }

  return wrap;
}

function textareaField({ id, name, label, placeholder = "", required = true, value = "", error = "" }) {
  const wrap = document.createElement("label");
  wrap.className = "grid gap-1.5 text-xs font-semibold text-gray-700";
  wrap.append(document.createTextNode(label));

  const input = document.createElement("textarea");
  input.id = id;
  input.name = name;
  input.required = required;
  input.placeholder = placeholder;
  input.rows = 3;
  input.value = value ?? "";
  input.className = `${inputClassName(Boolean(error))} min-h-24 resize-y`;
  wrap.append(input);

  if (error) {
    wrap.append(errorNode(error));
  }

  return wrap;
}

function inputClassName(hasError) {
  const base = "min-h-11 min-w-0 w-full rounded-2xl border bg-white/90 px-4 py-2.5 text-xs text-gray-950 outline-none transition duration-200 placeholder:text-[var(--pb-text-muted)] focus:bg-white focus:ring-4";

  return hasError
    ? `${base} border-[color-mix(in_srgb,var(--pb-danger)_42%,white)] focus:border-[color-mix(in_srgb,var(--pb-danger)_70%,white)] focus:ring-[color-mix(in_srgb,var(--pb-danger)_14%,white)]`
    : `${base} border-gray-200 focus:border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] focus:ring-[color-mix(in_srgb,var(--pb-brand-primary)_20%,white)]`;
}

function hintNode(text) {
  const hint = document.createElement("span");
  hint.className = "text-[10px] font-medium text-gray-500";
  hint.textContent = text;
  return hint;
}

function errorNode(text) {
  const node = document.createElement("span");
  node.className = "text-[10px] font-semibold text-[var(--pb-danger)]";
  node.textContent = text;
  return node;
}

function validateDraft(data) {
  const fields = {};

  if (!String(data.name ?? "").trim()) {
    fields.name = "Nama wajib diisi.";
  }

  if (!String(data.email ?? "").trim()) {
    fields.email = "Email wajib diisi.";
  }

  if (String(data.password ?? "").length < 6) {
    fields.password = "Password minimal 6 karakter.";
  }

  if (!String(data.showroom_name ?? "").trim()) {
    fields["showroom.name"] = "Nama showroom wajib diisi.";
  }

  if (!String(data.city_name ?? "").trim()) {
    fields["showroom.city_name"] = "Kota wajib dipilih.";
  }

  const slug = normalizeSlug(data.showroom_slug);

  if (slug.length < SLUG_MIN_LENGTH) {
    fields["showroom.slug"] = `Alamat halaman minimal ${SLUG_MIN_LENGTH} karakter.`;
  } else if (slug.length > SLUG_MAX_LENGTH) {
    fields["showroom.slug"] = `Alamat halaman maksimal ${SLUG_MAX_LENGTH} karakter.`;
  }

  return Object.keys(fields).length
    ? { message: "Periksa kembali isian yang ditandai.", fields }
    : null;
}

/**
 * Mirrors the server-side normalizer so the preview shows exactly what will be
 * stored.
 */
function normalizeSlug(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeFieldErrors(error) {
  const errors = error?.errors ?? error?.data?.errors ?? null;

  if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
    return {};
  }

  return errors;
}

function emptyToNull(value) {
  const text = String(value ?? "").trim();
  return text === "" ? null : text;
}

/**
 * Seller yang akunnya sudah dibuat tapi belum disetujui (mis. sesi terputus
 * sebelum sempat bayar) kembali ke "/daftar-showroom" lewat roleGuard.js.
 * Tanpa ini, state di memori (registered/planConfirmed/paymentSubmitted)
 * selalu kosong lagi setelah reload, dan halaman menampilkan form
 * pendaftaran kosong dari awal alih-alih melanjutkan ke langkah bayar yang
 * sebenarnya masih tertunda.
 */
async function resumeExistingRegistration(state) {
  if (!authStore.isAuthenticated() || authStore.role() !== "seller") {
    return;
  }

  const user = authStore.user() ?? {};
  if (user.is_approved) {
    return;
  }

  let showroom = null;
  try {
    showroom = await showroomsResource.mine();
  } catch {
    return;
  }

  if (!showroom) {
    return;
  }

  state.registered = {
    showroomName: showroom.name ?? "",
    slug: showroom.slug ?? "",
    email: user.email ?? "",
  };

  if (!state.plans.length) {
    state.planConfirmed = true;
    state.paymentSubmitted = true;
    return;
  }

  const selectedPlan = state.plans.find((plan) => plan.name === showroom.selected_plan_name);
  if (!selectedPlan) {
    return;
  }

  state.selectedPlanId = selectedPlan.id;
  state.planConfirmed = true;
  state.midtransShowroom = showroom;
  state.paymentSubmitted = showroom.subscription_payment_status !== "unpaid";
}
