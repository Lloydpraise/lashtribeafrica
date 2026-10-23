# Variant photos, bulk publishing and categories

Everything is in your local checkout, C:\Users\ADMIN\projects\lashtribe-astro. Nothing has been pushed.

## Run order (Supabase SQL editor)
1. `0024_product_variant_photos.sql`: links each variant to its own photo. Safe to re-run.
2. `0025_category_tree.sql`: adds subcategories and sorts products into them. Safe to re-run, and it works without 0018.

Then deploy, so the new photos in `public/products/` and the code changes go live.

## Photos that showed more than one variant (fixed in 0024)
| Product | What the photo showed | Fix |
|---|---|---|
| Fast-Drying Black Glue | 5ml and 10ml bottles | New option Size: 10ml / 5ml, each with its own photo |
| Ventilador premade fans | 3D to 20D in one photo | Each fan size has its own photo |
| Fadvan tweezers | Types AF, A and B | Each type linked to its photo |
| Classic, volume and flat lashes | Different thicknesses in one tray photo | Each thickness linked to the photo that shows it |
| L-curl lashes | L, L+, LC and LD | Each curl has its own photo |
| Mega volume fans | Curls C and D | New option Curl: C / D, with photos |
| 0.07 premade fans | Curls C and D | New option Curl: C / D (no clean photo to split) |
| Isolation tweezers | Straight and curved, but it is sold curved | Photo replaced with the curved one |
| Lash shampoo | Second photo was a brush bundle | That photo removed |
| Color Lash | Four colour combos | Option Colour, each with its photo |
| From 0023: Mini Air Blower, Glue Rings, DIY Cluster Lash | Colours, ring types, styles | Each choice linked to its photo |

These were flagged but not changed:
* The under-eye gel patches photo shows several colours, but we sell one.
* The Low-Fume Primer is named 10ml, but its photo shows a 15ml bottle.
* The micro-brush photo shows two purple bottles, so I could not link a Purple/Blue photo.
* The A-01 silver-cap bottle has no clean photo.

## Categories (0025)
| Main category | Subcategories |
|---|---|
| Lash Extensions | Classic, Volume, Flat/Ellipse, Shaped (YY, W, Spikes), Coloured, Mixed & Specialty, Cluster/DIY lashes |
| Premade Fans | Short stem, Long stem/Loose, Mega volume (Lash Fans moves under here) |
| Adhesives & Primers | **Fast-Drying Glue (0.1-1s)**, **Medium & Slow-Drying Glue (1-4s)**, DIY Cluster Glue, Primers & Prep |
| Removers & Aftercare | Removers, Shampoo & Cleansers, Sealants & Aftercare |
| Tools | Tweezers, Brushes & Applicators, Glue Rings & Holders, Pads & Tape, Kits & Accessories |

* On the shop page each main category has a heading with chip links to its subcategories, then one row per subcategory. The category chips now also show on desktop.
* The product page breadcrumb reads, for example, Adhesives & Primers › Fast-Drying Glue.
* Search also matches the main category name.
* An offer on a main category now also covers every product in its subcategories.

## Admin: Products
* The **bulk bar is at the top right** and stays in view while you scroll. Tick products, or use "Select all", then choose **Publish N**, Unpublish, Archive or Move to category. It warns you when a selected product has no photo.
* There is a search box that matches name, SKU, category and variant values.
* Status tabs (All, Published, Draft, Archived) show counts.
* Filters cover category (a main category includes its subcategories), supplier and sort order. Reset clears them.
* The list works on a phone and shows 100 products at a time.
* A **Categories** button opens a manager where you can rename a category, move it under a main category, change its order, add or delete it, and see its product count.
* In the product form, the Status field moved out of the field grid. It is now a **Draft / Published / Archived switch at the top right** of the form.
* "New category" in the form can create a subcategory.
* **"Goes together with"** is now a search box with thumbnails. The products you pick show as chips you can remove.

## Checks done
* Both migrations ran twice on a test database, and the category counts were correct.
* The site builds.
* I tested the admin screens with sample data: search, the category filter, select all, bulk publish, the category manager, the form's status switch and the picker.
