/* =====================================================================
 * projectB - Browser Tester Otomatis
 * File  : public/tester/uji_otomatis_browser.js
 *
 * Cara pakai:
 *   1. Buka aplikasi (contoh: http://localhost:8000/#/)
 *   2. DevTools (F12) -> Console
 *   3. Tempel seluruh isi file ini lalu Enter
 *   4. Panel muncul di kanan-bawah. Pilih JSON lalu "Mulai Uji".
 *
 * Diadaptasi dari runner SIATOM dengan perbedaan penting:
 *   - Sadar hash routing (projectB adalah SPA, semua route di location.hash)
 *   - Query ulang elemen tepat sebelum aksi, karena SPA membangun ulang DOM
 *   - Punya assertion sungguhan lewat field "harapan"; langkah bisa MERAH
 *   - Punya "tunggu" deklaratif, bukan jeda buta
 *   - Punya variabel: simpan nilai dari satu langkah, pakai di langkah lain
 *   - Error endpoint ikut menggagalkan langkah, tidak hanya dicatat
 *   - Laporan bisa diunduh sebagai file JSON
 *   - Bisa menjawab window.prompt()/window.confirm() lewat field
 *     "dialog_jawaban" pada langkah (retur/batalkan transaksi memakainya)
 * ===================================================================== */
(function () {
  "use strict";

  var CONFIG = {
    jeda_ms: 400,
    // Dilonggarkan karena render SPA bisa melambat drastis di tab yang tidak
    // aktif; Chrome mencekik setTimeout di tab background.
    timeout_ms: 20000,
    poll_ms: 200,
    folder: "tester/",
    daftarUrl: "tester/index.json",
    akunUrl: "tester/akun.json",
    endpoint_log_limit: 300,
    endpoint_response_limit: 1500,
    endpoint_gagalkan_langkah: true,
    // Endpoint yang wajar membalas non-2xx sebagai bagian dari alur normal.
    // Tanpa daftar ini, tamu yang belum login selalu dianggap error.
    endpoint_abaikan: [
      { url: "/api/auth/autologin", status: [401] },
      { url: "/api/favorites", status: [401, 403] },
      { url: "/api/notifications", status: [401] },
    ],
    zIndex: 2147483000
  };

  var STORAGE = {
    batch: "PBT_BATCH",
    single: "PBT_SINGLE",
    report: "PBT_REPORT",
    selected: "PBT_SELECTED",
    endpoint: "PBT_ENDPOINT",
    vars: "PBT_VARS"
  };

  var state = {
    running: false,
    paused: false,
    stop: false,
    data: null,
    fileName: null,
    fileList: [],
    filteredFileList: [],
    currentStep: null,
    resumeResolve: null,
    hasil: [],
    vars: {},
    batchRunning: false,
    batchStop: false,
    akun: {},
    dialogQueue: []
  };

  /* =================== util dasar =================== */

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  function safeJsonParse(txt, fallback) {
    try { return JSON.parse(txt); } catch (e) { return fallback; }
  }

  function baseUrl() {
    return location.origin + "/";
  }

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  function nowStamp() { return String(Date.now()); }

  function log(msg, level) {
    var t = new Date().toTimeString().split(" ")[0];
    console.log("[PBT " + t + "] " + msg);
    appendLog(msg, level);
  }

  function tungguPause() {
    if (!state.paused) return Promise.resolve();
    return new Promise(function (res) { state.resumeResolve = res; });
  }

  /* =================== variabel & interpolasi =================== */

  function builtinVars() {
    var d = new Date();
    return {
      timestamp: nowStamp(),
      stamp6: nowStamp().slice(-6),
      tanggal_hari_ini: d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()),
      jam_sekarang: pad2(d.getHours()) + ":" + pad2(d.getMinutes())
    };
  }

  function interpolate(value) {
    if (typeof value !== "string") return value;
    return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, function (full, name) {
      if (Object.prototype.hasOwnProperty.call(state.vars, name)) {
        return String(state.vars[name]);
      }
      log("Variabel {{" + name + "}} belum ada, dibiarkan apa adanya.", "warn");
      return full;
    });
  }

  function interpolateDeep(input) {
    if (typeof input === "string") return interpolate(input);
    if (Array.isArray(input)) return input.map(interpolateDeep);
    if (input && typeof input === "object") {
      var out = {};
      Object.keys(input).forEach(function (k) { out[k] = interpolateDeep(input[k]); });
      return out;
    }
    return input;
  }

  function setVar(name, value) {
    state.vars[name] = value;
    localStorage.setItem(STORAGE.vars, JSON.stringify(state.vars));
    log("Variabel {{" + name + "}} = " + value);
  }

  function loadVars() {
    state.vars = safeJsonParse(localStorage.getItem(STORAGE.vars), {}) || {};
  }

  /**
   * Menyiapkan variabel untuk satu run.
   *
   * Skenario berantai perlu membaca hasil skenario sebelumnya, misalnya slug
   * showroom yang baru didaftarkan. Bila JSON menyetel `warisi_variabel: true`,
   * variabel run terakhir dipertahankan dan hanya ditimpa oleh seed sendiri.
   */
  function resetVars(seed, warisi) {
    var sebelumnya = warisi ? (safeJsonParse(localStorage.getItem(STORAGE.vars), {}) || {}) : {};

    // Urutan prioritas dari terendah: akun bersama, warisan rantai, builtin,
    // lalu variabel milik skenario itu sendiri.
    state.vars = Object.assign({}, state.akun, sebelumnya, builtinVars(), seed || {});

    // Nilai bawaan seperti timestamp harus selalu segar, tetapi variabel hasil
    // tangkapan run sebelumnya tidak boleh tertimpa builtin.
    if (warisi) {
      Object.keys(sebelumnya).forEach(function (k) {
        if (! Object.prototype.hasOwnProperty.call(builtinVars(), k)
          && ! Object.prototype.hasOwnProperty.call(seed || {}, k)) {
          state.vars[k] = sebelumnya[k];
        }
      });
    }

    localStorage.setItem(STORAGE.vars, JSON.stringify(state.vars));

    if (warisi && Object.keys(sebelumnya).length) {
      log("Mewarisi " + Object.keys(sebelumnya).length + " variabel dari run sebelumnya.");
    }
  }

  function lupakanVariabel() {
    localStorage.removeItem(STORAGE.vars);
    state.vars = {};
    log("Variabel rantai dikosongkan.");
  }

  /* =================== routing (hash-aware) =================== */

  function normalizeRoute(route) {
    var text = String(route || "").trim();
    text = text.replace(/^https?:\/\/[^/]+/i, "");
    text = text.replace(/^\/+/, "");
    text = text.replace(/^#/, "");
    text = text.replace(/^\/+/, "");
    text = text.split("?")[0];
    return "/" + text.replace(/\/+$/, "").replace(/^\/+/, "");
  }

  function currentRoute() {
    var hash = String(location.hash || "");
    if (hash) return normalizeRoute(hash);
    return normalizeRoute(location.pathname);
  }

  function routeMatches(target) {
    var now = currentRoute();
    var want = normalizeRoute(target);
    if (want === "/") return now === "/";
    // Cocok persis, atau cocok sebagai prefix segmen penuh.
    return now === want || now.indexOf(want + "/") === 0;
  }

  function halamanList(data) {
    var halaman = data && data.halaman;
    if (Array.isArray(halaman)) return halaman.filter(Boolean);
    if (typeof halaman === "string" && halaman) return [halaman];
    return [];
  }

  function routeUrl(route) {
    return baseUrl() + "#" + normalizeRoute(route);
  }

  /**
   * Navigasi dalam SPA cukup mengganti hash. Halaman tidak reload, jadi
   * runner tetap hidup dan tidak perlu state di localStorage.
   */
  async function pastikanHalaman(route, paksaSegar) {
    if (!route) return true;

    // SPA menyimpan state komponen halaman di memori. Mengeset hash ke route
    // yang sama tidak melakukan apa-apa, sehingga sisa state dari run
    // sebelumnya (panel sukses, pesan error) ikut terbawa. Pantulkan lewat
    // route netral supaya router membuang dan membangun ulang halamannya.
    if (routeMatches(route)) {
      if (!paksaSegar) return true;

      log("Menyegarkan halaman lewat pantulan route.");
      location.hash = "/";
      await sleep(CONFIG.jeda_ms);
    }

    // Query dipertahankan apa adanya; hanya pembandingan route yang
    // mengabaikannya. Tanpa ini, "#/auth?role=seller" kehilangan rolenya.
    var tujuan = String(route).replace(/^#/, "");
    if (tujuan.charAt(0) !== "/") {
      tujuan = "/" + tujuan;
    }

    log("Navigasi ke " + tujuan);
    location.hash = tujuan;

    var deadline = Date.now() + CONFIG.timeout_ms;
    while (Date.now() < deadline) {
      await sleep(CONFIG.poll_ms);
      if (routeMatches(route)) {
        // Beri SPA waktu merender setelah route berubah.
        await sleep(CONFIG.jeda_ms);
        return true;
      }
    }

    return false;
  }

  /* =================== perekam endpoint =================== */

  function trimText(text, limit) {
    text = String(text === undefined || text === null ? "" : text);
    limit = limit || CONFIG.endpoint_response_limit;
    return text.length > limit ? text.substring(0, limit) + "...[dipotong]" : text;
  }

  function isTesterEndpoint(urlText) {
    var s = String(urlText || "");
    return s.indexOf(CONFIG.folder) > -1 || s.indexOf("uji_otomatis_browser.js") > -1;
  }

  function endpointReason(status, parsed, text) {
    if (status === 0) return "REQUEST_GAGAL";
    if (status < 200 || status >= 300) return "HTTP_" + status;
    if (parsed && parsed.success === false) return "JSON_SUCCESS_FALSE";
    if (parsed && parsed.status === false) return "JSON_STATUS_FALSE";
    if (parsed && parsed.error) return "JSON_ERROR";
    if (/fatal error|uncaught exception|stack trace/i.test(String(text || ""))) return "PHP_FATAL";
    return "";
  }

  function getEndpointLogs() {
    var logs = safeJsonParse(localStorage.getItem(STORAGE.endpoint), []);
    return Array.isArray(logs) ? logs : [];
  }

  function clearEndpointLogs() {
    localStorage.removeItem(STORAGE.endpoint);
  }

  function appendEndpointLog(entry) {
    if (!entry || isTesterEndpoint(entry.url)) return;
    entry.route = currentRoute();
    entry.file = state.fileName || "";
    entry.step = state.currentStep || null;

    var logs = getEndpointLogs();
    logs.push(entry);
    if (logs.length > CONFIG.endpoint_log_limit) {
      logs = logs.slice(logs.length - CONFIG.endpoint_log_limit);
    }
    localStorage.setItem(STORAGE.endpoint, JSON.stringify(logs));

    if (entry.reason) {
      log("[endpoint] " + entry.method + " " + entry.url + " -> " + entry.reason, "warn");
    }
  }

  function endpointDikecualikan(entry) {
    return (CONFIG.endpoint_abaikan || []).some(function (aturan) {
      if (String(entry.url || "").indexOf(aturan.url) === -1) {
        return false;
      }

      return ! aturan.status || aturan.status.indexOf(Number(entry.status)) > -1;
    });
  }

  function endpointErrors(logs) {
    return (logs || getEndpointLogs()).filter(function (e) {
      return !!(e && e.reason) && ! endpointDikecualikan(e);
    });
  }

  function installEndpointRecorder() {
    if (window.__pbt_recorder) return;
    window.__pbt_recorder = true;

    if (window.fetch) {
      var origFetch = window.fetch;
      window.__pbt_original_fetch = origFetch;
      window.fetch = function (input, init) {
        var started = Date.now();
        var reqUrl = typeof input === "string" ? input : (input && input.url) || String(input || "");
        var method = (init && init.method) || (input && input.method) || "GET";
        method = String(method).toUpperCase();

        return origFetch.apply(this, arguments).then(function (response) {
          var ct = (response.headers && response.headers.get && response.headers.get("content-type")) || "";
          response.clone().text().then(function (text) {
            var parsed = /json/i.test(ct) ? safeJsonParse(text, null) : null;
            appendEndpointLog({
              waktu: new Date().toISOString(),
              transport: "fetch",
              method: method,
              url: reqUrl,
              status: response.status,
              durasi_ms: Date.now() - started,
              respons: trimText(text),
              reason: endpointReason(response.status, parsed, text)
            });
          }).catch(function () { /* body tidak terbaca, abaikan */ });
          return response;
        }).catch(function (err) {
          appendEndpointLog({
            waktu: new Date().toISOString(),
            transport: "fetch",
            method: method,
            url: reqUrl,
            status: 0,
            durasi_ms: Date.now() - started,
            respons: err && err.message ? err.message : String(err),
            reason: "REQUEST_GAGAL"
          });
          throw err;
        });
      };
    }

    if (window.XMLHttpRequest) {
      var OriginalXHR = window.XMLHttpRequest;
      window.__pbt_original_xhr = OriginalXHR;
      function PatchedXHR() {
        var xhr = new OriginalXHR();
        var meta = { method: "GET", url: "", started: 0 };
        var originalOpen = xhr.open;
        var originalSend = xhr.send;

        xhr.open = function (method, reqUrl) {
          meta.method = String(method || "GET").toUpperCase();
          meta.url = String(reqUrl || "");
          return originalOpen.apply(xhr, arguments);
        };

        xhr.send = function () {
          meta.started = Date.now();
          xhr.addEventListener("loadend", function () {
            var ct = "";
            var text = "";
            try { ct = xhr.getResponseHeader("content-type") || ""; } catch (e) { ct = ""; }
            try {
              if (xhr.responseType === "" || xhr.responseType === "text") text = xhr.responseText || "";
            } catch (e2) { text = ""; }
            var parsed = /json/i.test(ct) ? safeJsonParse(text, null) : null;
            appendEndpointLog({
              waktu: new Date().toISOString(),
              transport: "xhr",
              method: meta.method,
              url: meta.url,
              status: xhr.status,
              durasi_ms: Date.now() - meta.started,
              respons: trimText(text),
              reason: endpointReason(xhr.status, parsed, text)
            });
          });
          return originalSend.apply(xhr, arguments);
        };

        return xhr;
      }
      PatchedXHR.prototype = OriginalXHR.prototype;
      ["UNSENT", "OPENED", "HEADERS_RECEIVED", "LOADING", "DONE"].forEach(function (k, i) {
        PatchedXHR[k] = i;
      });
      window.XMLHttpRequest = PatchedXHR;
    }

    log("Perekam endpoint aktif.");
  }

  /* =================== resolusi elemen =================== */

  function selectorStep(step) {
    if (step.selector) return step.selector;
    if (step.id) return "#" + CSS.escape(step.id);

    var pola = String(step.pola_id || "");
    if (!pola) return null;

    var cut = pola.indexOf("<");
    if (cut > 0) return '[id^="' + pola.substring(0, cut) + '"]';
    return "#" + CSS.escape(pola);
  }

  function isVisible(el) {
    if (!el) return false;
    var type = el.type ? String(el.type).toLowerCase() : "";
    if (type === "hidden") return true;
    if (el.tagName === "OPTION") return true;

    var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (style && (style.display === "none" || style.visibility === "hidden")) return false;

    // Tab yang tidak aktif berhenti meng-komposit frame, sehingga semua elemen
    // melaporkan offset 0 dan nol client rect. Di kondisi itu geometri tidak
    // bisa dipercaya, jadi cukup andalkan computed style.
    if (document.hidden) return true;

    return !!(el.offsetWidth || el.offsetHeight || (el.getClientRects && el.getClientRects().length));
  }

  /**
   * Selalu query ulang. Di SPA, referensi elemen lama bisa sudah lepas dari
   * DOM setelah re-render; mengklik node yatim tidak melakukan apa pun.
   */
  function queryNow(step) {
    var sel = selectorStep(step);
    if (!sel) return [];
    var els = Array.prototype.slice.call(document.querySelectorAll(sel));

    if (step.indeks !== undefined && step.indeks !== null) {
      var idx = Number(step.indeks);
      return els[idx] ? [els[idx]] : [];
    }

    if (step.berisi_teks) {
      var needle = String(interpolate(step.berisi_teks)).toLowerCase();
      var cocok = els.filter(function (el) {
        return (el.textContent || "").toLowerCase().indexOf(needle) > -1;
      });
      if (cocok.length) return cocok;
    }

    return els;
  }

  async function tungguTarget(step, timeout) {
    var deadline = Date.now() + (timeout || CONFIG.timeout_ms);
    var butuhVisible = step.jenis !== "input-hidden" && step.abaikan_visible !== true;

    while (Date.now() < deadline) {
      await tungguPause();
      if (state.stop) break;

      var els = queryNow(step);
      if (els.length) {
        var siap = butuhVisible ? els.filter(isVisible) : els;
        if (siap.length) return siap;
      }

      await sleep(CONFIG.poll_ms);
    }

    return [];
  }

  /* =================== aksi =================== */

  function setVal(el, val) {
    var proto = el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    var setter = Object.getOwnPropertyDescriptor(proto, "value");

    // Setter native dipakai supaya framework yang melacak nilai ikut sadar.
    if (setter && setter.set && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) {
      setter.set.call(el, val);
    } else {
      el.value = val;
    }

    ["input", "change", "keyup", "blur"].forEach(function (ev) {
      el.dispatchEvent(new Event(ev, { bubbles: true }));
    });
  }

  function pilihSelect(el, nilai) {
    var opsi = Array.prototype.slice.call(el.options || []);
    var target = null;

    if (nilai !== undefined && nilai !== null && nilai !== "") {
      var wanted = String(nilai);
      target = opsi.find(function (o) { return o.value === wanted; })
        || opsi.find(function (o) { return (o.textContent || "").trim() === wanted; })
        || opsi.find(function (o) { return (o.textContent || "").toLowerCase().indexOf(wanted.toLowerCase()) > -1; });

      if (!target) {
        throw new Error("opsi '" + wanted + "' tidak ada di select (tersedia: "
          + opsi.map(function (o) { return o.value || (o.textContent || "").trim(); }).slice(0, 8).join(", ") + ")");
      }
    } else {
      target = opsi.find(function (o) {
        var t = (o.textContent || "").trim();
        return !o.disabled && o.value !== "" && !/^[-\s]*(pilih|select|--|semua|all)/i.test(t);
      });
      if (!target) throw new Error("tidak ada opsi yang bisa dipilih");
    }

    el.value = target.value;
    ["input", "change"].forEach(function (ev) {
      el.dispatchEvent(new Event(ev, { bubbles: true }));
    });

    return target.value || (target.textContent || "").trim();
  }

  function setChecked(el, checked) {
    if (el.checked !== checked) el.click();
    if (el.checked !== checked) {
      el.checked = checked;
      ["input", "change"].forEach(function (ev) {
        el.dispatchEvent(new Event(ev, { bubbles: true }));
      });
    }
  }

  async function jalankanAksi(step) {
    var aksi = String(step.aksi || "").toLowerCase();
    var jenis = String(step.jenis || "").toLowerCase();

    // Query ulang persis sebelum bertindak.
    var els = queryNow(step).filter(function (el) {
      return step.jenis === "input-hidden" || step.abaikan_visible === true || isVisible(el);
    });

    if (!els.length) throw new Error("elemen hilang sebelum aksi dijalankan (kemungkinan re-render)");
    var el = els[0];

    if (aksi === "verifikasi" || aksi === "verifikasi_atau_ubah") {
      return { catatan: "verifikasi elemen ada", el: el, els: els };
    }

    if (aksi === "klik" || aksi === "klik_opsional" || /^(button|link|tab)/.test(jenis)) {
      if (el.disabled) throw new Error("tombol dalam keadaan disabled");
      el.scrollIntoView({ block: "center" });
      el.click();
      return { catatan: "klik", el: el, els: els };
    }

    if (jenis === "select") {
      if (el.disabled) throw new Error("select dalam keadaan disabled");
      var dipilih = pilihSelect(el, step.nilai);
      return { catatan: "pilih '" + dipilih + "'", el: el, els: els };
    }

    if (jenis === "radio" || jenis === "checkbox") {
      var nyala = step.nilai === undefined ? true : !/^(0|false|tidak|no)$/i.test(String(step.nilai));
      setChecked(el, nyala);
      return { catatan: (nyala ? "dicentang" : "dilepas"), el: el, els: els };
    }

    if (aksi === "isi" || /^input|^textarea/.test(jenis)) {
      if (el.disabled) throw new Error("input dalam keadaan disabled");
      if (el.readOnly) throw new Error("input readonly, tidak bisa diisi");
      if (jenis === "input-file") {
        throw new Error("input file tidak bisa diisi otomatis dari console");
      }
      if (step.nilai === undefined || step.nilai === null) {
        throw new Error("langkah 'isi' wajib punya field nilai (mode nilai eksplisit)");
      }
      setVal(el, String(step.nilai));
      return { catatan: "isi '" + step.nilai + "'", el: el, els: els };
    }

    if (jenis === "table" || jenis === "container") {
      return { catatan: "verifikasi container", el: el, els: els };
    }

    el.click();
    return { catatan: "klik (fallback)", el: el, els: els };
  }

  /* =================== tunggu deklaratif =================== */

  async function jalankanTunggu(tunggu) {
    if (!tunggu) return;

    var timeout = Number(tunggu.timeout_ms || CONFIG.timeout_ms);
    var deadline = Date.now() + timeout;

    if (tunggu.ms) {
      await sleep(Number(tunggu.ms));
      return;
    }

    while (Date.now() < deadline) {
      await tungguPause();
      if (state.stop) return;

      if (tunggu.elemen && document.querySelector(tunggu.elemen)) return;
      if (tunggu.hilang && !document.querySelector(tunggu.hilang)) return;
      if (tunggu.teks && (document.body.innerText || "").indexOf(tunggu.teks) > -1) return;
      if (tunggu.route && routeMatches(tunggu.route)) return;

      await sleep(CONFIG.poll_ms);
    }

    var apa = tunggu.elemen || tunggu.hilang || tunggu.teks || tunggu.route;
    throw new Error("timeout menunggu: " + JSON.stringify(apa));
  }

  /* =================== assertion =================== */

  function teksDari(el, scope) {
    if (scope === "halaman" || !el) return document.body.innerText || "";
    return el.innerText || el.textContent || "";
  }

  function periksaHarapan(step, hasilAksi) {
    var harapan = step.harapan;
    if (!harapan) return [];

    var gagal = [];
    var el = hasilAksi && hasilAksi.el;
    var scope = harapan.lingkup || "elemen";

    if (harapan.elemen_ada && !document.querySelector(harapan.elemen_ada)) {
      gagal.push("elemen_ada gagal: '" + harapan.elemen_ada + "' tidak ditemukan");
    }

    if (harapan.elemen_tidak_ada && document.querySelector(harapan.elemen_tidak_ada)) {
      gagal.push("elemen_tidak_ada gagal: '" + harapan.elemen_tidak_ada + "' masih ada");
    }

    if (harapan.teks_mengandung) {
      var teks = teksDari(el, scope);
      if (teks.indexOf(harapan.teks_mengandung) === -1) {
        gagal.push("teks_mengandung gagal: '" + harapan.teks_mengandung + "' tidak ada dalam "
          + (scope === "halaman" ? "halaman" : "elemen"));
      }
    }

    if (harapan.teks_tidak_mengandung) {
      var teks2 = teksDari(el, scope);
      if (teks2.indexOf(harapan.teks_tidak_mengandung) > -1) {
        gagal.push("teks_tidak_mengandung gagal: '" + harapan.teks_tidak_mengandung + "' ternyata ada");
      }
    }

    if (harapan.nilai_sama !== undefined) {
      var aktual = el ? String(el.value === undefined ? "" : el.value) : "";
      if (aktual !== String(harapan.nilai_sama)) {
        gagal.push("nilai_sama gagal: harapan '" + harapan.nilai_sama + "', aktual '" + aktual + "'");
      }
    }

    if (harapan.disabled !== undefined) {
      var aktualDisabled = !!(el && el.disabled);
      if (aktualDisabled !== !!harapan.disabled) {
        gagal.push("disabled gagal: harapan " + harapan.disabled + ", aktual " + aktualDisabled);
      }
    }

    if (harapan.jumlah_baris_minimal !== undefined) {
      var tbody = el ? (el.querySelector("tbody") || el) : null;
      var baris = tbody ? tbody.children.length : 0;
      if (baris < Number(harapan.jumlah_baris_minimal)) {
        gagal.push("jumlah_baris_minimal gagal: harapan >= " + harapan.jumlah_baris_minimal + ", aktual " + baris);
      }
    }

    if (harapan.jumlah_elemen !== undefined) {
      var jml = hasilAksi && hasilAksi.els ? hasilAksi.els.length : 0;
      if (jml !== Number(harapan.jumlah_elemen)) {
        gagal.push("jumlah_elemen gagal: harapan " + harapan.jumlah_elemen + ", aktual " + jml);
      }
    }

    if (harapan.route_sama) {
      if (!routeMatches(harapan.route_sama)) {
        gagal.push("route_sama gagal: harapan '" + normalizeRoute(harapan.route_sama) + "', aktual '" + currentRoute() + "'");
      }
    }

    return gagal;
  }

  /* =================== penangkapan variabel =================== */

  function tangkapVariabel(step, hasilAksi) {
    var simpan = step.simpan;
    if (!simpan) return;

    var daftar = Array.isArray(simpan) ? simpan : [simpan];

    daftar.forEach(function (item) {
      var el = item.selector ? document.querySelector(item.selector) : (hasilAksi && hasilAksi.el);
      if (!el) {
        log("Gagal menyimpan {{" + item.nama + "}}: elemen tidak ditemukan.", "warn");
        return;
      }

      var nilai = "";
      var dari = String(item.dari || "teks");

      if (dari === "nilai") {
        nilai = el.value === undefined ? "" : String(el.value);
      } else if (dari === "atribut") {
        nilai = el.getAttribute(item.atribut || "id") || "";
      } else if (dari === "id_sufiks") {
        // Ambil bagian akhir id, contoh: slrc_edit_car_button_42 -> 42
        var id = el.id || "";
        var awalan = String(item.awalan || "");
        nilai = awalan && id.indexOf(awalan) === 0 ? id.substring(awalan.length) : id.split("_").pop();
      } else {
        nilai = (el.innerText || el.textContent || "").trim();
      }

      if (item.regex) {
        var m = new RegExp(item.regex).exec(nilai);
        nilai = m ? (m[1] !== undefined ? m[1] : m[0]) : "";
      }

      setVar(item.nama, nilai);
    });
  }

  /* =================== eksekusi langkah =================== */

  async function prosesLangkah(rawStep) {
    var step = interpolateDeep(rawStep);
    var id = step.id || step.pola_id || step.selector || "";
    var label = "[" + (step.urutan || "?") + "] " + (step.nama || id);

    state.currentStep = {
      urutan: step.urutan || null,
      id: id,
      jenis: step.jenis || "",
      aksi: step.aksi || "",
      nama: step.nama || ""
    };

    var mulai = Date.now();
    var endpointAwal = getEndpointLogs().length;
    var opsional = String(step.aksi || "").indexOf("opsional") > -1 || step.opsional === true;

    log("→ " + label);

    function hasil(status, pesan, detail) {
      return {
        urutan: step.urutan || null,
        nama: step.nama || "",
        id: id,
        jenis: step.jenis || "",
        aksi: step.aksi || "",
        status: status,
        pesan: pesan || "",
        detail: detail || null,
        route: currentRoute(),
        durasi_ms: Date.now() - mulai
      };
    }

    // 1. Pindah halaman bila perlu
    if (step.halaman) {
      var sampai = await pastikanHalaman(step.halaman);
      if (!sampai) {
        var pesanNav = "gagal navigasi ke " + normalizeRoute(step.halaman) + " (sekarang di " + currentRoute() + ")";
        floatMsg(label + " → " + pesanNav);
        log("✗ " + label + " → " + pesanNav, "error");
        return hasil("GAGAL", pesanNav);
      }
    }

    // 2. Langkah assert murni tidak punya target; langsung ke harapan.
    //    Dibutuhkan untuk assertion negatif seperti elemen_tidak_ada, yang
    //    mustahil dijalankan kalau runner menuntut elemennya ada lebih dulu.
    if (String(step.aksi || "").toLowerCase() === "assert" || !selectorStep(step)) {
      try {
        await jalankanTunggu(step.tunggu);
      } catch (eT) {
        var pesanT = eT && eT.message ? eT.message : String(eT);
        floatMsg(label + " → " + pesanT);
        log("✗ " + label + " → " + pesanT, "error");
        return hasil("GAGAL", pesanT);
      }

      var gagalAssert = periksaHarapan(step, null);
      if (gagalAssert.length) {
        gagalAssert.forEach(function (g) { floatMsg(label + " → " + g); });
        log("✗ " + label + " → " + gagalAssert.join(" | "), "error");
        return hasil("GAGAL", gagalAssert.join(" | "), { harapan: gagalAssert });
      }

      log("✓ " + label + " (assert)");
      return hasil("LULUS", "assert");
    }

    // 3. Tunggu elemen muncul
    var els = await tungguTarget(step, step.timeout_ms);
    if (!els.length) {
      var pesanHilang = "elemen tidak ditemukan: " + (selectorStep(step) || "(tanpa selector)");
      if (opsional) {
        log("○ dilewati (opsional): " + label);
        return hasil("DILEWATI", pesanHilang);
      }
      floatMsg(label + " → " + pesanHilang);
      log("✗ " + label + " → " + pesanHilang, "error");
      return hasil("GAGAL", pesanHilang);
    }

    // 4. Jalankan aksi (siapkan dulu jawaban dialog native bila langkah ini
    // memicu window.prompt()/window.confirm(), misalnya tombol Retur/Batalkan)
    if (step.dialog_jawaban) {
      primeDialogs(step.dialog_jawaban);
    }
    var hasilAksi = null;
    try {
      hasilAksi = await jalankanAksi(step);
    } catch (e) {
      var pesanAksi = e && e.message ? e.message : String(e);
      if (opsional) {
        log("○ dilewati (opsional): " + label + " → " + pesanAksi);
        return hasil("DILEWATI", pesanAksi);
      }
      floatMsg(label + " → " + pesanAksi);
      log("✗ " + label + " → " + pesanAksi, "error");
      return hasil("GAGAL", pesanAksi);
    }

    // 5. Tunggu kondisi setelah aksi
    try {
      await jalankanTunggu(step.tunggu);
    } catch (e2) {
      var pesanTunggu = e2 && e2.message ? e2.message : String(e2);
      floatMsg(label + " → " + pesanTunggu);
      log("✗ " + label + " → " + pesanTunggu, "error");
      return hasil("GAGAL", pesanTunggu);
    }

    if (!step.tunggu) await sleep(CONFIG.jeda_ms);

    // 6. Assertion
    var gagalHarapan = periksaHarapan(step, hasilAksi);
    if (gagalHarapan.length) {
      gagalHarapan.forEach(function (g) { floatMsg(label + " → " + g); });
      log("✗ " + label + " → " + gagalHarapan.join(" | "), "error");
      return hasil("GAGAL", gagalHarapan.join(" | "), { harapan: gagalHarapan });
    }

    // 7. Error endpoint selama langkah ini
    var endpointBaru = getEndpointLogs().slice(endpointAwal);
    var errorBaru = endpointErrors(endpointBaru);
    if (errorBaru.length && CONFIG.endpoint_gagalkan_langkah && step.abaikan_error_endpoint !== true) {
      var ringkas = errorBaru.map(function (e) { return e.method + " " + e.url + " -> " + e.reason; }).join(" | ");
      floatMsg(label + " → error endpoint: " + ringkas);
      log("✗ " + label + " → error endpoint: " + ringkas, "error");
      return hasil("GAGAL", "error endpoint: " + ringkas, { endpoint_errors: errorBaru });
    }

    // 8. Simpan variabel
    try {
      tangkapVariabel(step, hasilAksi);
    } catch (e3) {
      log("Gagal menyimpan variabel: " + (e3 && e3.message), "warn");
    }

    log("✓ " + label + (hasilAksi.catatan ? " (" + hasilAksi.catatan + ")" : ""));
    return hasil("LULUS", hasilAksi.catatan);
  }

  /* =================== runner =================== */

  async function jalankan() {
    if (state.running) return;
    if (!state.data) {
      setStatus("Pilih file JSON dulu.");
      return;
    }

    state.running = true;
    state.stop = false;
    state.paused = false;
    state.hasil = [];
    resetVars(state.data.variabel, state.data.warisi_variabel === true);
    clearEndpointLogs();
    setRunningUI();

    log("===== MULAI: " + (state.data.nama_fitur || state.fileName) + " =====");
    setStatus("Menguji: " + state.fileName);

    var halamanAwal = halamanList(state.data)[0];
    if (halamanAwal) {
      // Selalu paksa segar di awal run, kecuali JSON meminta sebaliknya.
      var paksa = state.data.mulai_dari_halaman_segar !== false;
      var ok = await pastikanHalaman(halamanAwal, paksa);
      if (!ok) log("Peringatan: gagal membuka halaman awal " + halamanAwal, "warn");
    }

    var steps = (state.data.urutan_uji || []).slice().sort(function (a, b) {
      return (a.urutan || 0) - (b.urutan || 0);
    });

    var lulus = 0, gagal = 0, dilewati = 0;

    for (var i = 0; i < steps.length; i++) {
      await tungguPause();
      if (state.stop) break;

      var r = await prosesLangkah(steps[i]);
      state.hasil.push(r);

      if (r.status === "LULUS") lulus++;
      else if (r.status === "DILEWATI") dilewati++;
      else gagal++;

      setStatus("Langkah " + (i + 1) + "/" + steps.length + "  ✓" + lulus + " ✗" + gagal + " ○" + dilewati);

      if (gagal > 0 && state.data.berhenti_saat_gagal === true) {
        log("Berhenti karena berhenti_saat_gagal = true.", "warn");
        break;
      }
    }

    var ringkasan = {
      file: state.fileName,
      fitur: state.data.nama_fitur || "",
      selesai_pada: new Date().toISOString(),
      total: steps.length,
      lulus: lulus,
      gagal: gagal,
      dilewati: dilewati,
      dihentikan: state.stop,
      langkah: state.hasil,
      variabel: state.vars,
      endpoint_errors: endpointErrors()
    };
    localStorage.setItem(STORAGE.report, JSON.stringify(ringkasan));

    log("===== SELESAI: ✓" + lulus + " ✗" + gagal + " ○" + dilewati + " =====",
      gagal > 0 ? "error" : "ok");
    setStatus((gagal > 0 ? "GAGAL" : "LULUS") + " ✓" + lulus + " ✗" + gagal + " ○" + dilewati);

    state.currentStep = null;
    state.running = false;
    setRunningUI();

    return ringkasan;
  }

  /* =================== jalankan berantai =================== */

  /**
   * Menjalankan seluruh skenario berurutan sesuai index.json.
   *
   * Tidak perlu resume lewat localStorage seperti runner aplikasi multi-halaman:
   * projectB adalah SPA, navigasinya hanya mengganti hash, jadi runner tetap
   * hidup dari awal sampai akhir antrean.
   */
  async function jalankanSemua(daftar) {
    if (state.running || state.batchRunning) return;

    var antrean = (daftar || state.fileList).filter(function (n) { return /\.json$/i.test(n); });
    if (! antrean.length) {
      setStatus("Tidak ada skenario untuk dijalankan.");
      return;
    }

    state.batchRunning = true;
    state.batchStop = false;
    lupakanVariabel();
    setBatchUI();

    log("===== RANTAI DIMULAI: " + antrean.length + " skenario =====");
    var rekap = [];

    for (var i = 0; i < antrean.length; i++) {
      if (state.batchStop) {
        log("Rantai dihentikan pengguna.", "warn");
        break;
      }

      var berkas = antrean[i];
      setStatus("Rantai " + (i + 1) + "/" + antrean.length + ": " + berkas);
      log("--- [" + (i + 1) + "/" + antrean.length + "] " + berkas + " ---");

      var termuat = await muatFile(berkas);
      if (! termuat) {
        rekap.push({ file: berkas, status: "GAGAL_MUAT", lulus: 0, gagal: 0 });
        continue;
      }

      var hasil = await jalankan();
      rekap.push({
        file: berkas,
        status: hasil && hasil.gagal === 0 ? "LULUS" : "GAGAL",
        lulus: hasil ? hasil.lulus : 0,
        gagal: hasil ? hasil.gagal : 0,
        dilewati: hasil ? hasil.dilewati : 0
      });

      // Skenario berikutnya mewarisi variabel bila JSON-nya meminta, jadi
      // jangan bersihkan apa pun di sini.
      await sleep(CONFIG.jeda_ms);
    }

    var totalGagal = rekap.reduce(function (s, r) { return s + (r.gagal || 0); }, 0);
    var skenarioGagal = rekap.filter(function (r) { return r.status !== "LULUS"; }).length;

    localStorage.setItem(STORAGE.report, JSON.stringify({
      tipe: "rantai",
      selesai_pada: new Date().toISOString(),
      jumlah_skenario: rekap.length,
      skenario_gagal: skenarioGagal,
      total_langkah_gagal: totalGagal,
      rekap: rekap,
      variabel_akhir: state.vars
    }));

    log("===== RANTAI SELESAI: " + (rekap.length - skenarioGagal) + "/" + rekap.length
      + " skenario lulus, " + totalGagal + " langkah gagal =====",
      skenarioGagal > 0 ? "error" : "ok");
    rekap.forEach(function (r) {
      log("  " + (r.status === "LULUS" ? "✓" : "✗") + " " + r.file
        + "  ✓" + r.lulus + " ✗" + r.gagal, r.status === "LULUS" ? "ok" : "error");
    });

    setStatus("Rantai selesai: " + (rekap.length - skenarioGagal) + "/" + rekap.length + " skenario lulus");
    state.batchRunning = false;
    setBatchUI();
  }

  function setBatchUI() {
    if (!ui.semuaBtn) return;
    ui.semuaBtn.disabled = state.running || state.batchRunning;
    ui.semuaStopBtn.disabled = ! state.batchRunning;
    ui.playBtn.disabled = state.running || state.batchRunning;
  }

  function unduhLaporan() {
    var raw = localStorage.getItem(STORAGE.report);
    if (!raw) {
      setStatus("Belum ada laporan.");
      return;
    }
    var blob = new Blob([raw], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "laporan-uji-" + Date.now() + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
    log("Laporan diunduh.");
  }

  /* =================== muat file =================== */

  /**
   * Memuat akun bersama dari akun.json. Semua skenario otomatis mendapat
   * variabel ini tanpa perlu mendeklarasikan ulang, sehingga kredensial hanya
   * ditulis di satu tempat.
   */
  async function muatAkun() {
    try {
      var r = await fetch(baseUrl() + CONFIG.akunUrl, { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      var data = await r.json();
      state.akun = (data && data.variabel) || {};
      // Tersedia langsung, bukan hanya saat run dimulai, supaya bisa diperiksa
      // lewat PBT.vars() sebelum menjalankan skenario apa pun.
      state.vars = Object.assign({}, state.akun, state.vars);
      var jml = Object.keys(state.akun).length;
      log("Akun bersama dimuat: " + jml + " variabel dari akun.json");
      return jml;
    } catch (e) {
      state.akun = {};
      log("akun.json tidak terbaca. Skenario harus mendeklarasikan kredensialnya sendiri. " + e.message, "warn");
      return 0;
    }
  }

  async function scanFiles() {
    try {
      var r = await fetch(baseUrl() + CONFIG.daftarUrl, { cache: "no-store" });
      if (r.ok) {
        var j = await r.json();
        if (Array.isArray(j)) return j.filter(function (n) { return /\.json$/i.test(n); });
        if (j && Array.isArray(j.files)) return j.files.filter(function (n) { return /\.json$/i.test(n); });
      }
    } catch (e) { /* lanjut */ }
    return [];
  }

  async function muatFile(name) {
    try {
      var r = await fetch(baseUrl() + CONFIG.folder + name, { cache: "no-store" });
      if (!r.ok) throw new Error("HTTP " + r.status);
      var data = await r.json();
      state.data = data;
      state.fileName = name;
      var jml = (data.urutan_uji && data.urutan_uji.length) || 0;
      log("Dimuat: " + name + " | " + (data.nama_fitur || "-") + " | " + jml + " langkah");
      setStatus(name + " (" + jml + " langkah). Siap.");
      return true;
    } catch (e) {
      log("Gagal membaca " + name + " → " + e.message, "error");
      setStatus("Gagal membaca " + name);
      return false;
    }
  }

  function muatDariTeks(txt) {
    var data = safeJsonParse(txt, null);
    if (!data || !Array.isArray(data.urutan_uji)) {
      setStatus("JSON tidak valid atau tidak punya urutan_uji.");
      return false;
    }
    state.data = data;
    state.fileName = data.nama_fitur || "(tempel manual)";
    log("Dimuat dari tempelan: " + state.fileName + " | " + data.urutan_uji.length + " langkah");
    setStatus(state.fileName + " (" + data.urutan_uji.length + " langkah). Siap.");
    return true;
  }

  /* =================== notifikasi mengambang =================== */

  var floatBox = null;

  function floatMsg(text) {
    if (!floatBox) {
      floatBox = document.createElement("div");
      floatBox.style.cssText =
        "position:fixed;left:12px;top:12px;z-index:" + CONFIG.zIndex +
        ";display:flex;flex-direction:column;gap:6px;max-width:340px;max-height:80vh;" +
        "overflow-y:auto;pointer-events:none;font:12px Arial,sans-serif;";
      document.body.appendChild(floatBox);
    }
    var el = document.createElement("div");
    el.style.cssText =
      "background:#c0392b;color:#fff;padding:8px 12px;border-radius:4px;" +
      "box-shadow:0 2px 10px rgba(0,0,0,.35);white-space:pre-wrap;";
    el.textContent = text;
    floatBox.appendChild(el);
  }

  /* =================== panel =================== */

  var ui = {};

  function appendLog(msg, level) {
    if (!ui.logEl) return;
    var line = document.createElement("div");
    if (level === "error") line.style.color = "#fca5a5";
    else if (level === "warn") line.style.color = "#fcd34d";
    else if (level === "ok") line.style.color = "#86efac";
    line.textContent = msg;
    ui.logEl.appendChild(line);
    ui.logEl.scrollTop = ui.logEl.scrollHeight;
  }

  function setStatus(txt) {
    if (ui.statusEl) ui.statusEl.textContent = "Status: " + txt;
  }

  function setRunningUI() {
    if (!ui.playBtn) return;
    ui.playBtn.disabled = state.running;
    ui.pauseBtn.disabled = !state.running;
    ui.stopBtn.disabled = !state.running;
    ui.pauseBtn.textContent = state.paused ? "▶ Lanjut" : "⏸ Jeda";
    setBatchUI();
  }

  function cssText() {
    return [
      "#pbt-panel{position:fixed;right:16px;bottom:16px;width:380px;max-height:76vh;z-index:" + CONFIG.zIndex + ";background:#fff;border:1px solid #cbd5e0;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.3);font:13px/1.5 Arial,sans-serif;overflow:hidden;display:flex;flex-direction:column;}",
      "#pbt-panel .pbt-hdr{background:#0f172a;color:#fff;padding:8px 10px;cursor:move;display:flex;justify-content:space-between;align-items:center;user-select:none;}",
      "#pbt-panel .pbt-ico{background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:4px;width:22px;height:22px;cursor:pointer;margin-left:4px;}",
      "#pbt-panel .pbt-body{padding:10px;overflow-y:auto;flex:1;}",
      "#pbt-panel .pbt-row{display:flex;gap:6px;align-items:center;margin-bottom:8px;}",
      "#pbt-panel select,#pbt-panel input,#pbt-panel textarea{flex:1;padding:5px 6px;border:1px solid #cbd5e0;border-radius:4px;font-size:12px;font-family:inherit;}",
      "#pbt-panel textarea{height:60px;font-family:Consolas,monospace;}",
      "#pbt-panel .pbt-btn{border:0;border-radius:6px;padding:7px 10px;cursor:pointer;color:#fff;font-size:12px;flex:1;}",
      "#pbt-panel .pbt-play{background:#16a34a;}",
      "#pbt-panel .pbt-pause{background:#f59e0b;}",
      "#pbt-panel .pbt-stop{background:#dc2626;}",
      "#pbt-panel .pbt-sec{background:#3b82f6;color:#fff;border:0;border-radius:4px;cursor:pointer;padding:5px 9px;font-size:12px;}",
      "#pbt-panel .pbt-btn:disabled{background:#94a3b8;cursor:not-allowed;}",
      "#pbt-panel .pbt-status{background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:5px 8px;margin-bottom:8px;font-size:11px;color:#334155;}",
      "#pbt-panel .pbt-log{background:#0f172a;color:#e2e8f0;border-radius:4px;padding:6px 8px;font:11px/1.5 Consolas,monospace;height:180px;overflow-y:auto;white-space:pre-wrap;word-break:break-word;}"
    ].join("\n");
  }

  function buildPanel() {
    var old = document.getElementById("pbt-panel");
    if (old) old.remove();
    var oldStyle = document.getElementById("pbt-style");
    if (oldStyle) oldStyle.remove();

    var panel = document.createElement("div");
    panel.id = "pbt-panel";
    panel.innerHTML =
      '<div class="pbt-hdr"><b>🧪 projectB Tester</b>' +
      '<span><button class="pbt-ico" id="pbt-min">–</button>' +
      '<button class="pbt-ico" id="pbt-close">×</button></span></div>' +
      '<div class="pbt-body" id="pbt-body">' +
      '  <div class="pbt-row">' +
      '    <select id="pbt-file"><option>– memindai –</option></select>' +
      '    <button id="pbt-rescan" class="pbt-sec">↻</button>' +
      '  </div>' +
      '  <div class="pbt-row"><textarea id="pbt-paste" placeholder="atau tempel JSON di sini…"></textarea></div>' +
      '  <div class="pbt-row"><button id="pbt-load-paste" class="pbt-sec" style="flex:1">Muat dari tempelan</button></div>' +
      '  <div class="pbt-row">' +
      '    <button id="pbt-semua" class="pbt-btn pbt-play" style="background:#4f46e5">⏩ Jalankan Semua</button>' +
      '    <button id="pbt-semua-stop" class="pbt-btn pbt-stop" disabled>⏹ Stop Rantai</button>' +
      '  </div>' +
      '  <div class="pbt-row">' +
      '    <button id="pbt-play" class="pbt-btn pbt-play">▶ Mulai Uji</button>' +
      '    <button id="pbt-pause" class="pbt-btn pbt-pause" disabled>⏸ Jeda</button>' +
      '    <button id="pbt-stop" class="pbt-btn pbt-stop" disabled>⏹ Stop</button>' +
      '  </div>' +
      '  <div class="pbt-row">' +
      '    <button id="pbt-report" class="pbt-sec" style="flex:1">⬇ Laporan</button>' +
      '    <button id="pbt-reset-vars" class="pbt-sec" style="flex:1" title="Kosongkan variabel warisan antar skenario">↺ Reset Rantai</button>' +
      '  </div>' +
      '  <div class="pbt-status" id="pbt-status">Status: siap.</div>' +
      '  <div class="pbt-log" id="pbt-log"></div>' +
      '</div>';

    document.body.appendChild(panel);

    var st = document.createElement("style");
    st.id = "pbt-style";
    st.textContent = cssText();
    document.head.appendChild(st);

    ui.panel = panel;
    ui.bodyEl = panel.querySelector("#pbt-body");
    ui.fileSel = panel.querySelector("#pbt-file");
    ui.pasteEl = panel.querySelector("#pbt-paste");
    ui.semuaBtn = panel.querySelector("#pbt-semua");
    ui.semuaStopBtn = panel.querySelector("#pbt-semua-stop");
    ui.playBtn = panel.querySelector("#pbt-play");
    ui.pauseBtn = panel.querySelector("#pbt-pause");
    ui.stopBtn = panel.querySelector("#pbt-stop");
    ui.statusEl = panel.querySelector("#pbt-status");
    ui.logEl = panel.querySelector("#pbt-log");

    var hdr = panel.querySelector(".pbt-hdr");
    var drag = null;
    hdr.addEventListener("mousedown", function (e) {
      drag = { dx: e.clientX - panel.offsetLeft, dy: e.clientY - panel.offsetTop };
      e.preventDefault();
    });
    document.addEventListener("mousemove", function (e) {
      if (!drag) return;
      panel.style.left = (e.clientX - drag.dx) + "px";
      panel.style.top = (e.clientY - drag.dy) + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });
    document.addEventListener("mouseup", function () { drag = null; });

    panel.querySelector("#pbt-min").addEventListener("click", function () {
      var hide = ui.bodyEl.style.display !== "none";
      ui.bodyEl.style.display = hide ? "none" : "";
      this.textContent = hide ? "+" : "–";
    });
    panel.querySelector("#pbt-close").addEventListener("click", function () {
      panel.remove();
      var s = document.getElementById("pbt-style");
      if (s) s.remove();
    });
    panel.querySelector("#pbt-rescan").addEventListener("click", mulaiScan);
    panel.querySelector("#pbt-load-paste").addEventListener("click", function () {
      muatDariTeks(ui.pasteEl.value);
    });
    panel.querySelector("#pbt-report").addEventListener("click", unduhLaporan);
    panel.querySelector("#pbt-reset-vars").addEventListener("click", function () {
      lupakanVariabel();
      setStatus("Variabel rantai dikosongkan. Mulai lagi dari skenario 01.");
    });

    ui.fileSel.addEventListener("change", function () {
      if (ui.fileSel.value) muatFile(ui.fileSel.value);
    });
    ui.semuaBtn.addEventListener("click", function () { jalankanSemua(state.fileList); });
    ui.semuaStopBtn.addEventListener("click", function () {
      state.batchStop = true;
      state.stop = true;
      log("⏹ stop rantai diminta…", "warn");
    });
    ui.playBtn.addEventListener("click", function () { jalankan(); });
    ui.pauseBtn.addEventListener("click", function () {
      if (!state.running) return;
      state.paused = !state.paused;
      if (!state.paused && state.resumeResolve) {
        var r = state.resumeResolve;
        state.resumeResolve = null;
        r();
      }
      setRunningUI();
      log(state.paused ? "⏸ dijeda" : "▶ dilanjutkan");
    });
    ui.stopBtn.addEventListener("click", function () {
      state.stop = true;
      if (state.resumeResolve) {
        var r2 = state.resumeResolve;
        state.resumeResolve = null;
        r2();
      }
      log("⏹ stop diminta…", "warn");
    });

    setRunningUI();
  }

  async function mulaiScan() {
    setStatus("memindai " + CONFIG.folder + " …");
    var list = await scanFiles();
    state.fileList = list;
    ui.fileSel.innerHTML = "";

    if (!list.length) {
      ui.fileSel.options.add(new Option("(tidak ada, pakai tempelan)", ""));
      setStatus("Tidak ada JSON ditemukan. Gunakan kotak tempelan.");
      return;
    }

    list.forEach(function (n) { ui.fileSel.options.add(new Option(n, n)); });
    setStatus("Ditemukan " + list.length + " file.");
    if (ui.fileSel.value) muatFile(ui.fileSel.value);
  }

  /* =================== dialog native (prompt/confirm) =================== */

  /**
   * Beberapa aksi seller/buyer (retur, batalkan transaksi) memakai
   * window.prompt()/window.confirm() bawaan browser, bukan elemen form biasa
   * di DOM — makanya tidak bisa diisi lewat selector seperti langkah lain.
   *
   * Sebelum langkah yang memicu dialog itu dijalankan, JSON bisa menitipkan
   * jawaban lewat field `dialog_jawaban` (array, sesuai urutan dialog yang
   * akan muncul: string untuk prompt, boolean untuk confirm). Tanpa
   * `dialog_jawaban`, prompt mengembalikan string kosong dan confirm
   * mengembalikan true, supaya rantai tidak diam-diam terhenti menunggu
   * dialog yang tidak pernah bisa dijawab manusia dalam mode otomatis.
   */
  function primeDialogs(jawaban) {
    state.dialogQueue = Array.isArray(jawaban) ? jawaban.slice() : [];
  }

  function pasangPenahanDialogNative() {
    if (window.__pbt_dialog_guard) return;
    window.__pbt_dialog_guard = true;

    window.prompt = function (pesan, def) {
      if (state.dialogQueue.length) {
        var jawaban = state.dialogQueue.shift();
        log("[prompt] " + pesan + " -> " + JSON.stringify(jawaban));
        return jawaban === null ? null : String(jawaban);
      }
      log("[prompt] " + pesan + " -> (tidak ada dialog_jawaban, pakai default kosong)", "warn");
      return def !== undefined ? String(def) : "";
    };

    window.confirm = function (pesan) {
      if (state.dialogQueue.length) {
        var jawaban = state.dialogQueue.shift();
        log("[confirm] " + pesan + " -> " + Boolean(jawaban));
        return Boolean(jawaban);
      }
      log("[confirm] " + pesan + " -> (tidak ada dialog_jawaban, default true)", "warn");
      return true;
    };

    log("Penahan dialog native (prompt/confirm) aktif.");
  }

  /* =================== init =================== */

  /**
   * Google OAuth tidak bisa diselesaikan saat offline: aplikasi akan
   * meninggalkan halaman menuju accounts.google.com dan runner ikut mati.
   *
   * Ini bukan bypass autentikasi. Tidak ada sesi yang dibuat dan tidak ada
   * kode aplikasi yang diubah. Runner hanya menahan kepindahan halaman ke
   * domain luar, lalu mencatatnya sebagai langkah yang dilewati, sehingga
   * rantai bisa lanjut memakai login email dan password.
   */
  function pasangPenahanOAuth() {
    if (window.__pbt_oauth_guard) return;
    window.__pbt_oauth_guard = true;

    var domainLuar = /accounts\.google\.com|oauth2|googleusercontent/i;

    // Tahan window.open
    var openAsli = window.open;
    window.open = function (url) {
      if (domainLuar.test(String(url || ""))) {
        log("[oauth] Dicegah membuka " + url + " (offline).", "warn");
        return null;
      }
      return openAsli.apply(window, arguments);
    };

    // Tahan pindah halaman lewat klik tautan
    document.addEventListener("click", function (event) {
      var anchor = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (anchor && domainLuar.test(anchor.href)) {
        event.preventDefault();
        event.stopPropagation();
        log("[oauth] Dicegah mengikuti tautan " + anchor.href + " (offline).", "warn");
      }
    }, true);

    // Tahan redirect via assign/replace
    ["assign", "replace"].forEach(function (metode) {
      var asli = window.location[metode];
      if (typeof asli !== "function") return;
      try {
        window.location[metode] = function (url) {
          if (domainLuar.test(String(url || ""))) {
            log("[oauth] Dicegah redirect ke " + url + " (offline).", "warn");
            return;
          }
          return asli.apply(window.location, arguments);
        };
      } catch (e) {
        // Sebagian browser mengunci location; abaikan saja.
      }
    });

    log("Penahan OAuth aktif. Langkah Google akan dilewati, bukan menggantung.");
  }

  function init() {
    installEndpointRecorder();
    pasangPenahanOAuth();
    pasangPenahanDialogNative();
    loadVars();

    if (window.alert && !window.__pbt_alert) {
      window.__pbt_alert = true;
      window.__pbt_original_alert = window.alert;
      window.alert = function (m) { log("[alert] " + m, "warn"); };
    }

    buildPanel();
    muatAkun().then(mulaiScan);
    log("Runner siap. Route sekarang: " + currentRoute());
  }

  window.PBT = {
    jalankan: jalankan,
    muatDariTeks: muatDariTeks,
    laporan: function () { return safeJsonParse(localStorage.getItem(STORAGE.report), null); },
    vars: function () { return state.vars; },
    config: CONFIG
  };

  init();
})();
