# Affiliate Account Login and Layout

## Role Canon

- Auth role canon for affiliate accounts is `affiliate_admin`.
- UI may label the role as `Affiliate`, but storage, auth, preload, and notifications keep `affiliate_admin`.
- Login uses the existing `#/auth` page.
- Successful affiliate login redirects to `#/affiliate`.

## Seller Create Affiliate Flow

- Seller creates affiliate from `#/seller/affiliates`.
- Create form requires:
  - affiliate name
  - login email
  - password
  - password confirmation
  - WhatsApp phone
  - referral slug
  - affiliate status
- Backend creates the `users` row and `affiliates` row in one transaction.
- The affiliate user is created with role `affiliate_admin`.
- Active affiliate status maps to active login access.
- Inactive affiliate status maps to suspended login access.
- Edit keeps password optional:
  - empty password means no password change
  - filled password resets affiliate login password

## Password and Security Rules

- Password is never stored as plain text.
- Backend hashes password with `password_hash(..., PASSWORD_DEFAULT)`.
- API responses must not include password or password hash.
- Seller can reset password by entering a new password on edit, but cannot view the existing password.
- Email must be unique in `users`.
- Seller can only manage affiliates owned by that seller through the existing affiliate policy.

## State and Sync

- Seller affiliate create/update patches the active working collection and seller preload snapshot/cache.
- No route reload is used as the primary sync mechanism.
- The modal does not fetch extra data when opened.
- Mutation calls are limited to save actions.

## Affiliate Account Layout

- Affiliate account pages use a buyer-like account shell:
  - mobile-first
  - no sidebar
  - mobile bottom nav
  - desktop top nav
  - header action order `[NotificationBell] [Profile/User]`
  - background video visible like buyer pages
- Applied account routes:
  - `#/affiliate`
  - `#/affiliate/ledger`
  - `#/affiliate/activity`
  - `#/affiliate/settlements`
  - `#/profile` when current role is `affiliate_admin`
  - `#/notifications` when current role is `affiliate_admin`
- Public affiliate routes remain public and are not converted to account shell:
  - `#/af/:slug`
  - `#/af/:slug/cars/:id`
  - `#/af/:slug/transactions/new`

## Affiliate Account Layout Polish

- Affiliate account follows buyer-style mobile-first layout.
- Desktop top nav `afacc_desktop_top_nav` uses the same background treatment as buyer transaction top nav `byrtx_desktop_top_nav`: `bg-[color-mix(in_srgb,var(--pb-surface-card)_92%,transparent)]`, with the same border, card shadow, and backdrop blur direction.
- Mobile footer reuses the account footer component with `account-mobile-footer--affiliate`, scoped contrast rules, and visible icon/text labels above the background video.
- Text outside cards uses white color on video background.
- Card content keeps normal readable color.
- Affiliate account card/list sections use `min-w-0`, wrapping text, and responsive grids to avoid mobile overflow.

## Notifications

- Affiliate account pages use the global `NotificationBell`.
- Opening the popover reads preloaded notification state and does not fetch.
- Commission notifications link to `#/affiliate/ledger`.
- Settlement paid notifications link to `#/affiliate/settlements`.

## Regression Checklist

- Buyer keeps buyer no-sidebar account layout.
- Seller and admin keep their sidebar/header shell.
- Public affiliate landing remains public.
- Seller affiliate response does not expose password.
- Affiliate login redirects to `#/affiliate`.
