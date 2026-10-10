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

## Follow-up (Oct 9) — verified in a real browser at 360/390/430px
- mobile-ecommerce.css:
  - product page was ~495px wide (swipe rows stretched the grid) -> fixed
  - section.shop padding shorthand wiped the .wrap side gutter, so cards/headings touched the screen edges -> side gutter kept
  - hero content shrank to its widest child and sat flush left -> full width with gutter
  - closed full-width cart drawer leaked a shadow down the right edge -> removed
  - small spacing: chip bar -> first heading, bundle box -> "You may also like"
- mobile-academy.css: same closed-drawer shadow fix for the academy cart
- .github/workflows/astro.yml: Node 20 -> 22. Astro 7.2.8 requires Node >= 22.12 (package.json engines too), so the Pages build would fail on Node 20.
