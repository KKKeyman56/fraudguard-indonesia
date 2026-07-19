create index if not exists analysis_runs_created_at_idx on public.analysis_runs (created_at desc);
create index if not exists transactions_status_idx on public.transactions (status);
