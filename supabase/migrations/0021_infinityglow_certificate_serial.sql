-- 0021_infinityglow_certificate_serial.sql
-- InfinityGlow™ Mastery certificate serials: UV-<year>-<roman>[-<round>]  (shown on the PDF and on /verify)
--
--   The roman part rotates II, III ... XX (19 sections). The first pass has no suffix; after XX it
--   starts again at II with -01, then -02, and so on up to -100:
--     #1 UV-2026-II   #2 UV-2026-III  ...  #19 UV-2026-XX
--     #20 UV-2026-II-01  ...  #38 UV-2026-XX-01   #39 UV-2026-II-02 ...
--   Numbering restarts every calendar year. Other courses keep LTA-<year>-00001.
--
-- Run AFTER 0020 in the Supabase SQL editor. Safe to re-run (the counters are kept).
-- To continue after certificates already handed out on paper, set how many were issued this year, e.g.
--   insert into public.infinityglow_certificate_counter (year, issued) values (2026, 6)
--   on conflict (year) do update set issued = excluded.issued;          -- next one is #7 = UV-2026-VIII

drop sequence if exists public.infinityglow_certificate_seq;   -- from an earlier draft of this file

create table if not exists public.infinityglow_certificate_counter (
  year integer primary key,
  issued integer not null default 0
);
alter table public.infinityglow_certificate_counter enable row level security;   -- no policies: only the trigger writes it

-- n = 1, 2, 3 ... within the year
create or replace function public.infinityglow_serial(p_year integer, n integer)
returns text
language sql
immutable
as $$
  select 'UV-' || p_year || '-' || to_char(2 + (n - 1) % 19, 'FMRN')
         || case when (n - 1) / 19 = 0 then '' else '-' || case when (n - 1) / 19 < 10 then '0' else '' end || ((n - 1) / 19) end;
$$;

create or replace function public.course_certificate_serial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  y integer := extract(year from coalesce(new.issued_at, now()))::integer;
  n integer;
begin
  if new.course_id = 'ec782526-4917-5fc8-a601-f65a45e72baf' then
    insert into public.infinityglow_certificate_counter as c (year, issued) values (y, 1)
    on conflict (year) do update set issued = c.issued + 1
    returning issued into n;
    new.certificate_no := public.infinityglow_serial(y, n);
  end if;
  return new;
end;
$$;

drop trigger if exists course_certificates_serial on public.course_certificates;
create trigger course_certificates_serial
  before insert on public.course_certificates
  for each row execute function public.course_certificate_serial();
