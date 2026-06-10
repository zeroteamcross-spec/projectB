const DESIGN_STUDIO_HOOK_REGISTRY = [
  entry("shell.app.root", "Shell aplikasi", "Kerangka utama halaman internal setelah login.", "Shared layout", ["shell", "layout"], ["shell.appHeaderBg", "shell.sidebarStart", "shell.sidebarEnd"]),
  entry("shell.app.header", "Header aplikasi", "Header global untuk halaman buyer, seller, admin, dan marketing.", "Shared layout", ["shell"], ["shell.appHeaderBg", "brand.appName", "brand.logoIcon"]),
  entry("shell.app.sidebar", "Sidebar aplikasi", "Sidebar navigasi internal yang mengikuti tone shell.", "Shared layout", ["shell"], ["shell.sidebarStart", "shell.sidebarEnd", "shell.navActiveBg"]),
  entry("shell.public.root", "Shell publik", "Kontainer utama pengalaman public/landing.", "Shared layout", ["shell", "layout"], ["colors.publicCanvasStart", "colors.publicCanvasMid", "colors.publicCanvasEnd"]),
  entry("shell.public.header", "Header publik", "Header sticky untuk katalog dan detail mobil public.", "Shared layout", ["shell"], ["shell.publicHeaderBg", "brand.appName", "brand.logoIcon"]),
  entry("shared.section_header", "Section header", "Header judul halaman/module yang dipakai lintas role.", "Shared elements", ["shell", "layout"], ["colors.text", "colors.textMuted"]),
  entry("shared.card.panel", "Card / panel", "Surface card atau panel yang dipakai di banyak area studio.", "Shared elements", ["surface", "layout"], ["surface.cardBg", "surface.cardBorder", "layout.shadowDepth"]),
  entry("shared.button.primary", "Tombol utama", "CTA utama yang memakai token button primary.", "Shared elements", ["surface"], ["button.primaryFrom", "button.primaryTo"]),
  entry("shared.button.secondary", "Tombol sekunder", "Aksi sekunder netral yang sering dipakai di toolbar dan panel.", "Shared elements", ["surface"], ["button.secondaryBg", "button.secondaryText"]),
  entry("shared.button.ghost", "Tombol ghost", "Aksi ringan tanpa fill utama.", "Shared elements", ["surface"], ["button.ghostText"]),
  entry("shared.input.control", "Input umum", "Kontrol input standar untuk form dan pencarian.", "Shared elements", ["form"], ["form.inputBg", "form.controlBorder", "form.focus"]),
  entry("shared.badge.status", "Badge status", "Badge status/label kecil lintas halaman.", "Shared elements", ["layout", "colors"], ["state.badgeNeutralBg", "colors.success", "colors.warning", "colors.danger", "colors.info"]),
  entry("shared.state.empty", "Empty state", "Keadaan kosong saat data belum tersedia.", "Shared states", ["layout"], ["state.emptyBg", "colors.textMuted"]),
  entry("shared.state.error", "Error state", "Panel error ringan untuk halaman dan operasi studio.", "Shared states", ["layout", "colors"], ["state.errorBg", "state.errorBorder", "colors.danger"]),
  entry("catalog.page", "Halaman katalog", "Kontainer utama katalog public dan landing katalog.", "Public catalog", ["shell", "layout"], ["colors.publicCanvasStart", "colors.publicCanvasMid", "colors.publicCanvasEnd"]),
  entry("catalog.hero.banner", "Banner katalog", "Hero/banner utama katalog public.", "Public catalog", ["shell", "surface"], ["colors.publicCanvasStart", "button.primaryFrom", "button.primaryTo"]),
  entry("public.affiliate.banner", "Banner marketing", "Banner context marketing aktif di public flow.", "Public catalog", ["surface", "colors"], ["surface.panelBg", "colors.accent"]),
  entry("catalog.search.bar", "Bar pencarian katalog", "Panel pencarian dan filter utama katalog.", "Public catalog", ["form", "surface"], ["form.searchBg", "surface.cardBg", "surface.cardBorder"]),
  entry("catalog.search.input", "Input pencarian katalog", "Kolom kata kunci di katalog.", "Public catalog", ["form"], ["form.searchBg", "form.focus", "colors.textMuted"]),
  entry("catalog.filter.toolbar", "Toolbar filter katalog", "Baris quick filter, sort, dan lokasi katalog.", "Public catalog", ["form"], ["form.chipBg", "form.chipActiveFrom", "form.chipActiveTo"]),
  entry("catalog.stats.panel", "Ringkasan katalog", "Panel ringkasan metrik singkat di katalog.", "Public catalog", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("catalog.card.root", "Card mobil katalog", "Card mobil pada listing katalog public.", "Public catalog", ["surface"], ["surface.cardBg", "surface.cardBorder", "layout.shadowDepth"]),
  entry("catalog.card.price", "Harga mobil katalog", "Blok harga utama di card mobil katalog.", "Public catalog", ["surface", "colors"], ["button.primaryFrom", "button.primaryTo"]),
  entry("catalog.load_more.button", "Tombol muat katalog", "CTA untuk memuat data katalog tambahan.", "Public catalog", ["surface"], ["button.secondaryBg", "button.secondaryText"]),
  entry("public.car_detail.page", "Halaman detail mobil", "Kontainer utama detail mobil public.", "Public detail", ["shell", "layout"], ["colors.pageBg"]),
  entry("public.car_detail.gallery", "Galeri mobil", "Galeri gambar utama pada detail mobil.", "Public detail", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("public.car_detail.title", "Judul detail mobil", "Blok judul dan identitas mobil.", "Public detail", ["surface"], ["colors.text", "colors.textMuted"]),
  entry("public.car_detail.inspection", "Ringkasan inspeksi", "Panel ringkasan inspeksi mobil.", "Public detail", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("public.car_detail.price_panel", "Panel harga detail", "Panel harga di kolom samping detail mobil.", "Public detail", ["surface"], ["surface.cardBg", "button.primaryFrom", "button.primaryTo"]),
  entry("public.car_detail.cta_panel", "Panel CTA detail", "Panel CTA desktop di kolom samping detail mobil.", "Public detail", ["surface"], ["surface.cardBg", "button.primaryFrom", "button.secondaryBg"]),
  entry("public.car_detail.seller_summary", "Ringkasan seller", "Panel informasi seller/showroom di detail mobil.", "Public detail", ["surface"], ["surface.panelBg", "surface.cardBorder"]),
  entry("public.car_detail.description", "Deskripsi mobil", "Panel catatan atau deskripsi listing mobil.", "Public detail", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("public.car_detail.sticky_cta", "Sticky CTA detail mobil", "CTA sticky pada mobile untuk lanjutkan minat buyer.", "Public detail", ["surface"], ["button.primaryFrom", "button.primaryTo"]),
  entry("buyer.transaction.hero", "Hero transaksi buyer", "Hero copy pada entry transaksi buyer.", "Buyer", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("buyer.transaction.summary", "Ringkasan mobil buyer", "Ringkasan mobil yang akan ditransaksikan buyer.", "Buyer", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("buyer.transaction.form", "Form transaksi buyer", "Form utama create transaction buyer.", "Buyer", ["form", "surface"], ["form.inputBg", "form.controlBorder", "button.primaryFrom"]),
  entry("buyer.payment.header", "Header status pembayaran", "Header halaman payment status buyer.", "Buyer", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("buyer.payment.summary", "Ringkasan payment buyer", "Panel status dan nominal pembayaran buyer.", "Buyer", ["surface", "colors"], ["surface.cardBg", "colors.warning", "colors.success", "colors.info"]),
  entry("buyer.payment.instructions", "Instruksi payment buyer", "Panel instruksi pembayaran buyer.", "Buyer", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("buyer.payment.actions", "Aksi payment buyer", "Panel aksi refresh/pelunasan buyer.", "Buyer", ["surface"], ["surface.panelBg", "button.primaryFrom", "button.secondaryBg"]),
  entry("buyer.payment.completion", "Panel pelunasan buyer", "Panel membuat sesi pelunasan buyer.", "Buyer", ["surface", "form"], ["surface.cardBg", "form.inputBg", "button.primaryFrom"]),
  entry("seller.dashboard.showroom", "Panel showroom seller", "Ringkasan showroom pada dashboard seller.", "Seller", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("seller.dashboard.summary", "Ringkasan dashboard seller", "Stat card dashboard seller.", "Seller", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("seller.dashboard.tasks", "Task launcher seller", "Shortcut tugas utama seller.", "Seller", ["surface"], ["surface.panelBg", "button.secondaryBg"]),
  entry("seller.affiliates.summary", "Ringkasan marketing seller", "Card jumlah marketing seller.", "Seller", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("seller.affiliates.list", "Daftar marketing seller", "List marketing seller beserta CTA landing.", "Seller", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("seller.affiliates.form", "Form marketing seller", "Form create/edit marketing seller.", "Seller", ["form", "surface"], ["form.inputBg", "form.controlBorder", "button.primaryFrom"]),
  entry("seller.commissions.summary", "Ringkasan komisi seller", "Summary komisi marketing seller.", "Seller", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("seller.commissions.priority", "Panel prioritas komisi", "Panel penjelasan prioritas rule komisi.", "Seller", ["surface"], ["surface.panelBg", "colors.info"]),
  entry("seller.commissions.overrides", "Daftar override komisi", "Daftar override komisi per mobil.", "Seller", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("seller.commissions.global_form", "Form rule global komisi", "Form rule komisi global seller.", "Seller", ["form", "surface"], ["form.inputBg", "form.controlBorder", "button.primaryFrom"]),
  entry("seller.commissions.override_form", "Form override komisi", "Form override komisi per mobil.", "Seller", ["form", "surface"], ["form.inputBg", "form.controlBorder", "button.primaryFrom"]),
  entry("admin.dashboard.summary", "Ringkasan dashboard admin", "Summary cards untuk monitoring admin.", "Admin", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("admin.dashboard.quick_actions", "Quick actions admin", "Shortcut aksi utama dashboard admin.", "Admin", ["surface"], ["surface.panelBg", "button.secondaryBg"]),
  entry("admin.dashboard.transactions", "Panel transaksi admin", "Panel transaksi terbaru pada dashboard admin.", "Admin", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("admin.dashboard.queues", "Panel queue admin", "Panel queue pending dan approval admin.", "Admin", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("admin.users.filters", "Filter user admin", "Filter bar user management admin.", "Admin", ["form", "surface"], ["form.inputBg", "form.controlBorder", "surface.cardBg"]),
  entry("admin.users.list", "Daftar user admin", "List user management admin.", "Admin", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("admin.users.detail", "Detail user admin", "Detail panel user terpilih.", "Admin", ["surface"], ["surface.panelBg", "surface.cardBorder"]),
  entry("admin.transactions.filters", "Filter transaksi admin", "Filter monitoring transaksi admin.", "Admin", ["form", "surface"], ["form.inputBg", "form.controlBorder", "surface.cardBg"]),
  entry("admin.transactions.list", "Daftar transaksi admin", "List transaksi admin.", "Admin", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("admin.transactions.detail", "Detail transaksi admin", "Detail panel transaksi admin.", "Admin", ["surface"], ["surface.panelBg", "surface.cardBorder"]),
  entry("admin.approvals.filters", "Filter approval admin", "Filter approval queue admin.", "Admin", ["form", "surface"], ["form.inputBg", "form.controlBorder", "surface.cardBg"]),
  entry("admin.approvals.list", "Daftar approval admin", "Daftar approval queue admin.", "Admin", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("admin.approvals.detail", "Detail approval admin", "Panel detail approval admin.", "Admin", ["surface"], ["surface.panelBg", "surface.cardBorder"]),
  entry("admin.settlements.summary", "Ringkasan settlement admin", "Summary settlement marketing di admin.", "Admin", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("admin.settlements.filters", "Filter settlement admin", "Filter status settlement admin.", "Admin", ["surface"], ["button.primaryFrom", "button.secondaryBg"]),
  entry("admin.settlements.list", "Daftar settlement admin", "Daftar batch settlement admin.", "Admin", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("affiliate.dashboard.summary", "Ringkasan dashboard marketing", "Ringkasan utama dashboard marketing.", "Marketing", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("affiliate.dashboard.quick_actions", "Quick actions marketing", "Shortcut aksi marketing untuk landing dan laporan.", "Marketing", ["surface"], ["surface.panelBg", "button.secondaryBg"]),
  entry("affiliate.dashboard.identity", "Identitas marketing", "Panel identitas dan landing marketing.", "Marketing", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("affiliate.dashboard.activity", "Aktivitas marketing", "Panel ringkas aktivitas marketing di dashboard.", "Marketing", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("affiliate.dashboard.owner", "Owner panel marketing", "Panel informasi owner/seller marketing.", "Marketing", ["surface"], ["surface.panelBg", "surface.cardBorder"]),
  entry("affiliate.activity.summary", "Ringkasan activity marketing", "Summary click/activity marketing.", "Marketing", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("affiliate.activity.list", "Daftar click marketing", "Daftar click activity marketing.", "Marketing", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("affiliate.ledger.summary", "Ringkasan ledger marketing", "Summary ledger komisi marketing.", "Marketing", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("affiliate.ledger.list", "Daftar ledger marketing", "Daftar ledger komisi marketing.", "Marketing", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("affiliate.settlements.summary", "Ringkasan settlement marketing", "Summary payout baseline marketing.", "Marketing", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("affiliate.settlements.eligible", "Ledger eligible marketing", "Daftar ledger yang eligible untuk settlement.", "Marketing", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
  entry("affiliate.settlements.history", "Riwayat settlement marketing", "Daftar riwayat settlement marketing.", "Marketing", ["surface"], ["surface.cardBg", "surface.cardBorder"]),
];

const DESIGN_STUDIO_HOOK_MAP = new Map(DESIGN_STUDIO_HOOK_REGISTRY.map((item) => [item.id, item]));

export function designStudioHooks() {
  return DESIGN_STUDIO_HOOK_REGISTRY.map((item) => ({ ...item, relatedSections: [...item.relatedSections], tokens: [...item.tokens] }));
}

export function findDesignStudioHook(hookId) {
  const entry = DESIGN_STUDIO_HOOK_MAP.get(String(hookId || "").trim());
  return entry
    ? { ...entry, relatedSections: [...entry.relatedSections], tokens: [...entry.tokens] }
    : null;
}

export function designStudioHooksBySection(sectionId) {
  const key = String(sectionId || "").trim();
  return designStudioHooks().filter((item) => item.relatedSections.includes(key));
}

export function applyDesignHook(node, hookId, overrides = {}) {
  if (!(node instanceof HTMLElement) || !hookId) {
    return node;
  }

  const meta = findDesignStudioHook(hookId);
  node.dataset.ds = hookId;
  if (meta?.label) {
    node.dataset.dsLabel = overrides.label ?? meta.label;
  }
  if (meta?.category) {
    node.dataset.dsCategory = overrides.category ?? meta.category;
  }
  if (meta?.description) {
    node.dataset.dsDescription = overrides.description ?? meta.description;
  }
  return node;
}

function entry(id, label, description, category, relatedSections = [], tokens = []) {
  return {
    id,
    label,
    description,
    category,
    relatedSections,
    tokens,
  };
}
