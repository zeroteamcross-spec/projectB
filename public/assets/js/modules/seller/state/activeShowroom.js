import { appStore } from "../../../state/store.js";
import { showroomsResource } from "../../../resources/showroomsResource.js";

const STORAGE_KEY = "projectB:seller:active-showroom-id";

/**
 * Cabang showroom yang sedang dikelola seller (fitur multi-cabang). Beda
 * dari app.activeRole -- role selalu bisa dihitung ulang dari sesi auth,
 * tapi "cabang mana yang dipilih" tidak punya sumber kebenaran lain sama
 * sekali, jadi HARUS disimpan di localStorage supaya bertahan lewat reload
 * penuh (mengganti cabang lewat sellerBranchSwitcher.js memuat ulang
 * halaman) -- app.activeShowroomId di store cuma cache in-memory dari nilai
 * yang sama, dibaca ulang dari localStorage tiap app.js boot.
 */
export const activeShowroom = {
  id() {
    const cached = appStore.get("app.activeShowroomId", null);
    if (cached !== null) {
      return cached;
    }

    return readStoredId();
  },

  set(showroomId) {
    writeStoredId(showroomId);
    appStore.patchState("app", { activeShowroomId: showroomId }, "seller:active-showroom-changed");
  },

  clear() {
    writeStoredId(null);
    appStore.patchState("app", { activeShowroomId: null }, "seller:active-showroom-cleared");
  },

  /**
   * Dipakai preload rute seller yang sebelumnya selalu memanggil
   * showroomsResource.mine() -- begitu ada cabang aktif terpilih,
   * showroom itu yang dimuat; kalau belum ada pilihan (login baru, atau
   * seller satu-cabang yang belum pernah menyentuh pemilih cabang), tetap
   * jatuh ke mine() (cabang pertama) seperti perilaku lama, supaya seller
   * satu-cabang tidak pernah melihat bedanya sama sekali.
   */
  async resolveMine(options = {}) {
    const showroomId = this.id();

    if (!showroomId) {
      return showroomsResource.mine(options);
    }

    try {
      return await showroomsResource.mineById(showroomId, options);
    } catch (error) {
      // Cabang yang tersimpan mungkin sudah tidak ada/bukan miliknya lagi
      // (mis. dihapus dari perangkat lain) -- daripada mengunci seller di
      // halaman error, lupakan pilihannya dan kembali ke cabang pertama.
      this.clear();
      return showroomsResource.mine(options);
    }
  },
};

function readStoredId() {
  try {
    const raw = window.localStorage?.getItem(STORAGE_KEY);
    const parsed = raw !== null ? Number(raw) : null;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch (error) {
    // Storage bisa tidak tersedia di private browsing/konteks terbatas.
    return null;
  }
}

function writeStoredId(showroomId) {
  try {
    if (showroomId) {
      window.localStorage?.setItem(STORAGE_KEY, String(showroomId));
    } else {
      window.localStorage?.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    // Sama seperti readStoredId() -- diamkan, cabang aktif cukup tidak
    // bertahan lewat reload di kondisi ini, bukan error yang menghentikan
    // seller.
  }
}
