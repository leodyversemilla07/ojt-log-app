-- RLS verification script for public.ojt_logs
-- Run this in Supabase SQL Editor AFTER creating at least 2 real users:
--   user A and user B.
--
-- Replace placeholders before running:
--   <USER_A_UUID>
--   <USER_B_UUID>

-- 1) Confirm RLS is enabled on the table
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'ojt_logs';

-- 2) Confirm policies exist
select schemaname, tablename, policyname, permissive, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'ojt_logs'
order by policyname;

-- 3) Seed one test row for each user (idempotent)
insert into public.ojt_logs (
  id, user_id, date, week_number, day_number, time_in, time_out, total_hours,
  tasks_accomplished, key_learnings, challenges, goals_for_tomorrow
)
values
  (gen_random_uuid(), '<USER_A_UUID>'::uuid, current_date, 1, 1, '08:00', '17:00', 8.00, array['A task'], array['A learning'], '', ''),
  (gen_random_uuid(), '<USER_B_UUID>'::uuid, current_date, 1, 1, '08:00', '17:00', 8.00, array['B task'], array['B learning'], '', '')
on conflict do nothing;

-- 4) Manual test plan (run from app with signed-in users):
--    As USER A:
--      - Should see only USER A rows
--      - Should NOT see USER B rows
--      - Should NOT update/delete USER B rows
--    As USER B:
--      - Same, mirrored behavior
