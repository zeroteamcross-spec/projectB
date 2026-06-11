# UI Fix Mobile Footer, Landing Sort, Search Bar

## Bug User
- Footer mobile buyer dan affiliate terlihat seperti card melayang karena ada gap kiri, kanan, atau bawah.
- Popup tombol `Urutkan` di landing page muncul tertutup card list mobil / toolbar filter.
- Font pada `data-ds="catalog.search.bar"` terlalu besar.

## File yang Diaudit
- `public/assets/js/modules/buyer/`
- `public/assets/js/modules/buyer/components/`
- `public/assets/js/modules/buyer/pages/`
- `public/assets/js/modules/affiliate/`
- `public/assets/js/modules/affiliate/components/`
- `public/assets/js/modules/affiliate/pages/`
- `public/assets/js/layout/`
- `public/assets/js/modules/public/`
- `public/assets/js/modules/public/components/`
- `public/assets/js/modules/public/pages/`
- `public/assets/js/modules/catalog/`
- `public/assets/css/`

## Hasil Audit Selector
- Buyer mobile footer file: `public/assets/js/modules/buyer/components/buyerMobileFooterNav.js`
- Affiliate mobile footer file: `public/assets/js/modules/affiliate/components/affiliateAccountShell.js`, memakai `BuyerMobileFooterNav` lalu mengganti class ke `account-mobile-footer--affiliate`.
- Landing catalog toolbar file: `public/assets/js/modules/public/components/publicSearchFilterBar.js`
- Sort popup file: `public/assets/js/modules/public/components/publicSearchFilterBar.js`
- Search bar file: `public/assets/js/modules/public/components/publicSearchFilterBar.js`
- `data-ds="catalog.filter.toolbar"`: dibuat oleh `applyDesignHook(row, "catalog.filter.toolbar")`.
- `data-ds="catalog.search.bar"`: dibuat oleh `applyDesignHook(section, "catalog.search.bar")`.

## File yang Diubah
- `public/assets/js/modules/buyer/components/buyerMobileFooterNav.js`
- `public/assets/js/modules/public/components/publicSearchFilterBar.js`
- `docs/UI_FIX_MOBILE_FOOTER_LANDING_SORT_SEARCH.md`

## Buyer Footer Fix
- Fixed container tetap `left: 0`, `right: 0`, `bottom: 0`, dan ditambah `width: 100%`.
- Padding horizontal container dihapus agar bar menyentuh sisi kiri dan kanan viewport.
- Shell tidak lagi dibatasi `max-width: 420px`, sehingga footer full-bleed.
- Border kiri, kanan, dan bawah bar dihapus untuk menghindari efek card melayang; radius tetap hanya di bagian atas.
- Safe area kiri/kanan/bawah tetap dipakai untuk isi footer.

## Affiliate Footer Fix
- Affiliate memakai komponen footer mobile buyer melalui wrapper `affiliateMobileFooterNav`.
- Karena class dasar sama, perubahan full-bleed berlaku konsisten untuk `account-mobile-footer--affiliate` tanpa membuat komponen baru.
- Override affiliate tetap hanya warna/z-index existing, tidak mengubah flow navigasi.

## Landing Sort Popup Fix
- Search/filter container diberi stacking context `relative z-30`.
- Toolbar `data-ds="catalog.filter.toolbar"` diberi `relative z-40 overflow-visible`.
- Wrapper sort diberi `relative z-50 overflow-visible`.
- Dropdown sort dinaikkan ke `z-[65]` dan jarak top didekatkan ke tombol agar tidak jatuh terlalu bawah.
- Sort logic dan handler existing tidak diubah.

## Search Bar Font Fix
- Selector `data-ds="catalog.search.bar"` sekarang memakai font 13px di mobile dan 14px mulai `sm`.
- Input search dan placeholder dibuat 13px di mobile dan 14px mulai `sm`.
- Perubahan tidak menyentuh style input global.

## Z-index Strategy
- Mobile footer tetap `z-index: 58`, di atas konten dan di bawah modal global `z-[80]`, mobile drawer `z-[80]`, mobile toggle `z-[90]`, dan toast `z-[9999]`.
- Sort dropdown `z-[65]`, cukup di atas toolbar/card landing, tetap di bawah modal/drawer/notification layer global.
- Tidak ada global z-index besar yang ditambahkan.

## Responsive Smoke Result
- Server lokal aktif di `http://127.0.0.1:8000/`.
- Viewport diuji: `360x800`, `390x844`, `768x1024`, `1280x800`.
- Landing `#/`: `data-ds="catalog.filter.toolbar"` dan `data-ds="catalog.search.bar"` ditemukan di semua viewport.
- Landing sort popup: tombol `Urutkan` membuka menu, menu berada di viewport, `menuZ=65`, `toolbarZ=40` di semua viewport.
- Search bar font: `13px` pada `360x800` dan `390x844`; `14px` pada `768x1024` dan `1280x800`.
- Horizontal overflow: tidak ditemukan pada route smoke.
- Buyer/affiliate route authenticated redirect ke Google login tanpa session lokal, sehingga footer tidak ter-render pada route tersebut.
- Footer component smoke terisolasi: buyer `#byr_mobile_footer_nav` dan affiliate `#afacc_mobile_footer_nav` full-bleed pada `360x800` dan `390x844`, no horizontal overflow, `z-index=58`.
- Footer pada `768x1024` dan `1280x800` `display:none` sesuai breakpoint `md`, expected untuk mobile footer.

## Regression Result
- `node --check public/assets/js/modules/buyer/components/buyerMobileFooterNav.js`: PASS.
- `node --check public/assets/js/modules/public/components/publicSearchFilterBar.js`: PASS.
- `php tests/run.php`: PASS, 14 passed, 0 failed.
- `php -l`: not applicable, no PHP files changed.

## Known Limitations
- Smoke buyer/affiliate bergantung pada state login lokal. Jika tidak ada session, validasi visual route authenticated bisa terbatas pada route yang dapat dirender oleh app lokal.

