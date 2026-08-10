/**
 * Penyimpanan aset berat landing di Cache Storage.
 *
 * Alasannya: cache HTTP peramban punya batas ukuran per entri. Model GLB 17,9 MB
 * terbukti melewati batas itu di sebagian peramban, sehingga terunduh penuh
 * setiap kunjungan walaupun header Cache-Control-nya sudah benar. Panorama
 * 5,6 MB lolos, GLB tidak. Cache Storage memakai kuota origin yang jauh lebih
 * besar dan tidak punya batas per entri semacam itu.
 *
 * Polanya stale-while-revalidate: isi tersimpan langsung dipakai supaya halaman
 * cepat, lalu satu permintaan HEAD memeriksa ETag di latar. Bila berkas di
 * server berubah, entri dihapus sehingga kunjungan berikutnya mengunduh yang
 * baru. Jadi mengganti model tidak perlu menyentuh kode.
 */

const NAMA_CACHE = "saas-landing-aset-v1";
const AWALAN_CACHE = "saas-landing-aset-";

/**
 * Mengambil aset, memakai salinan tersimpan bila ada.
 * Selalu mengembalikan Response, dan tidak pernah melempar karena urusan cache;
 * bila apa pun gagal, jatuh kembali ke fetch biasa.
 */
export async function ambilAsetBerat(url) {
  const cache = await bukaCache();

  if (!cache) {
    return fetch(url);
  }

  try {
    const tersimpan = await cache.match(url);

    if (tersimpan) {
      periksaPerubahan(cache, url, tersimpan.headers.get("ETag"));
      return tersimpan;
    }

    const jawaban = await fetch(url);

    if (jawaban.ok) {
      // clone() wajib: body hanya bisa dibaca sekali.
      await cache.put(url, jawaban.clone());
    }

    return jawaban;
  } catch (error) {
    console.warn("Cache aset landing tidak terpakai.", error);
    return fetch(url);
  }
}

async function bukaCache() {
  // caches hanya ada di secure context: https, atau localhost saat kembangan.
  if (typeof caches === "undefined" || !window.isSecureContext) {
    return null;
  }

  try {
    const cache = await caches.open(NAMA_CACHE);
    hapusVersiLama();
    return cache;
  } catch (error) {
    console.warn("Cache Storage tidak tersedia.", error);
    return null;
  }
}

async function hapusVersiLama() {
  try {
    const nama = await caches.keys();
    await Promise.all(
      nama
        .filter((n) => n.startsWith(AWALAN_CACHE) && n !== NAMA_CACHE)
        .map((n) => caches.delete(n)),
    );
  } catch {
    // Membersihkan versi lama bukan hal kritis.
  }
}

/**
 * Memeriksa apakah berkas di server sudah berbeda, tanpa menahan pemakai.
 * HEAD tidak membawa body, jadi biayanya hanya satu perjalanan header.
 */
function periksaPerubahan(cache, url, etagTersimpan) {
  if (!etagTersimpan) {
    return;
  }

  fetch(url, { method: "HEAD", cache: "no-cache" })
    .then((jawaban) => {
      if (jawaban.ok && jawaban.headers.get("ETag") !== etagTersimpan) {
        return cache.delete(url);
      }
      return false;
    })
    .catch(() => {
      // Offline atau server sedang tidak menjawab. Salinan tersimpan tetap dipakai.
    });
}
