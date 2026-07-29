alter table public.analysis_runs
  add column if not exists baseline_snapshot jsonb not null default '{}'::jsonb;

alter table public.transactions
  add column if not exists order_id text,
  add column if not exists customer_external_id text,
  add column if not exists account_age_days integer,
  add column if not exists refund_count integer not null default 0,
  add column if not exists failed_payment_count integer not null default 0,
  add column if not exists voucher_code text,
  add column if not exists item_count integer,
  add column if not exists sales_channel text,
  add column if not exists shipping_method text,
  add column if not exists feedback_status text not null default 'UNKNOWN',
  add column if not exists review_status text not null default 'PENDING',
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'analysis_runs_baseline_snapshot_object_check'
      and conrelid = 'public.analysis_runs'::regclass
  ) then
    alter table public.analysis_runs
      add constraint analysis_runs_baseline_snapshot_object_check
      check (jsonb_typeof(baseline_snapshot) = 'object');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_account_age_days_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_account_age_days_check
      check (account_age_days is null or account_age_days >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_refund_count_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_refund_count_check
      check (refund_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_failed_payment_count_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_failed_payment_count_check
      check (failed_payment_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_item_count_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_item_count_check
      check (item_count is null or item_count > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_feedback_status_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_feedback_status_check
      check (feedback_status in ('UNKNOWN', 'SAFE', 'PROBLEM'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_review_status_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_review_status_check
      check (review_status in ('PENDING', 'REVIEWED'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'transactions_review_note_length_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_review_note_length_check
      check (review_note is null or char_length(review_note) <= 500);
  end if;
end
$$;

create index if not exists transactions_user_review_created_idx
  on public.transactions (user_id, review_status, created_at desc);

create index if not exists transactions_user_feedback_idx
  on public.transactions (user_id, feedback_status);

create table if not exists public.transaction_review_audit (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  analysis_id uuid not null references public.analysis_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  old_feedback text not null,
  new_feedback text not null,
  old_review_status text not null,
  new_review_status text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.transaction_review_audit enable row level security;

create index if not exists transaction_review_audit_user_created_idx
  on public.transaction_review_audit (user_id, created_at desc);

create index if not exists transaction_review_audit_transaction_created_idx
  on public.transaction_review_audit (transaction_id, created_at desc);

create index if not exists transaction_review_audit_analysis_id_idx
  on public.transaction_review_audit (analysis_id);

create index if not exists transaction_review_audit_actor_id_idx
  on public.transaction_review_audit (actor_id);

create index if not exists transactions_reviewed_by_idx
  on public.transactions (reviewed_by);

revoke all on table public.transaction_review_audit from public, anon, authenticated;
grant select on table public.transaction_review_audit to authenticated;

drop policy if exists "Pengguna atau admin membaca audit review" on public.transaction_review_audit;
create policy "Pengguna atau admin membaca audit review"
on public.transaction_review_audit
for select
to authenticated
using (
  (
    user_id = (select auth.uid())
    and (select private.is_fraudguard_active_user())
  )
  or (select private.is_fraudguard_admin())
);

revoke update on table public.transactions from anon, authenticated;
grant update (
  feedback_status,
  review_status,
  review_note,
  reviewed_at,
  reviewed_by
) on table public.transactions to authenticated;

drop policy if exists "Pengguna atau admin memperbarui review transaksi" on public.transactions;
create policy "Pengguna atau admin memperbarui review transaksi"
on public.transactions
for update
to authenticated
using (
  (
    user_id = (select auth.uid())
    and (select private.is_fraudguard_active_user())
  )
  or (select private.is_fraudguard_admin())
)
with check (
  (
    (
      user_id = (select auth.uid())
      and (select private.is_fraudguard_active_user())
    )
    or (select private.is_fraudguard_admin())
  )
  and (reviewed_by is null or reviewed_by = (select auth.uid()))
);

create or replace function private.log_transaction_review_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.feedback_status is distinct from new.feedback_status
     or old.review_status is distinct from new.review_status
     or old.review_note is distinct from new.review_note then
    insert into public.transaction_review_audit (
      transaction_id,
      analysis_id,
      user_id,
      actor_id,
      old_feedback,
      new_feedback,
      old_review_status,
      new_review_status,
      note
    )
    values (
      new.id,
      new.analysis_id,
      new.user_id,
      coalesce(new.reviewed_by, (select auth.uid())),
      old.feedback_status,
      new.feedback_status,
      old.review_status,
      new.review_status,
      new.review_note
    );
  end if;
  return new;
end;
$$;

revoke all on function private.log_transaction_review_change() from public, anon, authenticated;

drop trigger if exists transaction_review_audit_trigger on public.transactions;
create trigger transaction_review_audit_trigger
after update of feedback_status, review_status, review_note
on public.transactions
for each row
execute function private.log_transaction_review_change();

comment on column public.analysis_runs.baseline_snapshot is
  'Snapshot baseline bisnis yang dipakai saat analisis dijalankan.';

comment on table public.transaction_review_audit is
  'Jejak append-only perubahan feedback dan status review transaksi.';
