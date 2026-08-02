alter table public.payments
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;
