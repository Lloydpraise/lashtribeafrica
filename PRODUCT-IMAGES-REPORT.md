# Product images and supplier data (2026-10-22)

## What to run

1. The photos are in **public/products/<slug>/N.webp**, 123 files for 82 products. They are white background, square, max 1000px and about 8 MB in total. They go live with the next site deploy.
2. **supabase/migrations/0022_product_images.sql** fills `products.images` for the 44 existing products (the 6 demo products from 0003 and the 38 from 0019). Run it once in the SQL editor.
   * It is safe to re-run, and it works without 0018. It never overwrites photos uploaded in the admin.
   * I tested it on a local Postgres 16.
3. **supabase/migrations/0023_proposed_qeelasee_shop_products.sql** is a **proposal**. Read it before you run it. It does not change 0019.
   * Section 1 adds 38 more Qeelasee products as drafts, with photos, costs and formula prices.
   * Section 2 is optional. It adds a "Mix 8-15mm" length to 25 lash products, and colour choices to Color Lash.
   * I tested it on a local Postgres with a stubbed pricing formula.

## Where each image came from

* **Qeelasee products:** qeelasee.com (a Shopify store). The photo is the main tray shot, cleaned: the caption bar is cut off, the grey background is turned white, and the image is trimmed. A plain "lash on white" shot is added as the 2nd/3rd photo where one exists.
  * The PDF price list photos are tiny and repeated, so I only used them as a reference.
* **Fadvan products:** a mix of fadvan.com product photos and crops from the Fadvan catalog PDF. The PDF has clean white-background shots of the glues, gel remover, shampoo, wand glue, tweezers and trays.
* **Demo products from 0003:** these have no supplier. I used the closest matching supplier photo:
  * 0.07 Volume Fans Mixed Tray: Fadvan 6D premade fans
  * Mega Volume Fans 0.05: Fadvan 20D premade fans
  * Pro Bond Adhesive: Qeelasee 0.5s glue
  * Isolation Tweezers Curved: VETUS ST tweezers
  * Under-Eye Gel Patches: Fadvan eye pads
  * Low-Fume Primer: Fadvan glue primer

  These photos show the supplier's branding.

| product slug | photos | source |
|---|---|---|
| `qeelasee-volume-lash-0-02-0-03mm` || 3 | qeelasee.com |
| `qeelasee-volume-lash-0-05-0-07mm` || 2 | qeelasee.com |
| `qeelasee-brown-lash` || 2 | qeelasee.com |
| `qeelasee-classic-lash` || 3 | qeelasee.com |
| `qeelasee-l-curl-lash` || 2 | qeelasee.com |
| `qeelasee-l-curl-lash-0-03mm` || 2 | qeelasee.com |
| `qeelasee-m-curl-lash` || 2 | qeelasee.com |
| `qeelasee-m-curl-lash-0-03mm` || 2 | qeelasee.com |
| `qeelasee-ellipse-flat-lash-black` || 3 | qeelasee.com |
| `qeelasee-ellipse-flat-lash-brown` || 2 | qeelasee.com |
| `qeelasee-yy-shape-lash-black` || 2 | qeelasee.com |
| `qeelasee-yy-shape-lash-dark-brown` || 1 | qeelasee.com |
| `qeelasee-yy-shape-lash-light-brown` || 2 | qeelasee.com |
| `qeelasee-easy-fanning-lash` || 3 | qeelasee.com |
| `qeelasee-3d-clover-lash-black` || 2 | qeelasee.com |
| `qeelasee-4d-w-shape-lash-black` || 2 | qeelasee.com |
| `qeelasee-5d-w-shape-lash-black` || 2 | qeelasee.com |
| `qeelasee-w-shape-lash-6d-black` || 2 | qeelasee.com |
| `qeelasee-3d-clover-lash-brown` || 1 | qeelasee.com |
| `qeelasee-4d-w-shape-lash-brown` || 2 | qeelasee.com |
| `qeelasee-5d-w-shape-lash-brown` || 1 | qeelasee.com |
| `qeelasee-w-shape-lash-6d-brown` || 2 | qeelasee.com |
| `qeelasee-spike-3d-w-lash-brown` || 2 | qeelasee.com |
| `qeelasee-camellia-lash` || 2 | qeelasee.com |
| `qeelasee-spikes-lashes` || 1 | qeelasee.com |
| `qeelasee-premade-fans-6d-short-stem` || 2 | qeelasee.com |
| `qeelasee-color-lash` || 1 | qeelasee.com |
| `qeelasee-rainbow-lash` || 2 | qeelasee.com |
| `fadvan-ventilador-premade-fans-3d-20d` || 3 | Fadvan catalog PDF (cropped), fadvan.com |
| `fadvan-8d-w-shape-lash` || 3 | fadvan.com |
| `fadvan-diy-cluster-lashes` || 3 | Fadvan catalog PDF (cropped), fadvan.com |
| `fadvan-eyelash-extension-glue-a-01-10ml` || 1 | Fadvan catalog PDF (cropped) |
| `fadvan-fast-drying-black-glue` || 1 | fadvan.com |
| `fadvan-sky-glue` || 1 | Fadvan catalog PDF (cropped) |
| `fadvan-diy-lash-glue-wand` || 2 | Fadvan catalog PDF (cropped), fadvan.com |
| `fadvan-lash-gel-remover-5g` || 1 | Fadvan catalog PDF (cropped) |
| `fadvan-lash-cleaning-shampoo-60ml` || 2 | Fadvan catalog PDF (cropped), fadvan.com |
| `fadvan-fadvan-eyelash-tweezers` || 4 | Fadvan catalog PDF (cropped), fadvan.com |
| `0-07-volume-fans-mixed-tray` || 2 | fadvan.com |
| `mega-volume-fans-0-05` || 2 | fadvan.com |
| `pro-bond-adhesive-5ml` || 1 | qeelasee.com |
| `isolation-tweezers-curved` || 2 | qeelasee.com |
| `under-eye-gel-patches-bulk` || 1 | fadvan.com |
| `low-fume-primer-10ml` || 1 | fadvan.com |

### Check these
* **YY Shape Lash - Light Brown:** Qeelasee only sells one brown YY tray, so Light Brown and Dark Brown share the same main photo.
* **3D-Clover Lash - Brown** vs **Spike 3D-W Lash - Brown:** the shop has "Brown 3D-W" and "Dual-Core 3DW brown", and both are described as "Spike 3D W-shape". I matched them in that order, so swap the folders if Qeelasee confirms the other way round.
* **Fadvan A-01 glue:** the only photo is the styled podium shot in the catalog. I cut out the purple-cap bottle onto white. The silver-blue cap version has no clean photo.
* **Comic and anime lashes** (in 0023): Qeelasee sells these under the "Lashonly" label, and their trays show that name.

## Prices: 0019 OEM cost vs Qeelasee shop retail (USD per tray)

The OEM list (what 0019 uses) is the bulk, private-label price. The shop price is for a single retail tray. If you order through OEM, keep the 0019 costs. The shop prices show what a buyer pays at retail. The M curl 0.03mm tray in the shop is $11.49, against $4.99 OEM.

On the shop, "Size" means length, "Style" means curl and "Color" means thickness.

| product | OEM (0019) | shop | shop listing | shop variations |
|---|---|---|---|---|
| `qeelasee-volume-lash-0-02-0-03mm` | $3.29 | $6.54 | [Qeelasee 0.03 Volume Mink Eyelash Extensions](https://qeelasee.com/products/qeelasee-volume-false-eyelash-extensions) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, 8-15mm, 16-18mm; Style: B, C, CC, D, DD; Color: 0.03mm |
| `qeelasee-volume-lash-0-05-0-07mm` | $2.99 | $6.54 | [Qeelasee 0.05 0.07 Volume Mink Eyelash Extensions](https://qeelasee.com/products/qeelasee-0-05-0-07-volume-mink-eyelash-extensions) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm, mix(16-18)mm; Style: B, C, CC, D, DD; Color: 0.05mm, 0.07mm |
| `qeelasee-brown-lash` | $2.99 | $7.49 | [Qeelasee Brown Color False Eyelash Extensions](https://qeelasee.com/products/qeelasee-brown-color-false-eyelash-extensions) | Size: 7mm, 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm; Style: J, B, C, D; Color: 0.07mm, 0.05mm, 0.10mm |
| `qeelasee-classic-lash` | $2.59 | $5.89 | [Qeelasee 0.10 0.12 Classic Eyelash Extensions](https://qeelasee.com/products/qeelasee-0-10-0-12-classic-eyelash-extensions) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm, mix(16-18)mm; Style: B, C, CC, D, DD; Color: 0.10mm, 0.12mmm |
| `qeelasee-l-curl-lash` | $3.99 | $7.50 | [Qeelasee L L+ LC LD curl False Eyelash Extensions](https://qeelasee.com/products/qeelasee-l-l-lc-ld-curl-false-eyelash-extensions) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm; Style: L, L+, LC, LD; Color: 0.10mm, 0.03mm, 0.05mm, 0.07mm, 0.12mm, 0.15mm |
| `qeelasee-l-curl-lash-0-03mm` | $4.99 | $7.50 | [Qeelasee L L+ LC LD curl False Eyelash Extensions](https://qeelasee.com/products/qeelasee-l-l-lc-ld-curl-false-eyelash-extensions) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm; Style: L, L+, LC, LD; Color: 0.10mm, 0.03mm, 0.05mm, 0.07mm, 0.12mm, 0.15mm |
| `qeelasee-m-curl-lash` | $3.99 | $6.99 | [Qeelasee M Curl (8-15)mm Mixed Tray](https://qeelasee.com/products/qeelasee-m-curl-8-15mm-mixed-tray) | Size: Mix(8-15)mm; Style: M; Color: 0.03mm, 0.07mm, 0.10mm |
| `qeelasee-m-curl-lash-0-03mm` | $4.99 | $11.49 | [Qeelasee M Curl (8-15)mm Mixed Tray](https://qeelasee.com/products/qeelasee-m-curl-8-15mm-mixed-tray) | Size: Mix(8-15)mm; Style: M; Color: 0.03mm, 0.07mm, 0.10mm |
| `qeelasee-ellipse-flat-lash-black` | $6.50 | $7.43 | [Qeelasee 0.15mm Ellipse Flat Lash](https://qeelasee.com/products/qeelasee-0-15mm-ellipse-flat-lash) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm, mix(16-18)mm, mix(7-13)mm; Style: C, CC, D, DD, B; Color: 0.15mm |
| `qeelasee-ellipse-flat-lash-brown` | $6.50 | $7.99 | [Brown Matte Flat Eyelash Extension Split Tips](https://qeelasee.com/products/brown-matte-flat-eyelash-extension-split-tips) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, MIX(8-15)mm; Style: C, CC, D; Color: 0.15mm, 0.20mm, 0.25mm |
| `qeelasee-yy-shape-lash-black` | $5.98 | $7.90 | [Qeelasee YY 0.05 0.07mm Eyelash Extension(Black Color)](https://qeelasee.com/products/qeelasee-0-05-0-07-yy-eyelash-extension) | Size: 7mm, 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm, mix(7-13)mm; Style: C, D; Color: 0.07mm, 0.05mm |
| `qeelasee-yy-shape-lash-dark-brown` | $5.98 | $8.49 | [Qeelasee YY 0.07mm Eyelash Extension (Brown Color)](https://qeelasee.com/products/qeelasee-yy-0-07mm-eyelash-extension-brown-color) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm; Style: C, D; Color: 0.07mm |
| `qeelasee-yy-shape-lash-light-brown` | $5.98 | $8.49 | [Qeelasee YY 0.07mm Eyelash Extension (Brown Color)](https://qeelasee.com/products/qeelasee-yy-0-07mm-eyelash-extension-brown-color) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm; Style: C, D; Color: 0.07mm |
| `qeelasee-easy-fanning-lash` | $4.95 | $6.90 | [Qeelasee Easy Fan Lashes](https://qeelasee.com/products/qeelasee-easy-fan-lashes) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm; Style: C, D; Color: 0.03mm, 0.05mm, 0.07mm |
| `qeelasee-3d-clover-lash-black` | $5.98 | $7.68 | [Qeelasee 3D W Shape Eyelashes](https://qeelasee.com/products/qeelasee-3d-w-shape-eyelashes) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm; Style: C, D; Color: 0.07mm |
| `qeelasee-4d-w-shape-lash-black` | $5.98 | $8.28 | [Qeelasee 4D W Shape Eyelashes](https://qeelasee.com/products/qeelasee-4d-w-shape-eyelashes) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm; Style: C, D; Color: 0.07mm |
| `qeelasee-5d-w-shape-lash-black` | $6.48 | $8.80 | [Qeelasee 5D W Shape Eyelashes](https://qeelasee.com/products/qeelasee-5d-w-shape-eyelashes) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm; Style: C, D; Color: 0.07mm |
| `qeelasee-w-shape-lash-6d-black` | $5.98 | $8.18 | [Qeelasee W Shape Eyelashes](https://qeelasee.com/products/qeelasee-w-shape-eyelashes) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm; Style: C, D; Color: 0.07mm |
| `qeelasee-3d-clover-lash-brown` | $5.98 | $8.30 | [Qeelasee Brown Color 3D-W 0.07mm Eyelash Extension](https://qeelasee.com/products/qeelasee-brown-color-3d-w-0-07mm-eyelash-extension) | Size: Mix(8-15)mm; Thickness: 0.07mm; Curl: D |
| `qeelasee-4d-w-shape-lash-brown` | $5.98 | $8.99 | [Qeelasee Brown Color 4D-W 0.07mm Eyelash Extension](https://qeelasee.com/products/qeelasee-brown-color-4d-w-0-07mm-eyelash-extension) | Thickness: 0.07mm; Curl: D; Length: Mix(8-15)mm |
| `qeelasee-5d-w-shape-lash-brown` | $6.48 | $9.20 | [Qeelasee Brown Color 5D-W 0.07mm Eyelash Extension](https://qeelasee.com/products/qeelasee-brown-color-5d-w-0-07mm-eyelash-extension) | Thickness: 0.07mm; Curl: D; Length: Mix(8-15)mm |
| `qeelasee-w-shape-lash-6d-brown` | $5.98 | $8.99 | [Qeelasee Brown Color W 0.07mm Eyelash Extension](https://qeelasee.com/products/qeelasee-brown-color-w-0-07mm-eyelash-extension) | Curl: D; Thickness: 0.07mm; Length: Mix(8-15)mm |
| `qeelasee-spike-3d-w-lash-brown` | $6.48 | $9.50 | [Qeelasee Dual-Core 3DW Brown Color Eyelashes](https://qeelasee.com/products/qeelasee-dual-core-3dw-brown-color-eyelashes) | size: MIX8-15MM; Thickness: 0.07mm; Curl: D |
| `qeelasee-camellia-lash` | $4.59 | $12.55 | [Camellia Eyelash 3D-6D 0.07 Volume Mixed Length in One Lash Strip](https://qeelasee.com/products/camellia-eyelash-3d-6d-0-07-volume-mixed-length-in-one-lash-strip) | 尺寸: 6 8 10mm length, 7 9 11mm length, 8 10 12mm length, 9 11 13mm length, 10 12 14mm length, 11 13 15mm length; 样式: J, C, D; 颜色: 0.03mm, 0.05mm, 0.07mm |
| `qeelasee-spikes-lashes` | $3.50 | $6.89 | [Wispy Spikes Eyelash Extension](https://qeelasee.com/products/wispy-spikes-eyelash-extension) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, MIX(8-15)mm, MIX(16-18)mm; Style: C, D; Color: 0.07mm |
| `qeelasee-premade-fans-6d-short-stem` | $3.95 | $6.68 | [Qeelasee Premade Volume Fans Lash 6D](https://qeelasee.com/products/qeelasee-premade-volume-fans-lash-6d) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm, mix(8-15)mm; Style: C, D; Color: 0.07mm |
| `qeelasee-color-lash` | $2.99 | $6.54 | [Qeelasee Gradient Colored Ombre Lashes 0.07mm](https://qeelasee.com/products/qeelasee-gradient-colored-ombre-lashes) | Size: mix(8-15)mm; Style: C, D; Color: Purple+White, Yellow+Blue, Pink+Brown, Blue+Red |
| `qeelasee-rainbow-lash` | $2.99 | $6.54 | [Qeelasee 8 Colors Rainbow Colored Eyelash Extension](https://qeelasee.com/products/qeelasee-8-colors-rainbow-colored-eyelash-extension) | Size: 8mm, 9mm, 10mm, 11mm, 12mm, 13mm, 14mm, 15mm; Style: B, C, D; Color: 0.07mm |

Variations the shop sells that 0019 does not have:
* Mixed-length trays (Mix 8-15mm, and on some lashes Mix 16-18mm or Mix 7-13mm). 0023 section 2 adds Mix 8-15mm.
* Colour combos for Color Lash: Purple+White, Yellow+Blue, Pink+Brown and Blue+Red. 0023 section 2 adds these.
* Small range differences between the PDF and the shop. For example, the shop's Classic Lash goes up to 15mm plus mixes, while the PDF says 6-20mm. I kept 0019's ranges because the OEM list is what you order from.

## New Qeelasee products in 0023 (all drafts)

The cost is the shop retail price. The KES prices come from your pricing formula.

| name | category | shop price | variations |
|---|---|---|---|
| Luxury Comic Spire Lashes | premade-fans | $5.99 | Curl: C, D |
| Heart & Star Comic Spire Lashes | premade-fans | $5.99 | Curl: C, CC, D |
| Wings Anime Effect Lashes | premade-fans | $5.99 | Curl: C, D |
| Fairy Anime Effect Lashes | premade-fans | $5.99 | Curl: C, D |
| Spire Anime Effect Lashes | premade-fans | $5.99 | Curl: C, D |
| DIY Cluster Lash 120/200pcs | premade-fans | $5.68 | Style: 40P, S06, W51, Glue, Tweezer |
| DIY Cluster Lash 240pcs 30D/40D | premade-fans | $7.98 | Style: 30D 240pcs, 40D 240pcs, 30D 240pcs + kit, 40D 240pcs + kit |
| DIY Cluster Lash 50D/80D/100D | premade-fans | $7.98 | Style: 50D 144pcs, 80D 144pcs, 100D 108pcs, 50D 144pcs + kit, 80D 144pcs + kit, 100D 108pcs + kit |
| Lower Flat Bottom Lashes | lash-extensions | $7.99 | Thickness: 0.15mm, 0.20mm; Curl: J, C; Length: 6mm, 7mm |
| Bottom Volume Lashes 5-7mm | lash-extensions | $7.99 | Thickness: 0.05mm, 0.07mm, 0.10mm, 0.15mm, 0.20mm; Curl: J, B, C; Length: 5mm, 6mm, 7mm |
| Ultra Glue 0506 (1s, low irritation) | adhesives-primers | $13.90 | - |
| Strong Viscosity Glue 0505 (1s) | adhesives-primers | $13.70 | - |
| Mild Glue 0507 (0.5s, long lasting) | adhesives-primers | $13.50 | - |
| YY/W Lash Glue 0607 (0.5s) | adhesives-primers | $10.50 | - |
| Expert Glue 0606 (0.5s) | adhesives-primers | $11.50 | - |
| Fast Drying Super Glue 0608 (0.3-0.5s) | adhesives-primers | $10.59 | - |
| 0.1-0.3s Fast Glue for Volume Lashes | adhesives-primers | $26.90 | Type: Volume lash glue, Master glue 0609 |
| 0.5s Fast Drying Eyelash Glue | adhesives-primers | $10.59 | - |
| Protein Remover / Lash Primer (Green Tea) | adhesives-primers | $9.59 | - |
| Glue Primer | adhesives-primers | $9.59 | - |
| Clear Gel Remover 15g | aftercare | $9.59 | - |
| Remover Brush Pen | aftercare | $6.89 | Size: 5ml, 10ml |
| Fiber Tips Pink Tweezers | tools | $9.99 | Model: LF01, LF02, LF03, LF04, LF05 |
| VETUS Tweezers MSA-18 / MSA-19 | tools | $10.54 | Model: MSA-18, MSA-19 |
| VETUS Golden Feather / Dolphin Tweezers | tools | $9.59 | Model: Dolphin, Golden Feather |
| VETUS Tweezers ESD Series | tools | $7.69 | Model: ESD-11, ESD-12, ESD-15, ESD-17 |
| VETUS Tweezers ST Series | tools | $7.69 | Model: ST-11, ST-12, ST-15, ST-17 |
| AS10 Eyelash Tweezers | tools | $17.99 | - |
| AS09 Volume Tweezers (3D-6D) | tools | $9.49 | - |
| Micro Brushes (100pcs) | tools | $5.53 | Colour: Purple, Blue |
| Cleaning / Lip Brushes (100pcs) | tools | $8.79 | Colour: Black, Clear, Golden |
| Mascara Wands (2 bags, 100pcs) | tools | $8.79 | Colour: Black, Pink |
| Lash Check Mirror (2pcs) | tools | $7.87 | - |
| Surgical Tape (10 rolls) | tools | $11.76 | - |
| Transparent PE Tape (10 rolls) | tools | $9.07 | - |
| 3M Micropore Tape (10 rolls) | tools | $14.34 | - |
| Glue Holder Rings (100pcs) | tools | $10.34 | Type: 1 Big, divided, 2 Big, 3 Medium, 4 Small, 5 |
| Mini Air Blower | tools | $4.84 | Colour: Pink, Black, Red |

## Fadvan

fadvan.com and the catalog have **no prices**. Ask Fadvan for a quote. The site lists 84 product pages, and most are per-curl or per-fan-size pages of the lines already in 0019. Products it has that you do not:
* Lashes: premade loose fans 3D-30D, premade V lash, premade spike lash, segment lash, self-adhesive lash, 3D-7D W lashes, flat lash, individual L/LC/LD/LU curls.
* Non-lash: lash lift kit, lash bonder, lash primer, cream remover, eye pads, lash tape, lash brushes, mannequin head, practice lashes, lash plate / tiles, growth serum, extension kits, DIY lash kit / remover / tweezers.

I did not add these, because they have no price. Say which ones you want and I'll add them as drafts with photos.
