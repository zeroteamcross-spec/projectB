# Slider Management Module

## Tujuan

Modul Slider dipakai admin untuk mengelola banner yang tampil pada public catalog hero dan buyer dashboard hero. Implementasi dibuat preload-first agar halaman publik/buyer membaca snapshot/working state, bukan fetch langsung dari komponen saat halaman dibuka.

## Data Model

Tabel: `sliders`

Field utama:
- `code`
- `title`
- `subtitle`
- `body_text` / response alias `description`
- `image_url`
- `image_alt`
- `cta_text`
- `cta_url`
- `position_key`
- `template_key`
- `animation_key`
- `sort_order`
- `is_active`
- `start_at`
- `end_at`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `deleted_at`

Position key:
- `landing_hero`
- `public_home`
- `buyer_home`

Template key:
- `elegant_gradient`
- `glassmorphism`
- `minimal_product`
- `full_image`

Animation key:
- `fade`
- `slide`
- `zoom`
- `rise`
- `none`

SQL patch:
- `scripts/sql/20260519_sliders.sql`

## API Contract

Admin:
- `GET /api/admin/sliders`
- `GET /api/admin/sliders/{id}`
- `POST /api/admin/sliders`
- `PUT /api/admin/sliders/{id}`
- `PATCH /api/admin/sliders/{id}`
- `DELETE /api/admin/sliders/{id}`
- `POST /api/admin/sliders/{id}/toggle`
- `POST /api/admin/sliders/reorder`
- `POST /api/admin/sliders/upload-image`

Public:
- `GET /api/sliders?position=public_home`
- `GET /api/sliders?position=landing_hero`
- `GET /api/sliders?position=buyer_home`

Response list:
```json
{
  "success": true,
  "data": {
    "sliders": []
  },
  "meta": {
    "limit": 5,
    "position": "public_home"
  }
}
```

Upload response keeps the standard API envelope and includes direct URL in `data.url`:
```json
{
  "success": true,
  "data": {
    "url": "/storage/uploads/sliders/example.webp",
    "asset": {
      "url": "/storage/uploads/sliders/example.webp"
    }
  }
}
```

## Admin UI Behavior

Route:
- `#/admin/sliders`

Menu:
- Admin sidebar label: `Slider`

Admin page behavior:
- list uses shared `DataTable`
- create/edit/preview use shared modal
- modal does not close via backdrop
- upload supports drag and drop plus file input
- image preview appears before saving the slider
- template selection is visual: admin can click preview cards and see a live slider preview in the modal
- live preview uses the same `SliderBanner` renderer as public/buyer output, with controlled title/body sizes so the preview does not diverge from the real banner
- required fields are validated in the frontend before submit; incomplete title/image/template/position/animation/sort/CTA schedule data is blocked before hitting the backend
- save success toast uses the server response message, and failed backend responses surface the server message/error details without clearing the current form draft
- toggle active/inactive is row action
- reorder is available through up/down row actions
- archive uses soft delete through `deleted_at`

Form fields:
- Title
- Description
- Upload Image
- Image URL
- Image Alt
- Template Selection
- Position
- Animation
- CTA Text
- CTA URL
- Schedule Start
- Schedule End
- Active Toggle
- Sort Order

## Sanitization Rule

The MVP does not accept custom admin HTML. `html_content` exists in the schema for future compatibility but the create/update flow stores it as `null`.

Rendered HTML comes only from predefined frontend templates:
- `elegant_gradient`
- `glassmorphism`
- `minimal_product`
- `full_image`

`full_image` renders an empty banner surface with only the uploaded image. It uses the same fixed banner aspect ratio as other templates and `object-fit: cover`, so different uploaded image dimensions do not change slider size.

Slider text is inserted through `textContent`. CTA URL is validated server-side and must be:
- `http://...`
- `https://...`
- `#/...`
- safe relative path beginning with `/`

Rejected:
- `<script>`
- inline event handlers
- `javascript:` URL
- iframe
- arbitrary style/HTML input

## Upload Rule

Endpoint:
- `POST /api/admin/sliders/upload-image`

Storage:
- `storage/uploads/sliders`

Rules:
- admin only
- field name: `image`
- allowed MIME: `image/jpeg`, `image/png`, `image/webp`
- allowed extension: `jpg`, `jpeg`, `png`, `webp`
- max size: 5MB
- stored file name is random via storage service
- served through existing `/storage/uploads/...` public handler

## Preload And Cache

Boot snapshot keys:
- `public.slidersPublicHome`
- `public.slidersLandingHero`
- `buyer.slidersBuyerHome`
- `admin.sliders`

Route working keys:
- `working.publicCatalog.sliders`
- `working.buyerDashboard.sliders`
- `working.adminSliders.sliders`

Admin mutations patch admin working/snapshot state and mark public/buyer slider snapshots stale:
- `public.slidersPublicHome`
- `public.slidersLandingHero`
- `buyer.slidersBuyerHome`

## Public/Buyer Render Location

Public:
- route `#/public`
- existing root `#/` remains supported
- component replaces public catalog hero when active slider exists
- fallback old hero remains if no slider is active

Buyer:
- route `#/buyer`
- component replaces buyer hero when active slider exists
- fallback old buyer hero remains if no slider is active

Layout rule:
- Slider selalu berbentuk banner persegi panjang memanjang.
- Public dan buyer memakai komposisi template yang sama di desktop maupun mobile.
- Saat viewport menyempit, ukuran elemen dipadatkan tetapi posisi teks, CTA, image, dan indikator tidak berpindah stack ke layout berbeda.
- Renderer memakai rasio banner stabil agar informasi penting tidak berubah posisi antar viewport.
- Slider carousel otomatis bergeser setiap sekitar 5 detik jika ada lebih dari satu slider dan looping terus menerus dari slide terakhir kembali ke slide pertama.
- Dots dapat diklik untuk memilih slide dan timer carousel akan lanjut dari pilihan terakhir.
- Maksimal 5 slider dirender per halaman agar first load tetap ringan.

Active slider rule:
- `is_active = true`
- `deleted_at IS NULL`
- `start_at IS NULL OR current_time >= start_at`
- `end_at IS NULL OR current_time <= end_at`

## Security Notes

- CRUD/upload routes require authenticated admin role.
- Public endpoint only returns active scheduled sliders.
- HTML is not accepted from admin input.
- CTA URL blocks `javascript:`.
- Upload validates MIME, extension, and size.
- Public rendering uses DOM APIs and `textContent`.

## Smoke Checklist

- Login admin.
- Open `#/admin/sliders`.
- Create slider with title, description, image, template, position, CTA, schedule.
- Preview slider modal.
- Edit slider.
- Toggle inactive/active.
- Reorder up/down.
- Confirm DataTable updates without full page reload.
- Open `#/public`.
- Open `#/buyer`.
- Confirm active scheduled slider appears.
- Confirm empty slider state falls back to old hero.
- Try script/onclick/javascript URL input and confirm it is not accepted/executed.
- Confirm non-admin cannot mutate slider endpoints.
