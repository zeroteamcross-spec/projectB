const ICONS = {
  brandMark: "fa-solid fa-car-side",
  dashboard: "fa-solid fa-gauge-high",
  showroom: "fa-solid fa-warehouse",
  car: "fa-solid fa-car-side",
  carb: "fa-solid fa-car-rear",
  transaction: "fa-solid fa-receipt",
  affiliate: "fa-solid fa-users",
  commission: "fa-solid fa-hand-holding-dollar",
  search: "fa-solid fa-magnifying-glass",
  filter: "fa-solid fa-filter",
  bell: "fa-solid fa-bell",
  shoppingBag: "fa-solid fa-bag-shopping",
  user: "fa-solid fa-user",
  sort: "fa-solid fa-arrow-down-wide-short",
  "chevron-down": "fa-solid fa-chevron-down",
  chevronRight: "fa-solid fa-chevron-right",
  location: "fa-solid fa-location-dot",
  calendar: "fa-solid fa-calendar-days",
  seat: "fa-solid fa-chair",
  sparkles: "fa-solid fa-wand-magic-sparkles",
  star: "fa-solid fa-star",
  heart: "fa-solid fa-heart",
  home: "fa-solid fa-house",
  settings: "fa-solid fa-gear",
  users: "fa-solid fa-users-gear",
  shield: "fa-solid fa-shield-halved",
  lock: "fa-solid fa-lock",
  unlock: "fa-solid fa-unlock",
  chart: "fa-solid fa-chart-line",
  pieChart: "fa-solid fa-chart-pie",
  money: "fa-solid fa-money-bill-wave",
  wallet: "fa-solid fa-wallet",
  bank: "fa-solid fa-building-columns",
  database: "fa-solid fa-database",
  creditCard: "fa-solid fa-credit-card",
  file: "fa-solid fa-file-lines",
  folder: "fa-solid fa-folder",
  clipboard: "fa-solid fa-clipboard-list",
  list: "fa-solid fa-list",
  table: "fa-solid fa-table",
  tags: "fa-solid fa-tags",
  tag: "fa-solid fa-tag",
  plus: "fa-solid fa-plus",
  arrowLeft: "fa-solid fa-arrow-left",
  arrowRight: "fa-solid fa-arrow-right",
  edit: "fa-solid fa-pen-to-square",
  trash: "fa-solid fa-trash",
  eye: "fa-solid fa-eye",
  eyeSlash: "fa-solid fa-eye-slash",
  upload: "fa-solid fa-upload",
  download: "fa-solid fa-download",
  image: "fa-solid fa-image",
  camera: "fa-solid fa-camera",
  wrench: "fa-solid fa-wrench",
  tools: "fa-solid fa-screwdriver-wrench",
  truck: "fa-solid fa-truck",
  key: "fa-solid fa-key",
  idCard: "fa-solid fa-id-card",
  addressBook: "fa-solid fa-address-book",
  phone: "fa-solid fa-phone",
  envelope: "fa-solid fa-envelope",
  message: "fa-solid fa-message",
  clock: "fa-solid fa-clock",
  history: "fa-solid fa-clock-rotate-left",
  map: "fa-solid fa-map",
  globe: "fa-solid fa-globe",
  link: "fa-solid fa-link",
  chain: "fa-solid fa-link",
  sitemap: "fa-solid fa-sitemap",
  bars: "fa-solid fa-bars",
  ellipsis: "fa-solid fa-ellipsis",
  circleCheck: "fa-solid fa-circle-check",
  circleXmark: "fa-solid fa-circle-xmark",
  triangleWarning: "fa-solid fa-triangle-exclamation",
  info: "fa-solid fa-circle-info",
  flag: "fa-solid fa-flag",
  bookmark: "fa-solid fa-bookmark",
  crown: "fa-solid fa-crown",
  bolt: "fa-solid fa-bolt",
  percent: "fa-solid fa-percent",
};

export const iconRegistry = Object.freeze(Object.keys(ICONS));

/**
 * Icon di aplikasi ini adalah font icon: glyph-nya digambar oleh ::before,
 * bukan oleh elemen tersendiri. Jadi kotak <i> bisa duduk persis di tengah
 * lingkarannya sementara glyph di dalam kotak itu tidak.
 *
 * Ukuran kotak datang dari h-4 w-4 (16px), ukuran glyph dari font-size yang
 * diwarisi. Selama keduanya kebetulan sama besar glyph terlihat pas. Begitu
 * font seluruh aplikasi dikecilkan satu langkah, font-size turun ke 12px
 * sementara kotaknya tetap 16px -- dan karena baris teks menempel ke atas
 * dengan text-align start, glyph pindah ke pojok kiri atas.
 *
 * Ditulis sebagai style inline, bukan kelas: 78 dari 322 pemanggil createIcon
 * sudah mengirim display sendiri lewat className (block, grid, inline-block),
 * dan siapa yang menang antar kelas Tailwind ditentukan urutan di stylesheet,
 * bukan urutan di atribut class. Style inline menang tanpa perlu ditebak.
 */
function pusatkanGlyph(icon) {
  icon.style.display = "inline-flex";
  icon.style.alignItems = "center";
  icon.style.justifyContent = "center";
  icon.style.lineHeight = "1";
}

export function createIcon(name, { className = "", title = "" } = {}) {
  const icon = document.createElement("i");
  icon.className = `${ICONS[name] ?? ICONS.brandMark} ${className}`.trim();
  icon.setAttribute("aria-hidden", title ? "false" : "true");
  pusatkanGlyph(icon);

  if (title) {
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", title);
    icon.title = title;
  }

  return icon;
}
