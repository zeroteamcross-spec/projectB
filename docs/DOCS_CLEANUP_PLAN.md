# DOCS_CLEANUP_PLAN.md

## Tujuan

Dokumen ini menjadi acuan untuk merampingkan folder `projectB/docs/` agar:

- prompt kerja tidak boros karena membaca terlalu banyak file
- file yang benar-benar aktif tetap mudah ditemukan
- dokumen histori atau transisional tidak mengganggu pekerjaan harian
- tim tetap punya arsip yang rapi untuk kebutuhan referensi lama

Prinsip utama:

1. **Jangan hapus permanen dulu** dokumen lama yang masih mungkin dibutuhkan.
2. Pindahkan dokumen yang sifatnya histori, migrasi, atau transisional ke `docs/archive/`.
3. Pertahankan hanya dokumen yang benar-benar menjadi **source of truth aktif** di root `docs/`.
4. Gunakan pola prompt yang membaca **file inti** terlebih dahulu, lalu tambahkan file kontekstual sesuai task.

---

## Kategori Dokumen

### 1. KEEP — Tetap di `projectB/docs/`

Dokumen dalam kategori ini masih aktif dipakai sebagai acuan utama untuk pengembangan, operasi, UAT, dan release.

#### Arsitektur dan source of truth
- `SYSTEM_OVERVIEW.md`
- `FRONTEND_ARCHITECTURE_SPEC.md`
- `FEATURE_MODULE_CONTRACT.md`
- `SCHEMA_CANON.md`
- `AFFILIATE_FINANCE_CANON.md`
- `KNOWN_LIMITATIONS.md`
- `ROADMAP_PROJECTB.md`

#### Operasional dan validasi aktif
- `ENVIRONMENT_VARIABLES.md`
- `ENV_SETUP_CHECKLIST.md`
- `UAT_CHECKLIST.md`
- `OPERATIONS_RUNBOOK.md`
- `RUNBOOK_SETTLEMENT_BASELINE.md`
- `RELEASE_READINESS_CHECKLIST.md`

### Kenapa file-file ini tetap di root `docs/`
File-file ini menjawab kebutuhan utama saat Codex atau developer mulai bekerja:

- sistem ini apa dan konteks bisnisnya bagaimana
- arsitektur frontend dan aturan pengembangan seperti apa
- schema canon dan aturan finance affiliate apa
- limitation aktif apa yang harus dihormati
- environment dan UAT dijalankan seperti apa
- runbook operasional dan settlement baseline bagaimana
- release readiness dinilai dengan checklist apa
- roadmap berikutnya ke mana

---

### 2. ARCHIVE — Pindah ke `projectB/docs/archive/`

Dokumen dalam kategori ini masih berguna sebagai referensi, tetapi tidak perlu dibaca setiap prompt atau setiap sesi kerja baru.

#### Histori migrasi dan referensi transisi
- `MIGRATION_MAP.md`
- `COMPONENT_SYSTEM_SPEC.md`
- `GLOBAL_STORE_AND_PRELOAD_SPEC.md`

#### Histori readiness dan handoff
- `FINAL_READINESS_REPORT.md`
- `STAGING_UAT_HANDOFF.md`

#### Dokumen transisional staging/deployment lama
- `STAGING_DEPLOYMENT_GUIDE.md`
- `STAGING_GO_LIVE_CHECKLIST.md`
- `UAT_EXECUTION_PLAN.md`

### Kenapa file-file ini dipindah ke archive
File-file ini umumnya bersifat:

- histori fase sebelumnya
- panduan staging/transisi
- dokumen migrasi
- handoff readiness lama
- referensi teknis yang berguna, tetapi tidak lagi menjadi source of truth harian

Mereka tetap perlu disimpan, tetapi tidak perlu tinggal di root `docs/`.

---

### 3. OPTIONAL — Bisa tetap di root atau ikut archive

Dokumen berikut masih bisa berguna, tetapi tidak wajib dibaca untuk sebagian besar task.

- `SMOKE_TEST_CHECKLIST.md`
- `POST_UAT_ISSUE_TEMPLATE.md`
- `LOCAL_MIDTRANS_MANUAL_TEST.md`
- `PRODUCTION_CAVEATS.md`

#### Rekomendasi
**Tetap di root `docs/` bila masih sering dipakai:**
- `SMOKE_TEST_CHECKLIST.md`
- `POST_UAT_ISSUE_TEMPLATE.md`

**Pindah ke `docs/archive/` bila jarang dipakai:**
- `LOCAL_MIDTRANS_MANUAL_TEST.md`
- `PRODUCTION_CAVEATS.md`

---

## Struktur Folder yang Disarankan

### Root `docs/`
```text
docs/
  AFFILIATE_FINANCE_CANON.md
  ENVIRONMENT_VARIABLES.md
  ENV_SETUP_CHECKLIST.md
  FEATURE_MODULE_CONTRACT.md
  FRONTEND_ARCHITECTURE_SPEC.md
  KNOWN_LIMITATIONS.md
  OPERATIONS_RUNBOOK.md
  RELEASE_READINESS_CHECKLIST.md
  ROADMAP_PROJECTB.md
  RUNBOOK_SETTLEMENT_BASELINE.md
  SCHEMA_CANON.md
  SYSTEM_OVERVIEW.md
  UAT_CHECKLIST.md
```

### `docs/archive/`
```text
docs/archive/
  COMPONENT_SYSTEM_SPEC.md
  FINAL_READINESS_REPORT.md
  GLOBAL_STORE_AND_PRELOAD_SPEC.md
  MIGRATION_MAP.md
  STAGING_DEPLOYMENT_GUIDE.md
  STAGING_GO_LIVE_CHECKLIST.md
  STAGING_UAT_HANDOFF.md
  UAT_EXECUTION_PLAN.md
```

### Optional
```text
docs/
  SMOKE_TEST_CHECKLIST.md
  POST_UAT_ISSUE_TEMPLATE.md

docs/archive/
  LOCAL_MIDTRANS_MANUAL_TEST.md
  PRODUCTION_CAVEATS.md
```

---

## File Inti yang Wajib Dibaca Secara Default

Untuk sebagian besar task Codex/developer, cukup baca file berikut:

- `projectB/AGENTS.md`
- `projectB/docs/SYSTEM_OVERVIEW.md`
- `projectB/docs/FRONTEND_ARCHITECTURE_SPEC.md`
- `projectB/docs/FEATURE_MODULE_CONTRACT.md`
- `projectB/docs/SCHEMA_CANON.md`
- `projectB/docs/KNOWN_LIMITATIONS.md`

### Tambahkan file berikut sesuai konteks

#### Jika task terkait affiliate finance
Tambahkan:
- `projectB/docs/AFFILIATE_FINANCE_CANON.md`

#### Jika task terkait UAT atau release
Tambahkan:
- `projectB/docs/UAT_CHECKLIST.md`
- `projectB/docs/RELEASE_READINESS_CHECKLIST.md`
- `projectB/docs/ENV_SETUP_CHECKLIST.md`

#### Jika task terkait settlement baseline
Tambahkan:
- `projectB/docs/RUNBOOK_SETTLEMENT_BASELINE.md`
- `projectB/docs/OPERATIONS_RUNBOOK.md`

#### Jika task terkait perencanaan berikutnya
Tambahkan:
- `projectB/docs/ROADMAP_PROJECTB.md`

---

## Pola Prompt Hemat yang Disarankan

Gunakan pola seperti ini sebagai default:

```text
Workspace yang dikerjakan adalah projectB.

Baca file berikut terlebih dahulu:
- projectB/AGENTS.md
- projectB/docs/SYSTEM_OVERVIEW.md
- projectB/docs/FRONTEND_ARCHITECTURE_SPEC.md
- projectB/docs/FEATURE_MODULE_CONTRACT.md
- projectB/docs/SCHEMA_CANON.md
- projectB/docs/KNOWN_LIMITATIONS.md

Tambahan konteks:
- bila task terkait affiliate finance, baca juga projectB/docs/AFFILIATE_FINANCE_CANON.md
- bila task terkait UAT/release, baca juga projectB/docs/UAT_CHECKLIST.md dan projectB/docs/RELEASE_READINESS_CHECKLIST.md
- bila task terkait settlement baseline, baca juga projectB/docs/RUNBOOK_SETTLEMENT_BASELINE.md dan projectB/docs/OPERATIONS_RUNBOOK.md
```

### Kenapa pola ini lebih baik
Karena:

- lebih hemat token
- lebih cepat diproses
- tetap cukup kuat sebagai konteks
- file tambahan hanya dibaca bila relevan dengan task

---

## Rencana Eksekusi Cleanup

### Tahap 1 — Buat folder archive
Buat folder:
```text
projectB/docs/archive/
```

### Tahap 2 — Pindahkan file archive
Pindahkan file berikut ke `docs/archive/`:

- `MIGRATION_MAP.md`
- `COMPONENT_SYSTEM_SPEC.md`
- `GLOBAL_STORE_AND_PRELOAD_SPEC.md`
- `FINAL_READINESS_REPORT.md`
- `STAGING_UAT_HANDOFF.md`
- `STAGING_DEPLOYMENT_GUIDE.md`
- `STAGING_GO_LIVE_CHECKLIST.md`
- `UAT_EXECUTION_PLAN.md`

### Tahap 3 — Putuskan file optional
Evaluasi apakah file berikut masih aktif dipakai:

- `SMOKE_TEST_CHECKLIST.md`
- `POST_UAT_ISSUE_TEMPLATE.md`
- `LOCAL_MIDTRANS_MANUAL_TEST.md`
- `PRODUCTION_CAVEATS.md`

### Tahap 4 — Update instruksi prompt internal
Mulai gunakan prompt hemat berbasis **file inti + file kontekstual**, bukan “baca seluruh docs/”.

---

## Hal yang Jangan Dilakukan

- Jangan hapus permanen file lama yang masih mungkin dibutuhkan untuk audit atau histori.
- Jangan membiarkan root `docs/` terus bertambah tanpa kategori.
- Jangan memaksa semua prompt membaca semua file di `docs/`.
- Jangan menjadikan dokumen staging/transisi lama sebagai source of truth aktif.

---

## Hasil yang Diharapkan Setelah Cleanup

Jika cleanup ini dijalankan, hasilnya:

- root `docs/` menjadi lebih ringkas
- prompt Codex lebih hemat dan cepat
- source of truth aktif lebih jelas
- dokumen lama tetap aman di archive
- onboarding developer/Codex jadi lebih mudah
- risiko membaca dokumen usang sebagai acuan aktif menjadi lebih kecil

---

## Status Dokumen Ini

Dokumen ini adalah rencana cleanup dokumentasi aktif.  
Jika struktur `docs/` berubah lagi di masa depan, dokumen ini perlu diperbarui agar tetap selaras dengan praktik kerja terbaru.
