alter table public.analysis_runs
  add column if not exists engine_version text,
  add column if not exists explanation_provider text;

update public.analysis_runs
set
  engine_version = coalesce(engine_version, 'legacy'),
  explanation_provider = coalesce(explanation_provider, 'legacy')
where engine_version is null
   or explanation_provider is null;

alter table public.analysis_runs
  alter column engine_version set default 'legacy',
  alter column engine_version set not null,
  alter column explanation_provider set default 'legacy',
  alter column explanation_provider set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'analysis_runs_explanation_provider_check'
      and conrelid = 'public.analysis_runs'::regclass
  ) then
    alter table public.analysis_runs
      add constraint analysis_runs_explanation_provider_check
      check (explanation_provider in ('groq', 'fallback', 'legacy'));
  end if;
end
$$;

alter table public.transactions
  add column if not exists risk_signals jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_risk_signals_array_check'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_risk_signals_array_check
      check (jsonb_typeof(risk_signals) = 'array');
  end if;
end
$$;

comment on column public.analysis_runs.engine_version is
  'Versi deterministic risk engine yang menghasilkan skor.';

comment on column public.analysis_runs.explanation_provider is
  'Sumber explanation layer: groq, fallback, atau legacy.';

comment on column public.transactions.risk_signals is
  'Daftar rule code, bobot, severity, alasan, dan rekomendasi yang membentuk skor.';

