/**
 * Nama peran yang dilihat pengguna, satu sumber untuk seluruh aplikasi.
 *
 * Nilai peran di database, di rute, dan di payload API tetap "seller" dan
 * "affiliate_admin". Yang berganti hanya kata yang tampil di layar: peran
 * seller disebut Showroom, dan affiliate disebut Marketing.
 *
 * Sebelumnya empat berkas menyimpan petanya masing-masing -- roleGuard,
 * roleSpecificLoginPage, profilePage, publicAuthLandingService -- dan keempatnya
 * sudah berbeda satu sama lain: yang satu menulis "seller", yang lain "Seller",
 * yang lain lagi "marketing admin". Mengganti kata di satu tempat tidak akan
 * pernah menyentuh tiga tempat sisanya.
 *
 * Huruf besar sengaja tidak dinormalkan di sini. Beberapa pemanggil menyisipkan
 * label di tengah kalimat ("Akun Showroom tidak dapat...") dan sebagian lagi
 * memakainya sebagai judul, jadi bentuk kapital dipilih sekali di sini dan
 * pemanggil yang butuh huruf kecil memakai roleLabelLower().
 */
const LABEL_PERAN = Object.freeze({
  public: "Publik",
  buyer: "Buyer",
  seller: "Showroom",
  admin: "Admin",
  super_admin: "Super Admin",
  affiliate: "Marketing",
  affiliate_admin: "Marketing",
});

export function roleLabel(role) {
  const kunci = String(role ?? "").trim();

  return LABEL_PERAN[kunci] ?? (kunci || "-");
}

export function roleLabelLower(role) {
  return roleLabel(role).toLowerCase();
}

export function knownRoleLabels() {
  return { ...LABEL_PERAN };
}
