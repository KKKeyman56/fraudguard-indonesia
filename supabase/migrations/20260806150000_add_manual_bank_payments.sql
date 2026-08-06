alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments
  add constraint payments_provider_check
  check (provider in ('manual_bank', 'midtrans', 'doku', 'ipaymu'));

alter table public.payments
  add column if not exists manual_review_status text,
  add column if not exists proof_path text,
  add column if not exists proof_original_name text,
  add column if not exists proof_submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id),
  add column if not exists review_note text;

alter table public.payments drop constraint if exists payments_manual_review_status_check;
alter table public.payments
  add constraint payments_manual_review_status_check
  check (manual_review_status is null or manual_review_status in (
    'awaiting_proof', 'pending_review', 'approved', 'rejected'
  ));

create index if not exists payments_manual_review_queue_idx
  on public.payments (manual_review_status, proof_submitted_at desc)
  where provider = 'manual_bank';

alter table public.payment_events drop constraint if exists payment_events_provider_check;
alter table public.payment_events
  add constraint payment_events_provider_check
  check (provider in ('manual_bank', 'midtrans', 'doku', 'ipaymu'));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.apply_manual_payment_review(
  p_order_id text,
  p_decision text,
  p_reviewer_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.payments%rowtype;
  mapped_status text;
begin
  if not exists (
    select 1 from public.profiles
    where id = p_reviewer_id and role = 'admin' and status = 'active'
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'INVALID_REVIEW_DECISION';
  end if;

  select * into target
  from public.payments
  where order_id = p_order_id
  for update;

  if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
  if target.provider <> 'manual_bank' then raise exception 'PAYMENT_PROVIDER_MISMATCH'; end if;
  if target.manual_review_status <> 'pending_review' or target.proof_path is null then
    raise exception 'PAYMENT_PROOF_NOT_READY';
  end if;
  if target.status = 'paid' then raise exception 'PAYMENT_ALREADY_APPROVED'; end if;

  mapped_status := case when p_decision = 'approved' then 'paid' else 'denied' end;

  insert into public.payment_events (
    payment_id, provider, mapped_status, transaction_status, transaction_id, payment_type
  ) values (
    target.id, 'manual_bank', mapped_status, upper(p_decision), null, 'bank_transfer_manual'
  ) on conflict do nothing;

  update public.payments
  set status = mapped_status,
      manual_review_status = p_decision,
      transaction_status = upper(p_decision),
      payment_type = 'bank_transfer_manual',
      reviewed_at = now(),
      reviewed_by = p_reviewer_id,
      review_note = nullif(left(trim(coalesce(p_note, '')), 500), ''),
      paid_at = case when p_decision = 'approved' then now() else paid_at end,
      updated_at = now()
  where id = target.id;

  if p_decision = 'approved' then
    update public.profiles
    set plan = target.plan,
        plan_updated_at = now(),
        plan_expires_at = case
          when plan = target.plan and plan_expires_at > now()
            then plan_expires_at + interval '30 days'
          else now() + interval '30 days'
        end
    where id = target.user_id;
  end if;
end;
$$;

revoke all on function public.apply_manual_payment_review(text, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.apply_manual_payment_review(text, text, uuid, text)
  to service_role;
