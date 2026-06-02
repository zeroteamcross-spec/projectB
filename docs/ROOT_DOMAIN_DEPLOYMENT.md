# Root Domain Deployment

## 1. Tujuan

Menyiapkan ProjectB agar SPA dapat dibuka dari root domain tanpa `/app.html`.

Target URL:

- `https://public.test`
- `https://public.test/#/buyer`
- `https://public.test/#/seller`
- `https://public.test/#/admin`
- `https://public.test/#/affiliate`

Hash routing tetap digunakan. Clean URL tanpa hash bukan scope dokumen ini.

## 2. Current Entry Point

Entry point lama:

- `public/app.html`

Sebelum perubahan, browser smoke dan beberapa runbook membuka:

- `/app.html#/...`

## 3. Final Public URL

Entry point root sekarang:

- `public/index.html`

`public/app.html` tetap ada untuk backward compatibility.

## 4. Option Yang Dipakai

Option A dipakai:

- membuat `public/index.html` yang kompatibel dengan `public/app.html`.
- tidak menghapus `app.html`.
- server root domain standar akan membuka `index.html`.

Local dev router juga disesuaikan agar:

- `/` menyajikan SPA.
- `/api/...` tetap masuk backend PHP.
- `/storage/uploads/...` tetap masuk backend PHP hardening path.
- static asset tetap disajikan langsung.

## 5. File Dibuat / Diubah

- `public/index.html`
- `public/.htaccess`
- `scripts/local_dev_router.php`
- `docs/ROOT_DOMAIN_DEPLOYMENT.md`

## 6. Nginx / aaPanel Sample

Sesuaikan `root`, PHP-FPM socket, dan versi PHP dengan server aktual.

```nginx
server {
    listen 80;
    server_name public.test;
    root /www/wwwroot/public.test/projectB/public;
    index index.html app.html index.php;

    location /api/ {
        try_files $uri /index.php?$query_string;
    }

    location /storage/uploads/ {
        try_files $uri /index.php?$query_string;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param SCRIPT_NAME $fastcgi_script_name;
        fastcgi_pass unix:/tmp/php-cgi-82.sock;
    }
}
```

aaPanel notes:

- Set site root ke folder `projectB/public`.
- Set default document order: `index.html`, `app.html`, `index.php`.
- Tambahkan rewrite API agar `/api/...` diarahkan ke `index.php`.
- Jika PHP-FPM socket berbeda, ganti `fastcgi_pass`.
- Jangan arahkan document root ke folder repo `projectB`; gunakan `projectB/public`.

## 7. Apache / .htaccess Sample

File aktif tersedia di `public/.htaccess`.

```apache
DirectoryIndex index.html app.html

<IfModule mod_rewrite.c>
RewriteEngine On

RewriteCond %{REQUEST_URI} ^/api(/|$)
RewriteRule ^ index.php [QSA,L]

RewriteCond %{REQUEST_URI} ^/storage/uploads/
RewriteRule ^ index.php [QSA,L]

RewriteCond %{REQUEST_FILENAME} -f [OR]
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

RewriteRule ^ index.html [L]
</IfModule>
```

Apache notes:

- Pastikan `AllowOverride` mengizinkan `.htaccess`, atau pindahkan rule ke vhost.
- `mod_rewrite` harus aktif.
- `public/index.php` tetap dipakai untuk API/backend route.

## 8. Asset / API Path Checklist

Asset SPA memakai absolute root path:

- `/assets/js/theme/tailwindRuntimeConfig.js`
- `/assets/js/app.js`
- `/assets/images/bg-vid.mp4`

API frontend memakai base URL:

- `/api`

Path ini aman saat halaman dibuka dari:

- `/`
- `/#/...`
- `/app.html#/...`

API tidak menjadi `/app.html/api`.

## 9. Smoke Checklist

Root:

- buka `http://127.0.0.1:<port>/`
- expected: SPA landing tampil, URL tidak menjadi `/app.html`.

Hash routes:

- `/#/buyer`
- `/#/seller`
- `/#/admin`
- `/#/affiliate`
- `/#/notifications`

Expected:

- route guard frontend berjalan.
- server tidak 404.
- tidak redirect ke `/app.html`.

Backward compatibility:

- `/app.html#/`

Expected:

- masih membuka SPA.

Assets:

- `/assets/js/app.js`
- `/assets/images/bg-vid.mp4`

Expected:

- HTTP 200.

API:

- `/api/health`
- `/api/auth/autologin`
- `/api/auth/me` is not a registered ProjectB endpoint at this time; if checked, it should return backend JSON 404, not SPA HTML.

Expected:

- tetap masuk backend.
- tidak diperlakukan sebagai SPA fallback.

## 10. Rollback Plan

Jika root deployment bermasalah:

1. Hapus atau nonaktifkan `public/index.html`.
2. Kembalikan default document ke `app.html`.
3. Revert `.htaccess` atau vhost rewrite ke konfigurasi sebelumnya.
4. Buka kembali `/app.html#/` sebagai entry lama.
5. Tidak perlu rollback database karena perubahan ini tidak menyentuh schema atau data.
