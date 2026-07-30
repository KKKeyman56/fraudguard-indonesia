create table if not exists private.analysis_rate_limit_buckets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  request_count integer not null default 0 check (request_count >= 0),
  reset_at timestamptz not null
);

create or replace function private.consume_my_analysis_rate_limit(
  p_limit integer default 8,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  resulting_count integer;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if p_limit < 1 or p_limit > 120 or p_window_seconds < 10 or p_window_seconds > 3600 then
    raise exception using errcode = '22023', message = 'INVALID_RATE_LIMIT_CONFIGURATION';
  end if;

  insert into private.analysis_rate_limit_buckets (user_id, request_count, reset_at)
  values (actor_id, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (user_id) do update set
    request_count = case
      when private.analysis_rate_limit_buckets.reset_at <= now() then 1
      else private.analysis_rate_limit_buckets.request_count + 1
    end,
    reset_at = case
      when private.analysis_rate_limit_buckets.reset_at <= now()
        then now() + make_interval(secs => p_window_seconds)
      else private.analysis_rate_limit_buckets.reset_at
    end
  returning request_count into resulting_count;

  return resulting_count <= p_limit;
end;
$$;

revoke all on function private.consume_my_analysis_rate_limit(integer, integer)
  from public, anon, authenticated;
grant execute on function private.consume_my_analysis_rate_limit(integer, integer)
  to authenticated;

create or replace function public.consume_my_analysis_rate_limit()
returns boolean
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.consume_my_analysis_rate_limit(8, 60);
$$;

revoke all on function public.consume_my_analysis_rate_limit()
  from public, anon, authenticated;
grant execute on function public.consume_my_analysis_rate_limit()
  to authenticated;

comment on table private.analysis_rate_limit_buckets is
  'Rate limit global lintas instance Vercel untuk endpoint analisis.';
