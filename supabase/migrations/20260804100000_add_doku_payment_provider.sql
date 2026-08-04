alter table public.payments
  add column if not exists provider text not null default 'midtrans',
  add column if not exists provider_transaction_id text,
  add column if not exists provider_session_id text;

alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments
  add constraint payments_provider_check
  check (provider in ('midtrans', 'doku', 'ipaymu'));

create index if not exists payments_provider_status_updated_at_idx
  on public.payments (provider, status, updated_at desc);

alter table public.payment_events
  add column if not exists provider text not null default 'midtrans';

alter table public.payment_events drop constraint if exists payment_events_provider_check;
alter table public.payment_events
  add constraint payment_events_provider_check
  check (provider in ('midtrans', 'doku', 'ipaymu'));

drop index if exists public.payment_events_dedupe_idx;
create unique index payment_events_dedupe_idx
  on public.payment_events (
    payment_id,
    provider,
    mapped_status,
    transaction_status,
    coalesce(transaction_id, '')
  );

create or replace function public.apply_doku_payment_status(
  p_order_id text,
  p_status text,
  p_transaction_id text,
  p_session_id text,
  p_transaction_status text,
  p_payment_type text
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
  if target.provider <> 'doku' then
    raise exception 'PAYMENT_PROVIDER_MISMATCH';
  end if;

  insert into public.payment_events (
    payment_id,
    provider,
    mapped_status,
    transaction_status,
    transaction_id,
    payment_type
  ) values (
    target.id,
    'doku',
    p_status,
    p_transaction_status,
    p_transaction_id,
    p_payment_type
  ) on conflict do nothing;

  update public.payments
  set status = p_status,
      provider_transaction_id = coalesce(p_transaction_id, provider_transaction_id),
      provider_session_id = coalesce(p_session_id, provider_session_id),
      transaction_status = p_transaction_status,
      payment_type = coalesce(p_payment_type, payment_type),
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

revoke all on function public.apply_doku_payment_status(text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.apply_doku_payment_status(text, text, text, text, text, text)
  to service_role;
