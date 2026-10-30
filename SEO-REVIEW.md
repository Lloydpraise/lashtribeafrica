# Lashtribe product SEO: review notes

Written 2026-10-30 for all 101 products (96 active, 5 drafts), the same way as the Kitchen And All Claude drafts: photo checked against the name, specs taken only from the supplier pages (Qeelasee shop, Fadvan catalogue), the product's own options and what is readable on the photo, and Kenyan wording and price levels from Jumia, Kilimall and Jiji listings. Jiji and Jumia block automated page reads, so they were read through search results. Nothing was copied from competitors.

## How to apply
1. Run `supabase/migrations/0045_product_seo.sql` in the Supabase SQL editor.
2. Rebuild/redeploy the site: product pages then show the intro, sections, a specs table, FAQs, the SEO title and meta description, and Google product + FAQ data.
3. Answer the questions below. Products with missing facts (no photo, no size) get minimal copy until you answer.

## Things to fix in the data (found during research)
- **M Curl Lash** and **M Curl Lash 0.03mm**: their options are the L curl options (L, LC, LD, L+, 8-18mm). The supplier sells M curl as `M`, mixed 8-15mm. Fix the options in the admin.
- **Color Lash**: photo is the 8-colour rainbow tray but the options are the two-tone ombre colours.
- **Lash Gel Remover 5G / 10G**: the photo box says 15g.
- **Possible duplicates** that compete with each other in Google (keep one of each, or archive): Classic Lashes vs Classic Lash; Easy Fan Lashes vs Easy Fanning Lash; Lash Shampoo 60ML vs Lash Cleaning Shampoo 60ml; Eye Patch vs Eyepads; Microbrush vs Micro Brushes; Mirror vs Lash Check Mirror; Lash Gel Remover 5G vs Lash Gel Remover 5g (Fadvan); Lash Brush / Spoolies vs Mascara Wands.
- **No photo**: Electric Fan, Eye Mask, Full Lash Kit - Clear Bag, I-G Tech Full Kit, Lash Serum, Makeup Box, Tweezers. Stand-in photos: Eye Patch, Microbrush, Mirror, I-G Tech glues, Fast-Drying Infinity Glow glue.
- Several Qeelasee glues say 10ml on the photo but 5ml in the supplier text, and retention 6-8 weeks on the label vs 8-9 weeks in the text. The copy shows both.

## Questions per product

**0.1-0.3s Fast Glue for Volume Lashes** (`qeelasee-fast-volume-glue`)
- What is the difference between the Volume and Master 0609 formulas? The supplier gives one set of specs for both.

**3D-Clover Lash - Brown** (`qeelasee-3d-clover-lash-brown`)
- Supplier lists the brown 3D W in D curl, mixed 8-15mm only. Live has C/D and single lengths. Please confirm.

**3M Micropore Tape (10 rolls)** (`3m-micropore-tape`)
- Roll width and length?

**4D-W Shape Lash - Brown** (`qeelasee-4d-w-shape-lash-brown`)
- Supplier lists brown 4D W in D curl, mixed 8-15mm only. Please confirm C curl and single lengths.

**5D-W Shape Lash - Brown** (`qeelasee-5d-w-shape-lash-brown`)
- Supplier lists brown 5D W in D curl, mixed 8-15mm only. Please confirm.

**AS10 Eyelash Tweezers** (`qeelasee-as10-tweezers`)
- The supplier only says "best quality". Length and tip type confirmed from photo only.

**Bottom Volume Lashes 5-7mm** (`qeelasee-bottom-volume-lashes`)
- Supplier also lists 0.03mm and 0.10mm; live options exclude 0.03mm. Fine if intended.

**Camellia Lash** (`qeelasee-camellia-lash`)
- Supplier lists curls C/CC/D in text but J/C/D in options, and lengths up to 11-13-15mm. Live has groups up to 14-16-18mm. Please confirm.

**Classic Lash** (`qeelasee-classic-lash`)
- Live options list 6-7mm and 16-20mm lengths; the supplier shop lists 8-15mm plus 16-18mm mixed. Please confirm which lengths you can really supply.

**Classic Lashes** (`classic-lashes`)
- This product has no thickness, curl or length options. Which ones does it come in? Without options the copy cannot list sizes.
- The tray is branded Lashes by Shazz. Should the copy mention that brand?
- Is this the same lash as the "Classic Lash" product (qeelasee-classic-lash)? If so, consider archiving one so they do not compete in Google.

**Color Lash** (`qeelasee-color-lash`)
- The photo looks like the 8-colour rainbow tray, but the options (Purple+White etc.) are the two-tone ombre lashes. Please confirm which product this is; the copy follows the options.

**DIY Cluster Lash 120/200pcs** (`qeelasee-diy-cluster-lash-120-200`)
- The pack size (120 or 200) is not a separate option on the page. Which size is sold?

**DIY Cluster Lash 240pcs 30D/40D** (`qeelasee-diy-cluster-lash-240-30d-40d`)
- What exactly is in the "+ kit" option? The photo shows bond/remover and a pink tweezer; please confirm.

**DIY Cluster Lash 50D/80D/100D** (`qeelasee-diy-cluster-lash-50d-100d`)
- What is in the kit option?

**DIY Cluster Lashes** (`fadvan-diy-cluster-lashes`)
- Does "P" mean the number of fibres per cluster? The copy only calls it fullness.

**Easy Fan Lashes** (`easy-fan-lashes`)
- No thickness, curl or length options are set. Which sizes does it come in?
- Is this a duplicate of "Easy Fanning Lash"? Two pages with the same keyword compete in Google; consider archiving one or giving them different focuses.

**Easy Fanning Lash** (`qeelasee-easy-fanning-lash`)
- Supplier lists lengths 8-20mm and mixes up to 20-25mm; live options list 21-25mm single lengths. Please confirm.

**Electric Fan** (`electric-fan`)
- Please upload a photo and tell us: rechargeable (USB) or battery, handheld or with a stand?

**Eye Mask** (`eye-mask`)
- What kind of eye mask is this (contoured 3D sleep mask, gel mask, disposable)? Material and photo please; the copy is minimal until then.

**Eye Patch** (`eye-patch`)
- This uses a stand-in photo; please upload the real one. Is it the same as Eyepads? If so, keep one page.

**Eyepads** (`eyepads`)
- How many pairs per pack?

**Fairy Anime Effect Lashes** (`qeelasee-fairy-anime-lashes`)
- The trays in the photo carry the Lashonly brand. Fine to show?

**Fast-Drying Infinity Glow - Glue** (`fast-drying-infinity-glow-glue`)
- Is this a normal (air-curing) glue or the UV glue used in the Infinity Glow course? The page currently describes a normal fast glue. If it is UV glue, the copy must change (cures under the lamp in about 1.5s).
- Which size is it, 5ml or 10ml?

**Fiber Tips Pink Tweezers** (`qeelasee-fiber-tips-pink-tweezers`)
- Which LF model has which tip shape? Then each can be described.

**Full Lash Kit - Clear Bag** (`full-lash-kit-clear-bag`)
- Is this ONLY the bag, or a full lash kit packed in a clear bag? The name says "Full Lash Kit", the description says "storage bag". The copy follows the description; please confirm and upload a photo.

**Heart & Star Comic Spire Lashes** (`qeelasee-heart-star-comic-spire-lashes`)
- The trays in the photo carry the Lashonly brand. Fine to show?

**I-G Tech Full Kit** (`i-g-tech-full-kit`)
- Please confirm the kit is the UV (Infinity Glow) kit and list exactly what is inside (lamp model, glue size, number of eye pads, glasses type, foil bag?). Upload a photo.
- The course says UV400 safety glasses and 395nm lamp; can the page state these?

**I-G Tech Glue 10ML** (`i-g-tech-glue-10ml`)
- Your notes say I-G Tech Glue is the Fadvan fast-drying black glue. Is that right, and is it air-curing or the UV glue from the Infinity Glow course? Drying time and retention are left out until you confirm.
- Please upload the real I-G Tech bottle photo.

**I-G Tech Glue 5ML** (`i-g-tech-glue-5ml`)
- Your notes say I-G Tech Glue is the Fadvan fast-drying black glue. Is that right, and is it air-curing or the UV glue from the Infinity Glow course? Drying time and retention are left out until you confirm.
- Please upload the real I-G Tech bottle photo.

**L Curl Lash 0.03mm** (`qeelasee-l-curl-lash-0-03mm`)
- Live options say 0.03mm only; the supplier also lists 0.03mm in the main L curl listing. Fine.

**Lash Bed** (`lash-bed`)
- Size, weight and colours? Weight also sets the shipping cost. Is assembly needed?

**Lash Brush / Spoolies** (`lash-brush-spoolies`)
- How many per pack?
- Is this the same as Mascara Wands? Consider one page.

**Lash Gel Remover 10G** (`lash-gel-remover-10g`)
- The photo says 15g but the product is called 10g. Which is right?
- The 5G and 10G products share the same box photo; are they different sizes of the same remover?

**Lash Gel Remover 5G** (`lash-gel-remover-5g`)
- The photo says 15g but the product is called 5g. Which is right?
- The 5G and 10G products share the same box photo; are they different sizes of the same remover?

**Lash Glue 10ML** (`lash-glue-10ml`)
- What is the drying time and retention of this glue? They are left out until you tell us.
- The 5ml and 10ml share one photo. Upload a 10ml photo if the bottle looks different.

**Lash Glue 5ML** (`lash-glue-5ml`)
- What is the drying time and retention of this glue? They are left out until you tell us.
- The 5ml and 10ml share one photo. Upload a 10ml photo if the bottle looks different.

**Lash Serum** (`lash-serum`)
- No photo, brand, size or ingredients. Please upload a photo and tell us the size and main ingredients, and whether it is oil-free (safe with extensions). The copy makes no growth claims until then.

**Lash Shampoo 60ML** (`lash-shampoo-60ml`)
- This and "Lash Cleaning Shampoo 60ml" (draft) look like the same product. Keep one, or Google sees two pages competing.

**Lash Tape** (`lash-tape`)
- How many rolls per pack, and roll size?

**Luxury Comic Spire Lashes** (`qeelasee-luxury-comic-spire-lashes`)
- The trays in the photo carry the Lashonly brand. Fine to show?

**M Curl Lash** (`qeelasee-m-curl-lash`)
- DATA ERROR: the live options on this product are L, LC, LD and L+ curls with 8-18mm lengths and thicknesses up to 0.20mm (copied from the L curl product). The supplier sells M curl only as "M", mixed 8-15mm, in 0.03/0.07/0.10mm. Please fix the options; the copy follows the supplier.

**M Curl Lash 0.03mm** (`qeelasee-m-curl-lash-0-03mm`)
- DATA ERROR: the live options on this product are L, LC, LD and L+ curls with 8-18mm lengths and thicknesses up to 0.20mm (copied from the L curl product). The supplier sells M curl only as "M", mixed 8-15mm, in 0.03/0.07/0.10mm. Please fix the options; the copy follows the supplier.

**Makeup Box** (`makeup-box`)
- Please upload a photo and give size, material and number of compartments or trays.

**Microbrush** (`microbrush`)
- Same product as "Micro Brushes (100pcs)"? If so keep one page. How many per pack?

**Mild Glue 0507 (0.5s, long lasting)** (`qeelasee-mild-glue-0507`)
- Is the bottle 5ml or 10ml? The photo says 10ml, the supplier text says 5ml.

**Mirror** (`mirror`)
- Is this the same as Lash Check Mirror (2pcs)? Your description says "compact mirror". If it is a different mirror, please upload a photo.

**Moonlight** (`moonlight`)
- Power (watts), colour temperature, dimmer settings and whether it is height-adjustable? Leave them out until confirmed.

**Primer** (`primer`)
- What size is the bottle? The label looks like 15ml but is not clear.

**Rainbow Lash** (`qeelasee-rainbow-lash`)
- Supplier also offers B curl. Add it if you want.

**Spike 3D-W Lash - Brown** (`qeelasee-spike-3d-w-lash-brown`)
- The supplier shop sells this as "Dual-Core 3DW Brown", mixed 8-15mm. Please confirm single lengths.

**Spire Anime Effect Lashes** (`qeelasee-spire-anime-lashes`)
- The trays in the photo carry the Lashonly brand. Fine to show?

**Strong Viscosity Glue 0505 (1s)** (`qeelasee-strong-glue-0505`)
- Is the bottle 5ml or 10ml?

**Surgical Tape (10 rolls)** (`qeelasee-surgical-tape`)
- Roll width and length?

**Transparent PE Tape (10 rolls)** (`qeelasee-pe-tape`)
- Roll width and length?

**Tweezers** (`tweezers`)
- No photo, shape or material. Which tweezers are these (straight, curved, volume)? Please upload a photo.

**Ultra Glue 0506 (1s, low irritation)** (`qeelasee-ultra-glue-0506`)
- Is the bottle 5ml or 10ml?

**Ventilador Premade Fans (3D-20D)** (`fadvan-ventilador-premade-fans-3d-20d`)
- Is 0.07mm really offered at 16D-20D? Very full fans usually come in finer fibres. Please confirm which thicknesses go with which fan sizes.

**VETUS Golden Feather / Dolphin Tweezers** (`vetus-golden-feather-dolphin-tweezers`)
- Is the leather case included?

**VETUS Tweezers ESD** (`vetus-tweezers-esd`)
- Which ESD models have which tip shape? Then each can be described exactly.

**VETUS Tweezers MSA** (`vetus-tweezers-msa`)
- Which MSA models have which tip shape? Then each can be described exactly.

**VETUS Tweezers ST** (`vetus-tweezers-st`)
- Which ST models have which tip shape? Then each can be described exactly.

**Volume Lash 0.02/0.03mm** (`qeelasee-volume-lash-0-02-0-03mm`)
- Supplier shop offers 0.02mm only in C and D curls, 8-15mm. Live options list J to DD and 6-20mm. Please confirm.

**Volume Lash 0.05/0.07mm** (`qeelasee-volume-lash-0-05-0-07mm`)
- Live options list 6-7mm and 16-20mm and J/B curls; the supplier shop lists B-DD and 8-18mm. Please confirm.

**W Shape Lash (6D) - Black** (`qeelasee-w-shape-lash-6d-black`)
- The supplier's plain "W Shape" lash is described as 3D double tips, while our name says 6D (from the price list PDF). Please confirm the fibre count so the page is accurate.

**W Shape Lash (6D) - Brown** (`qeelasee-w-shape-lash-6d-brown`)
- Supplier brown W is "3D double tips", D curl, mixed 8-15mm. Our name says 6D. Please confirm fibre count, curl and lengths.

**Wings Anime Effect Lashes** (`qeelasee-wings-anime-lashes`)
- The trays in the photo carry the Lashonly brand. Fine to show?

**YY Shape Lash - Black** (`qeelasee-yy-shape-lash-black`)
- Supplier also sells black YY in 0.05mm and 7mm; add if wanted.

**YY Shape Lash - Dark Brown** (`qeelasee-yy-shape-lash-dark-brown`)
- The supplier shop lists one "Brown" YY. Dark and light brown come from the price list; please confirm both are available.

**YY Shape Lash - Light Brown** (`qeelasee-yy-shape-lash-light-brown`)
- The supplier shop lists one "Brown" YY. Dark and light brown come from the price list; please confirm both are available.

**8D-W Shape Lash** (`fadvan-8d-w-shape-lash`)
- This product is a draft (supplier MOQ 20). Publish only if you decide to sell it.

**DIY Lash Glue (wand)** (`fadvan-diy-lash-glue-wand`)
- Draft with no price. Publish only once priced.

**Fadvan Eyelash Tweezers** (`fadvan-fadvan-eyelash-tweezers`)
- Draft with no price.
- Which model has which tip?

**Lash Cleaning Shampoo 60ml** (`fadvan-lash-cleaning-shampoo-60ml`)
- Draft, price unconfirmed. Probably a duplicate of Lash Shampoo 60ML.

**Sky Glue** (`fadvan-sky-glue`)
- This product is a draft with no price. Publish only once priced.
- Bottle size?

## Keywords used

| Product | Primary keyword | SEO title |
|---|---|---|
| 0.1-0.3s Fast Glue for Volume Lashes | fast volume lash glue | Fast Volume Lash Glue 0.1-0.3s Dry, 5ml | Kenya |
| 0.5s Fast Drying Eyelash Glue | fast drying eyelash glue | 0.5s Fast Drying Eyelash Extension Glue 5ml | Kenya |
| 3D-Clover Lash - Black | 3D W lashes | 3D W Shape Lash Extensions Black 0.07mm | Kenya |
| 3D-Clover Lash - Brown | brown 3D W lashes | 3D W Shape Lash Extensions Brown 0.07mm | Kenya |
| 3M Micropore Tape (10 rolls) | 3M micropore tape | 3M Micropore Tape for Lash Extensions, 10 Rolls | Kenya |
| 4D-W Shape Lash - Black | 4D W lashes | 4D W Shape Lash Extensions Black 0.07mm | Kenya |
| 4D-W Shape Lash - Brown | brown 4D W lashes | 4D W Shape Lash Extensions Brown 0.07mm | Kenya |
| 5D-W Shape Lash - Black | 5D W lashes | 5D W Shape Lash Extensions Black 0.07mm | Kenya |
| 5D-W Shape Lash - Brown | brown 5D W lashes | 5D W Shape Lash Extensions Brown 0.07mm | Kenya |
| AS09 Volume Tweezers (3D-6D) | volume lash tweezers | AS09 Volume Lash Tweezers for 3D-6D Fans | Kenya |
| AS10 Eyelash Tweezers | curved lash tweezers | AS10 Eyelash Extension Tweezers, Curved Tip | Kenya |
| Bottom Volume Lashes 5-7mm | bottom lash extensions | Bottom Lash Extensions 5-7mm for Lower Lashes | Kenya |
| Brown Lash | brown lash extensions | Brown Lash Extensions 0.05-0.10mm Trays | Kenya |
| Camellia Lash | camellia lashes | Camellia Lashes, 3 Mixed Lengths per Strip | Kenya |
| Classic Lash | classic lash extensions | Classic Lash Extensions Trays 0.10-0.20mm | Kenya |
| Classic Lashes | classic lashes | Classic Lashes Tray for Lash Extensions | Kenya |
| Cleaning / Lip Brushes (100pcs) | disposable lip brushes | Disposable Lip and Lash Cleaning Brushes, 100pcs | Kenya |
| Clear Gel Remover 15g | lash gel remover | Clear Gel Lash Remover 15g, No Smell | Kenya |
| Color Lash | coloured lash extensions | Coloured Ombre Lash Extensions 0.07mm | Kenya |
| DIY Cluster Lash 120/200pcs | DIY cluster lashes | DIY Cluster Lashes 120/200pcs, 0.07 D Curl | Kenya |
| DIY Cluster Lash 240pcs 30D/40D | 30D cluster lashes | DIY Cluster Lashes 240pcs 30D/40D, with Kit | Kenya |
| DIY Cluster Lash 50D/80D/100D | fluffy cluster lashes | Fluffy DIY Cluster Lashes 50D, 80D, 100D | Kenya |
| DIY Cluster Lashes | reusable cluster lashes | DIY Cluster Lashes 10P-40P, Reusable | Kenya |
| Easy Fan Lashes | easy fan lash trays | Easy Fan Lashes Trays for Fast Volume | Kenya |
| Easy Fanning Lash | easy fan lashes | Easy Fan Lashes 0.03-0.07mm, Blooming Lashes | Kenya |
| Electric Fan | lash fan | Mini Electric Lash Fan for Drying Glue | Kenya |
| Ellipse Flat Lash - Black | ellipse flat lash extensions | Ellipse Flat Lash Extensions Black 0.15-0.25mm | Kenya |
| Ellipse Flat Lash - Brown | brown flat lash extensions | Ellipse Flat Lash Extensions Brown 0.15-0.25mm | Kenya |
| Expert Glue 0606 (0.5s) | expert lash glue | Expert Lash Glue 0606, 0.5s Dry, 8 Weeks, 5ml | Kenya |
| Eye Mask | lash eye mask | Eye Mask for Lash Extension Clients | Kenya |
| Eye Patch | under eye patches | Under Eye Patches for Lash Extensions | Kenya |
| Eyelash Extension Glue A-01 10ml | latex free lash glue | Eyelash Extension Glue A-01 10ml, Latex Free | Kenya |
| Eyepads | under eye gel pads | Under Eye Gel Pads for Lash Extensions | Kenya |
| Fairy Anime Effect Lashes | fairy anime lashes | Fairy Anime Lashes, Anime Effect 0.05mm | Kenya |
| Fast Drying Super Glue 0608 (0.3-0.5s) | super fast lash glue | Super Fast Lash Glue 0608, 0.3-0.5s Dry, 5ml | Kenya |
| Fast-Drying Infinity Glow - Glue | Infinity Glow lash glue | Fast-Drying Infinity Glow Lash Glue, 1-2s | Kenya |
| Fiber Tips Pink Tweezers | fiber tip lash tweezers | Fiber Tip Pink Lash Tweezers LF01-LF05 | Kenya |
| Full Lash Kit - Clear Bag | lash kit bag | Clear Storage Bag for Lash Kits | Kenya |
| Glue Holder Rings (100pcs) | glue rings for lash extensions | Glue Rings for Lash Extensions, 100pcs, 5 Types | Kenya |
| Glue Primer | lash glue primer | Lash Glue Primer 15ml for Better Retention | Kenya |
| Heart & Star Comic Spire Lashes | heart & star comic lashes | Heart & Star Comic Lashes, Anime Effect 0.05mm | Kenya |
| I-G Tech Full Kit | UV lash kit | I-G Tech Full Kit: UV Lash Lamp, Glue and Glasses | Kenya |
| I-G Tech Glue 10ML | I-G Tech lash glue 10ml | I-G Tech Lash Glue 10ml, Fast Drying | Kenya |
| I-G Tech Glue 5ML | I-G Tech lash glue 5ml | I-G Tech Lash Glue 5ml, Fast Drying | Kenya |
| L Curl Lash | L curl lash extensions | L Curl Lash Extensions L, L+, LC, LD | Kenya |
| L Curl Lash 0.03mm | 0.03mm L curl lashes | L Curl Lash Extensions 0.03mm for Volume | Kenya |
| Lash Bed | lash bed | Curved Lash Bed for Eyelash Extensions | Kenya |
| Lash Brush / Spoolies | lash spoolies | Lash Spoolies, Disposable Lash Brushes | Kenya |
| Lash Check Mirror (2pcs) | lash check mirror | Lash Check Mirror, Stainless Steel, 2pcs | Kenya |
| Lash Gel Remover 10G | lash gel remover 10g | Pink Lash Gel Remover 10g for Extensions | Kenya |
| Lash Gel Remover 5g | lash glue remover 5g | Lash Glue Remover 5g Jar, Works in 3-5 Min | Kenya |
| Lash Gel Remover 5G | lash gel remover 5g | Pink Lash Gel Remover 5g for Extensions | Kenya |
| Lash Glue 10ML | lash glue 10ml | Lash Glue 10ml for Eyelash Extensions | Kenya |
| Lash Glue 5ML | lash glue 5ml | Lash Glue 5ml for Eyelash Extensions | Kenya |
| Lash Serum | lash serum | Lash Serum for Natural Lash Care | Kenya |
| Lash Shampoo 60ML | lash shampoo | Lash Shampoo 60ml Foam Cleanser | Kenya |
| Lash Tape | lash tape | Breathable Pink Lash Tape for Extensions | Kenya |
| Lower Flat Bottom Lashes | flat bottom lashes | Flat Bottom Lashes 6-7mm, Split Tips | Kenya |
| Luxury Comic Spire Lashes | luxury comic spire lashes | Luxury Comic Spire Lashes, Anime Effect 0.05mm | Kenya |
| M Curl Lash | M curl lash extensions | M Curl Lash Extensions for Hooded Eyes | Kenya |
| M Curl Lash 0.03mm | 0.03mm M curl lashes | M Curl Lash Extensions 0.03mm Mixed Tray | Kenya |
| Makeup Box | makeup box | Portable Makeup Box for Lash and Beauty Tools | Kenya |
| Mascara Wands (2 bags, 100pcs) | disposable mascara wands | Disposable Mascara Wands / Spoolies, 2 Bags | Kenya |
| Micro Brushes (100pcs) | disposable micro brushes | Disposable Micro Brushes for Lashes, 100pcs | Kenya |
| Microbrush | microbrush applicators | Microbrush Applicators for Lash Products | Kenya |
| Mild Glue 0507 (0.5s, long lasting) | mild lash glue | Mild Lash Glue 0507, 0.5s, Long Lasting | Kenya |
| Mini Air Blower | lash air blower | Mini Air Blower for Drying Lash Glue | Kenya |
| Mirror | lash mirror | Lash Mirror for Checking Extensions | Kenya |
| Moonlight | half moon lash lamp | Half Moon Lash Lamp, Floor Standing LED | Kenya |
| Premade Fans 6D Short Stem | 6D premade fans | 6D Premade Fans Short Stem 0.07mm, 180 Fans | Kenya |
| Primer | lash primer | Lash Primer for Eyelash Extensions | Kenya |
| Protein Remover / Lash Primer (Green Tea) | lash protein remover | Lash Protein Remover, Green Tea, 15ml | Kenya |
| Rainbow Lash | rainbow lash extensions | Rainbow Lash Extensions, 8 Colours in One Tray | Kenya |
| Remover Brush Pen | lash remover pen | Lash Remover Brush Pen 5ml / 10ml | Kenya |
| Spike 3D-W Lash - Brown | brown spike lashes | Brown Spike 3D-W Lash Extensions 0.07mm | Kenya |
| Spikes Lashes | spike lash extensions | Wispy Spike Lash Extensions 0.07mm | Kenya |
| Spire Anime Effect Lashes | spire anime lashes | Spire Anime Lashes, Anime Effect 0.05mm | Kenya |
| Strong Viscosity Glue 0505 (1s) | strong lash glue | Strong Lash Glue 0505, 1s Dry, Thick | Kenya |
| Surgical Tape (10 rolls) | surgical lash tape | Surgical Tape for Lash Extensions, 10 Rolls | Kenya |
| Transparent PE Tape (10 rolls) | transparent lash tape | Transparent PE Lash Tape, Breathable, 10 Rolls | Kenya |
| Tweezers | lash tweezers | Precision Lash Tweezers for Extensions | Kenya |
| Ultra Glue 0506 (1s, low irritation) | low irritation lash glue | Ultra Lash Glue 0506, 1s Dry, Low Irritation | Kenya |
| Ventilador Premade Fans (3D-20D) | premade volume fans | Premade Volume Fans 3D-20D, 0.05/0.07mm | Kenya |
| VETUS Golden Feather / Dolphin Tweezers | VETUS volume tweezers | VETUS Golden Feather and Dolphin Volume Tweezers | Kenya |
| VETUS Tweezers ESD | VETUS ESD tweezers | VETUS ESD Lash Tweezers ESD-11+ | Kenya |
| VETUS Tweezers MSA | VETUS MSA tweezers | VETUS MSA Lash Tweezers MSA-18+ | Kenya |
| VETUS Tweezers ST | VETUS ST tweezers | VETUS ST Lash Tweezers ST-11+ | Kenya |
| Volume Lash 0.02/0.03mm | mega volume lashes | Mega Volume Lashes 0.02 / 0.03mm Trays | Kenya |
| Volume Lash 0.05/0.07mm | volume lash extensions | Volume Lash Extensions 0.05 / 0.07mm Trays | Kenya |
| W Shape Lash (6D) - Black | 6D W lashes | 6D W Shape Lash Extensions Black 0.07mm | Kenya |
| W Shape Lash (6D) - Brown | brown 6D W lashes | 6D W Shape Lash Extensions Brown 0.07mm | Kenya |
| Wings Anime Effect Lashes | wings anime lashes | Wings Anime Lashes, Anime Effect 0.05mm | Kenya |
| YY Shape Lash - Black | YY lashes | YY Lashes Black 0.07mm, Y Shape Extensions | Kenya |
| YY Shape Lash - Dark Brown | dark brown YY lashes | Dark Brown YY Lashes 0.07mm | Kenya |
| YY Shape Lash - Light Brown | light brown YY lashes | Light Brown YY Lashes 0.07mm | Kenya |
| YY/W Lash Glue 0607 (0.5s) | YY lash glue | YY and W Lash Glue 0607, 0.5s Dry, 5ml | Kenya |
| 8D-W Shape Lash | 8D W lashes | 8D W Shape Lash Extensions 0.07mm | Kenya |
| DIY Lash Glue (wand) | DIY lash glue | DIY Cluster Lash Glue with Wand | Kenya |
| Fadvan Eyelash Tweezers | eyelash extension tweezers | Pink Eyelash Extension Tweezers, Volume & Isolation | Kenya |
| Lash Cleaning Shampoo 60ml | lash cleaning shampoo | Lash Cleaning Shampoo 60ml Foam Cleanser | Kenya |
| Sky Glue | sky lash glue | Sky Lash Glue, 1s Dry, Soft Bond | Kenya |
