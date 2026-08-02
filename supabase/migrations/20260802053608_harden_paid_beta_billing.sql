alter table public.payments
  add column if not exists checkout_url text,
  add column if not exists checkout_expires_at timestamptz;

create table if not exists public.payment_events (
  id bigint generated always as identity primary key,
  payment_id bigint not null references public.payments(id) on delete cascade,
  mapped_status text not null
    check (mapped_status in ('pending', 'paid', 'denied', 'cancelled', 'expired', 'failed', 'refunded')),
  transaction_status text not null,
  transaction_id text,
  payment_type text,
  fraud_status text,
  received_at timestamptz not null default now()
);

create unique index if not exists payment_events_dedupe_idx
  on public.payment_events (
    payment_id,
    mapped_status,
    transaction_status,
    coalesce(transaction_id, '')
  );

create index if not exists payment_events_payment_id_received_at_idx
  on public.payment_events (payment_id, received_at desc);

alter table public.payment_events enable row level security;

revoke all on table public.payment_events from public, anon, authenticated;
revoke all on sequence public.payment_events_id_seq from public, anon, authenticated;
grant select, insert on table public.payment_events to service_role;
grant usage, select on sequence public.payment_events_id_seq to service_role;

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

  insert into public.payment_events (
    payment_id,
    mapped_status,
    transaction_status,
    transaction_id,
    payment_type,
    fraud_status
  ) values (
    target.id,
    p_status,
    p_transaction_status,
    p_transaction_id,
    p_payment_type,
    p_fraud_status
  ) on conflict do nothing;

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
