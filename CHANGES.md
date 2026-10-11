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

## Oct 11 — cart, academy fit, footer, hook card
- Cart counter (shop + academy) = number of different products, not units (4 products at MOQ 5 shows 4). Ids no longer in the catalog are ignored. Checkout "N items" is now "N products".
- Academy cart was a hardcoded 2-product demo (Volume Fans / Adhesive, fixed prices). It now uses the same live cart as the shop: real names, photos, MOQs, prices and totals. "Products used in this course" strip also reads the live catalog and adds at the product's MOQ.
- Other hardcodes removed: footer stats (2,400+ / 38 / 4.9★) now come from the database and are hidden when there is no real number (optional supabase/migrations/0012_public_stats.sql adds "students taught"); academy header no longer ships a fake "Amina"; checkout placeholder totals (Ksh 13,750 / 7,250) are Ksh 0 until the cart loads; product cards no longer fall back to a fake product link or a fake "MOQ 5".
- Academy fit: header (logo + cart + profile + menu) was wider than a phone, which made the browser zoom the page out. Smaller logo, tighter gaps, nothing fixed-width. Menu button sits on the far right next to the profile.
- Both cart drawers fit 320-430px, lock page scroll while open, and use dvh/safe-area.
- Footer: "Ecommerce" link (/ecommerce) added. The footer is one shared component, so the academy has it too.
- Ecommerce Academy card: "Lashtribe Academy" + your copy + Go To Academy button, styled like the academy hero with the first published course cover on the right (read live; plain gradient if none).
- "Rewards" removed from the top nav (still in the footer Community column — say if you want it gone there too).
- Very narrow phones (320px): header row and the certificate verify input no longer overflow.
Checked in a browser against a mock database: 11 pages x 320/360/390/430px, zero horizontal overflow.

## Oct 11 — preorder batches (run migration 0013 first)
How it works: suppliers ship twice a month (15th and month-end). Each date is a batch. A new order joins the first
open batch that is MORE than 7 days away (exactly 7 days is too late). The batch is saved on the order, so editing dates
later never moves old orders. Course-only orders have no batch.
- Site Settings: new **Shipping batches** card (generate 15th + month-end for 6 months, add/edit/delete any date, set status open / closed / ordered from supplier / shipped, change the 7-day cutoff) and a **Suppliers** card. The old single "ordering window" date is gone; the hero bar now reads the next batch.
- Hero: "ships in N days", "Next shipment Sat, 31 Oct" and "Order today → ships <the batch a new order would get>". Built into the page at deploy, then refreshed in the browser, so it is current without a redeploy.
- Checkout: shows "This order ships with the <date> batch" (decided by the database, same rule as order time) and repeats it on the "Order placed" screen.
- Products: required **Supplier** dropdown with a quick "new supplier" box; stock fields are hidden (nothing is held in stock; existing values are kept). The product list shows the supplier, and a bar offers one-click "set this supplier on all products that have none".
- Orders: new default tab **By shipping batch**: a card per batch with countdown, "taking orders until", orders / units / value / unpaid, a status switch, and the orders inside (click to open). **Supplier PDF** per batch: a page per supplier (SKU, product, total quantity), optional "only this supplier", optional dispatch list (customer, phone, area, items), paid orders only unless you tick "include awaiting payment". Order detail has "Ships with" to move an order to another batch. The All orders table has a Ships column.
Tested: migration on a clean Postgres 16 with migrations 0001-0013 (cutoff rule, closed batches skipped, no open batch = unassigned, admin-only functions, re-run safe); production bundle compiles; PDF checked visually (multi-page, long names, dispatch list). Not tested: the admin screens in a browser against your real project.
