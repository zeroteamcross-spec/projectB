/* =====================================================================
 * SUT - Browser Tester Otomatis
 * File  : uji_otomatis_browser.js
 * Tempat: SIATOM/tester_task/
 * Cara pakai:
 *   1. Buka halaman yang diuji (contoh: http://host/absensi/hariefektif)
 *   2. Buka DevTools (F12) -> Console
 *   3. Tempel seluruh isi file ini lalu Enter
 *   4. Panel floating muncul di kanan-bawah. Pilih file JSON dari
 *      SIATOM/tester_task/, lalu klik "▶ Mulai Uji".
 *
 * Perilaku:
 *   - Memindai folder SIATOM/tester_task/ via list.php (fallback:
 *     parse listing HTML direktori).
 *   - Setelah file dipilih, JSON dibaca & dijalankan langkah ujinya
 *     (urutan_uji) sesuai jenis elemen.
 *   - Jeda 1 detik antar aksi.
 *   - Jika elemen tidak ditemukan, diulang 10x (1x per detik).
 *     Jika tetap tidak ada, muncul floating text "Tombol Tidak tersedia"
 *     yang menumpuk ke bawah (bertahan sampai halaman di-reload),
 *     lalu tester lanjut ke langkah berikutnya.
 * ===================================================================== */
(function () {
  "use strict";

  var CONFIG = {
    jeda_ms: 1000,      // jeda antar aksi (1 detik)
    max_ulang: 10,      // jumlah percobaan jika elemen tak ditemukan (1x/detik)
    folder: "SIATOM/tester_task/",
    scanUrl: "SIATOM/tester_task/list.php",
    endpoint_log_limit: 120,
    endpoint_response_limit: 1800,
    zIndex: 999999
  };

  var STORAGE = {
    debug: "SUT_DEBUG",
    batch: "SUT_BATCH_STATE",
    single: "SUT_SINGLE_RUN",
    report: "SUT_BATCH_REPORT",
    selected: "SUT_SELECTED_TESTS",
    endpoint: "SUT_ENDPOINT_LOG"
  };

  var state = {
    running: false,
    paused: false,
    stop: false,
    data: null,
    fileName: null,
    fileList: [],
    filteredFileList: [],
    selectedFiles: [],
    currentStep: null,
    resumeResolve: null
  };

  /* =================== util =================== */

  function log(msg) {
    var t = new Date().toTimeString().split(" ")[0];
    console.log("[SUT " + t + "] " + msg);
    appendLog(msg);
  }

  function sleep(ms) {
    return new Promise(function (res) { setTimeout(res, ms); });
  }

  function baseUrl() {
    if (typeof url === "string" && url) return url.replace(/\/+$/, "") + "/";
    return location.origin + "/";
  }

  function safeJsonParse(txt, fallback) {
    try { return JSON.parse(txt); } catch (e) { return fallback; }
  }

  function getBatchState() {
    return safeJsonParse(localStorage.getItem(STORAGE.batch), null);
  }

  function saveBatchState(batch) {
    localStorage.setItem(STORAGE.batch, JSON.stringify(batch));
  }

  function clearBatchState() {
    localStorage.removeItem(STORAGE.batch);
  }

  function getSingleRunState() {
    return safeJsonParse(localStorage.getItem(STORAGE.single), null);
  }

  function saveSingleRunState(run) {
    localStorage.setItem(STORAGE.single, JSON.stringify(run));
  }

  function clearSingleRunState() {
    localStorage.removeItem(STORAGE.single);
  }

  function getEndpointLogs() {
    var logs = safeJsonParse(localStorage.getItem(STORAGE.endpoint), []);
    return Array.isArray(logs) ? logs : [];
  }

  function clearEndpointLogs() {
    localStorage.removeItem(STORAGE.endpoint);
  }

  function trimText(text, limit) {
    text = String(text === undefined || text === null ? "" : text);
    limit = limit || CONFIG.endpoint_response_limit;
    return text.length > limit ? text.substring(0, limit) + "...[dipotong]" : text;
  }

  function endpointUrlString(input) {
    if (typeof input === "string") return input;
    if (input && input.url) return input.url;
    return String(input || "");
  }

  function endpointMethod(input, init) {
    if (init && init.method) return String(init.method).toUpperCase();
    if (input && input.method) return String(input.method).toUpperCase();
    return "GET";
  }

  function isTesterEndpoint(urlText) {
    return String(urlText || "").indexOf(CONFIG.folder) > -1 ||
      String(urlText || "").indexOf(CONFIG.scanUrl) > -1 ||
      String(urlText || "").indexOf("uji_otomatis_browser.js") > -1;
  }

  function parseResponsePreview(text, contentType) {
    var preview = trimText(text);
    var parsed = null;
    if (/json/i.test(contentType || "") || /^[\s\r\n]*[\[{]/.test(preview)) {
      parsed = safeJsonParse(preview, null);
    }
    return { preview: preview, parsed: parsed };
  }

  function endpointReason(status, parsed, text) {
    if (status < 200 || status >= 300) return "HTTP_STATUS_" + status;
    if (parsed && parsed.status === false) return "JSON_STATUS_FALSE";
    if (parsed && parsed.error) return "JSON_ERROR";
    if (parsed && parsed.success === false) return "JSON_SUCCESS_FALSE";
    if (/akses ditolak|gagal|error|server error|fatal error|warning|exception/i.test(String(text || ""))) {
      return "RESPONSE_CONTAINS_ERROR_TEXT";
    }
    return "";
  }

  function appendEndpointLog(entry) {
    if (!entry || isTesterEndpoint(entry.url)) return;

    entry.page = location.href;
    entry.file = state.fileName || "";
    entry.step = state.currentStep || null;

    var logs = getEndpointLogs();
    logs.push(entry);
    if (logs.length > CONFIG.endpoint_log_limit) {
      logs = logs.slice(logs.length - CONFIG.endpoint_log_limit);
    }
    localStorage.setItem(STORAGE.endpoint, JSON.stringify(logs));

    if (entry.reason) {
      log("[endpoint error] " + entry.method + " " + entry.url + " -> " + entry.reason);
    }
  }

  function endpointErrors(logs) {
    return (logs || getEndpointLogs()).filter(function (entry) {
      return !!(entry && entry.reason);
    });
  }

  function installEndpointRecorder() {
    if (window.__sut_endpoint_recorder_installed) return;
    window.__sut_endpoint_recorder_installed = true;

    if (window.fetch) {
      window.__sut_original_fetch = window.__sut_original_fetch || window.fetch;
      window.fetch = function (input, init) {
        var started = Date.now();
        var reqUrl = endpointUrlString(input);
        var method = endpointMethod(input, init);
        return window.__sut_original_fetch.apply(this, arguments).then(function (response) {
          var clone = response.clone();
          var contentType = response.headers && response.headers.get ? response.headers.get("content-type") || "" : "";
          clone.text().then(function (text) {
            var parsed = parseResponsePreview(text, contentType);
            appendEndpointLog({
              time: new Date().toISOString(),
              transport: "fetch",
              method: method,
              url: reqUrl,
              status: response.status,
              statusText: response.statusText || "",
              ok: response.ok,
              durationMs: Date.now() - started,
              contentType: contentType,
              responsePreview: parsed.preview,
              reason: endpointReason(response.status, parsed.parsed, parsed.preview)
            });
          }).catch(function () {
            appendEndpointLog({
              time: new Date().toISOString(),
              transport: "fetch",
              method: method,
              url: reqUrl,
              status: response.status,
              statusText: response.statusText || "",
              ok: response.ok,
              durationMs: Date.now() - started,
              reason: response.ok ? "" : "HTTP_STATUS_" + response.status
            });
          });
          return response;
        }).catch(function (err) {
          appendEndpointLog({
            time: new Date().toISOString(),
            transport: "fetch",
            method: method,
            url: reqUrl,
            status: 0,
            statusText: "",
            ok: false,
            durationMs: Date.now() - started,
            responsePreview: err && err.message ? err.message : String(err),
            reason: "FETCH_FAILED"
          });
          throw err;
        });
      };
    }

    if (window.XMLHttpRequest) {
      var OriginalXHR = window.XMLHttpRequest;
      window.__sut_original_xhr = window.__sut_original_xhr || OriginalXHR;
      window.XMLHttpRequest = function () {
        var xhr = new OriginalXHR();
        var meta = { method: "GET", url: "", started: 0 };
        var originalOpen = xhr.open;
        var originalSend = xhr.send;

        xhr.open = function (method, reqUrl) {
          meta.method = String(method || "GET").toUpperCase();
          meta.url = endpointUrlString(reqUrl);
          return originalOpen.apply(xhr, arguments);
        };

        xhr.send = function () {
          meta.started = Date.now();
          xhr.addEventListener("loadend", function () {
            var contentType = "";
            try { contentType = xhr.getResponseHeader("content-type") || ""; } catch (e) { contentType = ""; }
            var text = "";
            try {
              if (xhr.responseType === "" || xhr.responseType === "text") text = xhr.responseText || "";
              else if (typeof xhr.response === "string") text = xhr.response;
            } catch (e2) { text = ""; }
            var parsed = parseResponsePreview(text, contentType);
            appendEndpointLog({
              time: new Date().toISOString(),
              transport: "xhr",
              method: meta.method,
              url: meta.url,
              status: xhr.status,
              statusText: xhr.statusText || "",
              ok: xhr.status >= 200 && xhr.status < 300,
              durationMs: Date.now() - meta.started,
              contentType: contentType,
              responsePreview: parsed.preview,
              reason: endpointReason(xhr.status, parsed.parsed, parsed.preview)
            });
          });
          return originalSend.apply(xhr, arguments);
        };

        return xhr;
      };
      window.XMLHttpRequest.prototype = OriginalXHR.prototype;
    }

    log("Recorder endpoint aktif. Log tersimpan di localStorage: " + STORAGE.endpoint);
  }

  function normalizePath(path) {
    return String(path || "")
      .replace(/^https?:\/\/[^/]+/i, "")
      .split("?")[0]
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");
  }

  function currentPath() {
    return normalizePath(location.pathname);
  }

  function halamanList(data) {
    var halaman = data && data.halaman;
    if (Array.isArray(halaman)) return halaman.filter(Boolean);
    if (typeof halaman === "string" && halaman) return [halaman];
    return [];
  }

  function isCurrentPage(data) {
    var now = currentPath();
    var pages = halamanList(data);
    if (!pages.length) return true;
    return pages.some(function (h) {
      var target = normalizePath(h);
      return now === target || now.slice(-target.length) === target;
    });
  }

  function withDebugParam(target) {
    var hash = "";
    var hashIdx = target.indexOf("#");
    if (hashIdx > -1) {
      hash = target.substring(hashIdx);
      target = target.substring(0, hashIdx);
    }
    if (/[?&]debug=/.test(target)) return target + hash;
    return target + (target.indexOf("?") > -1 ? "&" : "?") + "debug=1" + hash;
  }

  function pageUrl(data) {
    var pages = halamanList(data);
    if (!pages.length) return "";
    return withDebugParam(baseUrl() + normalizePath(pages[0]));
  }

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }

  function bulanBerjalan() {
    var d = new Date();
    return pad2(d.getMonth() + 1) + " " + d.getFullYear(); // format MM YYYY (dateFormat aplikasi)
  }

  function tanggalHariIni() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function nilaiDefault(step, jenis, el) {
    if (step.nilai !== undefined && step.nilai !== null) return String(step.nilai);
    return dummyByElement(step, jenis, el);
  }

  function isOptionalStep(step) {
    var aksi = String(step.aksi || "");
    return aksi.indexOf("opsional") > -1 || aksi.indexOf("jika") > -1;
  }

  function randInt(min, max) {
    min = Math.ceil(Number(min));
    max = Math.floor(Number(max));
    if (!isFinite(min)) min = 1;
    if (!isFinite(max)) max = min + 98;
    if (max < min) max = min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomItem(arr) {
    if (!arr || !arr.length) return null;
    return arr[randInt(0, arr.length - 1)];
  }

  function nowStamp() {
    return String(new Date().getTime());
  }

  function attrHint(step, el) {
    var parts = [
      step && step.id,
      step && step.pola_id,
      step && step.nama,
      el && el.id,
      el && el.name,
      el && el.placeholder,
      el && el.getAttribute && el.getAttribute("aria-label")
    ];
    return parts.filter(Boolean).join(" ").toLowerCase();
  }

  function tipeInput(jenis, el) {
    var tag = el && el.tagName ? el.tagName.toLowerCase() : "";
    var type = el && el.type ? String(el.type).toLowerCase() : "";
    var jenisMap = {
      "input-date": "date",
      "input-datetime": "datetime-local",
      "input-datetime-local": "datetime-local",
      "input-month": "month",
      "input-week": "week",
      "input-time": "time",
      "input-color": "color",
      "input-number": "number",
      "input-range": "range",
      "input-email": "email",
      "input-tel": "tel",
      "input-phone": "tel",
      "input-url": "url",
      "input-password": "password",
      "input-search": "search",
      "input-text": "text",
      "input-text-dinamis": "text",
      "input-hidden": "hidden",
      "input-file": "file"
    };
    if (tag === "textarea") return "textarea";
    if (tag === "select") return "select";
    if (jenisMap[jenis]) return jenisMap[jenis];
    if (type) return type;
    if (jenis && jenis.indexOf("input-") === 0) return jenis.replace("input-", "");
    return jenis || "text";
  }

  function tanggalJamSekarang() {
    var d = new Date();
    return tanggalHariIni() + "T" + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function mingguBerjalan() {
    var d = new Date();
    var firstJan = new Date(d.getFullYear(), 0, 1);
    var days = Math.floor((d - firstJan) / 86400000);
    var week = Math.ceil((days + firstJan.getDay() + 1) / 7);
    return d.getFullYear() + "-W" + pad2(week);
  }

  function nilaiAngka(el) {
    var minAttr = el && el.getAttribute ? el.getAttribute("min") : null;
    var maxAttr = el && el.getAttribute ? el.getAttribute("max") : null;
    var stepAttr = el && el.getAttribute ? el.getAttribute("step") : null;
    var min = minAttr !== null && minAttr !== "" ? Number(minAttr) : 1;
    var max = maxAttr !== null && maxAttr !== "" ? Number(maxAttr) : 99;
    if (!isFinite(min)) min = 1;
    if (!isFinite(max)) max = min + 98;
    if (max < min) max = min;

    var step = stepAttr !== null && stepAttr !== "" && stepAttr !== "any" ? Number(stepAttr) : 1;
    if (!isFinite(step) || step <= 0) step = 1;

    var slots = Math.max(0, Math.floor((max - min) / step));
    var value = min + (randInt(0, slots) * step);
    var decimals = String(step).indexOf(".") > -1 ? String(step).split(".")[1].length : 0;
    return decimals ? value.toFixed(decimals) : String(Math.round(value));
  }

  function dummyText(step, el) {
    var hint = attrHint(step, el);
    var ts = nowStamp();
    var shortTs = ts.slice(-6);
    if (/email|e-mail|surel/.test(hint)) return "tester." + shortTs + "@example.test";
    if (/telp|telepon|phone|hp|wa|whatsapp|kontak|no_hp|nomor_hp/.test(hint)) return "081234" + ts.slice(-6);
    if (/url|website|web|link|tautan/.test(hint)) return "https://example.test/uji-" + shortTs;
    if (/password|passwd|pass|sandi/.test(hint)) return "P@ssw0rd" + shortTs;
    if (/nisn|nis|nip|nik|npsn|kode|nomor|no_/.test(hint)) return "UJI" + shortTs;
    if (/nama|name/.test(hint)) return "Data Uji " + shortTs;
    if (/alamat|address/.test(hint)) return "Alamat Uji " + shortTs;
    if (/catatan|keterangan|deskripsi|uraian|alasan|note/.test(hint)) return "Catatan uji otomatis " + shortTs;
    return (step.nama || step.id || step.pola_id || "Data uji") + " " + shortTs;
  }

  function dummyByElement(step, jenis, el) {
    var type = tipeInput(jenis, el);
    var ts = nowStamp();
    if (type === "date") return tanggalHariIni();
    if (type === "datetime-local" || jenis === "input-datetime") return tanggalJamSekarang();
    if (type === "month") return tanggalHariIni().substring(0, 7);
    if (type === "week") return mingguBerjalan();
    if (type === "time") return pad2(new Date().getHours()) + ":" + pad2(new Date().getMinutes());
    if (type === "color") return randomItem(["#e74c3c", "#2563eb", "#16a34a", "#f59e0b", "#7c3aed"]) || "#2563eb";
    if (type === "number" || type === "range") return nilaiAngka(el);
    if (type === "email") return "tester." + ts.slice(-6) + "@example.test";
    if (type === "tel") return "081234" + ts.slice(-6);
    if (type === "url") return "https://example.test/uji-" + ts.slice(-6);
    if (type === "password") return "P@ssw0rd" + ts.slice(-6);
    if (type === "search") return dummyText(step, el);
    if (type === "textarea") return dummyText(step, el);
    return dummyText(step, el);
  }

  function tungguPause() {
    if (!state.paused) return Promise.resolve();
    return new Promise(function (res) { state.resumeResolve = res; });
  }

  /* =================== floating notifikasi (menumpuk ke bawah) =================== */

  var floatBox = null;

  function ensureFloatBox() {
    if (!floatBox) {
      floatBox = document.createElement("div");
      floatBox.id = "sut-floatbox";
      floatBox.style.cssText =
        "position:fixed;left:12px;top:64px;z-index:" + CONFIG.zIndex +
        ";display:flex;flex-direction:column;gap:6px;max-width:320px;" +
        "pointer-events:none;font:12px Arial,sans-serif;";
      document.body.appendChild(floatBox);
    }
    return floatBox;
  }

  function floatMsg(text) {
    var el = document.createElement("div");
    el.style.cssText =
      "background:#c0392b;color:#fff;padding:8px 12px;border-radius:4px;" +
      "box-shadow:0 2px 10px rgba(0,0,0,.35);white-space:pre-wrap;";
    el.textContent = text;
    ensureFloatBox().appendChild(el);
  }

  /* =================== scan & baca file JSON =================== */

  async function scanFiles() {
    var base = baseUrl();
    var urls = [base + CONFIG.scanUrl, base + CONFIG.folder];
    for (var i = 0; i < urls.length; i++) {
      try {
        var r = await fetch(urls[i], { cache: "no-store" });
        if (!r.ok) continue;
        var txt = await r.text();
        var list = parseList(txt, urls[i]);
        if (list && list.length) return list;
      } catch (e) { /* lanjut kandidat berikutnya */ }
    }
    return [];
  }

  function parseList(txt, srcUrl) {
    var arr = [];
    try {
      var j = JSON.parse(txt);
      if (Array.isArray(j)) {
        j.forEach(function (n) { if (typeof n === "string" && /\.json$/i.test(n)) arr.push(n); });
        return arr;
      }
    } catch (e) { /* bukan JSON -> coba HTML */ }
    var re = /href=["']([^"']+\.json)["']/gi;
    var m;
    while ((m = re.exec(txt)) !== null) {
      var n = m[1];
      if (n.indexOf("/") > -1) n = n.split("/").pop();
      if (arr.indexOf(n) === -1) arr.push(n);
    }
    return arr;
  }

  async function bacaFile(name) {
    var r = await fetch(baseUrl() + CONFIG.folder + name, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  }

  async function muatFile(name) {
    try {
      var data = await bacaFile(name);
      state.data = data;
      state.fileName = name;
      var jml = (data.urutan_uji && data.urutan_uji.length) || 0;
      log("File dimuat: " + name + " | fitur: " + (data.nama_fitur || "-") + " | langkah: " + jml);
      setStatus("File: " + name + " (" + jml + " langkah). Siap uji.");
      return true;
    } catch (e) {
      log("Gagal membaca " + name + " → " + e.message);
      floatMsg("Gagal membaca file: " + name);
      setStatus("Gagal membaca file: " + name);
      return false;
    }
  }

  /* =================== resolusi target & aksi =================== */

  function selectorStep(step) {
    if (step.id) return "#" + step.id;
    var pola = step.pola_id || "";
    if (/^hef_day_/.test(pola)) return 'input[id^="hef_day_"]';
    if (/^hef_tgl_more_/.test(pola)) return '[id^="hef_tgl_more_"]';
    var cut = pola.indexOf("YYYY");
    if (cut === -1) cut = pola.indexOf("<");
    if (cut > 0) return '[id^="' + pola.substring(0, cut) + '"]';
    return "#" + pola;
  }

  async function tungguTarget(step) {
    var sel = selectorStep(step);
    for (var i = 0; i < CONFIG.max_ulang; i++) {
      if (i > 0) await sleep(1000);
      await tungguPause();
      if (state.stop) break;
      var els = document.querySelectorAll(sel);
      if (els && els.length > 0) {
        return { found: true, els: Array.prototype.slice.call(els), sel: sel };
      }
    }
    return { found: false, sel: sel };
  }

  function setVal(el, val, evts) {
    var j = (typeof jQuery !== "undefined") ? jQuery : null;
    if (j && j(el) && j.fn) {
      var $el = j(el);
      $el.val(val);
      (evts || ["input", "change"]).forEach(function (ev) { $el.trigger(ev); });
    } else {
      el.value = val;
      (evts || ["input", "change"]).forEach(function (ev) {
        el.dispatchEvent(new Event(ev, { bubbles: true }));
      });
    }
  }

  function clickEl(el) {
    var j = (typeof jQuery !== "undefined") ? jQuery : null;
    if (j && j(el) && j.fn) j(el).trigger("click");
    else el.click();
  }

  function triggerChecked(el, checked) {
    var j = (typeof jQuery !== "undefined") ? jQuery : null;
    if (j && j.fn) j(el).prop("checked", checked).trigger("input").trigger("change");
    else {
      el.checked = checked;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function optionLayak(option) {
    if (!option || option.disabled) return false;
    var value = option.value;
    var text = (option.textContent || "").trim();
    if (value === "" && text === "") return false;
    if (/^[-\s]*(pilih|select|--|semua|all)[-\s]*$/i.test(text)) return false;
    return true;
  }

  function pilihSelect(el, step) {
    if (!el || el.disabled) {
      log("Select dilewati: elemen disabled.");
      return;
    }

    var options = Array.prototype.slice.call(el.options || []).filter(optionLayak);
    if (!options.length) throw new Error("tidak ada opsi select yang bisa dipilih");

    if (step.nilai !== undefined && step.nilai !== null) {
      setVal(el, String(step.nilai), ["change"]);
      log("Pilih select: " + step.nilai);
      return;
    }

    if (el.multiple) {
      var jumlah = Math.min(options.length, randInt(1, Math.min(2, options.length)));
      var selected = [];
      options.forEach(function (opt) { opt.selected = false; });
      while (selected.length < jumlah) {
        var opt = randomItem(options);
        if (selected.indexOf(opt) === -1) {
          opt.selected = true;
          selected.push(opt);
        }
      }
      if (typeof jQuery !== "undefined" && jQuery.fn) {
        jQuery(el).val(selected.map(function (opt) { return opt.value; })).trigger("change");
      } else {
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      log("Pilih select multiple: " + selected.map(function (opt) { return opt.value || opt.textContent.trim(); }).join(", "));
      return;
    }

    var pilihan = randomItem(options);
    setVal(el, pilihan.value, ["change"]);
    log("Pilih select random: " + (pilihan.value || pilihan.textContent.trim()));
  }

  function pilihCheckboxRadio(els, jenis, step) {
    var aktif = els.filter(function (el) { return !el.disabled; });
    if (!aktif.length) {
      log("Pilih " + jenis + " dilewati: semua elemen disabled.");
      return;
    }

    if (jenis === "radio") {
      var radio = randomItem(aktif);
      triggerChecked(radio, true);
      log("Pilih radio: " + (radio.value || radio.id || radio.name || "-"));
      return;
    }

    aktif.forEach(function (el) {
      var checked = step.nilai !== undefined && step.nilai !== null
        ? !/^(0|false|tidak|no)$/i.test(String(step.nilai))
        : Math.random() >= 0.35;
      triggerChecked(el, checked);
    });
    log("Pilih checkbox: " + aktif.length + " elemen");
  }

  function isFormInputJenis(jenis) {
    return /^(input|input-|textarea|select|checkbox|radio|datepicker)/.test(String(jenis || ""));
  }

  function isNativeFormInput(el) {
    if (!el || !el.tagName) return false;
    return /^(input|textarea|select)$/i.test(el.tagName);
  }

  function isVisibleElement(el) {
    if (!el) return false;
    var type = el.type ? String(el.type).toLowerCase() : "";
    if (type === "hidden") return true;
    var style = window.getComputedStyle ? window.getComputedStyle(el) : null;
    if (style && (style.display === "none" || style.visibility === "hidden")) return false;
    return !!(el.offsetWidth || el.offsetHeight || (el.getClientRects && el.getClientRects().length));
  }

  function perluTungguVisible(step, els) {
    var jenis = step.jenis;
    if (!(isFormInputJenis(jenis) || isNativeFormInput(els[0]))) return false;
    var type = tipeInput(jenis, els[0]);
    return ["hidden", "file", "select", "checkbox", "radio"].indexOf(type) === -1;
  }

  async function tungguInputVisible(step, els) {
    if (!perluTungguVisible(step, els)) return els;

    var sel = selectorStep(step);
    for (var i = 0; i < CONFIG.max_ulang; i++) {
      var visibles = els.filter(isVisibleElement);
      if (visibles.length) return visibles;
      if (i < CONFIG.max_ulang - 1) {
        await sleep(1000);
        await tungguPause();
        if (state.stop) break;
        els = Array.prototype.slice.call(document.querySelectorAll(sel));
      }
    }

    return [];
  }

  function isiInputLike(step, els, jenis) {
    els.forEach(function (el, idx) {
      var type = tipeInput(jenis, el);
      if (type === "file") {
        log("Input file dilewati: browser tidak boleh mengisi file otomatis tanpa file lokal.");
        return;
      }
      if (type === "hidden" && step.nilai === undefined) {
        log("Input hidden dilewati: tidak ada nilai eksplisit.");
        return;
      }
      if (el.disabled || (el.readOnly && step.nilai === undefined)) {
        log("Input dilewati: readonly/disabled (" + (el.id || el.name || jenis) + ").");
        return;
      }
      if (type === "checkbox" || type === "radio") {
        pilihCheckboxRadio([el], type, step);
        return;
      }
      if (type === "select") {
        pilihSelect(el, step);
        return;
      }

      var val = nilaiDefault(step, jenis, el);
      var events = ["input", "change"];
      if (type === "text" || type === "search" || type === "textarea" || type === "email" ||
          type === "tel" || type === "url" || type === "password") {
        events.push("keyup");
      }
      setVal(el, val, events);
      log("Isi " + type + (idx > 0 ? " #" + (idx + 1) : "") + ": " + val);
    });
  }

  async function jalankanAksi(step, els) {
    var jenis = step.jenis;

    if (jenis === "button" || jenis === "button-submit" || jenis === "button-dinamis" ||
        jenis === "button-popup" || jenis === "button-dinamis-modal" || jenis === "link-button" ||
        jenis === "link-button-dinamis" || jenis === "tab") {
      clickEl(els[0]);

    } else if (jenis === "checkbox" || jenis === "radio") {
      pilihCheckboxRadio(els, jenis, step);

    } else if (jenis === "select") {
      els.forEach(function (el) { pilihSelect(el, step); });

    } else if (jenis === "datepicker" || jenis === "input-datepicker") {
      var m = bulanBerjalan();
      setVal(els[0], m, ["input", "change"]);
      log("Isi bulan: " + m);

    } else if (jenis === "input-readonly" || jenis === "input-hidden" || jenis === "text" ||
        jenis === "container" || jenis === "modal" || jenis === "tabs" || jenis === "canvas") {
      log("Verifikasi elemen ada: " + (step.id || step.pola_id || jenis));

    } else if (jenis === "input-file") {
      log("Input file dilewati: browser tidak boleh mengisi file otomatis tanpa file lokal.");

    } else if (jenis === "table") {
      var tb = els[0].querySelector("tbody") || els[0];
      log("Verifikasi tabel, baris: " + (tb ? tb.children.length : 0));

    } else if (isFormInputJenis(jenis) || isNativeFormInput(els[0])) {
      isiInputLike(step, els, jenis);

    } else {
      clickEl(els[0]);
    }
  }

  async function prosesLangkah(step) {
    var id = step.id || step.pola_id || "";
    var label = (step.urutan ? "[" + step.urutan + "] " : "") + (step.nama || id) + " (" + id + ")";
    state.currentStep = {
      urutan: step.urutan || null,
      id: id,
      jenis: step.jenis || "",
      aksi: step.aksi || "",
      nama: step.nama || ""
    };
    log("→ " + label);

    var target = await tungguTarget(step);
    if (!target.found) {
      if (isOptionalStep(step)) {
        log("Optional dilewati: " + label);
        await sleep(CONFIG.jeda_ms);
        return true;
      }
      var msg = "Tombol Tidak tersedia → " + label;
      floatMsg(msg);
      log("✗ " + msg);
      await sleep(CONFIG.jeda_ms);
      return false;
    }

    try {
      var siapEls = await tungguInputVisible(step, target.els);
      if (!siapEls.length) {
        if (isOptionalStep(step)) {
          log("Optional dilewati karena input belum tampil: " + label);
          await sleep(CONFIG.jeda_ms);
          return true;
        }
        throw new Error("input form belum tampil/aktif");
      }

      await jalankanAksi(step, siapEls);
      log("✓ " + label);
      await sleep(CONFIG.jeda_ms);
      return true;
    } catch (e) {
      var msg2 = "Gagal: " + label + " → " + (e && e.message ? e.message : e);
      floatMsg(msg2);
      log("✗ " + msg2);
      await sleep(CONFIG.jeda_ms);
      return false;
    }
  }

  async function jalankan() {
    if (state.running) return;
    if (!state.data) {
      setStatus("Pilih file JSON terlebih dahulu!");
      return;
    }

    if (!isCurrentPage(state.data)) {
      var target = pageUrl(state.data);
      if (target) {
        saveSingleRunState({
          running: true,
          file: state.fileName,
          waitingUrl: target,
          startedAt: new Date().toISOString()
        });
        localStorage.setItem(STORAGE.debug, "1");
        log("Pindah halaman otomatis untuk play: " + target);
        setStatus("Pindah halaman untuk menjalankan: " + state.fileName);
        location.href = target;
        return;
      }
    }

    clearSingleRunState();
    state.running = true;
    state.stop = false;
    state.paused = false;
    setRunningUI();

    log("===== MULAI UJI =====");
    log("Fitur : " + (state.data.nama_fitur || "-"));
    log("File  : " + state.fileName);
    setStatus("Menguji: " + state.fileName);

    var steps = (state.data.urutan_uji || []).slice().sort(function (a, b) {
      return (a.urutan || 0) - (b.urutan || 0);
    });

    var ok = 0, gagal = 0;
    for (var i = 0; i < steps.length; i++) {
      await tungguPause();
      if (state.stop) break;
      var hasil = await prosesLangkah(steps[i]);
      if (hasil) ok++; else gagal++;
      setStatus("Langkah " + (i + 1) + "/" + steps.length + " (✓" + ok + " ✗" + gagal + ")");
    }

    log("===== SELESAI: ✓ " + ok + " | ✗ " + gagal + " =====");
    if (state.stop) log("Uji dihentikan oleh pengguna.");
    setStatus("Selesai ✓" + ok + " ✗" + gagal);
    state.currentStep = null;

    state.running = false;
    state.data = null;
    state.fileName = null;
    state.selectedFiles = getSelectedFiles();
    renderSelectedList();
    setRunningUI();
  }

  function currentOptionFiles() {
    if (state.filteredFileList && state.filteredFileList.length) {
      return state.filteredFileList.slice();
    }
    if (!ui.fileSel) return [];
    return Array.prototype.slice.call(ui.fileSel.options)
      .map(function (opt) { return opt.value; })
      .filter(function (val) { return /\.json$/i.test(val); });
  }

  function getSelectedFiles() {
    var files = safeJsonParse(localStorage.getItem(STORAGE.selected), []);
    if (!Array.isArray(files)) return [];
    return files.filter(function (n, idx) {
      return /\.json$/i.test(n) && files.indexOf(n) === idx;
    });
  }

  function saveSelectedFiles(files) {
    state.selectedFiles = (files || []).filter(function (n, idx, arr) {
      return /\.json$/i.test(n) && arr.indexOf(n) === idx;
    });
    localStorage.setItem(STORAGE.selected, JSON.stringify(state.selectedFiles));
    renderSelectedList();
  }

  function addSelectedFile(name) {
    name = String(name || "").trim();
    if (!/\.json$/i.test(name)) {
      setStatus("Pilih file JSON dulu sebelum tambah list.");
      return;
    }
    var files = getSelectedFiles();
    if (files.indexOf(name) === -1) files.push(name);
    saveSelectedFiles(files);
    setStatus("Ditambahkan ke list: " + name);
    log("Tambah list: " + name);
  }

  function removeSelectedFile(name) {
    saveSelectedFiles(getSelectedFiles().filter(function (n) { return n !== name; }));
    setStatus("Dihapus dari list: " + name);
  }

  function clearSelectedFiles() {
    saveSelectedFiles([]);
    setStatus("List test dikosongkan.");
  }

  function renderSelectedList() {
    if (!ui.selectedList) return;
    var files = getSelectedFiles();
    state.selectedFiles = files.slice();
    ui.selectedList.innerHTML = "";

    if (!files.length) {
      ui.selectedList.innerHTML = '<div class="sut-empty">List test kosong. Pilih JSON lalu klik Tambah.</div>';
      setBatchButtons();
      return;
    }

    files.forEach(function (name) {
      var row = document.createElement("div");
      row.className = "sut-selected-item";
      var label = document.createElement("span");
      label.title = name;
      label.textContent = name;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-action", "remove");
      btn.setAttribute("data-file", name);
      btn.textContent = "x";
      row.appendChild(label);
      row.appendChild(btn);
      ui.selectedList.appendChild(row);
    });

    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "sut-clear-list";
    clearBtn.setAttribute("data-action", "clear");
    clearBtn.textContent = "Kosongkan List";
    ui.selectedList.appendChild(clearBtn);
    setBatchButtons();
  }

  function saveBatchReport(batch) {
    var endpoints = getEndpointLogs();
    localStorage.setItem(STORAGE.report, JSON.stringify({
      startedAt: batch.startedAt,
      finishedAt: new Date().toISOString(),
      total: batch.queue.length,
      results: batch.results || [],
      endpoint_logs: endpoints,
      endpoint_errors: endpointErrors(endpoints)
    }));
  }

  function setBatchButtons() {
    if (!ui.batchBtn || !ui.batchStopBtn) return;
    var batch = getBatchState();
    var active = !!(batch && batch.running);
    ui.batchBtn.disabled = state.running || active || getSelectedFiles().length === 0;
    ui.batchStopBtn.disabled = !active;
  }

  async function mulaiBatch(files) {
    if (state.running) return;
    files = (files || []).filter(function (n) { return /\.json$/i.test(n); });
    if (!files.length) {
      setStatus("Tidak ada file JSON untuk batch.");
      return;
    }

    var batch = {
      running: true,
      queue: files,
      index: 0,
      results: [],
      startedAt: new Date().toISOString()
    };
    clearEndpointLogs();
    localStorage.setItem(STORAGE.debug, "1");
    saveBatchState(batch);
    log("Batch dimulai: " + files.length + " file.");
    await lanjutBatch();
  }

  async function lanjutBatch() {
    var batch = getBatchState();
    if (!batch || !batch.running || state.running) {
      setBatchButtons();
      return;
    }

    if (batch.index >= batch.queue.length) {
      batch.running = false;
      saveBatchReport(batch);
      clearBatchState();
      setStatus("Batch selesai: " + batch.queue.length + " file.");
      log("Batch selesai. Report tersimpan di localStorage: " + STORAGE.report);
      setBatchButtons();
      return;
    }

    var file = batch.queue[batch.index];
    setStatus("Batch " + (batch.index + 1) + "/" + batch.queue.length + ": " + file);
    log("Batch file " + (batch.index + 1) + "/" + batch.queue.length + ": " + file);

    var loaded = await muatFile(file);
    if (!loaded) {
      batch.results.push({
        file: file,
        status: "failed",
        reason: "Gagal memuat JSON",
        url: location.href,
        finishedAt: new Date().toISOString()
      });
      batch.index += 1;
      saveBatchState(batch);
      setTimeout(lanjutBatch, CONFIG.jeda_ms);
      return;
    }

    if (!isCurrentPage(state.data)) {
      var target = pageUrl(state.data);
      if (target) {
        batch.currentFile = file;
        batch.waitingUrl = target;
        saveBatchState(batch);
        localStorage.setItem(STORAGE.debug, "1");
        log("Pindah halaman otomatis: " + target);
        setStatus("Pindah halaman untuk: " + file);
        location.href = target;
        return;
      }
    }

    state.stop = false;
    state.paused = false;
    setBatchButtons();

    var fitur = state.data && state.data.nama_fitur ? state.data.nama_fitur : "-";
    var endpointStart = getEndpointLogs().length;
    await jalankan();

    batch = getBatchState();
    if (!batch || !batch.running) {
      state.running = false;
      state.data = null;
      state.fileName = null;
      setRunningUI();
      setBatchButtons();
      return;
    }

    batch.results = batch.results || [];
    var endpointSlice = getEndpointLogs().slice(endpointStart);
    var endpointErrorSlice = endpointErrors(endpointSlice);
    batch.results.push({
      file: file,
      fitur: fitur,
      status: state.stop ? "stopped" : "done",
      statusText: ui.statusEl ? ui.statusEl.textContent : "",
      url: location.href,
      endpoint_total: endpointSlice.length,
      endpoint_error_total: endpointErrorSlice.length,
      endpoint_errors: endpointErrorSlice,
      finishedAt: new Date().toISOString()
    });
    batch.index += 1;
    delete batch.currentFile;
    delete batch.waitingUrl;
    saveBatchState(batch);

    state.running = false;
    state.stop = false;
    state.data = null;
    state.fileName = null;
    setRunningUI();
    setBatchButtons();

    setTimeout(lanjutBatch, CONFIG.jeda_ms);
  }

  function stopBatch() {
    var batch = getBatchState();
    if (batch) {
      batch.running = false;
      batch.stoppedAt = new Date().toISOString();
      saveBatchReport(batch);
    }
    clearBatchState();
    state.stop = true;
    setStatus("Batch dihentikan.");
    log("Batch dihentikan. Report terakhir tersimpan di localStorage: " + STORAGE.report);
    setBatchButtons();
  }

  async function lanjutSingleRun() {
    var run = getSingleRunState();
    if (!run || !run.running || state.running) return;

    if (!run.file || !/\.json$/i.test(run.file)) {
      clearSingleRunState();
      setStatus("Single run dibatalkan: file JSON tidak valid.");
      return;
    }

    setStatus("Melanjutkan play otomatis: " + run.file);
    log("Melanjutkan play otomatis dari localStorage: " + run.file);

    var loaded = await muatFile(run.file);
    if (!loaded) {
      clearSingleRunState();
      setStatus("Single run gagal memuat file: " + run.file);
      return;
    }

    if (!isCurrentPage(state.data)) {
      var target = pageUrl(state.data);
      if (target && target !== location.href) {
        run.waitingUrl = target;
        saveSingleRunState(run);
        localStorage.setItem(STORAGE.debug, "1");
        log("Pindah halaman otomatis lanjutan: " + target);
        location.href = target;
        return;
      }
    }

    clearSingleRunState();
    await jalankan();
  }

  /* =================== panel floating (kanan-bawah) =================== */

  var ui = {};

  function cssText() {
    return [
      "#sut-panel{position:fixed;right:16px;bottom:16px;width:360px;max-height:70vh;z-index:" + CONFIG.zIndex + ";background:#fff;border:1px solid #cbd5e0;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.28);font:13px/1.5 Arial,sans-serif;overflow:hidden;display:flex;flex-direction:column;}",
      "#sut-panel .sut-hdr{background:#2c3e50;color:#fff;padding:8px 10px;cursor:move;display:flex;justify-content:space-between;align-items:center;user-select:none;}",
      "#sut-panel .sut-hdr b{font-size:12px;}",
      "#sut-panel .sut-ico{background:rgba(255,255,255,.15);color:#fff;border:0;border-radius:4px;width:22px;height:22px;cursor:pointer;margin-left:4px;line-height:1;}",
      "#sut-panel .sut-ico:hover{background:rgba(255,255,255,.3);}",
      "#sut-panel .sut-body{padding:10px;overflow-y:auto;flex:1;}",
      "#sut-panel .sut-row{display:flex;gap:6px;align-items:center;margin-bottom:8px;}",
      "#sut-panel select,#sut-panel input[type=text],#sut-panel input[type=search]{flex:1;padding:5px 6px;border:1px solid #cbd5e0;border-radius:4px;font-size:12px;}",
      "#sut-panel .sut-btn{border:0;border-radius:6px;padding:7px 10px;cursor:pointer;color:#fff;font-size:12px;flex:1;}",
      "#sut-panel .sut-play{background:#27ae60;}", "#sut-panel .sut-play:disabled{background:#95a5a6;cursor:not-allowed;}",
      "#sut-panel .sut-batch{background:#6366f1;}",
      "#sut-panel .sut-batch-stop{background:#7f1d1d;}",
      "#sut-panel .sut-pause{background:#f39c12;}",
      "#sut-panel .sut-stop{background:#c0392b;}",
      "#sut-panel .sut-btn:disabled{background:#bdc3c7;cursor:not-allowed;}",
      "#sut-panel .sut-status{background:#f8f9fa;border:1px solid #e2e8f0;border-radius:4px;padding:5px 8px;margin-bottom:8px;font-size:11px;color:#334155;}",
      "#sut-panel .sut-selected{border:1px solid #e2e8f0;border-radius:4px;padding:5px;max-height:92px;overflow-y:auto;margin-bottom:8px;background:#f8fafc;}",
      "#sut-panel .sut-selected-item{display:flex;align-items:center;gap:6px;margin-bottom:4px;font-size:11px;}",
      "#sut-panel .sut-selected-item span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
      "#sut-panel .sut-selected-item button,#sut-panel .sut-clear-list{border:0;border-radius:4px;cursor:pointer;background:#e2e8f0;color:#334155;font-size:11px;padding:2px 6px;}",
      "#sut-panel .sut-clear-list{width:100%;padding:4px 6px;margin-top:2px;}",
      "#sut-panel .sut-empty{font-size:11px;color:#64748b;}",
      "#sut-panel .sut-log{background:#0f172a;color:#e2e8f0;border-radius:4px;padding:6px 8px;font:11px/1.5 Consolas,monospace;height:150px;overflow-y:auto;white-space:pre-wrap;word-break:break-all;}",
      "#sut-panel .sut-refresh{background:#3b82f6;color:#fff;border:0;border-radius:4px;cursor:pointer;padding:5px 9px;}"
    ].join("\n");
  }

  function appendLog(msg) {
    if (!ui.logEl) return;
    var line = document.createElement("div");
    line.textContent = msg;
    ui.logEl.appendChild(line);
    ui.logEl.scrollTop = ui.logEl.scrollHeight;
  }

  function setStatus(txt) {
    if (ui.statusEl) ui.statusEl.textContent = "Status: " + txt;
  }

  function setRunningUI() {
    ui.playBtn.disabled = state.running;
    ui.pauseBtn.disabled = !state.running;
    ui.stopBtn.disabled = !state.running;
    setBatchButtons();
    ui.pauseBtn.textContent = state.paused ? "▶ Lanjut" : "⏸ Jeda";
  }

  function buildPanel() {
    var old = document.getElementById("sut-panel");
    if (old) old.remove();

    var panel = document.createElement("div");
    panel.id = "sut-panel";
    panel.innerHTML =
      '<div class="sut-hdr">' +
      '  <b>🧪 SUT Browser Tester</b>' +
      '  <span><button class="sut-ico" id="sut-min" title="Minimalkan">–</button>' +
      '       <button class="sut-ico" id="sut-close" title="Tutup">×</button></span>' +
      '</div>' +
      '<div class="sut-body" id="sut-body">' +
      '  <div class="sut-row">' +
      '    <input type="search" id="sut-file-search" placeholder="Cari file JSON, contoh: hukuman / kebaikan" title="Filter daftar file JSON">' +
      '  </div>' +
      '  <div class="sut-row">' +
      '    <select id="sut-file" style="flex:1" title="File JSON hasil scan"><option>– memindai –</option></select>' +
      '    <button id="sut-scan" class="sut-refresh" title="Tambah file terpilih ke list">Tambah</button>' +
      '  </div>' +
      '  <div id="sut-selected-list" class="sut-selected"></div>' +
      '  <div class="sut-row" id="sut-manual" style="display:none">' +
      '    <input type="text" id="sut-file-manual" placeholder="nama-file.json (manual)">' +
      '    <button id="sut-muat" class="sut-refresh">Muat</button>' +
      '  </div>' +
      '  <div class="sut-row">' +
      '    <button id="sut-play" class="sut-btn sut-play">▶ Mulai Uji</button>' +
      '    <button id="sut-pause" class="sut-btn sut-pause" disabled>⏸ Jeda</button>' +
      '    <button id="sut-stop" class="sut-btn sut-stop" disabled>⏹ Stop</button>' +
      '  </div>' +
      '  <div class="sut-row">' +
      '    <button id="sut-batch" class="sut-btn sut-batch" title="Jalankan semua file JSON di list pilihan">Jalankan List</button>' +
      '    <button id="sut-batch-stop" class="sut-btn sut-batch-stop" disabled>Stop Batch</button>' +
      '  </div>' +
      '  <div class="sut-status" id="sut-status">Status: siap. Memindai folder…</div>' +
      '  <div class="sut-log" id="sut-log"></div>' +
      '</div>';

    document.body.appendChild(panel);

    var st = document.createElement("style");
    st.id = "sut-style";
    st.textContent = cssText();
    document.body.appendChild(st);

    ui.panel = panel;
    ui.bodyEl = panel.querySelector("#sut-body");
    ui.fileSearch = panel.querySelector("#sut-file-search");
    ui.fileSel = panel.querySelector("#sut-file");
    ui.scanBtn = panel.querySelector("#sut-scan");
    ui.selectedList = panel.querySelector("#sut-selected-list");
    ui.manualRow = panel.querySelector("#sut-manual");
    ui.manualInp = panel.querySelector("#sut-file-manual");
    ui.muatBtn = panel.querySelector("#sut-muat");
    ui.playBtn = panel.querySelector("#sut-play");
    ui.pauseBtn = panel.querySelector("#sut-pause");
    ui.stopBtn = panel.querySelector("#sut-stop");
    ui.batchBtn = panel.querySelector("#sut-batch");
    ui.batchStopBtn = panel.querySelector("#sut-batch-stop");
    ui.statusEl = panel.querySelector("#sut-status");
    ui.logEl = panel.querySelector("#sut-log");

    /* drag */
    var hdr = panel.querySelector(".sut-hdr");
    var dragging = null;
    hdr.addEventListener("mousedown", function (e) {
      dragging = { dx: e.clientX - panel.offsetLeft, dy: e.clientY - panel.offsetTop };
      e.preventDefault();
    });
    document.addEventListener("mousemove", function (e) {
      if (!dragging) return;
      panel.style.left = (e.clientX - dragging.dx) + "px";
      panel.style.top = (e.clientY - dragging.dy) + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });
    document.addEventListener("mouseup", function () { dragging = null; });

    /* tombol panel */
    panel.querySelector("#sut-min").addEventListener("click", function () {
      var disp = ui.bodyEl.style.display === "none" ? "" : "none";
      ui.bodyEl.style.display = disp;
      this.textContent = disp === "none" ? "+" : "–";
    });

    panel.querySelector("#sut-close").addEventListener("click", function () {
      panel.remove();
      var st2 = document.getElementById("sut-style");
      if (st2) st2.remove();
    });

    ui.scanBtn.addEventListener("click", function () {
      addSelectedFile(ui.fileSel.value);
    });
    ui.fileSearch.addEventListener("input", function () {
      renderFileOptions(ui.fileSearch.value, true);
    });
    ui.muatBtn.addEventListener("click", function () { muatManual(); });
    ui.manualInp.addEventListener("keydown", function (e) { if (e.key === "Enter") muatManual(); });

    ui.fileSel.addEventListener("change", function () {
      if (ui.fileSel.value) muatFile(ui.fileSel.value);
    });

    ui.selectedList.addEventListener("click", function (e) {
      var action = e.target.getAttribute("data-action");
      if (action === "remove") removeSelectedFile(e.target.getAttribute("data-file"));
      if (action === "clear") clearSelectedFiles();
    });

    ui.playBtn.addEventListener("click", jalankan);
    ui.batchBtn.addEventListener("click", function () {
      mulaiBatch(getSelectedFiles());
    });
    ui.batchStopBtn.addEventListener("click", stopBatch);
    ui.pauseBtn.addEventListener("click", function () {
      if (!state.running) return;
      state.paused = !state.paused;
      if (!state.paused && state.resumeResolve) {
        var r = state.resumeResolve;
        state.resumeResolve = null;
        r();
      }
      setRunningUI();
      log(state.paused ? "⏸ Dijeda" : "▶ Dilanjutkan");
    });
    ui.stopBtn.addEventListener("click", function () {
      if (!state.running) return;
      if (getBatchState()) {
        stopBatch();
        return;
      }
      state.stop = true;
      if (state.resumeResolve) { var r = state.resumeResolve; state.resumeResolve = null; r(); }
      log("⏹ Stop diminta…");
    });

    state.selectedFiles = getSelectedFiles();
    renderSelectedList();
    setRunningUI();
  }

  function muatManual() {
    var name = ui.manualInp.value.trim();
    if (!name) return;
    if (!/\.json$/i.test(name)) name += ".json";
    muatFile(name);
  }

  function renderFileOptions(keyword, autoLoad) {
    var q = String(keyword || "").trim().toLowerCase();
    var list = state.fileList || [];
    var filtered = q
      ? list.filter(function (n) { return n.toLowerCase().indexOf(q) > -1; })
      : list.slice();

    ui.fileSel.innerHTML = "";
    if (!filtered.length) {
      state.filteredFileList = [];
      ui.fileSel.options.add(new Option("(tidak ada hasil)", ""));
      setStatus("Tidak ada file JSON cocok untuk: " + (keyword || "-"));
      return [];
    }

    filtered.forEach(function (n) { ui.fileSel.options.add(new Option(n, n)); });
    state.filteredFileList = filtered.slice();
    ui.fileSel.value = filtered[0];
    setStatus("Filter: " + filtered.length + "/" + list.length + " file JSON.");

    if (autoLoad && filtered[0] && filtered[0] !== state.fileName) {
      muatFile(filtered[0]);
    }

    return filtered;
  }

  async function mulaiScan() {
    setStatus("Memindai folder " + CONFIG.folder + " …");
    ui.fileSel.innerHTML = "";
    ui.fileSel.options.add(new Option("(memindai…)", ""));
    var list = await scanFiles();
    state.fileList = list.slice();
    ui.fileSel.innerHTML = "";
    if (list.length === 0) {
      ui.fileSel.options.add(new Option("(tidak ditemukan — isi manual)", ""));
      ui.manualRow.style.display = "flex";
      setStatus("Tidak ada file JSON ditemukan. Isi nama file secara manual.");
      return;
    }
    renderFileOptions(ui.fileSearch ? ui.fileSearch.value : "", false);
    ui.manualRow.style.display = "none";
    setStatus("Ditemukan " + list.length + " file JSON. Pilih file lalu klik Tambah.");
    log("Hasil scan: " + list.join(", "));
    if (ui.fileSel.value) muatFile(ui.fileSel.value);
  }

  /* =================== inisialisasi =================== */

  function init() {
    var params = new URLSearchParams(location.search);
    if (params.get("debug") === "0") {
      localStorage.removeItem(STORAGE.debug);
      clearBatchState();
      clearSingleRunState();
      clearEndpointLogs();
      return;
    }
    if (params.get("debug") === "1") {
      localStorage.setItem(STORAGE.debug, "1");
    }

    installEndpointRecorder();

    /* diredirect agar alert() aplikasi tidak memblokir proses uji */
    if (window.alert && !window.__sut_alert_redirected) {
      window.__sut_alert_redirected = true;
      window.__sut_original_alert = window.alert;
      window.alert = function (m) { log("[alert] " + m); };
      log("window.alert dialihkan ke console (kembali normal setelah reload).");
    }

    buildPanel();
    mulaiScan().then(function () {
      var batch = getBatchState();
      if (batch && batch.running) {
        log("Melanjutkan batch dari localStorage: " + (batch.index + 1) + "/" + batch.queue.length);
        setTimeout(lanjutBatch, 500);
        return;
      }
      var single = getSingleRunState();
      if (single && single.running) {
        setTimeout(lanjutSingleRun, 500);
      }
    });
    log("SUT Browser Tester siap. Panel di kanan-bawah.");
  }

  init();
})();
