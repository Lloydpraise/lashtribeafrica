-- 0036_fadvan_weights.sql
-- Shipping weight (kg per unit) for the Fadvan products. Checkout charges weight x Ksh/kg (0029).
-- "listing" = the package gross weight on the Fadvan Alibaba listing (2026-10-27). "estimate" = no listing
-- weight found: a typical weight for that item, change it in Admin -> Products when you hold one.
-- Only fills products whose weight is still 0, so weights you typed are kept. Run after 0029.

update public.products p
   set weight_kg = v.kg
  from (values
    ('fadvan-ventilador-premade-fans-3d-20d', 0.045),  -- listing: premade fans 0.045 kg (10x5x2 cm)
    ('fadvan-8d-w-shape-lash',                0.040),  -- listing: W shape lashes 0.040 kg (10x5x2 cm)
    ('fadvan-lash-gel-remover-5g',            0.050),  -- listing: glue remover 0.050 kg (10x5x2 cm)
    ('fadvan-diy-cluster-lashes',             0.050),  -- estimate
    ('fadvan-fast-drying-black-glue',         0.050),  -- estimate (5ml bottle + box)
    ('i-g-tech-glue-5ml',                     0.050),  -- estimate, same bottle as the black glue
    ('i-g-tech-glue-10ml',                    0.080),  -- estimate
    ('fadvan-eyelash-extension-glue-a-01-10ml', 0.080),-- estimate
    ('fadvan-lash-cleaning-shampoo-60ml',     0.100)   -- estimate (60ml bottle)
  ) as v(slug, kg)
 where p.slug = v.slug and coalesce(p.weight_kg, 0) = 0;

select slug, name, weight_kg from public.products
 where slug like 'fadvan-%' or slug like 'i-g-tech-glue%' order by slug;
