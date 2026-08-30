# Lashtribe Africa — Astro Site

This is a straight port of the original single-page HTML scaffold
(`lashtribe-africa-scaffold_5_.html`) into an Astro project. Visually and
functionally it's the same site — same CSS, same markup, same cart /
checkout JavaScript — just split into components so it's easier to edit
and extend.

## Run it

```bash
npm install
npm run dev       # http://localhost:4321
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

## Structure

```
src/
  layouts/
    Layout.astro          <head>, Google Fonts, imports global.css
  styles/
    global.css             All original CSS (vars, components, media queries) unchanged
  components/
    AnnouncementTicker.astro
    SiteHeader.astro       Sticky nav + search panel + mobile burger
    Hero.astro              Hero banner with cycling headline + order-window widget
    MarketingPillars.astro  "01/02/03" black strip
    ProductRail.astro       Reusable — used for both "Top Selling" and "New In"
    KitStrip.astro          "You Should Have" curated bundle
    AcademyHook.astro       Mid-page dark academy teaser
    RewardsReseller.astro   Points + private-label two-up
    CheckoutPreview.astro   Mock "save your details" section
    SiteFooter.astro
    CartDrawer.astro        Slide-out cart (includes the shared #overlay)
    CheckoutModal.astro     Details → upsell → confirm modal flow
  pages/
    index.astro             Assembles everything + product data + loads the script
public/
  scripts/
    main.js                 All original vanilla JS (cart math, checkout flow,
                             mobile nav, search toggle, hero text cycling,
                             scroll-reveal) — logic untouched, just lifted out
                             of the inline <script> tag
```

## Notes on the port

- **Nothing in the CSS or JS logic was changed** — `global.css` is the
  original `<style>` block verbatim, and `public/scripts/main.js` is the
  original `<script>` block verbatim. Both still work off the same
  element IDs/classes (`#cartDrawer`, `#checkoutModal`, `.qty-btn`,
  `.upsell-add`, etc.), which are preserved exactly across the new
  components.
- **Product data** (Top Selling / New In cards) was pulled into arrays in
  `src/pages/index.astro` and passed into the reusable `ProductRail`
  component, since both rails were near-identical markup in the original.
  Everything else stayed as static markup in its own component to keep
  the port literal.
- The cart totals, MOQ (5) minimums, and prices in the drawer/checkout
  are still the same **static demo values** as the original scaffold —
  there's no real product/cart backend wired in yet. When you're ready to
  connect real inventory or a checkout provider, `ProductRail`'s props
  and `main.js`'s `unitPrices`/`marketPrices`/`qty` objects are the two
  places to start.
- `<script src="/scripts/main.js" is:inline>` is used instead of an
  Astro-processed script so it behaves exactly like the original
  synchronous inline script (no module wrapping, runs once after the
  DOM above it is parsed).
