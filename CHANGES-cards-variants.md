# Product card, checkout quantities, variant pickers + photos

Extract this zip over the repo root. **No database migration needed**: migration 0016 is already applied on the live
project (variant columns, cart_quote and place_order all exist; no product uses variants yet). The extra variant
fields below (`image`, `swatch`, `type`) live inside the existing `products.options` JSON, which the database
validator accepts. `npm run build` passes; the shop, product page and checkout were exercised in headless Chromium at
390px and 1280px against a mocked API.

## Product card (shop, home rails)
- Left: struck-through price on top, the real price under it, then a green "Save Ksh X" line (only when there is a
  saving; "Save up to" for products whose variants change the price).
- Right: square black button with a white cart icon. Adds the MOQ quantity and opens the cart.
  Products with variants show the same button but it opens the product page to choose.

- Card text: title (up to 2 lines), then the product description (2 lines max with an ellipsis; 1 line when the card
  shows a struck-through price). The image box is a fixed square for every card, so tall photos can't stretch it.
- "You may also like" now uses the very same card (new `ProductCard.astro`, also used by the shop and home rails),
  4 across on desktop and a swipe row on phones.

## Checkout order summary
- Each line has the − / quantity / + stepper (type a number too) and a Remove link. Prices, tier (wholesale/retail),
  totals and the "add N more for wholesale" hint update straight away. On phones open the "Items" toggle to see them.

## Variants
- Admin → Products → Variants: per variant type choose the picker (Automatic / text / colour swatches / photo tiles);
  per value set a price change (the resulting wholesale price is shown beside it), link one of the product's photos,
  and for colour pickers pick a swatch colour. Photo links to images later removed from the product are dropped on save.
- Product page: the variant picker now sits right below Quantity. It is drawn per type: round swatches for colours,
  photo tiles for image variants, text buttons for the rest (curl, length...). Price follows the choice as before.
- Gallery is now one smooth scroll-snap strip. Picking a variant with a linked photo slides to it; values without a
  linked photo leave the gallery where it is; thumbnails, swipes and arrow keys all scroll the same strip.

## Files
public/scripts/{cart-render,main}.js, src/admin/admin.css, src/admin/sections/products/{OptionsEditor,ProductForm}.jsx,
src/components/ecommerce/{ProductCard,ProductRail}.astro, src/data/ecommerce-products.js, src/lib/pricing.js,
src/pages/{shop.astro,ecommerce/index.astro,ecommerce/product/[slug].astro}, src/styles/{global,mobile-ecommerce}.css

## Notes
- Cart lines still show the product's first photo (cart_quote returns one image per product).
- "Separate prices" per variant are price changes added to the wholesale, retail and market prices, which is what the
  database prices and orders with. A fully independent price per combination (e.g. Colour x Length grid) would need a
  new migration; say if you want that next.
