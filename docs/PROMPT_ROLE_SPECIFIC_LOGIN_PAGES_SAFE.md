# PROMPT CODEX — Role-Specific Login Pages Aman Tanpa Menyentuh Login Existing

## Workspace

Workspace utama yang dikerjakan adalah `projectB`.

`projectA` hanya boleh dibaca sebagai referensi jika benar-benar diperlukan. Jangan ubah `projectA`.

---

## Severity / Guardrail

```txt
CRITICAL SAFETY TASK
AUTH FEATURE — HIGH RISK
```

User meminta:

```txt
Pisahkan halaman login untuk role:
- Buyer
- Admin
- Seller
- Affiliate

Pastikan setiap halaman tidak bisa login role lainnya.
Buat halaman baru, desain sama persis ( 100%) dengan desain login halaman login yang ada saat ini.
Halaman login saat ini biarkan tetap ada, jangan disentuh.
Jangan merusak aplikasi atau mengerjakan di luar permintaan.
Perketat Codex agar tidak ngawur dan merusak aplikasi.
Fitur baru tidak boleh menyentuh kode lainnya.
```

Codex wajib sangat ketat.

---

## Core Rule — Existing Feature Safety

```txt
Fitur baru harus additive.
Fitur baru tidak boleh merusak fitur existing.
Logout harus mengarah ke halaman login masing-masing rule ( WAJIB), jika login sebagai buyer saat logout wajib ke halaman login buyer, jangan sampai salah apalagi sampai pindah ke role lain ( ini akan menjadi kesalahan yang sangat fatal, jangan sampai hal ini terjadi. Perhatikan dengan baik dan jalankan dengan ketat. Pastikan berulang kali smpai tidak ada error atau BUG saat logout. Pastikan Logout berjalan dengan benar. Jangan merusak Aplikasi. Buatkan TOmbol Logout baru dan pertahankan tombol logout saat ini, tapi hapus dari tampilan. Tujuannya agar tidak merusak sistem.
```

Halaman login existing saat ini:

```txt
JANGAN DISENTUH.
JANGAN DIUBAH.
JANGAN DIREFACTOR.
JANGAN DIPINDAHKAN.
JANGAN DIGANTI.
JANGAN DIHAPUS.
```

Jika implementasi role-specific login membutuhkan perubahan besar pada login existing, STOP dan minta konfirmasi.

Default aman:

```txt
Buat route/page/component baru yang memakai service login existing secara backward-compatible, lalu validasi role setelah login response.
```

---

## Task

Tambahkan halaman login baru khusus role:

```txt
#/login/buyer
#/login/admin
#/login/seller
#/login/affiliate
```

atau route lain jika struktur route ProjectB punya pola auth yang berbeda, tetapi harus jelas dan konsisten.

Setiap halaman hanya boleh menerima role sesuai halaman:

```txt
#/login/buyer     -> hanya role buyer
#/login/admin     -> hanya role admin
#/login/seller    -> hanya role seller
#/login/affiliate -> hanya role affiliate_admin
```

Role canon backend tetap:

```txt
buyer
admin
seller
affiliate_admin
```

Label UI boleh:

```txt
Buyer
Admin
Seller
Affiliate
```

---

## Halaman Login Existing

Halaman login existing saat ini tetap ada dan tetap bekerja.

Contoh kemungkinan route existing:

```txt
#/login
#/auth/login
#/signin
```

Codex harus audit route aktual dan mencatatnya.

Aturan:

- jangan ubah behavior login existing.
- jangan ubah layout login existing.
- jangan ubah redirect login existing.
- jangan ubah API login existing kecuali benar-benar additive dan backward-compatible.
- jangan mengganti route existing ke role-specific page.
- jangan redirect paksa dari existing login ke halaman baru.
- jangan menghapus opsi login existing.

---

## Clarification Rule

Sebelum eksekusi, Codex wajib berhenti dan bertanya jika ada hal ambigu yang berdampak pada:

- auth API contract
- login existing behavior
- redirect after login
- role canon
- route naming
- session/cookie
- remember me
- impersonation
- account approval/pending state
- role guard
- multi-role user behavior
- UI shell auth/public layout

Jangan menebak.

Jika tidak bisa membuat fitur ini tanpa menyentuh kode login existing, STOP dan minta konfirmasi.

---

## Scope Ketat

Yang boleh dikerjakan:

1. Tambah route login khusus role.
2. Tambah page/component baru untuk login role-specific.
3. Tambah wrapper/service helper baru jika diperlukan.
4. Tambah validasi frontend setelah response login:
   - jika role sesuai, lanjut.
   - jika role tidak sesuai, logout/clear auth context lalu tampilkan error.
5. Tambah docs.
6. Tambah smoke test.

Yang tidak boleh dikerjakan:

- refactor login existing.
- ubah endpoint login existing secara breaking.
- ubah auth/session/cookie core.
- ubah role canon.
- ubah route dashboard existing.
- ubah permission system.
- ubah impersonation.
- ubah halaman buyer/seller/admin/affiliate existing.
- mengerjakan payment/notification/layout lain.
- mengubah projectA.

---

## Dokumen yang Perlu Dibaca

Baca seperlunya saja:

```txt
projectB/AGENTS.md
projectB/docs/FRONTEND_ARCHITECTURE_SPEC.md
projectB/docs/FEATURE_MODULE_CONTRACT.md
projectB/docs/KNOWN_LIMITATIONS.md
projectB/docs/PROJECTB_FINAL_FULL_REGRESSION_GATE.md
projectB/docs/PROJECTB_RELEASE_PREPARATION_GATE.md
```

Audit code terkait auth:

```txt
public/assets/js/modules/auth/
public/assets/js/modules/auth/pages/
public/assets/js/modules/auth/components/
public/assets/js/resources/authResource.js
public/assets/js/state/authStore.js
public/assets/js/core/app.js
public/assets/js/router/
public/assets/js/layout/
app/Modules/Auth/
routes/api.php
```

Jangan membaca seluruh docs di luar kebutuhan task.

---

# A. Audit Login Existing

Sebelum patch, audit dan laporkan:

1. Route login existing.
2. Page/component login existing.
3. Resource/service login existing.
4. API endpoint login.
5. Response login shape.
6. Field role pada response.
7. Redirect setelah login existing.
8. Cara authStore diupdate.
9. Cara remember me/cookie bekerja.
10. Cara logout/clear auth bekerja.

Output wajib:

```txt
Existing login route: <route>
Existing login files: <files>
Existing login behavior: unchanged
```

---

# B. Route Baru yang Diminta

Tambahkan route baru:

```txt
#/login/buyer
#/login/admin
#/login/seller
#/login/affiliate
```

Jika ProjectB memakai prefix auth:

```txt
#/auth/login/buyer
#/auth/login/admin
#/auth/login/seller
#/auth/login/affiliate
```

boleh, tetapi harus konsisten dan terdokumentasi.

Jangan mengubah route login existing.

---

# C. UI Requirement

Setiap halaman login punya identitas role jelas:

## Buyer Login

```txt
Login Buyer
Masuk sebagai Buyer
```

## Admin Login

```txt
Login Admin
Masuk sebagai Admin
```

## Seller Login

```txt
Login Seller
Masuk sebagai Seller
```

## Affiliate Login

```txt
Login Affiliate
Masuk sebagai Affiliate
```

Form minimal:

- email
- password
- remember me jika existing login punya
- submit button
- error message
- link kembali ke landing/login existing jika diperlukan

UI harus:

- mobile-friendly.
- tidak merusak background/video existing jika auth page memakai itu.
- button memakai theme token.
- icon center jika ada.
- tidak membuka sidebar.
- tidak fetch langsung di component.

---

# D. Role Lock Requirement

Setiap role-specific login harus menolak role lain.

Contoh:

```txt
User seller mencoba login di #/login/buyer -> ditolak.
User buyer mencoba login di #/login/admin -> ditolak.
User affiliate_admin mencoba login di #/login/seller -> ditolak.
User admin mencoba login di #/login/affiliate -> ditolak.
```

Pesan error:

```txt
Akun ini bukan akun Buyer.
Silakan gunakan halaman login yang sesuai.
```

atau sesuai role:

```txt
Akun ini bukan akun Seller.
Akun ini bukan akun Admin.
Akun ini bukan akun Affiliate.
```

Setelah role mismatch:

- jangan biarkan user tetap login.
- clear auth context/token/cookie session yang baru dibuat jika login API sempat sukses.
- jangan redirect ke dashboard role lain.
- tampilkan error di halaman login role-specific.
- jangan reload halaman.
- jangan mengubah login existing.

---

# E. Implementasi Role Lock yang Aman

Karena API login existing mungkin hanya validasi email/password lalu set session, opsi aman:

## Flow Role-Specific Login

1. Submit email/password ke login API existing via authResource/service.
2. Terima response auth/user.
3. Cek role response.
4. Jika role sesuai:
   - set authStore seperti flow existing.
   - redirect ke dashboard sesuai role.
5. Jika role tidak sesuai:
   - panggil logout/clear session endpoint jika session/cookie sudah dibuat.
   - clear authStore.
   - tampilkan error role mismatch.
   - tetap di halaman login khusus.

Jangan mengubah endpoint login existing kecuali perlu.

## Optional Backend Hardening

Jika ingin lebih aman, boleh tambah endpoint additive:

```http
POST /api/auth/login/role
```

dengan body:

```json
{
  "email": "...",
  "password": "...",
  "expected_role": "seller"
}
```

Tetapi hanya boleh jika additive dan tidak mengubah login existing.

Jika ini butuh perubahan besar, jangan lakukan.

Default: frontend role lock + server session clear mismatch.

---

# F. Redirect Setelah Login Berhasil

Mapping:

```txt
buyer            -> #/buyer
admin            -> #/admin
seller           -> #/seller
affiliate_admin  -> #/affiliate
```

Jangan mengubah redirect existing login.

---

# G. Auth Store / Preload Rules

Saat role-specific login sukses:

- authStore update sesuai flow existing.
- preload role terkait berjalan seperti login normal.
- notification snapshot role terkait berjalan.
- working/snapshot state role lain tidak stale.
- tidak reload.

Saat role mismatch:

- authStore clear.
- token/cookie/session hasil login dibersihkan.
- no preload role target.
- no notification polling start.
- error tampil.

---

# H. Regression Minimal Wajib

Karena auth sensitif, setelah patch wajib cek:

## Login Existing

```txt
existing login route tetap bisa dibuka.
existing login behavior tetap sama.
```

## Role-Specific Positive

```txt
#/login/buyer dengan akun buyer -> #/buyer PASS
#/login/admin dengan akun admin -> #/admin PASS
#/login/seller dengan akun seller -> #/seller PASS
#/login/affiliate dengan akun affiliate_admin -> #/affiliate PASS
```

## Role-Specific Negative

```txt
akun seller di #/login/buyer -> ditolak, tetap tidak login
akun buyer di #/login/seller -> ditolak, tetap tidak login
akun affiliate_admin di #/login/admin -> ditolak, tetap tidak login
akun admin di #/login/affiliate -> ditolak, tetap tidak login
```

Minimal negative wajib:

- satu mismatch untuk setiap halaman login role-specific.

## Existing Role Routes

Setelah positive login:

```txt
buyer: #/buyer
admin: #/admin
seller: #/seller
affiliate: #/affiliate
```

semua terbuka sesuai role.

---

# I. Jangan Mengganggu Impersonation

Karena baru saja ada masalah impersonation, task ini tidak boleh menyentuh impersonation kecuali audit menemukan tabrakan route auth.

Jangan:

- ubah admin login sebagai seller.
- ubah admin login sebagai affiliate.
- ubah stop impersonation.
- ubah impersonation cookie/session.
- ubah banner impersonation.

Jika role-specific login mempengaruhi impersonation, STOP dan minta konfirmasi.

---

# J. Testing / Verification

## JS

Jika JS berubah:

```bash
node --check <changed-js>
```

## PHP

Jika PHP berubah:

```bash
php -l <changed-php>
```

## Full Test

Wajib:

```bash
php tests/run.php
```

Expected:

```txt
13 passed, 0 failed
```

## Browser Smoke

Wajib browser smoke role-specific login.

Jika credentials tidak tersedia:

- cari seed/docs.
- jika tetap tidak ada, STOP dan minta user menyediakan credentials.
- jangan klaim selesai tanpa smoke.

Evidence wajib:

```txt
route tested
role account used
expected result
actual result
```

---

# K. Dokumentasi Wajib

Buat dokumen:

```txt
projectB/docs/ROLE_SPECIFIC_LOGIN_PAGES.md
```

Isi:

1. Tujuan fitur.
2. Route baru.
3. Login existing tetap tidak berubah.
4. Role lock behavior.
5. Positive login mapping.
6. Negative mismatch behavior.
7. Session cleanup on mismatch.
8. Regression matrix.
9. Files changed.
10. Known limitations.

Update jika relevan:

```txt
projectB/docs/FRONTEND_ARCHITECTURE_SPEC.md
projectB/docs/FEATURE_MODULE_CONTRACT.md
projectB/docs/KNOWN_LIMITATIONS.md
```

---

# L. Hal yang Tidak Boleh Dilakukan

Jangan:

- mengubah projectA.
- mengubah login existing.
- menghapus login existing.
- redirect login existing ke role-specific login.
- mengubah endpoint login existing secara breaking.
- mengubah auth/session core tanpa kebutuhan.
- mengubah role canon.
- mengubah impersonation.
- mengubah dashboard role.
- menambah fitur lain.
- membuat reload workaround.
- membuat direct fetch di component.
- klaim selesai tanpa browser smoke positive dan negative.

---

# M. Acceptance Criteria

Task selesai hanya jika:

- Halaman login Buyer baru ada.
- Halaman login Admin baru ada.
- Halaman login Seller baru ada.
- Halaman login Affiliate baru ada.
- Halaman login existing tetap ada dan tidak berubah.
- Buyer login page hanya menerima buyer.
- Admin login page hanya menerima admin.
- Seller login page hanya menerima seller.
- Affiliate login page hanya menerima affiliate_admin.
- Role mismatch dibersihkan dari session/authStore.
- Redirect sukses sesuai role.
- Tidak menyentuh impersonation.
- Tidak merusak admin login sebagai seller.
- Tidak merusak admin login sebagai affiliate.
- `php tests/run.php` tetap 13/0.
- `node --check` pass untuk JS berubah.
- Browser smoke positive/negative dijalankan.
- Tidak ada perubahan projectA.

---

# N. Output yang Diminta dari Codex

Output setelah selesai:

1. Ringkasan task.
2. File/dokumen yang diperiksa.
3. Existing login route dan bukti tidak diubah.
4. File yang diubah.
5. Route baru:
   - Buyer
   - Admin
   - Seller
   - Affiliate
6. Role lock implementation.
7. Session cleanup on mismatch.
8. Redirect mapping.
9. Penjelasan kenapa tidak menyentuh login existing.
10. Penjelasan kenapa tidak menyentuh impersonation.
11. Positive browser smoke:
    - buyer
    - admin
    - seller
    - affiliate
12. Negative browser smoke:
    - mismatch tiap halaman
13. Existing login smoke.
14. Ada/tidak direct fetch.
15. Ada/tidak reload workaround.
16. Ada/tidak perubahan projectA.
17. Verifikasi:
    - node-check
    - php-l jika ada
    - php tests/run.php
18. Docs yang dibuat/diupdate.
19. Final recommendation:
    - SAFE / STILL BLOCKED
20. Follow-up jika ada.

---

# Catatan Penting

Ini fitur auth baru, tetapi harus benar-benar additive.

Aturan final:

```txt
Create new role-specific login pages.
Do not touch existing login page.
Do not touch impersonation.
Do not break any existing auth flow.
If implementation needs touching risky auth core, stop and ask first.
```
