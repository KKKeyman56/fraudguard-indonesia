alter table public.profiles
  add column if not exists plan_expires_at timestamptz;

create table if not exists public.payments (
  id bigint generated always as identity primary key,
  order_id text not null unique,
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('pro', 'enterprise')),
  amount integer not null check (amount > 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  status text not null default 'created'
    check (status in ('created', 'pending', 'paid', 'denied', 'cancelled', 'expired', 'failed', 'refunded')),
  midtrans_transaction_id text,
  transaction_status text,
  payment_type text,
  fraud_status text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_user_id_created_at_idx
  on public.payments (user_id, created_at desc);
create index if not exists payments_status_updated_at_idx
  on public.payments (status, updated_at desc);

alter table public.payments enable row level security;

drop policy if exists "Users can view own payments" on public.payments;
create policy "Users can view own payments"
  on public.payments for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.payments from public, anon, authenticated;
grant select on table public.payments to authenticated;
revoke all on sequence public.payments_id_seq from public, anon, authenticated;

create or replace function public.apply_midtrans_payment_status(
  p_order_id text,
  p_status text,
  p_transaction_id text,
  p_transaction_status text,
  p_payment_type text,
  p_fraud_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.payments%rowtype;
begin
  if p_status not in ('pending', 'paid', 'denied', 'cancelled', 'expired', 'failed', 'refunded') then
    raise exception 'INVALID_PAYMENT_STATUS';
  end if;

  select * into target
  from public.payments
  where order_id = p_order_id
  for update;

  if not found then
    raise exception 'PAYMENT_NOT_FOUND';
  end if;

  update public.payments
  set status = p_status,
      midtrans_transaction_id = coalesce(p_transaction_id, midtrans_transaction_id),
      transaction_status = p_transaction_status,
      payment_type = coalesce(p_payment_type, payment_type),
      fraud_status = coalesce(p_fraud_status, fraud_status),
      paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
      updated_at = now()
  where id = target.id;

  if p_status = 'paid' and target.status <> 'paid' then
    update public.profiles
    set plan = target.plan,
        plan_updated_at = now(),
        plan_expires_at = case
          when plan = target.plan and plan_expires_at > now()
            then plan_expires_at + interval '30 days'
          else now() + interval '30 days'
        end
    where id = target.user_id;
  elsif p_status = 'refunded' and target.status = 'paid' and not exists (
    select 1 from public.payments as newer
    where newer.user_id = target.user_id
      and newer.status = 'paid'
      and newer.id <> target.id
      and newer.paid_at > target.paid_at
  ) then
    update public.profiles
    set plan = 'free', plan_updated_at = now(), plan_expires_at = null
    where id = target.user_id;
  end if;
end;
$$;

revoke all on function public.apply_midtrans_payment_status(text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_midtrans_payment_status(text, text, text, text, text, text)
  to service_role;

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
  with account as (
    select
      profile.id,
      case
        when profile.plan in ('pro', 'enterprise')
          and profile.plan_expires_at is not null
          and profile.plan_expires_at <= now() then 'free'
        else profile.plan
      end as effective_plan
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.status = 'active'
  )
  select
    account.effective_plan as plan_name,
    count(run.id)::integer as used,
    case account.effective_plan
      when 'free' then 50
      when 'pro' then 5000
      when 'enterprise' then 10000
      else 50
    end as monthly_limit,
    case account.effective_plan
      when 'free' then greatest(50 - count(run.id)::integer, 0)
      when 'pro' then greatest(5000 - count(run.id)::integer, 0)
      when 'enterprise' then greatest(10000 - count(run.id)::integer, 0)
      else greatest(50 - count(run.id)::integer, 0)
    end as remaining,
    date_trunc('month', now())::date as period_start
  from account
  left join public.analysis_runs as run
    on run.user_id = account.id
   and run.created_at >= date_trunc('month', now())
   and run.created_at < date_trunc('month', now()) + interval '1 month'
  group by account.id, account.effective_plan;
$$;

revoke all on function public.get_my_analysis_quota() from public, anon, authenticated;
grant execute on function public.get_my_analysis_quota() to authenticated;
