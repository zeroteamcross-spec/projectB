import { brandConfig } from "./brandConfig.js";

export const tw = {
  sectionHeader: "mb-[var(--pb-space-xl)] grid min-w-0 gap-[var(--pb-space-lg)] md:grid-cols-[minmax(0,1fr)_auto] md:items-end xl:gap-8",
  brand: {
    appName: brandConfig.appName,
    tagline: brandConfig.appTagline,
    mark: "text-[var(--pb-brand-secondary)]",
    page: "bg-[var(--pb-page-bg)]",
    shellText: "text-[var(--pb-text)]",
  },
  layout: {
    shell: "min-h-screen grid min-w-0 grid-cols-1 overflow-x-clip md:grid-cols-[80px_minmax(0,1fr)] xl:grid-cols-[272px_minmax(0,1fr)]",
    // Sidebar kaca. Tiga lapis bertumpuk dalam satu background:
    //
    //   1. kilau diagonal dari kiri atas -- putih pekat lalu memudar habis di
    //      tengah, itu yang membuat permukaannya terbaca sebagai kaca dan
    //      bukan sekadar warna transparan;
    //   2. sorotan lembut di sudut kiri atas, supaya kilaunya punya sumber;
    //   3. warna dasarnya sendiri, ditipiskan lewat color-mix.
    //
    // Warnanya tetap ditipiskan meski di belakangnya hanya kanvas polos. Kaca
    // yang benar-benar tembus butuh sesuatu di belakangnya; yang dikejar di
    // sini kesan permukaannya, dan itu datang dari kilau plus garis tepi tipis,
    // bukan dari transparansinya.
    sidebar: "hidden min-w-0 border-r border-white/15 bg-[linear-gradient(135deg,rgba(255,255,255,0.26),rgba(255,255,255,0.06)_34%,rgba(255,255,255,0)_58%),radial-gradient(120%_80%_at_0%_0%,rgba(255,255,255,0.20),transparent_60%),linear-gradient(170deg,color-mix(in_srgb,var(--pb-shell-sidebar-start)_88%,transparent),color-mix(in_srgb,var(--pb-shell-sidebar-end)_94%,transparent))] px-3 py-4 text-[var(--pb-shell-nav-text)] shadow-[0_24px_80px_rgba(15,23,42,0.32)] backdrop-blur-2xl md:sticky md:top-0 md:block md:h-screen md:overflow-y-auto md:py-6 xl:px-6",
    brand: "text-lg font-bold tracking-normal text-white",
    sidebarBrandBlock: "mb-[var(--pb-space-xl)] grid gap-1",
    sidebarTagline: "text-[10px] font-medium text-white/70",
    shellMark: "grid h-10 w-10 place-items-center rounded-[var(--pb-radius-xl)] bg-[linear-gradient(135deg,var(--pb-brand-primary),var(--pb-brand-accent),var(--pb-brand-secondary))] text-white shadow-[var(--pb-shadow-card)]",
    featureIcon: "grid h-10 w-10 place-items-center rounded-[var(--pb-radius-xl)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--pb-brand-primary)_15%,white),color-mix(in_srgb,var(--pb-brand-accent)_18%,white))] text-[var(--pb-brand-secondary)] shadow-[var(--pb-shadow-soft)]",
    nav: "grid gap-2",
    navLink: "flex min-w-0 items-center gap-3 rounded-[var(--pb-radius-xl)] px-3 py-2.5 text-xs font-semibold text-[var(--pb-shell-nav-text)] no-underline transition hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-white/40",
    navLinkActive: "bg-[var(--pb-shell-nav-active)] shadow-[var(--pb-shadow-soft)] ring-1 ring-white/10",
    navIcon: "h-4 w-4 shrink-0",
    main: "grid min-w-0 grid-rows-[auto_1fr] bg-[var(--pb-page-bg)]",
    header: "flex min-h-16 min-w-0 items-center justify-between gap-3 border-b border-[var(--pb-border)] bg-[var(--pb-shell-app-header)] px-4 py-3 text-[var(--pb-text)] shadow-[var(--pb-shadow-soft)] backdrop-blur md:px-6 xl:px-8",
    pageFrame: "relative mx-auto grid min-w-0 w-full max-w-[1240px] gap-[var(--pb-space-xl)] overflow-x-clip px-[var(--pb-page-x)] py-[var(--pb-page-y)] xl:max-w-[1320px] xl:px-8 2xl:max-w-[1400px]",
    publicRoot: "min-h-screen bg-[linear-gradient(180deg,var(--pb-public-canvas-start),var(--pb-public-canvas-mid),var(--pb-public-canvas-end))] text-[var(--pb-text)]",
    publicMain: "relative z-10 min-h-[calc(100vh-4rem)] bg-[var(--pb-page-bg)]",
    publicHeader: "sticky top-0 z-20 border-b border-[var(--pb-border)] bg-[var(--pb-shell-public-header)] shadow-[var(--pb-shadow-soft)] backdrop-blur-xl",
    publicHeaderInner: "mx-auto flex min-w-0 w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 2xl:max-w-[1240px]",
    publicBrandLink: "flex min-w-0 items-center gap-2 no-underline",
    publicMark: "grid h-10 w-10 shrink-0 place-items-center rounded-[var(--pb-radius-xl)] bg-[linear-gradient(135deg,var(--pb-brand-primary),var(--pb-brand-accent),var(--pb-brand-secondary))] text-xs font-bold text-white shadow-[var(--pb-shadow-card)]",
    publicActions: "flex min-w-0 items-center gap-2",
    publicActionButton: "inline-flex min-h-10 max-w-full items-center justify-center rounded-[var(--pb-radius-xl)] border border-[var(--pb-border-strong)] bg-[var(--pb-btn-secondary-bg)] px-3 py-2 text-xs font-semibold text-[var(--pb-btn-secondary-text)] no-underline shadow-[var(--pb-shadow-soft)] transition hover:brightness-95",
    publicHeroBand: "relative overflow-hidden border-b border-white/10 bg-[linear-gradient(135deg,var(--pb-public-canvas-start),var(--pb-public-canvas-mid),var(--pb-public-canvas-end))]",
    publicHeroInner: "mx-auto grid w-full max-w-[1200px] gap-2 px-4 py-8 sm:px-6 sm:py-10 2xl:max-w-[1240px]",
    appHeaderTitle: "text-xs font-semibold text-[var(--pb-text-muted)]",
    rolePill: "inline-flex max-w-full items-center rounded-full border border-[var(--pb-border)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_12%,white)] px-3 py-1 text-[10px] font-semibold uppercase text-[var(--pb-brand-secondary)]",
    contentBackdrop: "relative",
  },
  text: {
    muted: "text-[var(--pb-text-muted)]",
    subtle: "text-[var(--pb-text-strong)]",
    title: "break-words text-xl font-bold leading-tight tracking-normal text-[var(--pb-text)] md:text-2xl",
    sectionTitle: "break-words text-lg font-bold tracking-normal text-[var(--pb-text)]",
    eyebrow: "text-[10px] font-bold uppercase tracking-normal text-[var(--pb-brand-secondary)]",
    price: "text-[var(--pb-brand-secondary)]",
    gradientBrand: "bg-[linear-gradient(90deg,var(--pb-brand-secondary),var(--pb-brand-accent),var(--pb-brand-primary))] bg-clip-text text-transparent",
  },
  surface: {
    card: "rounded-[var(--pb-radius-xl)] border border-[var(--pb-card-border)] bg-[var(--pb-surface-card)] p-4 shadow-[var(--pb-shadow-card)] backdrop-blur",
    raisedCard: "p-[10px] rounded-[var(--pb-radius-2xl)] border border-[var(--pb-card-border)] bg-[var(--pb-surface-card)] shadow-[var(--pb-shadow-card)] backdrop-blur",
    mutedCard: "rounded-[var(--pb-radius-xl)] border border-[var(--pb-card-border)] bg-[var(--pb-surface-muted)] p-3",
    inset: "rounded-[var(--pb-radius-xl)] bg-[var(--pb-surface-inset)] p-3",
    insetGrid: "rounded-[var(--pb-radius-xl)] bg-[var(--pb-surface-inset)] p-3 text-xs",
    accentPanel: "rounded-[var(--pb-radius-xl)] border border-[color-mix(in_srgb,var(--pb-brand-primary)_28%,white)] bg-[var(--pb-surface-panel)] p-4 shadow-[var(--pb-shadow-card)] backdrop-blur",
    successPanel: "rounded-[var(--pb-radius-xl)] border border-[color-mix(in_srgb,var(--pb-success)_30%,white)] bg-[var(--pb-surface-panel)] p-4 shadow-[var(--pb-shadow-card)] backdrop-blur",
    successInset: "rounded-[var(--pb-radius-xl)] border border-[color-mix(in_srgb,var(--pb-success)_30%,white)] bg-[color-mix(in_srgb,var(--pb-success)_12%,white)] p-3 text-xs",
    warningPanel: "rounded-[var(--pb-radius-xl)] border border-[color-mix(in_srgb,var(--pb-warning)_30%,white)] bg-[var(--pb-surface-panel)] p-4 shadow-[var(--pb-shadow-card)] backdrop-blur",
    interactiveCard: "transition hover:-translate-y-1 hover:shadow-[var(--pb-shadow-elevated)]",
    grid: "grid gap-[var(--pb-space-lg)]",
    responsiveGrid: "grid gap-[var(--pb-space-lg)] sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4",
  },
  form: {
    label: "grid gap-1 text-xs font-medium text-[var(--pb-text-strong)]",
    control: "max-h-[50px] min-h-8 min-w-0 w-full rounded-[var(--pb-radius-xl)] border border-[var(--pb-form-border)] bg-[var(--pb-form-input-bg)] px-3 py-2 text-xs text-[var(--pb-text)] outline-none transition focus:border-[var(--pb-form-focus)] focus:ring-2 focus:ring-[var(--pb-form-focus)]",
    checkLabel: "inline-flex items-center gap-2 text-xs font-medium text-[var(--pb-text-strong)]",
    checkControl: "h-4 w-4 rounded-[var(--pb-radius-sm)] border-[var(--pb-form-border)] text-[var(--pb-brand-secondary)] focus:ring-[var(--pb-form-focus)]",
    radioControl: "h-4 w-4 border-[var(--pb-form-border)] text-[var(--pb-brand-secondary)] focus:ring-[var(--pb-form-focus)]",
    searchWrap: "min-w-0 rounded-[var(--pb-radius-2xl)] border border-[var(--pb-border)] bg-[var(--pb-form-search-bg)] p-2 shadow-[var(--pb-shadow-card)] backdrop-blur-xl xl:p-3",
    searchInput: "min-h-12 min-w-0 rounded-[var(--pb-radius-xl)] border-0 bg-transparent px-4 text-sm text-[var(--pb-text)] outline-none placeholder:text-[var(--pb-text-muted)]",
    choiceActive: "rounded-[var(--pb-radius-xl)] border border-[var(--pb-brand-primary)] bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,white)] p-3 text-xs text-[var(--pb-text)]",
    choiceIdle: "rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-3 text-xs text-[var(--pb-text-strong)]",
  },
  button: {
    base: "inline-flex min-h-3 max-w-full items-center justify-center gap-2 break-words rounded-[var(--pb-radius-xl)] border px-4 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)] disabled:cursor-not-allowed disabled:opacity-55",
    // Tiga peran tombol, dipakai seragam di seluruh aplikasi:
    //   ya     - hijau, aksi yang memajukan sesuatu (simpan, daftar, masuk,
    //            lanjut, approve, selesaikan, booking)
    //   tidak  - merah, aksi yang membatalkan/menutup/menghapus (batal, tutup,
    //            kembali, hapus, archive, retur, tolak, logout)
    //   netral - biru primary, navigasi biasa yang bukan keduanya (detail,
    //            foto, inspeksi, copy link, buka landing)
    // `primary`/`secondary`/`danger` dipertahankan sebagai alias supaya ratusan
    // pemanggil lama tidak perlu disunting satu per satu.
    ya: "border-transparent bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white shadow-[var(--pb-shadow-card)] hover:brightness-95",
    tidak: "border-transparent bg-[var(--pb-danger)] text-white shadow-[var(--pb-shadow-soft)] hover:brightness-95",
    netral: "border-transparent bg-[var(--pb-brand-primary)] text-white shadow-[var(--pb-shadow-soft)] hover:brightness-95",
    primary: "border-transparent bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] text-white shadow-[var(--pb-shadow-card)] hover:brightness-95",
    secondary: "border-transparent bg-[var(--pb-brand-primary)] text-white shadow-[var(--pb-shadow-soft)] hover:brightness-95",
    danger: "border-transparent bg-[var(--pb-danger)] text-white shadow-[var(--pb-shadow-soft)] hover:brightness-95",
    ghost: "border-transparent bg-transparent text-[var(--pb-btn-ghost-text)] hover:bg-[color-mix(in_srgb,var(--pb-brand-primary)_10%,transparent)]",
  },
  badge: {
    base: "inline-flex max-w-full w-fit items-center break-words rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-normal",
    default: "bg-[var(--pb-badge-neutral-bg)] text-[var(--pb-text-strong)]",
    success: "bg-[color-mix(in_srgb,var(--pb-success)_15%,white)] text-[var(--pb-success)]",
    warning: "bg-[color-mix(in_srgb,var(--pb-warning)_15%,white)] text-[var(--pb-warning)]",
    danger: "bg-[color-mix(in_srgb,var(--pb-danger)_12%,white)] text-[var(--pb-danger)]",
    info: "bg-[color-mix(in_srgb,var(--pb-info)_12%,white)] text-[var(--pb-info)]",
  },
  section: {
    header: "mb-[var(--pb-space-xl)] flex flex-col gap-[var(--pb-space-lg)] md:flex-row md:items-end md:justify-between",
    panel: "rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-panel)] p-4 shadow-[var(--pb-shadow-card)] backdrop-blur",
    panelMuted: "rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] p-3",
    stickyBar: "sticky top-16 z-10 border-b border-[var(--pb-border)] bg-[color-mix(in_srgb,var(--pb-page-bg)_92%,transparent)] px-4 py-4 backdrop-blur-xl sm:px-6",
    toolbar: "rounded-[var(--pb-radius-2xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-card)] p-3 shadow-[var(--pb-shadow-card)] backdrop-blur-xl xl:p-4",
  },
  emptyState: " bg-white rounded-[var(--pb-radius-xl)] border border-dashed border-[var(--pb-border-strong)] bg-[var(--pb-empty-bg)] px-5 py-8 text-center text-[var(--pb-text-muted)] shadow-[var(--pb-shadow-soft)]",
  skeleton: {
    wrap: "grid gap-3",
    line: "min-h-4 animate-pulse rounded-[var(--pb-radius-lg)] bg-[linear-gradient(90deg,color-mix(in_srgb,var(--pb-surface-muted)_80%,white),white,color-mix(in_srgb,var(--pb-surface-muted)_80%,white))]",
  },
  modal: {
    root: "fixed inset-0 z-[80] grid place-items-center bg-[var(--pb-overlay)] p-3 backdrop-blur-sm sm:p-4",
    panel: "flex max-h-[min(92vh,820px)] w-full max-w-lg min-w-0 flex-col overflow-hidden rounded-[1.75rem] border border-[var(--pb-card-border)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(250,244,237,0.90),rgba(234,244,249,0.82))] shadow-[0_28px_90px_rgba(15,23,42,0.24)] backdrop-blur-xl animate-[pbModalIn_180ms_cubic-bezier(0.22,1,0.36,1)]",
  },
  toast: {
    base: "pointer-events-auto relative grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 overflow-hidden rounded-[1.25rem] border px-4 py-4 text-left shadow-[0_22px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl animate-[pbModalIn_180ms_cubic-bezier(0.22,1,0.36,1)]",
    info: "",
    success: "",
    warning: "",
    error: "",
  },
  tabs: {
    list: "flex flex-wrap gap-2",
    active: "max-w-full break-words rounded-[var(--pb-radius-md)] bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] px-3 py-2 text-xs font-semibold text-white",
    idle: "max-w-full break-words rounded-[var(--pb-radius-md)] border border-[var(--pb-border-strong)] bg-[var(--pb-surface-card)] px-3 py-2 text-xs font-semibold text-[var(--pb-text)]",
  },
  interactive: {
    primaryLink: "inline-flex min-h-10 items-center justify-center rounded-[var(--pb-radius-xl)] border border-transparent bg-[linear-gradient(135deg,var(--pb-btn-primary-from),var(--pb-btn-primary-to))] px-4 py-2 text-xs font-semibold text-white no-underline transition hover:brightness-95",
    pillActive: "max-w-full break-words rounded-full bg-[linear-gradient(135deg,var(--pb-chip-active-from),var(--pb-chip-active-to))] px-4 py-2 text-xs font-semibold text-white shadow-[var(--pb-shadow-card)]",
    pillIdle: "max-w-full break-words rounded-full border border-[var(--pb-border)] bg-[var(--pb-chip-bg)] px-4 py-2 text-xs font-semibold text-[var(--pb-chip-text)] shadow-[var(--pb-shadow-soft)]",
    selectedCard: "ring-2 ring-[color-mix(in_srgb,var(--pb-brand-primary)_25%,white)] border-[color-mix(in_srgb,var(--pb-brand-primary)_35%,white)]",
    thumbButton: "h-16 w-20 shrink-0 overflow-hidden rounded-[var(--pb-radius-xl)] border border-[var(--pb-border)] bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]",
    rowButton: "grid min-w-0 w-full gap-4 rounded-[var(--pb-radius-xl)] p-4 text-left transition hover:bg-[var(--pb-surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--pb-form-focus)]",
    hoverBorder: "hover:border-[color-mix(in_srgb,var(--pb-brand-primary)_45%,white)]",
  },
  alert: {
    error: "rounded-[var(--pb-radius-xl)] border border-[var(--pb-error-border)] bg-[var(--pb-error-bg)] px-4 py-4 text-xs text-[var(--pb-danger)] shadow-[var(--pb-shadow-card)] backdrop-blur",
    errorMeta: "text-xs text-[var(--pb-danger)]",
  },
};

export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}
