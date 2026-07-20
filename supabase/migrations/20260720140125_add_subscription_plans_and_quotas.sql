alter table public.profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'pro', 'enterprise')),
  add column if not exists plan_updated_at timestamptz not null default now();

update public.profiles
set plan = 'enterprise',
    plan_updated_at = now()
where role = 'admin'
  and plan <> 'enterprise';

create index if not exists profiles_plan_idx
  on public.profiles (plan);

revoke update on table public.profiles from anon, authenticated;
grant update (role, status, suspended_at, plan, plan_updated_at)
  on table public.profiles to authenticated;

create or replace function public.get_my_analysis_quota()
returns table (
  plan_name text,
  used integer,
  monthly_limit integer,
  remaining integer,
  period_start date
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    profile.plan as plan_name,
    count(run.id)::integer as used,
    case profile.plan
      when 'free' then 50
      when 'pro' then 5000
      else null
    end as monthly_limit,
    case profile.plan
      when 'free' then greatest(50 - count(run.id)::integer, 0)
      when 'pro' then greatest(5000 - count(run.id)::integer, 0)
      else null
    end as remaining,
    date_trunc('month', now())::date as period_start
  from public.profiles as profile
  left join public.analysis_runs as run
    on run.user_id = profile.id
   and run.created_at >= date_trunc('month', now())
   and run.created_at < date_trunc('month', now()) + interval '1 month'
  where profile.id = (select auth.uid())
    and profile.status = 'active'
  group by profile.id, profile.plan;
$$;

revoke all on function public.get_my_analysis_quota() from public, anon, authenticated;
grant execute on function public.get_my_analysis_quota() to authenticated;

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
  coalesce(transaction_stats.detected_count, 0)::bigint as detected_count,
  profile.plan,
  profile.plan_updated_at,
  coalesce(analysis_stats.monthly_analysis_count, 0)::bigint as monthly_analysis_count
from public.profiles as profile
left join lateral (
  select
    count(*) as analysis_count,
    count(*) filter (
      where run.created_at >= date_trunc('month', now())
        and run.created_at < date_trunc('month', now()) + interval '1 month'
    ) as monthly_analysis_count,
    max(run.created_at) as last_analysis_at
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
