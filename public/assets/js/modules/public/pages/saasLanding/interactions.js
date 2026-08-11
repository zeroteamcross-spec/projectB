/**
 * Perilaku non-3D landing, diport dari blok skrip paket
 * "Carlynk Automotive SaaS Landing Page".
 *
 * Paket asli menjalankannya sebagai komponen React (DCLogic) dengan
 * MutationObserver, karena markup-nya bisa dirender ulang kapan saja. Di sini
 * markup dipasang sekali oleh lifecycle SPA, jadi observer itu tidak dipakai;
 * sebagai gantinya setiap pemasang mengembalikan fungsi pembersih.
 */

export const ID_BAGIAN = Object.freeze(["halaman", "listing", "marketing"]);

export function pasangInteraksi(akar) {
  const pembersih = [];
  const qa = (pemilih) => Array.from(akar.querySelectorAll(pemilih));
  const q = (pemilih) => akar.querySelector(pemilih);

  pembersih.push(pasangKata(qa));
  pembersih.push(pasangReveal(qa));
  pembersih.push(pasangTilt(qa));
  pembersih.push(pasangMagnet(qa));
  pembersih.push(pasangUiGulir(q, qa));
  pembersih.push(pasangHover(qa));
  pembersih.push(pasangGulirBagian(akar));

  return () => pembersih.splice(0).forEach((bersihkan) => bersihkan());
}

/* ---------- animasi masuk ---------- */

function pasangKata(qa) {
  const waktu = [];

  qa("[data-word]").forEach((kata, i) => {
    kata.style.display = "inline-block";
    kata.style.opacity = "0";
    kata.style.filter = "blur(10px)";
    kata.style.transform = "translateY(28px) rotateX(-40deg)";
    kata.style.transition = "opacity .8s cubic-bezier(.22,.9,.28,1), transform .9s cubic-bezier(.22,.9,.28,1), filter .8s ease";
    kata.style.transitionDelay = `${200 + i * 75}ms`;
    waktu.push(setTimeout(() => {
      kata.style.opacity = "1";
      kata.style.filter = "none";
      kata.style.transform = "none";
    }, 60));
  });

  return () => waktu.forEach((t) => clearTimeout(t));
}

function pasangReveal(qa) {
  const simpul = qa("[data-reveal]");
  const waktu = [];

  if (!simpul.length) {
    return () => {};
  }

  simpul.forEach((n, i) => {
    n.style.opacity = "0";
    n.style.transform = "translateY(26px)";
    n.style.transition = "opacity .9s cubic-bezier(.22,.9,.28,1), transform .9s cubic-bezier(.22,.9,.28,1)";
    n.style.transitionDelay = `${Math.min(i, 4) * 80}ms`;
  });

  const io = new IntersectionObserver((entri) => {
    entri.forEach((e) => {
      if (!e.isIntersecting) {
        return;
      }

      const t = e.target;
      t.style.opacity = "1";
      t.style.transform = "none";

      t.querySelectorAll("[data-bar]").forEach((b, i) => {
        b.style.animation = `barGrow .85s cubic-bezier(.22,.9,.28,1) ${i * 110}ms both`;
      });

      t.querySelectorAll("[data-lead]").forEach((l, i) => {
        waktu.push(setTimeout(() => {
          l.style.opacity = "1";
          l.style.transform = "none";
        }, 300 + i * 420));
      });

      t.querySelectorAll("[data-pop]").forEach((p, i) => {
        p.style.opacity = "0";
        p.style.transform = "translateY(14px) scale(.96)";
        waktu.push(setTimeout(() => {
          p.style.opacity = "1";
          p.style.transform = "none";
        }, 260 + i * 130));
      });

      const pengetik = t.querySelector("[data-type]");
      if (pengetik) {
        ketik(pengetik, waktu);
      }

      const status = t.querySelector("[data-status]");
      if (status) {
        waktu.push(setTimeout(() => {
          status.textContent = "Tayang";
          status.style.color = "#7ED08C";
          status.style.background = "rgba(126,208,140,.12)";
        }, 1600));
      }

      t.querySelectorAll("[data-row]").forEach((r, i) => {
        r.style.opacity = "0";
        r.style.transform = "translateX(-14px)";
        r.style.transition = `opacity .5s ease ${i * 90}ms, transform .5s cubic-bezier(.22,.9,.28,1) ${i * 90}ms, background .25s`;
        requestAnimationFrame(() => {
          r.style.opacity = "1";
          r.style.transform = "none";
        });
      });

      io.unobserve(t);
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -6% 0px" });

  simpul.forEach((n) => io.observe(n));

  return () => {
    io.disconnect();
    waktu.forEach((t) => clearTimeout(t));
  };
}

function ketik(el, waktu) {
  const penuh = el.getAttribute("data-type") || "";
  let i = 0;

  const detak = () => {
    el.textContent = penuh.slice(0, i++);
    if (i <= penuh.length) {
      waktu.push(setTimeout(detak, 42));
    }
  };

  detak();
}

/* ---------- interaksi penunjuk ---------- */

function pasangTilt(qa) {
  const lepas = [];

  qa("[data-tilt]").forEach((kartu) => {
    const gerak = (ev) => {
      const r = kartu.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width - 0.5;
      const py = (ev.clientY - r.top) / r.height - 0.5;
      kartu.style.transform = `perspective(1000px) rotateY(${(px * 6).toFixed(2)}deg) rotateX(${(-py * 6).toFixed(2)}deg) translateY(-5px)`;
      kartu.style.transitionDuration = ".12s";
    };
    const keluar = () => {
      kartu.style.transitionDuration = ".5s";
      kartu.style.transform = "none";
    };

    kartu.addEventListener("pointermove", gerak);
    kartu.addEventListener("pointerleave", keluar);
    lepas.push(() => {
      kartu.removeEventListener("pointermove", gerak);
      kartu.removeEventListener("pointerleave", keluar);
    });
  });

  return () => lepas.forEach((f) => f());
}

function pasangMagnet(qa) {
  const lepas = [];

  qa("[data-magnet]").forEach((tombol) => {
    const gerak = (ev) => {
      const r = tombol.getBoundingClientRect();
      const dx = (ev.clientX - (r.left + r.width / 2)) * 0.22;
      const dy = (ev.clientY - (r.top + r.height / 2)) * 0.3;
      tombol.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
    };
    const keluar = () => { tombol.style.transform = "none"; };

    tombol.addEventListener("pointermove", gerak);
    tombol.addEventListener("pointerleave", keluar);
    lepas.push(() => {
      tombol.removeEventListener("pointermove", gerak);
      tombol.removeEventListener("pointerleave", keluar);
    });
  });

  return () => lepas.forEach((f) => f());
}

/**
 * Meniru atribut style-hover paket asli, yang di sana dipasang oleh runtime
 * support.js. Nilai sebelum hover dibaca ulang setiap kali masuk, karena
 * properti seperti transform juga diubah animasi reveal.
 */
function pasangHover(qa) {
  const lepas = [];

  qa("[style-hover]").forEach((el) => {
    const aturan = uraiGaya(el.getAttribute("style-hover"));
    if (!aturan.length) {
      return;
    }

    let sebelum = null;

    const masuk = () => {
      sebelum = aturan.map(([prop]) => [prop, el.style.getPropertyValue(prop)]);
      aturan.forEach(([prop, nilai]) => el.style.setProperty(prop, nilai));
    };
    const keluar = () => {
      (sebelum || []).forEach(([prop, nilai]) => {
        if (nilai) {
          el.style.setProperty(prop, nilai);
        } else {
          el.style.removeProperty(prop);
        }
      });
      sebelum = null;
    };

    el.addEventListener("pointerenter", masuk);
    el.addEventListener("pointerleave", keluar);
    lepas.push(() => {
      el.removeEventListener("pointerenter", masuk);
      el.removeEventListener("pointerleave", keluar);
    });
  });

  return () => lepas.forEach((f) => f());
}

function uraiGaya(teks) {
  return String(teks || "")
    .split(";")
    .map((bagian) => bagian.trim())
    .filter(Boolean)
    .map((bagian) => {
      const pisah = bagian.indexOf(":");
      return pisah === -1 ? null : [bagian.slice(0, pisah).trim(), bagian.slice(pisah + 1).trim()];
    })
    .filter(Boolean);
}

/* ---------- gulir ---------- */

function pasangUiGulir(q, qa) {
  const bar = q("[data-progress]");
  const logo = q("[data-logo]");
  const petunjuk = q("[data-scrollhint]");
  const tautan = qa("[data-navlink]");
  let menunggu = false;

  const saatGulir = () => {
    if (menunggu) {
      return;
    }

    menunggu = true;
    requestAnimationFrame(() => {
      menunggu = false;
      const y = window.scrollY;
      const maks = Math.max(document.body.scrollHeight - window.innerHeight, 1);
      const p = Math.min(y / maks, 1);

      if (bar) bar.style.width = `${(p * 100).toFixed(2)}%`;
      if (logo) logo.style.transform = `rotate(${(p * 320).toFixed(1)}deg)`;
      if (petunjuk) petunjuk.style.opacity = y > 120 ? "0" : "1";

      let aktif = -1;
      ID_BAGIAN.forEach((id, i) => {
        const el = document.getElementById(`saas_landing_${id}`);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.45) {
          aktif = i;
        }
      });
      // Pita navigasi sekarang berlatar putih tembus pandang, jadi tautannya
      // gelap: biru penuh untuk yang aktif, abu tulisan untuk sisanya.
      tautan.forEach((l, i) => {
        l.style.color = i === aktif ? "#17698F" : "rgba(28,25,23,.62)";
      });
    });
  };

  window.addEventListener("scroll", saatGulir, { passive: true });
  saatGulir();

  return () => window.removeEventListener("scroll", saatGulir);
}

/**
 * Paket asli memakai anchor "#halaman". Di aplikasi ini hash dipakai router,
 * jadi anchor tersebut akan dibaca sebagai rute /halaman dan berujung notFound.
 * Kliknya ditahan dan diganti gulir programatik supaya location.hash tidak berubah.
 */
function pasangGulirBagian(akar) {
  const saatKlik = (ev) => {
    const pemicu = ev.target.closest("[data-scroll]");
    if (!pemicu || !akar.contains(pemicu)) {
      return;
    }

    ev.preventDefault();
    gulirKeBagian(pemicu.getAttribute("data-scroll"));
  };

  akar.addEventListener("click", saatKlik);
  return () => akar.removeEventListener("click", saatKlik);
}

export function gulirKeBagian(kunci) {
  const target = document.getElementById(`saas_landing_${kunci}`);
  if (!target) {
    return;
  }

  // Tab yang tidak terlihat tidak menjalankan frame, sehingga gulir halus
  // tidak pernah selesai. Di kondisi itu lompat langsung. Harus "instant",
  // bukan "auto": "auto" berarti ikut CSS, dan CSS landing ini smooth.
  target.scrollIntoView({ behavior: document.hidden ? "instant" : "smooth", block: "start" });
}
