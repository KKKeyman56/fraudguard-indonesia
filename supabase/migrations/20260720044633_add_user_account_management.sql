alter table public.profiles
  add column if not exists status text not null default 'active'
    check (status in ('active', 'suspended')),
  add column if not exists suspended_at timestamptz;

create index if not exists profiles_suspended_idx
  on public.profiles (suspended_at desc)
  where status = 'suspended';

create index if not exists analysis_runs_user_created_idx
  on public.analysis_runs (user_id, created_at desc);

create index if not exists transactions_user_status_idx
  on public.transactions (user_id, status);

create or replace function private.is_fraudguard_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and status = 'active'
    );
$$;

revoke all on function private.is_fraudguard_active_user() from public, anon, authenticated;
grant execute on function private.is_fraudguard_active_user() to authenticated;

create or replace function private.is_fraudguard_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
        and status = 'active'
    );
$$;

revoke all on function private.is_fraudguard_admin() from public, anon, authenticated;
grant execute on function private.is_fraudguard_admin() to authenticated;

revoke update on table public.profiles from anon, authenticated;
grant update (role, status, suspended_at) on table public.profiles to authenticated;

drop policy if exists "Admin mengelola pengguna lain" on public.profiles;
create policy "Admin mengelola pengguna lain"
on public.profiles
for update
to authenticated
using (
  (select private.is_fraudguard_admin())
  and id <> (select auth.uid())
)
with check (
  (select private.is_fraudguard_admin())
  and id <> (select auth.uid())
);

drop policy if exists "Pengguna atau admin membaca analisis" on public.analysis_runs;
create policy "Pengguna aktif atau admin membaca analisis"
on public.analysis_runs
for select
to authenticated
using (
  (
    user_id = (select auth.uid())
    and (select private.is_fraudguard_active_user())
  )
  or (select private.is_fraudguard_admin())
);

drop policy if exists "Pengguna menyimpan analisis sendiri" on public.analysis_runs;
create policy "Pengguna aktif menyimpan analisis sendiri"
on public.analysis_runs
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.is_fraudguard_active_user())
);

drop policy if exists "Pengguna menghapus analisis sendiri" on public.analysis_runs;
create policy "Pengguna aktif menghapus analisis sendiri"
on public.analysis_runs
for delete
to authenticated
using (
  user_id = (select auth.uid())
  and (select private.is_fraudguard_active_user())
);

drop policy if exists "Pengguna atau admin membaca transaksi" on public.transactions;
create policy "Pengguna aktif atau admin membaca transaksi"
on public.transactions
for select
to authenticated
using (
  (
    user_id = (select auth.uid())
    and (select private.is_fraudguard_active_user())
  )
  or (select private.is_fraudguard_admin())
);

drop policy if exists "Pengguna menyimpan transaksi sendiri" on public.transactions;
create policy "Pengguna aktif menyimpan transaksi sendiri"
on public.transactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select private.is_fraudguard_active_user())
);

create or replace view public.admin_user_overview
with (security_invoker = true)
as
select
  profile.id,
  profile.email,
  profile.role,
  profile.status,
  profile.suspended_at,
  profile.created_at,
  coalesce(analysis_stats.analysis_count, 0)::bigint as analysis_count,
  analysis_stats.last_analysis_at,
  coalesce(transaction_stats.transaction_count, 0)::bigint as transaction_count,
  coalesce(transaction_stats.detected_count, 0)::bigint as detected_count
from public.profiles as profile
left join lateral (
  select count(*) as analysis_count, max(run.created_at) as last_analysis_at
  from public.analysis_runs as run
  where run.user_id = profile.id
) as analysis_stats on true
left join lateral (
  select
    count(*) as transaction_count,
    count(*) filter (where transaction.status = 'TERDETEKSI') as detected_count
  from public.transactions as transaction
  where transaction.user_id = profile.id
) as transaction_stats on true;

revoke all on table public.admin_user_overview from public, anon, authenticated;
grant select on table public.admin_user_overview to authenticated;
