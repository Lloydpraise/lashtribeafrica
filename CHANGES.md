# Mobile pass — lashtribeafrica

Extract this zip over the repo root (paths match the repo). `npm run build` passes.
These changes were written from the code only, not checked on a device or in screenshots yet.

Desktop styling is untouched: every visual rule lives inside max-width media queries.
Phone breakpoint is 880px (admin shell 860px, modals/tables 640px, course editor 980px).

## New files
- src/styles/mobile-ecommerce.css  (imported by layouts/ecommerce/Layout.astro)
- src/styles/mobile-academy.css    (imported by layouts/academy/Layout.astro)
- src/admin/admin-mobile.css       (imported by AdminApp.jsx)
- src/admin/components/MobileTabs.jsx  (phone-only bottom tab bar + "More" sheet)

## Changed files
- layouts (ecommerce, academy) + pages/admin/index.astro: viewport-fit=cover so safe-area padding works on iPhones
- ProductRail.astro: new showViewAll prop (default true)
- shop.astro: category chip bar (phone only) + highlight script; the self-linking "View All Products" is removed on /shop (desktop too)
- KitStrip.astro, KitProductCard.astro, kit/[slug].astro: phone-only tweaks inside their scoped styles
- AdminApp.jsx: bottom tabs, scroll-to-top on navigate, copies table headers onto cells for the phone card layout
- Sidebar.jsx: also exports ICONS
- CourseEditor.jsx: phone master/detail for lessons (list OR lesson, "← Lessons" back button)

## Not changed / worth knowing
- Admin Logout: styled in admin.css but never rendered by Sidebar.jsx; I found no logout code, so nothing added.
- Academy progress rail vs sticky video overlap: suspected, not confirmed, left alone.
- Flip cards use absolutely positioned faces, so they get a taller height on phones rather than auto height.
- lashtribe-academy-astro/ (older copy inside the repo) untouched.

# Customers, profile, certificates, orders

New: `supabase/migrations/0011_customers_orders.sql` (run after 0010; see migrations/README.md for the
one-time Supabase setup), `/profile`, `/verify`, admin sign-in, admin Customers + Orders.
Public `public/certificate-template.pdf` is optional (your own certificate template).
