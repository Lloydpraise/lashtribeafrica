-- 0031_qeelasee_moq_5.sql
-- Minimum order quantity (the quantity from which the wholesale price applies) = 5 for every Qeelasee product,
-- including the 0023 proposals. Prices are per piece/tray, so 5 is the wholesale threshold.
-- Safe to re-run.

update public.products p
   set moq = 5
  from public.suppliers s
 where s.id = p.supplier_id
   and lower(s.name) = 'qeelasee'
   and p.moq is distinct from 5;

select count(*) as qeelasee_products_with_moq_5
  from public.products p join public.suppliers s on s.id = p.supplier_id
 where lower(s.name) = 'qeelasee' and p.moq = 5;
