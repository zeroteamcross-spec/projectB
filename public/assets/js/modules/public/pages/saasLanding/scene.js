/**
 * Panggung 3D landing, diport dari blok skrip paket
 * "Carlynk Automotive SaaS Landing Page".
 *
 * Modul ini sengaja dipisah supaya bisa di-import() setelah halaman tampil.
 * three.js sekitar 1,2 MB dan model GLB 17,9 MB; keduanya tidak boleh menahan
 * render pertama. Kanvas memang mulai dari opacity 0, jadi halaman terlihat
 * utuh sebelum panggung siap, persis seperti paket aslinya.
 *
 * three.js dilayani dari /assets/vendor, bukan unpkg seperti paket asli,
 * supaya landing tetap jalan tanpa koneksi keluar. Model dan panorama diambil
 * lewat ambilAsetBerat(), yang menyimpannya di Cache Storage; lihat
 * assetCache.js untuk alasannya.
 */

import { ambilAsetBerat } from "./assetCache.js";

const BASIS_THREE = "/assets/vendor/three/0.160.0";
const BERKAS_MODEL = "/assets/3d/ferrari-sf90.glb";
const BERKAS_PANORAMA = "/assets/3d/panorama.jpg";
// Model ini tidak memakai KHR_draco_mesh_compression, jadi berkas dekoder di
// bawah tidak pernah diunduh. Tetap dipasang supaya model ber-Draco juga jalan.
const JALUR_DRACO = `${BASIS_THREE}/addons/libs/draco/gltf/`;

/**
 * Model yang sudah selesai diurai disimpan di sini.
 *
 * Paket asli adalah halaman statis yang tidak pernah dilepas, jadi tidak
 * membutuhkan ini. Di SPA, landing bisa dibuka berkali-kali, dan mengurai
 * ulang GLB 17,9 MB berisi 173 mesh setiap kali terasa jelas lambat.
 */
let modelTersimpan = null;

/**
 * Perhentian kamera, satu untuk tiap bagian halaman.
 *
 * lookX menggeser titik bidik pada sumbu X dunia, yang membuat mobil bergeser
 * ke kiri atau kanan layar. Tandanya bergantung pada arah hadap kamera di
 * perhentian itu, jadi nilainya diverifikasi dengan memproyeksikan titik pusat
 * mobil ke koordinat layar, bukan dikira-kira.
 *
 * Empat perhentian sorot0..sorot3 sama persis dengan array stages paket asli.
 */
const TAHAP = Object.freeze({
  hero: { camX: 5.3, camY: 1.8, camZ: 5.7, lookX: -1.35, lookY: 0.62, rotY: 0.65 },
  sorot0: { camX: 5.3, camY: 1.8, camZ: 5.7, lookX: 0, lookY: 0.62, rotY: 0.65 },
  sorot1: { camX: 6.5, camY: 1.15, camZ: 0.4, lookX: 0, lookY: 0.64, rotY: 1.75 },
  sorot2: { camX: 2.2, camY: 3.3, camZ: -5.0, lookX: 0, lookY: 0.55, rotY: 3.5 },
  sorot3: { camX: -6.0, camY: 1.3, camZ: -3.1, lookX: 0, lookY: 0.58, rotY: 5.4 },
  // 01 lajur kiri, mobil di kanan.
  halaman: { camX: -6.2, camY: 1.5, camZ: 4.6, lookX: -2.25, lookY: 0.60, rotY: 6.4 },
  // 02 lajur kanan, mobil di kiri.
  listing: { camX: 6.1, camY: 2.0, camZ: 4.3, lookX: 2.21, lookY: 0.60, rotY: 7.6 },
  // 03 lajur kiri, mobil di kanan.
  marketing: { camX: 4.6, camY: 1.35, camZ: -5.6, lookX: 1.79, lookY: 0.58, rotY: 8.9 },
  // Blok daftar, lajur kanan, mobil di kiri.
  daftar: { camX: -5.4, camY: 2.5, camZ: -4.4, lookX: -1.98, lookY: 0.62, rotY: 10.2 },
  akhir: { camX: -0.4, camY: 3.4, camZ: 7.8, lookX: 0, lookY: 0.72, rotY: 11.4 },
});

export async function mulaiPanggung(akar) {
  const [THREE, { GLTFLoader }, { DRACOLoader }] = await Promise.all([
    import(`${BASIS_THREE}/three.module.js`),
    import(`${BASIS_THREE}/addons/loaders/GLTFLoader.js`),
    import(`${BASIS_THREE}/addons/loaders/DRACOLoader.js`),
  ]);

  const q = (pemilih) => akar.querySelector(pemilih);
  const qa = (pemilih) => Array.from(akar.querySelectorAll(pemilih));
  const kanvas = q("[data-stage]");

  if (!kanvas) {
    return () => {};
  }

  const renderer = new THREE.WebGLRenderer({
    canvas: kanvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  // Paket asli menyembunyikan kanvas di luar hero dan showcase. Sekarang mobil
  // dan panorama harus tampil sepanjang halaman, jadi kanvas dibuka sekali di
  // sini dan tidak pernah ditutup lagi.
  kanvas.style.opacity = "1";
  kanvas.style.pointerEvents = "auto";

  const scene = new THREE.Scene();
  scene.environment = lingkunganStudio(THREE, renderer);
  muatPanorama({ THREE, renderer, scene });

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 160);

  // Pencahayaan mengikuti palet terang: langit krem dari atas, pantulan krem
  // dari bawah, rim biru primary menggantikan rim oranye lama, dan lampu bawah
  // peach yang lembut supaya bodi mobil tidak terlihat datar di latar putih.
  scene.add(new THREE.HemisphereLight(0xFFF6EC, 0xE7DCCD, 0.85));
  const key = new THREE.DirectionalLight(0xFFFFFF, 1.25);
  key.position.set(5, 8, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x1E81B0, 1.4);
  rim.position.set(-7, 3.2, -6);
  scene.add(rim);
  const under = new THREE.PointLight(0xEAB676, 1.4, 9);
  under.position.set(0, -0.2, 0);
  scene.add(under);

  const pivot = new THREE.Group();
  pivot.visible = false;
  scene.add(pivot);

  const mobil = { model: null, dasarY: 0, roda: [] };
  muatModel({ THREE, GLTFLoader, DRACOLoader, pivot, mobil, q });

  const bayangan = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 2.6),
    new THREE.MeshBasicMaterial({ map: teksturBayangan(THREE), transparent: true, depthWrite: false, opacity: 1 }),
  );
  bayangan.rotation.x = -Math.PI / 2;
  bayangan.position.y = 0.016;
  pivot.add(bayangan);

  const lantai = new THREE.Mesh(
    new THREE.CircleGeometry(9, 64),
    new THREE.MeshStandardMaterial({ color: 0xE7DCCD, roughness: 0.55, metalness: 0.35, transparent: true, opacity: 0.55 }),
  );
  lantai.rotation.x = -Math.PI / 2;
  lantai.position.y = -0.004;
  lantai.visible = false;
  scene.add(lantai);

  const kolam = new THREE.Mesh(
    new THREE.CircleGeometry(10, 48),
    new THREE.MeshBasicMaterial({
      map: teksturBayangan(THREE),
      color: 0xEAB676,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  kolam.rotation.x = -Math.PI / 2;
  kolam.position.y = 0.006;
  kolam.visible = false;
  scene.add(kolam);

  const N = 120;
  const posisi = new Float32Array(N * 3);
  for (let i = 0; i < N; i += 1) {
    posisi[i * 3] = (Math.random() - 0.5) * 18;
    posisi[i * 3 + 1] = Math.random() * 4.5;
    posisi[i * 3 + 2] = (Math.random() - 0.5) * 16;
  }
  const geometriDebu = new THREE.BufferGeometry();
  geometriDebu.setAttribute("position", new THREE.BufferAttribute(posisi, 3));
  const debu = new THREE.Points(
    geometriDebu,
    new THREE.PointsMaterial({ color: 0x1E81B0, size: 0.022, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  scene.add(debu);

  const state = { camX: 5.6, camY: 1.95, camZ: 5.9, lookX: 0, lookY: 0.55, rotY: 0.7, opacity: 0 };
  const target = { ...state };
  let geser = 0;
  let kecepatanGeser = 0;
  let menyeret = false;
  let xTerakhir = 0;
  let sempit = false;

  const saatTekan = (e) => { menyeret = true; xTerakhir = e.clientX; kanvas.style.cursor = "grabbing"; };
  const saatSeret = (e) => {
    if (!menyeret) {
      return;
    }
    const d = (e.clientX - xTerakhir) * 0.006;
    geser += d;
    kecepatanGeser = d;
    xTerakhir = e.clientX;
  };
  const saatLepas = () => { menyeret = false; kanvas.style.cursor = "grab"; };

  kanvas.style.cursor = "grab";
  kanvas.addEventListener("pointerdown", saatTekan);
  window.addEventListener("pointermove", saatSeret, { passive: true });
  window.addEventListener("pointerup", saatLepas);

  let mx = 0;
  let tx = 0;
  let my = 0;
  let ty = 0;
  const saatPenunjuk = (e) => {
    tx = e.clientX / window.innerWidth - 0.5;
    ty = e.clientY / window.innerHeight - 0.5;
  };
  window.addEventListener("pointermove", saatPenunjuk, { passive: true });

  const ukurUlang = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    sempit = w < 900;
  };
  ukurUlang();
  window.addEventListener("resize", ukurUlang);

  let kapsiAktif = -1;
  const setKapsi = (idx) => {
    if (idx === kapsiAktif) {
      return;
    }
    kapsiAktif = idx;
    qa("[data-cap]").forEach((c, i) => {
      const nyala = i === idx;
      c.style.opacity = nyala ? "1" : "0";
      c.style.transform = nyala ? "none" : "translateY(24px)";
    });
  };

  const lerp = (a, b, t) => a + (b - a) * t;

  let jalur = bangunJalur();
  let tinggiTerakhir = document.documentElement.scrollHeight;
  let hitungPeriksa = 0;

  // Perhentian dihitung dari tinggi viewport, jadi harus disusun ulang saat
  // jendela berubah ukuran. Dipasang di sini, bukan di dalam ukurUlang(),
  // karena ukurUlang() sudah dipanggil sebelum jalur ada.
  const susunUlangJalur = () => { jalur = bangunJalur(); };
  window.addEventListener("resize", susunUlangJalur);

  const tataLetak = () => {
    // Tinggi dokumen berubah saat font selesai dimuat atau saat animasi reveal
    // mengubah tata letak. Jalur dibangun ulang bila itu terjadi, tapi tidak
    // setiap frame karena membaca scrollHeight memaksa layout.
    hitungPeriksa += 1;
    if (hitungPeriksa % 30 === 0) {
      const tinggi = document.documentElement.scrollHeight;
      if (Math.abs(tinggi - tinggiTerakhir) > 4) {
        tinggiTerakhir = tinggi;
        jalur = bangunJalur();
      }
    }

    if (jalur.length >= 2) {
      const y = window.scrollY;
      let i = 0;
      while (i < jalur.length - 2 && y >= jalur[i + 1].y) {
        i += 1;
      }

      const a = jalur[i];
      const b = jalur[i + 1];
      const f = Math.min(Math.max((y - a.y) / Math.max(b.y - a.y, 1), 0), 1);
      const e = f * f * (3 - 2 * f);

      target.camX = lerp(a.camX, b.camX, e) * (sempit ? 1.25 : 1);
      target.camY = lerp(a.camY, b.camY, e) + (sempit ? 0.45 : 0);
      target.camZ = lerp(a.camZ, b.camZ, e) * (sempit ? 1.25 : 1);
      // Di layar sempit lajur memenuhi lebar, jadi mobil dikembalikan ke tengah.
      target.lookX = sempit ? 0 : lerp(a.lookX, b.lookX, e);
      target.lookY = lerp(a.lookY, b.lookY, e) + (sempit ? 0.5 : 0);
      target.rotY = lerp(a.rotY, b.rotY, e);
    }

    perbaruiKapsi();
  };

  /**
   * Menyusun jalur kamera dari posisi bagian yang sebenarnya di dokumen.
   *
   * Paket asli hanya punya dua keadaan, hero dan showcase, dan menyembunyikan
   * kanvas di luar keduanya. Di sini setiap bagian punya perhentiannya sendiri
   * sehingga mobil dan panorama tampil sepanjang halaman, dan kamera berpindah
   * ke sisi yang berlawanan dengan lajur teks.
   */
  function bangunJalur() {
    const vh = window.innerHeight || 1;
    const showcase = q("[data-showcase]");
    const atasDokumen = (el) => (el ? el.getBoundingClientRect().top + window.scrollY : null);

    const atasShowcase = atasDokumen(showcase) ?? 0;
    const rentangShowcase = Math.max((showcase?.offsetHeight ?? vh) - vh, 1);
    const perhentian = (id) => {
      const atas = atasDokumen(document.getElementById(`saas_landing_${id}`));
      return atas === null ? null : Math.max(atas - vh * 0.45, 0);
    };

    const daftar = [
      { y: 0, ...TAHAP.hero },
      { y: atasShowcase, ...TAHAP.sorot0 },
      { y: atasShowcase + rentangShowcase / 3, ...TAHAP.sorot1 },
      { y: atasShowcase + (rentangShowcase * 2) / 3, ...TAHAP.sorot2 },
      { y: atasShowcase + rentangShowcase, ...TAHAP.sorot3 },
      { y: perhentian("halaman"), ...TAHAP.halaman },
      { y: perhentian("listing"), ...TAHAP.listing },
      { y: perhentian("marketing"), ...TAHAP.marketing },
      { y: perhentian("daftar"), ...TAHAP.daftar },
      { y: document.documentElement.scrollHeight - vh, ...TAHAP.akhir },
    ].filter((t) => t.y !== null);

    // Interpolasi mengandaikan urutan menaik.
    for (let i = 1; i < daftar.length; i += 1) {
      if (daftar[i].y <= daftar[i - 1].y) {
        daftar[i].y = daftar[i - 1].y + 1;
      }
    }

    return daftar;
  }

  function perbaruiKapsi() {
    const showcase = q("[data-showcase]");
    const sr = showcase ? showcase.getBoundingClientRect() : null;

    if (!sr || sr.top >= window.innerHeight || sr.bottom <= 0) {
      setKapsi(-1);
      return;
    }

    const total = Math.max(sr.height - window.innerHeight, 1);
    const p = Math.min(Math.max(-sr.top / total, 0), 1);
    setKapsi(Math.min(Math.floor(p * 3), 2));
    qa("[data-dot]").forEach((d, di) => {
      const lokal = Math.min(Math.max(p * 3 - di, 0), 1);
      const isi = d.firstElementChild;
      if (isi) {
        isi.style.transform = `scaleX(${lokal.toFixed(3)})`;
      }
    });
  }

  // Paket asli menaruh rujukan ini di kanvas untuk keperluan inspeksi.
  kanvas.__stage = { camera, pivot, state, target, scene, mobil };

  let raf = 0;
  let t0 = performance.now();
  let rotasiTerakhir = 0;

  const putar = () => {
    raf = requestAnimationFrame(putar);
    tataLetak();

    const t = (performance.now() - t0) / 1000;
    mx += (tx - mx) * 0.05;
    my += (ty - my) * 0.05;
    if (!menyeret) {
      geser += kecepatanGeser;
      kecepatanGeser *= 0.93;
    }
    Object.keys(target).forEach((k) => {
      if (k !== "opacity") {
        state[k] = lerp(state[k], target[k], 0.075);
      }
    });

    pivot.rotation.y = state.rotY + geser + mx * 0.35 + t * 0.02;
    const putaran = pivot.rotation.y - rotasiTerakhir;
    rotasiTerakhir = pivot.rotation.y;
    mobil.roda.forEach((w) => { w.rotation.z -= putaran * 3.4; });
    if (mobil.model) {
      mobil.model.position.y = mobil.dasarY + Math.sin(t * 0.8) * 0.018;
    }

    camera.position.set(state.camX, state.camY - my * 0.7, state.camZ);
    camera.lookAt(state.lookX, state.lookY, 0);
    debu.rotation.y = t * 0.012;
    if (kanvas.style.opacity !== "0") {
      renderer.render(scene, camera);
    }
  };

  putar();

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", ukurUlang);
    window.removeEventListener("resize", susunUlangJalur);
    window.removeEventListener("pointermove", saatPenunjuk);
    window.removeEventListener("pointermove", saatSeret);
    window.removeEventListener("pointerup", saatLepas);
    kanvas.removeEventListener("pointerdown", saatTekan);
    delete kanvas.__stage;
    // Peramban membatasi jumlah konteks WebGL yang hidup. Halaman statis asli
    // tidak pernah dilepas, sedangkan landing ini bisa dibuka berkali-kali,
    // jadi konteksnya harus benar-benar dilepas, bukan sekadar dispose().
    renderer.forceContextLoss?.();
    renderer.dispose();
  };
}

/**
 * Panorama dipakai dua kali: sebagai latar, dan sebagai sumber pantulan lewat
 * PMREM. Diambil sebagai blob supaya bisa lewat Cache Storage, lalu dibaca
 * TextureLoader dari object URL.
 */
async function muatPanorama({ THREE, renderer, scene }) {
  let objectUrl = "";

  try {
    const jawaban = await ambilAsetBerat(BERKAS_PANORAMA);
    if (!jawaban.ok) {
      return;
    }
    objectUrl = URL.createObjectURL(await jawaban.blob());
  } catch (error) {
    console.warn("Panorama gagal dimuat.", error);
    return;
  }

  new THREE.TextureLoader().load(objectUrl, (tex) => {
    URL.revokeObjectURL(objectUrl);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    if ("colorSpace" in tex) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromEquirectangular(tex).texture;
    scene.background = tex;
    scene.backgroundIntensity = 1.0;
    pm.dispose();
  }, undefined, () => URL.revokeObjectURL(objectUrl));
}

async function muatModel({ THREE, GLTFLoader, DRACOLoader, pivot, mobil, q }) {
  if (modelTersimpan) {
    pasangModel({ pivot, mobil, q, tersimpan: modelTersimpan });
    return;
  }

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(JALUR_DRACO);
  loader.setDRACOLoader(draco);

  let isi = null;

  try {
    const jawaban = await ambilAsetBerat(BERKAS_MODEL);
    if (!jawaban.ok) {
      throw new Error(`HTTP ${jawaban.status}`);
    }
    isi = await jawaban.arrayBuffer();
  } catch (error) {
    gagalMuatModel(q, error);
    return;
  }

  // parse(), bukan load(), karena isinya sudah di tangan. GLB ini mandiri:
  // buffer dan 74 teksturnya tertanam, jadi path resolusinya boleh kosong.
  loader.parse(isi, "", (gltf) => {
    const model = gltf.scene;
    model.name = "ferrari";

    let box = new THREE.Box3().setFromObject(model);
    const ukuran = box.getSize(new THREE.Vector3());
    if (ukuran.z > ukuran.x) {
      model.rotation.y = -Math.PI / 2;
      model.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(model);
    }

    const ukuran2 = box.getSize(new THREE.Vector3());
    model.scale.setScalar(4.35 / Math.max(ukuran2.x, 0.001));
    model.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(model);

    const pusat = box.getCenter(new THREE.Vector3());
    model.position.x -= pusat.x;
    model.position.z -= pusat.z;
    model.position.y -= box.min.y;

    model.traverse((o) => {
      if (!o.isMesh) {
        return;
      }
      o.frustumCulled = false;
      const m = o.material;
      if (m && m.isMeshStandardMaterial) {
        m.envMapIntensity = 1.15;
        if (m.map) {
          m.map.anisotropy = 4;
        }
      }
    });

    const roda = [];
    model.traverse((o) => {
      if (/wheel|tire|tyre|rim/i.test(o.name) && o.parent === model) {
        roda.push(o);
      }
    });

    modelTersimpan = { model, dasarY: model.position.y + 0.02, roda };
    pasangModel({ pivot, mobil, q, tersimpan: modelTersimpan });
    // parse() hanya menerima (data, path, onLoad, onError). Tidak ada slot
    // onProgress seperti pada load(), jadi onError langsung di argumen keempat.
  }, (error) => gagalMuatModel(q, error));
}

function gagalMuatModel(q, error) {
  console.warn("GLB gagal dimuat.", error);
  const lencana = q("[data-modelload]");
  if (lencana) {
    lencana.textContent = "MODEL 3D GAGAL DIMUAT";
  }
}

function pasangModel({ pivot, mobil, q, tersimpan }) {
  pivot.add(tersimpan.model);
  pivot.visible = true;
  mobil.model = tersimpan.model;
  mobil.dasarY = tersimpan.dasarY;
  mobil.roda = tersimpan.roda;

  const lencana = q("[data-modelload]");
  if (lencana) {
    lencana.style.opacity = "0";
    setTimeout(() => { lencana.style.display = "none"; }, 600);
  }
}

function lingkunganStudio(THREE, renderer) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 512;
  const g = c.getContext("2d");

  // Studio terang: lantai krem, langit putih ke krem. Dulu keduanya nyaris
  // hitam karena landing bertema gelap.
  const tanah = g.createLinearGradient(0, 256, 0, 512);
  tanah.addColorStop(0, "#F5ECE1");
  tanah.addColorStop(1, "#E7DCCD");
  g.fillStyle = tanah;
  g.fillRect(0, 0, 1024, 512);

  const langit = g.createLinearGradient(0, 0, 0, 258);
  langit.addColorStop(0, "#FFFFFF");
  langit.addColorStop(0.5, "#FAF4ED");
  langit.addColorStop(1, "#F5ECE1");
  g.fillStyle = langit;
  g.fillRect(0, 0, 1024, 258);

  const lembut = (cx, cy, rx, ry, a) => {
    g.save();
    g.translate(cx, cy);
    g.scale(rx / ry, 1);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, ry);
    grd.addColorStop(0, `rgba(255,252,246,${a})`);
    grd.addColorStop(0.55, `rgba(255,248,238,${(a * 0.42).toFixed(3)})`);
    grd.addColorStop(1, "rgba(255,245,235,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, 0, ry, 0, Math.PI * 2);
    g.fill();
    g.restore();
  };
  lembut(210, 96, 300, 132, 0.98);
  lembut(660, 74, 240, 104, 0.72);
  lembut(930, 130, 170, 92, 0.44);
  lembut(430, 196, 420, 92, 0.09);

  const hangat = g.createLinearGradient(0, 176, 0, 258);
  hangat.addColorStop(0, "rgba(255,138,61,.30)");
  hangat.addColorStop(1, "rgba(255,120,40,0)");
  g.fillStyle = hangat;
  g.fillRect(0, 176, 1024, 82);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();

  return env;
}

function teksturBayangan(THREE) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(128, 128, 8, 128, 128, 126);
  grd.addColorStop(0, "rgba(0,0,0,.85)");
  grd.addColorStop(0.45, "rgba(0,0,0,.42)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);

  return new THREE.CanvasTexture(c);
}
