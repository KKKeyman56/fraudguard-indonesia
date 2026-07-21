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
      when 'enterprise' then 10000
      else 50
    end as monthly_limit,
    case profile.plan
      when 'free' then greatest(50 - count(run.id)::integer, 0)
      when 'pro' then greatest(5000 - count(run.id)::integer, 0)
      when 'enterprise' then greatest(10000 - count(run.id)::integer, 0)
      else greatest(50 - count(run.id)::integer, 0)
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
