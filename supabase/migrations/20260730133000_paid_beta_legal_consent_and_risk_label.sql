-- Paid beta legal consent, per-analysis authorization, and safer risk terminology.

alter table public.analysis_runs
  add column if not exists data_processing_consent_version text,
  add column if not exists data_processing_consented_at timestamptz;

update public.analysis_runs
set
  data_processing_consent_version = coalesce(data_processing_consent_version, 'legacy-pre-consent'),
  data_processing_consented_at = coalesce(data_processing_consented_at, created_at);

alter table public.analysis_runs
  alter column data_processing_consent_version set not null,
  alter column data_processing_consented_at set not null;

create table if not exists public.legal_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  legal_version text not null,
  screening_consent_version text not null,
  terms_accepted boolean not null check (terms_accepted),
  privacy_accepted boolean not null check (privacy_accepted),
  screening_consent boolean not null check (screening_consent),
  consented_at timestamptz not null default now(),
  source text not null check (source in ('signup', 'settings')),
  created_at timestamptz not null default now(),
  unique (user_id, legal_version, screening_consent_version)
);

create index if not exists legal_consents_user_created_idx
  on public.legal_consents (user_id, created_at desc);

alter table public.legal_consents enable row level security;

drop policy if exists "Users can read own legal consents" on public.legal_consents;
create policy "Users can read own legal consents"
  on public.legal_consents
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.legal_consents from public, anon, authenticated;
grant select on table public.legal_consents to authenticated;

create or replace function public.capture_signup_legal_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce((new.raw_user_meta_data ->> 'terms_accepted')::boolean, false)
    and coalesce((new.raw_user_meta_data ->> 'privacy_accepted')::boolean, false)
    and coalesce((new.raw_user_meta_data ->> 'screening_consent')::boolean, false)
  then
    insert into public.legal_consents (
      user_id,
      legal_version,
      screening_consent_version,
      terms_accepted,
      privacy_accepted,
      screening_consent,
      consented_at,
      source
    )
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'legal_version', 'unknown'),
      coalesce(new.raw_user_meta_data ->> 'screening_consent_version', 'unknown'),
      true,
      true,
      true,
      coalesce((new.raw_user_meta_data ->> 'consented_at')::timestamptz, now()),
      'signup'
    )
    on conflict (user_id, legal_version, screening_consent_version) do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.capture_signup_legal_consent() from public, anon, authenticated;

drop trigger if exists on_auth_user_capture_legal_consent on auth.users;
create trigger on_auth_user_capture_legal_consent
  after insert on auth.users
  for each row execute function public.capture_signup_legal_consent();

alter table public.transactions
  drop constraint if exists transactions_status_check;

update public.transactions
set status = 'RISIKO TINGGI'
where status = 'TERDETEKSI';

alter table public.transactions
  add constraint transactions_status_check
  check (status in ('AMAN', 'WASPADA', 'RISIKO TINGGI'));

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
  coalesce(transaction_stats.monthly_transaction_count, 0)::bigint as monthly_analysis_count
from public.profiles as profile
left join lateral (
  select
    count(*) as analysis_count,
    max(run.created_at) as last_analysis_at
  from public.analysis_runs as run
  where run.user_id = profile.id
) as analysis_stats on true
left join lateral (
  select
    count(*) as transaction_count,
    count(*) filter (where transaction.status = 'RISIKO TINGGI') as detected_count,
    count(*) filter (
      where transaction.created_at >= date_trunc('month', now())
        and transaction.created_at < date_trunc('month', now()) + interval '1 month'
    ) as monthly_transaction_count
  from public.transactions as transaction
  where transaction.user_id = profile.id
) as transaction_stats on true;

revoke all on table public.admin_user_overview from public, anon, authenticated;
grant select on table public.admin_user_overview to authenticated;
